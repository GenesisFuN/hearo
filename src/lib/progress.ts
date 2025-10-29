// Playback Progress Tracking
// Saves and resumes user's listening position

import { supabase } from "./supabase";

interface PlaybackProgress {
  workId: string;
  progressSeconds: number;
  durationSeconds: number;
  completionPercentage: number;
  lastPlayed: string;
}

/**
 * Save playback progress to database
 */
export async function saveProgress(
  workId: string,
  progressSeconds: number,
  durationSeconds: number,
  actualListeningDelta: number = 0 // New: track actual listening time increments
): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      // Save to localStorage for anonymous users
      const key = `progress_${workId}`;
      const progress: PlaybackProgress = {
        workId,
        progressSeconds,
        durationSeconds,
        completionPercentage: (progressSeconds / durationSeconds) * 100,
        lastPlayed: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(progress));
      return;
    }

    // For authenticated users, save to database
    const completionPercentage = (progressSeconds / durationSeconds) * 100;

    // Find existing session or create new one
    const { data: existingSession, error: fetchError } = await supabase
      .from("playback_sessions")
      .select("id")
      .eq("work_id", workId)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(); // Use maybeSingle() to handle no results gracefully

    if (existingSession) {
      // Update existing session with session_end time and actual listening time
      // Use database-side increment to prevent race conditions
      if (actualListeningDelta > 0) {
        // Increment actual_listening_seconds by the delta
        const { error } = await supabase.rpc("increment_listening_time", {
          session_id: existingSession.id,
          seconds_to_add: Math.floor(actualListeningDelta),
          new_progress: Math.floor(progressSeconds),
          new_duration: Math.floor(durationSeconds),
          new_percentage: completionPercentage,
        });

        if (error) {
          console.error("Failed to increment listening time:", error);
          // Fallback to regular update
          await supabase
            .from("playback_sessions")
            .update({
              progress_seconds: Math.floor(progressSeconds),
              duration_seconds: Math.floor(durationSeconds),
              completion_percentage: completionPercentage,
              session_end: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingSession.id);
        }
      } else {
        // No listening time delta, just update position
        const { error } = await supabase
          .from("playback_sessions")
          .update({
            progress_seconds: Math.floor(progressSeconds),
            duration_seconds: Math.floor(durationSeconds),
            completion_percentage: completionPercentage,
            session_end: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSession.id);

        if (error) {
          console.error("Failed to update playback session:", error);
        }
      }
    } else {
      // Create new session with session_start
      const { error } = await supabase.from("playback_sessions").insert({
        user_id: session.user.id,
        work_id: workId,
        progress_seconds: Math.floor(progressSeconds),
        duration_seconds: Math.floor(durationSeconds),
        completion_percentage: completionPercentage,
        actual_listening_seconds: Math.floor(actualListeningDelta),
        session_start: new Date().toISOString(),
        session_end: new Date().toISOString(),
      });

      if (error) {
        console.error("Failed to create playback session:", error);
      }
    }
  } catch (error) {
    console.warn("Failed to save progress:", error);
    // Silently fail - don't disrupt playback
  }
}

/**
 * Get saved progress for a book
 */
export async function getProgress(
  workId: string
): Promise<PlaybackProgress | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      // Check localStorage for anonymous users
      const key = `progress_${workId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    }

    // For authenticated users, get from database
    const { data: sessionData, error } = await supabase
      .from("playback_sessions")
      .select("*")
      .eq("work_id", workId)
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle no results

    if (error || !sessionData) {
      return null;
    }

    return {
      workId,
      progressSeconds: sessionData.progress_seconds || 0,
      durationSeconds: sessionData.duration_seconds || 0,
      completionPercentage: sessionData.completion_percentage || 0,
      lastPlayed: sessionData.updated_at,
    };
  } catch (error) {
    console.warn("Failed to get progress:", error);
    return null;
  }
}

/**
 * Clear progress for a book (when user wants to start over)
 */
export async function clearProgress(workId: string): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      // Clear from localStorage
      const key = `progress_${workId}`;
      localStorage.removeItem(key);
      return;
    }

    // Clear from database
    await supabase
      .from("playback_sessions")
      .delete()
      .eq("work_id", workId)
      .eq("user_id", session.user.id);
  } catch (error) {
    console.warn("Failed to clear progress:", error);
  }
}

/**
 * Hook class for managing playback progress with auto-save
 */
export class ProgressTracker {
  private workId: string;
  private saveInterval: NodeJS.Timeout | null = null;
  private lastSaveTime: number = Date.now();
  private pendingProgress: { current: number; duration: number } | null = null;
  private sessionId: string | null = null;
  private sessionStartTime: number | null = null;
  private lastPosition: number = 0;
  private actualListeningSeconds: number = 0;

  constructor(workId: string) {
    this.workId = workId;
    this.startAutoSave();
  }

  /**
   * Start auto-save interval (saves every 10 seconds)
   */
  private startAutoSave() {
    // Save every 10 seconds
    this.saveInterval = setInterval(() => {
      if (this.pendingProgress) {
        this.save(this.pendingProgress.current, this.pendingProgress.duration);
      }
    }, 10000); // 10 seconds
  }

  /**
   * Update current progress (call frequently from player)
   */
  update(currentTime: number, duration: number) {
    // Track actual listening time (not skips)
    if (this.lastPosition >= 0) {
      const positionDelta = currentTime - this.lastPosition;

      // Only count as actual listening if the change is reasonable
      // Allow up to 2x speed (our maximum) plus a small buffer
      const timeSinceLastUpdate = (Date.now() - this.lastSaveTime) / 1000;
      const maxReasonableProgress = timeSinceLastUpdate * 2.2; // 2x speed + 10% buffer

      if (positionDelta > 0 && positionDelta <= maxReasonableProgress) {
        // Valid progress - count it
        this.actualListeningSeconds += positionDelta;
      }
      // If skip detected (positionDelta > maxReasonableProgress), don't count it
    }

    this.lastPosition = currentTime;
    this.lastSaveTime = Date.now();
    this.pendingProgress = { current: currentTime, duration };
  }

  /**
   * Pause auto-save (when playback is paused)
   */
  pause() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }

    // Save current position before pausing
    if (this.pendingProgress) {
      this.save(this.pendingProgress.current, this.pendingProgress.duration);
    }
  }

  /**
   * Resume auto-save (when playback resumes)
   */
  resume() {
    if (!this.saveInterval) {
      this.startAutoSave();
    }
  }

  /**
   * Force save immediately
   */
  async save(currentTime: number, duration: number) {
    if (duration <= 0) return;

    await saveProgress(
      this.workId,
      currentTime,
      duration,
      this.actualListeningSeconds
    );

    // Reset the accumulator after saving
    this.actualListeningSeconds = 0;
    this.lastSaveTime = Date.now();
  }

  /**
   * Stop tracking and cleanup
   */
  stop() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }

    // Final save before stopping
    if (this.pendingProgress) {
      this.save(this.pendingProgress.current, this.pendingProgress.duration);
    }
  }
}
