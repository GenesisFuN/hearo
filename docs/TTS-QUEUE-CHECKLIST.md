# TTS Queue System - Setup Checklist

## ✅ Phase 1: Database Setup (5 minutes)

- [ ] Open Supabase SQL Editor
- [ ] Copy/paste `docs/tts-queue-schema.sql`
- [ ] Click "Run" to execute
- [ ] Verify table created:
  ```sql
  SELECT COUNT(*) FROM tts_jobs;
  ```
- [ ] Verify functions exist:
  ```sql
  SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE '%tts%';
  ```

## ✅ Phase 2: Install Dependencies (1 minute)

- [ ] Run: `npm install`
- [ ] Verify tsx installed: `npx tsx --version`

## ✅ Phase 3: Add Job Tracking to Works (Optional)

- [ ] Run in Supabase:

  ```sql
  ALTER TABLE works
  ADD COLUMN IF NOT EXISTS tts_job_id UUID REFERENCES tts_jobs(id),
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

  CREATE INDEX IF NOT EXISTS idx_works_tts_job_id ON works(tts_job_id);
  ```

## ✅ Phase 4: Add Premium Status (Optional)

- [ ] Run in Supabase:
  ```sql
  ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
  ```

## ✅ Phase 5: Test the Queue (5 minutes)

### 5.1 Start the Worker

- [ ] Open terminal
- [ ] Run: `npm run worker:dev`
- [ ] Should see: "🚀 TTS Worker started: worker-xxx"

### 5.2 Test API Endpoint

- [ ] Get your auth token from browser DevTools:

  ```javascript
  // In browser console on your app:
  (await supabase.auth.getSession()).data.session.access_token;
  ```

- [ ] Test adding a job:

  ```bash
  curl -X POST http://localhost:3000/api/tts/queue \
    -H "Authorization: Bearer YOUR_TOKEN_HERE" \
    -H "Content-Type: application/json" \
    -d '{
      "workId": "test-work-id",
      "chapters": [
        {"id": "ch1", "text": "This is a test chapter", "title": "Chapter 1"}
      ],
      "voiceSettings": {}
    }'
  ```

- [ ] Should return: `{ "success": true, "jobId": "..." }`

### 5.3 Watch Worker Process

- [ ] In worker terminal, should see:
  ```
  📥 Claimed job xxx for work test-work-id
  📖 Processing chapter 1/1
  ✅ Generated: Xs
  ✅ Job xxx completed successfully
  ```

### 5.4 Check Job Status

- [ ] Test status endpoint:

  ```bash
  curl http://localhost:3000/api/tts/queue?jobId=YOUR_JOB_ID \
    -H "Authorization: Bearer YOUR_TOKEN_HERE"
  ```

- [ ] Should return: `{ "job": { "status": "completed", ... } }`

## ✅ Phase 6: Integration (15-30 minutes)

### 6.1 Update Upload/Publish API

- [ ] Add queue integration to your upload endpoint
- [ ] Reference: `docs/TTS-QUEUE-INTEGRATION-EXAMPLE.md`
- [ ] Test uploading a work

### 6.2 Add Status UI

- [ ] Create status polling component
- [ ] Show progress bar during generation
- [ ] Reference: UploadStatus component example

### 6.3 Update Worker with Real TTS

- [ ] Replace `generateTTS()` mock in `scripts/tts-worker.ts`
- [ ] Add your Coqui/Chatterbox API call
- [ ] Add Supabase Storage upload
- [ ] Test with real TTS generation

## ✅ Phase 7: Production Deployment (15 minutes)

### 7.1 Deploy Worker

Choose one:

**Option A: PM2 (Recommended)**

- [ ] Install PM2: `npm install -g pm2`
- [ ] Start worker: `pm2 start npm --name tts-worker -- run worker`
- [ ] Save: `pm2 save`
- [ ] Auto-start: `pm2 startup`

**Option B: Systemd**

- [ ] Create service file: `/etc/systemd/system/tts-worker.service`
- [ ] Enable: `sudo systemctl enable tts-worker`
- [ ] Start: `sudo systemctl start tts-worker`

