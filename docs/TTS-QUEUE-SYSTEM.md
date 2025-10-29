# TTS Queue System - Complete Guide

## Overview

A production-ready job queue system for TTS generation with **zero infrastructure cost** to start. Designed for easy migration to Redis/BullMQ when you scale.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Upload    │──1──>│  Queue API   │──2──>│  Database   │
│     UI      │      │  (Add Job)   │      │ (tts_jobs)  │
└─────────────┘      └──────────────┘      └─────────────┘
                                                   │
                                                   │ 3. Poll
                                                   ▼
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Status    │<─5───│  TTS Worker  │<─4───│  Claim Job  │
│     UI      │      │  (Process)   │      │             │
└─────────────┘      └──────────────┘      └─────────────┘
```

## Features

### Current (Database Queue)

- ✅ **Free** - No additional infrastructure
- ✅ **Job priorities** - Premium users jump the queue
- ✅ **Progress tracking** - Real-time status updates
- ✅ **Automatic retries** - Failed jobs retry up to 3 times
- ✅ **Stuck job detection** - Auto-resets jobs after 30 min
- ✅ **Atomic operations** - No race conditions
- ✅ **Cancellation** - Users can cancel pending jobs

### Future (Redis/BullMQ)

- 🔄 **Faster** - In-memory queue
- 🔄 **Better concurrency** - Multiple workers
- 🔄 **Exponential backoff** - Smart retry delays
- 🔄 **Rate limiting** - Protect your TTS servers
- 🔄 **Delayed jobs** - Schedule for later
- 🔄 **Job events** - Real-time WebSocket updates

## Setup

### 1. Run Database Migration

```bash
# In Supabase SQL Editor
# File: docs/tts-queue-schema.sql
```

This creates:

- `tts_jobs` table
- Helper functions (claim, complete, fail, etc)
- Indexes for performance
- RLS policies

### 2. Verify Installation

```sql
-- Check table exists
SELECT * FROM tts_jobs LIMIT 1;

-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%tts%';
```

### 3. Add Premium Status to Profiles (Optional)

```sql
-- Add is_premium column if not exists
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
```

## Usage

### Adding Jobs

```typescript
// In your upload/publish API
import { TTSQueue, getPriorityForUser } from "@/lib/queue";

const jobId = await TTSQueue.addJob(
  {
    workId: work.id,
    userId: user.id,
    jobType: "full_book",
    chapters: [
      { chapterId: "ch1", text: "...", title: "Chapter 1" },
      { chapterId: "ch2", text: "...", title: "Chapter 2" },
    ],
    voiceSettings: {
      voiceId: "default",
      speed: 1.0,
    },
  },
  getPriorityForUser(user.isPremium) // 1-3 for premium, 5-10 for free
);

console.log(`Job queued: ${jobId}`);
```

### Checking Status

```typescript
// Get specific job
const job = await TTSQueue.getJob(jobId);

console.log(job.status); // 'pending', 'processing', 'completed', 'failed'
console.log(job.progressPercent); // 0-100
console.log(job.progressMessage); // "Processing chapter 3 of 15"

// Get all user's jobs
const userJobs = await TTSQueue.getUserJobs(userId);
```

### Cancelling Jobs

```typescript
await TTSQueue.cancelJob(jobId);
```

## Running the Worker

### Development

```bash
# Terminal 1: Next.js dev server
npm run dev

# Terminal 2: TTS Worker
npx tsx scripts/tts-worker.ts
```

### Production

```bash
# Option 1: PM2 (recommended)
pm2 start scripts/tts-worker.ts --name tts-worker

# Option 2: Docker
docker run -d --name tts-worker \
  -e DATABASE_URL=... \
  your-app npm run worker

# Option 3: Systemd service
sudo systemctl start tts-worker
```

### Worker Configuration

```typescript
// scripts/tts-worker.ts

const WORKER_ID = "worker-1"; // Unique ID per worker instance
const POLL_INTERVAL = 5000; // Check for jobs every 5s
const HEARTBEAT_INTERVAL = 10000; // Update progress every 10s
```

## API Endpoints

### POST /api/tts/queue

Queue a new TTS generation job

**Request:**

```json
{
  "workId": "uuid",
  "chapters": [{ "id": "ch1", "text": "...", "title": "Chapter 1" }],
  "voiceSettings": {
    "voiceId": "default"
  },
  "jobType": "full_book"
}
```

**Response:**

```json
{
  "success": true,
  "jobId": "uuid",
  "job": {
    "id": "uuid",
    "status": "pending",
    "priority": 5,
    "progressPercent": 0,
    "totalChapters": 15
  }
}
```

### GET /api/tts/queue?jobId=xxx

Get job status

**Response:**

```json
{
  "job": {
    "id": "uuid",
    "status": "processing",
    "progressPercent": 47,
    "progressMessage": "Processing chapter 8 of 15",
    "currentChapter": 8,
    "totalChapters": 15,
    "createdAt": "2025-10-21T12:00:00Z",
    "startedAt": "2025-10-21T12:01:00Z"
  }
}
```

### GET /api/tts/queue?userId=xxx

Get all user's jobs

**Response:**

```json
{
  "jobs": [
    { "id": "uuid", "status": "completed", ... },
    { "id": "uuid", "status": "processing", ... }
  ]
}
```

### DELETE /api/tts/queue?jobId=xxx

Cancel a job

**Response:**

```json
{
  "success": true,
  "message": "Job cancelled successfully"
}
```

## Monitoring

### Queue Stats

```typescript
const stats = await TTSQueue.getQueueStats();

