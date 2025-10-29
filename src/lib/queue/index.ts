// TTS Queue - Unified Interface
// Swap providers without changing application code

import { DatabaseQueueProvider } from "./database-provider";
// import { RedisQueueProvider } from "./redis-provider"; // Uncomment when ready
import type { TTSQueueProvider } from "./types";

// ============================================
// CONFIGURATION: Choose your queue provider
// ============================================

const QUEUE_PROVIDER: "database" | "redis" = "database";

// ============================================
// Initialize provider (lazy-loaded)
// ============================================

let queueProvider: TTSQueueProvider | null = null;

function getQueueProvider(): TTSQueueProvider {
  if (!queueProvider) {
    if (QUEUE_PROVIDER === "database") {
      queueProvider = new DatabaseQueueProvider();
    } else {
      // When ready to switch to Redis:
      // queueProvider = new RedisQueueProvider();
      throw new Error("Redis provider not yet configured");
    }
  }
  return queueProvider;
}

// ============================================
// Export unified queue interface
// ============================================

export const TTSQueue = new Proxy({} as TTSQueueProvider, {
  get(target, prop) {
    const provider = getQueueProvider();
    const value = provider[prop as keyof TTSQueueProvider];
    return typeof value === "function" ? value.bind(provider) : value;
  },
});

// Re-export types for convenience
export type {
  TTSJob,
  TTSJobPayload,
  TTSJobResult,
  JobStatus,
  JobPriority,
  JobProgressUpdate,
} from "./types";

export { getPriorityForUser } from "./types";

// ============================================
// Usage Examples:
// ============================================

/*
// 1. Add a job (in your upload API)
import { TTSQueue, getPriorityForUser } from "@/lib/queue";

const jobId = await TTSQueue.addJob(
  {
    workId: work.id,
    userId: user.id,
    jobType: "full_book",
    chapters: parsedChapters,
    voiceSettings: { voiceId: "default" }
  },
  getPriorityForUser(user.isPremium)
);

// 2. Check job status (in your status API)
const job = await TTSQueue.getJob(jobId);
console.log(job.status, job.progressPercent);

// 3. Get user's jobs (for dashboard)
const userJobs = await TTSQueue.getUserJobs(userId);

// 4. Worker (in separate process)
import { TTSQueue } from "@/lib/queue";

async function processJobs() {
  while (true) {
    const job = await TTSQueue.claimNextJob("worker-1");
    
    if (!job) {
      await new Promise(r => setTimeout(r, 5000)); // Wait 5s
      continue;
    }
    
    try {
      // Process chapters
      for (let i = 0; i < job.payload.chapters.length; i++) {
        await generateChapter(job.payload.chapters[i]);
        
        await TTSQueue.updateProgress(job.id, {
          progressPercent: Math.round((i + 1) / job.payload.chapters.length * 100),
          progressMessage: `Processing chapter ${i + 1} of ${job.payload.chapters.length}`,
          currentChapter: i + 1
        });
      }
      
      await TTSQueue.completeJob(job.id, {
        audioFileIds: [...],
        totalDuration: 3600,
        completedAt: new Date().toISOString()
      });
      
    } catch (error) {
      await TTSQueue.failJob(job.id, error.message);
    }
  }
}

// 5. Maintenance cron (every 5 minutes)
const resetCount = await TTSQueue.resetStuckJobs();
console.log(`Reset ${resetCount} stuck jobs`);

// 6. Queue stats (for admin dashboard)
const stats = await TTSQueue.getQueueStats();
console.log(stats); // { pending: 5, processing: 2, completed: 100, failed: 3 }
*/
