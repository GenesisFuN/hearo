// Database-based TTS Queue Implementation
// Free solution - easy to swap for Redis later

import { createClient } from "@supabase/supabase-js";
import type {
  TTSQueueProvider,
  TTSJob,
  TTSJobPayload,
  TTSJobResult,
  JobPriority,
  JobProgressUpdate,
} from "./types";

export class DatabaseQueueProvider implements TTSQueueProvider {
  private supabase;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    // Use service role key for worker operations
    this.supabase = createClient(
      supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async addJob(
    payload: TTSJobPayload,
    priority: JobPriority = 5
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from("tts_jobs")
      .insert({
        work_id: payload.workId,
        user_id: payload.userId,
        job_type: payload.jobType,
        payload: payload,
        priority,
        total_chapters: payload.chapters.length,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to add job: ${error.message}`);
    }

    return data.id;
  }

  async getJob(jobId: string): Promise<TTSJob | null> {
    const { data, error } = await this.supabase
      .from("tts_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToTTSJob(data);
  }

  async cancelJob(jobId: string): Promise<void> {
    const { error } = await this.supabase
      .from("tts_jobs")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .in("status", ["pending", "processing"]);

    if (error) {
      throw new Error(`Failed to cancel job: ${error.message}`);
    }
  }

  async claimNextJob(workerId: string): Promise<TTSJob | null> {
    const { data, error } = await this.supabase.rpc("claim_next_tts_job", {
      worker_id_param: workerId,
    });

    if (error) {
      throw new Error(`Failed to claim job: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Fetch full job details
    return this.getJob(data[0].job_id);
  }

  async updateProgress(
    jobId: string,
    update: JobProgressUpdate
  ): Promise<void> {
    const { error } = await this.supabase.rpc("update_tts_job_progress", {
      job_id_param: jobId,
      progress_percent_param: update.progressPercent,
      progress_message_param: update.progressMessage || null,
      current_chapter_param: update.currentChapter || null,
    });

    if (error) {
      throw new Error(`Failed to update progress: ${error.message}`);
    }
  }

  async completeJob(jobId: string, result: TTSJobResult): Promise<void> {
    const { error } = await this.supabase.rpc("complete_tts_job", {
      job_id_param: jobId,
      result_param: result,
    });

    if (error) {
      throw new Error(`Failed to complete job: ${error.message}`);
    }
  }

  async failJob(
    jobId: string,
    errorMessage: string,
    shouldRetry: boolean = true
  ): Promise<void> {
    const { error } = await this.supabase.rpc("fail_tts_job", {
      job_id_param: jobId,
      error_message_param: errorMessage,
      should_retry: shouldRetry,
    });

    if (error) {
      throw new Error(`Failed to mark job as failed: ${error.message}`);
    }
  }

  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const { data, error } = await this.supabase
      .from("tts_jobs")
      .select("status")
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      ); // Last 24 hours

    if (error) {
      throw new Error(`Failed to get queue stats: ${error.message}`);
    }

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    data?.forEach((row) => {
      if (row.status in stats) {
        stats[row.status as keyof typeof stats]++;
      }
    });

    return stats;
  }

  async getUserJobs(userId: string, limit: number = 10): Promise<TTSJob[]> {
    const { data, error } = await this.supabase
      .from("tts_jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get user jobs: ${error.message}`);
    }

    return data.map((row) => this.mapToTTSJob(row));
  }

  async resetStuckJobs(): Promise<number> {
    const { data, error } = await this.supabase.rpc("reset_stuck_tts_jobs");

    if (error) {
      throw new Error(`Failed to reset stuck jobs: ${error.message}`);
    }

    return data || 0;
  }

  // Helper: Map database row to TTSJob
  private mapToTTSJob(row: any): TTSJob {
    return {
      id: row.id,
      workId: row.work_id,
      userId: row.user_id,
      status: row.status,
      priority: row.priority,
      payload: row.payload,
      result: row.result,
      errorMessage: row.error_message,
      progressPercent: row.progress_percent || 0,
      progressMessage: row.progress_message,
      currentChapter: row.current_chapter,
      totalChapters: row.total_chapters,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
    };
  }
}
