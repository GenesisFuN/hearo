# TTS Queue - Quick Reference

## 🚀 Setup (5 minutes)

```bash
# 1. Run SQL migration
# File: docs/tts-queue-schema.sql (in Supabase SQL Editor)

# 2. Start worker
npx tsx scripts/tts-worker.ts
```

## 📋 Common Operations

### Add Job

```typescript
import { TTSQueue, getPriorityForUser } from "@/lib/queue";

const jobId = await TTSQueue.addJob({
  workId: "...",
  userId: "...",
  jobType: "full_book",
  chapters: [...],
  voiceSettings: {}
}, getPriorityForUser(isPremium));
```

### Check Status

```typescript
const job = await TTSQueue.getJob(jobId);
console.log(job.status, job.progressPercent);
```

### Cancel Job

```typescript
await TTSQueue.cancelJob(jobId);
```

### Get User's Jobs

```typescript
const jobs = await TTSQueue.getUserJobs(userId);
```

## 🔧 Maintenance

### Reset Stuck Jobs

```typescript
const count = await TTSQueue.resetStuckJobs();
```

### Queue Stats

```typescript
const stats = await TTSQueue.getQueueStats();
// { pending: 5, processing: 2, completed: 100, failed: 3 }
```

## 🔄 Migration to Redis (Later)

```bash
# 1. Sign up: https://upstash.com
# 2. Install: npm install bullmq ioredis
# 3. Set env: REDIS_URL=...
# 4. Change one line:
```

```typescript
// src/lib/queue/index.ts
const QUEUE_PROVIDER: "database" | "redis" = "redis"; // ← Change this
```

## 📊 Job Priorities

| User Type        | Priority | Queue Position |
| ---------------- | -------- | -------------- |
| Premium + Urgent | 1        | First          |
| Premium          | 2-3      | High           |
| Free             | 5-10     | Normal         |

```typescript
getPriorityForUser(true); // Premium → 2
getPriorityForUser(false); // Free → 5
```

## 🎯 Job Lifecycle

```
pending → processing → completed ✅
                    ↓
                  failed ❌ (retry up to 3x)
```

## 📁 Files

```
src/
  lib/
    queue/
      index.ts              ← Main interface
      types.ts              ← Type definitions
      database-provider.ts  ← Current (free)
      redis-provider.ts     ← Future (paid)

scripts/
  tts-worker.ts             ← Worker process

docs/
  tts-queue-schema.sql      ← Database migration
  TTS-QUEUE-SYSTEM.md       ← Full documentation

src/app/api/
  tts/queue/route.ts        ← API endpoints
```

## 🐛 Troubleshooting

**Jobs not processing?**

```bash
# Check worker running
pm2 list
ps aux | grep tts-worker

# Check pending jobs
SELECT COUNT(*) FROM tts_jobs WHERE status = 'pending';
```

**Jobs stuck?**

```typescript
await TTSQueue.resetStuckJobs();
```

**View failed jobs:**

```sql
SELECT * FROM tts_jobs WHERE status = 'failed';
```

## 💡 Tips

- ✅ Start with database queue (free)
- ✅ One job = One book (not per chapter)
- ✅ Update progress per chapter (not per second)
- ✅ Log all state changes
- ✅ Switch to Redis when > 100 users

## 🎉 That's It!

Zero infrastructure cost. Easy migration path. Production-ready.
