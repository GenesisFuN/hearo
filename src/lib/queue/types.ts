// TTS Queue Interface
// Abstract interface - swap implementations without changing app code

export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type JobPriority = 1 | 2 | 3 | 5 | 10; // Lower = higher priority

export interface TTSJobPayload {
  workId: string;
  userId: string;
  jobType: "full_book" | "single_chapter" | "sample";
  chapters: Array<{
    chapterId: string;
    text: string;
    title: string;
  }>;
  voiceSettings: {
    voiceId?: string;
    speed?: number;
    pitch?: number;
  };
  metadata?: Record<string, any>;
}

export interface TTSJobResult {
  audioFileIds: string[];
  totalDuration: number;
  completedAt: string;
}

export interface TTSJob {
  id: string;
  workId: string;
  userId: string;
  status: JobStatus;
  priority: JobPriority;
  payload: TTSJobPayload;
  result?: TTSJobResult;
  errorMessage?: string;
  progressPercent: number;
  progressMessage?: string;
  currentChapter?: number;
  totalChapters?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  attempts: number;
  maxAttempts: number;
}

export interface JobProgressUpdate {
  progressPercent: number;
  progressMessage?: string;
  currentChapter?: number;
}

// Abstract queue interface - implement with Database or Redis
export interface TTSQueueProvider {
  // Job management
  addJob(payload: TTSJobPayload, priority?: JobPriority): Promise<string>;
  getJob(jobId: string): Promise<TTSJob | null>;
  cancelJob(jobId: string): Promise<void>;

  // Worker operations
  claimNextJob(workerId: string): Promise<TTSJob | null>;
  updateProgress(jobId: string, update: JobProgressUpdate): Promise<void>;
  completeJob(jobId: string, result: TTSJobResult): Promise<void>;
  failJob(jobId: string, error: string, shouldRetry?: boolean): Promise<void>;

  // Queue monitoring
  getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }>;
  getUserJobs(userId: string, limit?: number): Promise<TTSJob[]>;

  // Maintenance
  resetStuckJobs(): Promise<number>;
}

// Priority helper
export function getPriorityForUser(
  isPremium: boolean,
  isUrgent: boolean = false
): JobPriority {
  if (isPremium && isUrgent) return 1;
  if (isPremium) return 2;
  if (isUrgent) return 3;
  return 5; // Default for free users
}
