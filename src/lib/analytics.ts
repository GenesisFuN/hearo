// Analytics tracking utility
// Use this throughout the app to track user engagement

import { supabase } from "./supabase";

export type AnalyticsEventType =
  | "view"
  | "play_start"
  | "play_progress"
  | "play_complete"
  | "like"
  | "comment"
  | "share";

interface TrackEventOptions {
  workId: string;
  eventType: AnalyticsEventType;
  eventData?: Record<string, any>;
}

/**
 * Track an analytics event
 * This function is fire-and-forget - it won't block the UI
 */
export async function trackEvent({
  workId,
  eventType,
  eventData,
}: TrackEventOptions): Promise<void> {
  try {
    // Get auth token if available
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Try to get session token for authenticated tracking
    if (typeof window !== "undefined") {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
      } catch (error) {
        // Continue without auth if it fails
      }
    }

    // Fire and forget - don't await
    fetch("/api/analytics/track", {
      method: "POST",
      headers,
      body: JSON.stringify({
        workId,
        eventType,
        eventData,
      }),
      // Don't wait for response
      keepalive: true,
    }).catch((error) => {
      // Log errors in development
      if (process.env.NODE_ENV === "development") {
        console.warn("Analytics tracking failed:", error);
      }
    });
  } catch (error) {
    // Log errors in development
    if (process.env.NODE_ENV === "development") {
      console.warn("Analytics tracking error:", error);
    }
  }
}

/**
 * Track a book view
 */
export function trackView(workId: string) {
  return trackEvent({ workId, eventType: "view" });
}

/**
 * Track playback start
 */
export function trackPlayStart(
  workId: string,
  eventData?: Record<string, any>
) {
  return trackEvent({ workId, eventType: "play_start", eventData });
}

/**
 * Track playback progress (call every 30 seconds)
 */
export function trackPlayProgress(
  workId: string,
  progressSeconds: number,
  totalSeconds: number
) {
  return trackEvent({
    workId,
    eventType: "play_progress",
    eventData: {
      progress_seconds: progressSeconds,
      total_seconds: totalSeconds,
      completion_percentage: (progressSeconds / totalSeconds) * 100,
    },
  });
}

/**
 * Track playback completion (90%+ of book)
 */
export function trackPlayComplete(
  workId: string,
  eventData?: Record<string, any>
) {
  return trackEvent({ workId, eventType: "play_complete", eventData });
}

/**
 * Track a like action
 */
export function trackLike(workId: string) {
  return trackEvent({ workId, eventType: "like" });
}

/**
 * Track a comment action
 */
export function trackComment(workId: string) {
  return trackEvent({ workId, eventType: "comment" });
}

/**
 * Track a share action
 */
export function trackShare(workId: string, platform?: string) {
  return trackEvent({
    workId,
    eventType: "share",
    eventData: platform ? { platform } : undefined,
  });
}

/**
 * Hook for tracking playback sessions with automatic progress updates
 * Use this in your audio player component
 */
export class PlaybackSessionTracker {
  private workId: string;
  private progressInterval: NodeJS.Timeout | null = null;
  private sessionStart: Date;
  private lastProgressUpdate: number = 0;

  constructor(workId: string) {
    this.workId = workId;
    this.sessionStart = new Date();
    this.start();
  }

  private start() {
    // Track play_start
    trackPlayStart(this.workId, {
      session_start: this.sessionStart.toISOString(),
    });
  }

  /**
   * Update progress (call from audio player's time update event)
   */
  updateProgress(currentTime: number, duration: number) {
    // Track progress events every 30 seconds for analytics
    if (currentTime - this.lastProgressUpdate >= 30) {
      trackPlayProgress(
        this.workId,
        Math.floor(currentTime),
        Math.floor(duration)
      );
      this.lastProgressUpdate = currentTime;

      // Check for completion (90%+)
      const completionPercentage = (currentTime / duration) * 100;
      if (completionPercentage >= 90) {
        this.complete();
      }
    }
  }

  /**
   * Mark session as complete
   */
  complete() {
    trackPlayComplete(this.workId, {
      session_duration: (Date.now() - this.sessionStart.getTime()) / 1000,
    });
    this.cleanup();
  }

  /**
   * Stop tracking (call on pause or component unmount)
   */
  stop() {
    this.cleanup();
  }

  private cleanup() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }
}
