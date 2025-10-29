// Redis/BullMQ TTS Queue Implementation (Future)
// Swap to this when you're ready to scale

import { Queue, Worker, QueueEvents } from "bullmq";
import type {
  TTSQueueProvider,
  TTSJob,
  TTSJobPayload,
  TTSJobResult,
  JobPriority,
  JobProgressUpdate,
} from "./types";

/**
 * Redis-based queue using BullMQ
 *
 * Setup:
 * 1. npm install bullmq ioredis
 * 2. Sign up for Upstash Redis: https://upstash.com
 * 3. Set env vars: REDIS_URL, REDIS_TOKEN
 * 4. Swap provider in queue.ts
 *
 * Benefits over database:
 * - Faster (in-memory)
 * - Better concurrency handling
 * - Built-in retry with exponential backoff
 * - Job events (progress, completion)
 * - Rate limiting
 * - Delayed jobs
 * - Repeat jobs
 */
export class RedisQueueProvider implements TTSQueueProvider {
  private queue: Queue;
  private worker: Worker | null = null;
  private queueEvents: QueueEvents;

  constructor() {
    const connection = {
      host: process.env.REDIS_HOST!,
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      // For Upstash:
      // url: process.env.UPSTASH_REDIS_REST_URL,
      // token: process.env.UPSTASH_REDIS_REST_TOKEN,
    };

    this.queue = new Queue("tts-generation", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000, // Start with 5s, then 25s, then 125s
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000, // Keep max 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    });

    this.queueEvents = new QueueEvents("tts-generation", { connection });
  }

  async addJob(
    payload: TTSJobPayload,
    priority: JobPriority = 5
  ): Promise<string> {
    const job = await this.queue.add("generate-tts", payload, {
      priority,
      jobId: `${payload.workId}-${Date.now()}`, // Unique job ID
    });

    return job.id!;
  }

  async getJob(jobId: string): Promise<TTSJob | null> {
    const job = await this.queue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress as any;

    return {
      id: job.id!,
      workId: job.data.workId,
      userId: job.data.userId,
      status: this.mapBullMQState(state),
      priority: job.opts.priority as JobPriority,
      payload: job.data,
      result: job.returnvalue,
      errorMessage: job.failedReason,
      progressPercent: progress?.percent || 0,
      progressMessage: progress?.message,
      currentChapter: progress?.currentChapter,
      totalChapters: job.data.chapters.length,
      createdAt: new Date(job.timestamp).toISOString(),
      startedAt: job.processedOn
        ? new Date(job.processedOn).toISOString()
        : undefined,
      completedAt: job.finishedOn
        ? new Date(job.finishedOn).toISOString()
        : undefined,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts || 3,
    };
  }

  async cancelJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  async claimNextJob(workerId: string): Promise<TTSJob | null> {
    // BullMQ handles claiming automatically via worker
    // This method is not needed for BullMQ
    throw new Error("Use startWorker() instead for BullMQ");
  }

  async updateProgress(
    jobId: string,
    update: JobProgressUpdate
  ): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.updateProgress({
        percent: update.progressPercent,
        message: update.progressMessage,
        currentChapter: update.currentChapter,
      });
    }
  }

  async completeJob(jobId: string, result: TTSJobResult): Promise<void> {
    // BullMQ handles completion automatically when processor returns
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.moveToCompleted(result, job.token!);
    }
  }

  async failJob(
    jobId: string,
    errorMessage: string,
    shouldRetry: boolean = true
  ): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      if (shouldRetry && job.attemptsMade < (job.opts.attempts || 3)) {
        await job.retry();
      } else {
        await job.moveToFailed(new Error(errorMessage), job.token!);
      }
    }
  }

  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return {
      pending: waiting,
      processing: active,
      completed,
      failed,
    };
  }

  async getUserJobs(userId: string, limit: number = 10): Promise<TTSJob[]> {
    // BullMQ doesn't have built-in user filtering
    // You'd need to maintain a separate index or scan all jobs
    const jobs = await this.queue.getJobs(
      ["waiting", "active", "completed", "failed"],
      0,
      limit
    );

    const userJobs = jobs
      .filter((job) => job.data.userId === userId)
      .slice(0, limit);

    return Promise.all(userJobs.map((job) => this.getJob(job.id!))).then(
      (jobs) => jobs.filter(Boolean) as TTSJob[]
    );
  }

  async resetStuckJobs(): Promise<number> {
    // BullMQ has built-in stalled job detection
    // Just need to set stallInterval in worker options
    return 0;
  }

  // Start worker (call this in your worker process)
  startWorker(processor: (job: TTSJob) => Promise<TTSJobResult>): Worker {
    this.worker = new Worker(
      "tts-generation",
      async (job) => {
        const ttsJob = await this.getJob(job.id!);
        if (!ttsJob) throw new Error("Job not found");

        return processor(ttsJob);
      },
      {
        connection: this.queue.client,
        concurrency: 2, // Process 2 jobs at a time
        stalledInterval: 30000, // Check for stalled jobs every 30s
        maxStalledCount: 1, // Retry once if stalled
      }
    );

    return this.worker;
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.queueEvents.close();
    if (this.worker) {
      await this.worker.close();
    }
  }

  private mapBullMQState(state: string): TTSJob["status"] {
    switch (state) {
      case "waiting":
      case "delayed":
        return "pending";
      case "active":
        return "processing";
      case "completed":
        return "completed";
      case "failed":
        return "failed";
      default:
        return "pending";
    }
  }
}