console.log(stats);
// {
//   pending: 12,
//   processing: 3,
//   completed: 487,
//   failed: 5
// }
```

### Admin Dashboard (Future)

```typescript
// pages/admin/queue.tsx
import { TTSQueue } from "@/lib/queue";

export default async function QueueDashboard() {
  const stats = await TTSQueue.getQueueStats();
  const recentJobs = await TTSQueue.getUserJobs("all", 20);

  return (
    <div>
      <h1>Queue Dashboard</h1>
      <div>Pending: {stats.pending}</div>
      <div>Processing: {stats.processing}</div>
      {/* ... */}
    </div>
  );
}
```

## Troubleshooting

### Jobs stuck in "processing"

```bash
# Run maintenance function
psql -c "SELECT reset_stuck_tts_jobs();"

# Or via API
const resetCount = await TTSQueue.resetStuckJobs();
```

Jobs stuck > 30 minutes without heartbeat are auto-reset to pending.

### Worker not processing jobs

1. **Check worker is running:**

   ```bash
   ps aux | grep tts-worker
   pm2 list
   ```

2. **Check worker logs:**

   ```bash
   pm2 logs tts-worker
   ```

3. **Verify database connection:**

   ```bash
   # Test connection
   psql $DATABASE_URL -c "SELECT 1;"
   ```

4. **Check for pending jobs:**
   ```sql
   SELECT COUNT(*) FROM tts_jobs WHERE status = 'pending';
   ```

### High memory usage

```typescript
// Reduce worker concurrency
const POLL_INTERVAL = 10000; // Process slower

// Process one job at a time
// (Already the default for database provider)
```

### Failed jobs

```sql
-- View failed jobs
SELECT id, work_id, error_message, attempts, max_attempts
FROM tts_jobs
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Retry a specific job
UPDATE tts_jobs
SET status = 'pending', attempts = 0
WHERE id = 'job-id';
```

## Migration to Redis/BullMQ

When you're ready to scale (> 100 users, > 10 jobs/min):

### 1. Sign up for Upstash Redis

```bash
# Free tier: 10,000 commands/day
https://upstash.com
```

### 2. Install dependencies

```bash
npm install bullmq ioredis
```

### 3. Set environment variables

```bash
REDIS_URL=...
REDIS_TOKEN=...
```

### 4. Switch provider

```typescript
// src/lib/queue/index.ts

const QUEUE_PROVIDER: "database" | "redis" = "redis"; // Change this

// Uncomment:
import { RedisQueueProvider } from "./redis-provider";
queueProvider = new RedisQueueProvider();
```

### 5. Update worker

```typescript
// scripts/tts-worker.ts

// For BullMQ, use built-in worker:
import { RedisQueueProvider } from "../src/lib/queue/redis-provider";

const provider = new RedisQueueProvider();
provider.startWorker(async (job) => {
  // Process job
  return result;
});
```

**That's it!** No changes to your application code needed.

## Performance Comparison

| Metric      | Database      | Redis/BullMQ |
| ----------- | ------------- | ------------ |
| Jobs/sec    | ~10           | ~1000+       |
| Latency     | 50-100ms      | 1-5ms        |
| Concurrency | Single worker | Multi-worker |
| Cost        | $0            | $10-30/mo    |
| Setup       | 5 min         | 15 min       |

**Recommendation:** Start with database, switch to Redis when you need it.

## Best Practices

### 1. Job Size

- ✅ One job = One book
- ✅ Split large books (> 50 chapters) into batches
- ❌ Don't create jobs for individual chapters

### 2. Error Handling

```typescript
try {
  await generateTTS(text);
} catch (error) {
  if (error.code === "RATE_LIMIT") {
    // Retry with delay
    await TTSQueue.failJob(jobId, error.message, true);
  } else {
    // Don't retry
    await TTSQueue.failJob(jobId, error.message, false);
  }
}
```

### 3. Progress Updates

```typescript
// Update every chapter (not every second)
for (let i = 0; i < chapters.length; i++) {
  await processChapter(chapters[i]);

  await TTSQueue.updateProgress(jobId, {
    progressPercent: Math.round(((i + 1) / chapters.length) * 100),
    currentChapter: i + 1,
  });
}
```

### 4. Monitoring

```typescript
// Log all job state changes
await TTSQueue.completeJob(jobId, result);
console.log(`Job ${jobId} completed: ${result.audioFileIds.length} files`);

// Track metrics
trackMetric("tts_job_completed", {
  jobId,
  duration: result.totalDuration,
  chapters: result.audioFileIds.length,
});
```

## Summary

✅ **Free database queue** - Start with this
✅ **Easy migration** - Swap to Redis when needed
✅ **Production-ready** - Retries, priorities, monitoring
✅ **Simple API** - Add, check, cancel jobs
✅ **Worker included** - Process jobs automatically

Run `docs/tts-queue-schema.sql` to get started! 🚀