**Option C: Docker**

- [ ] Add to Dockerfile: `CMD ["npm", "run", "worker"]`
- [ ] Deploy container

### 7.2 Monitor Worker

- [ ] Check logs: `pm2 logs tts-worker`
- [ ] Check status: `pm2 status`
- [ ] Set up alerts for failures

### 7.3 Set Up Maintenance Cron (Optional)

- [ ] Add to crontab or use Supabase pg_cron:
  ```sql
  SELECT cron.schedule(
    'reset-stuck-jobs',
    '*/5 * * * *', -- Every 5 minutes
    $$SELECT reset_stuck_tts_jobs()$$
  );
  ```

## ✅ Phase 8: Monitoring (Ongoing)

### Daily Checks

- [ ] Check queue stats:
  ```typescript
  const stats = await TTSQueue.getQueueStats();
  console.log(stats);
  ```
- [ ] Review failed jobs:
  ```sql
  SELECT * FROM tts_jobs WHERE status = 'failed' AND created_at > NOW() - INTERVAL '1 day';
  ```
- [ ] Check worker is running: `pm2 status`

### Weekly Checks

- [ ] Review processing times
- [ ] Check for stuck jobs
- [ ] Optimize if needed

## ✅ Phase 9: Scale (When Needed)

### When to Scale

- [ ] > 100 active users
- [ ] > 10 jobs/minute
- [ ] Queue delays > 5 minutes
- [ ] Database queries slow (> 500ms)

### Migration to Redis

- [ ] Sign up: https://upstash.com
- [ ] Install: `npm install bullmq ioredis`
- [ ] Set env vars: `REDIS_URL`, `REDIS_TOKEN`
- [ ] Change provider in `src/lib/queue/index.ts`:
  ```typescript
  const QUEUE_PROVIDER = "redis"; // Was "database"
  ```
- [ ] Deploy and test
- [ ] Monitor performance improvement

## 🎉 Success Criteria

- ✅ Worker processes jobs automatically
- ✅ Users see progress updates
- ✅ Failed jobs retry automatically
- ✅ No jobs stuck > 30 minutes
- ✅ Premium users get priority
- ✅ Queue stats available
- ✅ Worker restarts on crash

## 📚 Reference Documents

- **Quick Start**: `docs/TTS-QUEUE-QUICK-REF.md`
- **Full Guide**: `docs/TTS-QUEUE-SYSTEM.md`
- **Implementation**: `docs/TTS-QUEUE-IMPLEMENTATION.md`
- **Integration Example**: `docs/TTS-QUEUE-INTEGRATION-EXAMPLE.md`
- **SQL Schema**: `docs/tts-queue-schema.sql`

## 🆘 Troubleshooting

**Problem**: Worker not starting

- **Check**: `npx tsx --version` (should be installed)
- **Fix**: `npm install tsx`

**Problem**: Jobs not processing

- **Check**: `SELECT COUNT(*) FROM tts_jobs WHERE status = 'pending';`
- **Fix**: Start worker: `npm run worker:dev`

**Problem**: Jobs stuck

- **Check**: `SELECT * FROM tts_jobs WHERE status = 'processing' AND heartbeat_at < NOW() - INTERVAL '30 minutes';`
- **Fix**: `SELECT reset_stuck_tts_jobs();`

**Problem**: Worker crashes

- **Check**: Worker logs
- **Fix**: Use PM2 for auto-restart

**Problem**: Slow queue

- **Check**: Queue stats
- **Fix**: Add more workers or migrate to Redis

## 🎯 Next Steps

1. ✅ Complete checklist phases 1-5 (testing)
2. ✅ Integrate into your upload flow (phase 6)
3. ✅ Deploy to production (phase 7)
4. ✅ Monitor and optimize (phase 8)
5. 🔄 Scale when needed (phase 9)

---

**Total Setup Time**: ~30 minutes
**Cost**: $0 (until you need Redis)
**Maintenance**: < 5 minutes/week

You're ready to queue! 🚀
