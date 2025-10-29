-- Fix the ambiguous column reference in claim_next_tts_job function

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
  SELECT 
    tts_jobs.id,
    tts_jobs.work_id,
    tts_jobs.payload,
    tts_jobs.attempts
  INTO claimed_job
  FROM tts_jobs
  WHERE tts_jobs.status = 'pending'
  ORDER BY tts_jobs.priority ASC, tts_jobs.created_at ASC
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
      attempts = tts_jobs.attempts + 1,
      updated_at = NOW()
    WHERE tts_jobs.id = claimed_job.id;
    
    RETURN QUERY SELECT 
      claimed_job.id,
      claimed_job.work_id,
      claimed_job.payload,
      claimed_job.attempts;
  END IF;
END;
$$;
