-- TTS Job Queue System
-- Free database-based queue with easy migration path to Redis/BullMQ

-- Create job queue table
CREATE TABLE IF NOT EXISTS tts_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Job identification
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type VARCHAR(50) NOT NULL DEFAULT 'full_book', -- 'full_book', 'single_chapter', 'sample'
  
  -- Job status
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  priority INTEGER NOT NULL DEFAULT 10, -- Lower = higher priority (1-10, premium users get 1-3)
  
  -- Job data
  payload JSONB NOT NULL, -- { chapters, voiceSettings, etc }
  result JSONB, -- { audioFileIds, duration, etc }
  error_message TEXT,
  
  -- Progress tracking
  progress_percent INTEGER DEFAULT 0, -- 0-100
  progress_message TEXT, -- "Processing chapter 3 of 15"
  current_chapter INTEGER,
  total_chapters INTEGER,
  
  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Worker tracking
  worker_id TEXT, -- Which worker claimed this job
  heartbeat_at TIMESTAMPTZ, -- Last heartbeat from worker (for stuck job detection)
  
  -- Retry logic
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tts_jobs_status_priority ON tts_jobs(status, priority, created_at) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_tts_jobs_user_id ON tts_jobs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tts_jobs_work_id ON tts_jobs(work_id);

CREATE INDEX IF NOT EXISTS idx_tts_jobs_heartbeat ON tts_jobs(heartbeat_at) 
  WHERE status = 'processing';

-- Enable Row Level Security
ALTER TABLE tts_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own jobs"
ON tts_jobs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs"
ON tts_jobs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel their own jobs"
ON tts_jobs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status IN ('pending', 'processing'))
WITH CHECK (status = 'cancelled');

-- Service role can do anything (for workers)
CREATE POLICY "Service role full access"
ON tts_jobs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to claim next job (atomic)
CREATE OR REPLACE FUNCTION claim_next_tts_job(
  worker_id_param TEXT
)
RETURNS TABLE (
  job_id UUID,
  work_id UUID,
  payload JSONB,
  attempts INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  claimed_job RECORD;
BEGIN
  -- Find and claim the next pending job atomically
  SELECT id, tts_jobs.work_id, tts_jobs.payload, tts_jobs.attempts
  INTO claimed_job
  FROM tts_jobs
  WHERE status = 'pending'
  ORDER BY priority ASC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED; -- Skip if another worker is claiming it
  
  IF claimed_job.id IS NOT NULL THEN
    -- Claim the job
    UPDATE tts_jobs
    SET 
      status = 'processing',
      worker_id = worker_id_param,
      started_at = NOW(),
      heartbeat_at = NOW(),
      attempts = attempts + 1,
      updated_at = NOW()
    WHERE id = claimed_job.id;
    
    RETURN QUERY SELECT 
      claimed_job.id,
      claimed_job.work_id,
      claimed_job.payload,
      claimed_job.attempts;
  END IF;
END;
$$;

-- Function to update job progress
CREATE OR REPLACE FUNCTION update_tts_job_progress(
  job_id_param UUID,
  progress_percent_param INTEGER,
  progress_message_param TEXT DEFAULT NULL,
  current_chapter_param INTEGER DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tts_jobs
  SET 
    progress_percent = progress_percent_param,
    progress_message = COALESCE(progress_message_param, progress_message),
    current_chapter = COALESCE(current_chapter_param, current_chapter),
    heartbeat_at = NOW(),
    updated_at = NOW()
  WHERE id = job_id_param;
END;
$$;

-- Function to mark job complete
CREATE OR REPLACE FUNCTION complete_tts_job(
  job_id_param UUID,
  result_param JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tts_jobs
  SET 
    status = 'completed',
    result = result_param,
    progress_percent = 100,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = job_id_param;
END;
$$;

-- Function to mark job failed
CREATE OR REPLACE FUNCTION fail_tts_job(
  job_id_param UUID,
  error_message_param TEXT,
  should_retry BOOLEAN DEFAULT TRUE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_record RECORD;
BEGIN
  SELECT attempts, max_attempts INTO job_record
  FROM tts_jobs
  WHERE id = job_id_param;
  
  IF should_retry AND job_record.attempts < job_record.max_attempts THEN
    -- Retry: move back to pending
    UPDATE tts_jobs
    SET 
      status = 'pending',
      last_error = error_message_param,
      worker_id = NULL,
      heartbeat_at = NULL,
      updated_at = NOW()
    WHERE id = job_id_param;
  ELSE
    -- Max retries reached: mark as failed
    UPDATE tts_jobs
    SET 
      status = 'failed',
      error_message = error_message_param,
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = job_id_param;
  END IF;
END;
$$;

-- Function to detect and reset stuck jobs (run via cron)
CREATE OR REPLACE FUNCTION reset_stuck_tts_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  -- Jobs stuck in processing for > 30 minutes without heartbeat
  UPDATE tts_jobs
  SET 
    status = 'pending',
    worker_id = NULL,
    last_error = 'Job stuck - worker timeout',
    updated_at = NOW()
  WHERE 
    status = 'processing'
    AND heartbeat_at < NOW() - INTERVAL '30 minutes';
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_tts_jobs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_tts_jobs_updated_at
  BEFORE UPDATE ON tts_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_tts_jobs_updated_at();

-- Comments
COMMENT ON TABLE tts_jobs IS 'Job queue for TTS generation - designed for easy migration to Redis/BullMQ';
COMMENT ON COLUMN tts_jobs.priority IS 'Lower number = higher priority. Premium users: 1-3, Free users: 5-10';
COMMENT ON COLUMN tts_jobs.payload IS 'Job-specific data (chapters, voice settings, etc)';
COMMENT ON COLUMN tts_jobs.heartbeat_at IS 'Worker heartbeat timestamp - used to detect stuck jobs';
COMMENT ON FUNCTION claim_next_tts_job IS 'Atomically claims the next pending job for processing';
COMMENT ON FUNCTION reset_stuck_tts_jobs IS 'Resets jobs stuck in processing state - run via cron every 5 minutes';
