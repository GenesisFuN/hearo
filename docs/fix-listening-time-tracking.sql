-- Fix Listening Time Tracking
-- This separates "actual listening time" from "progress position"
-- to prevent skips from inflating stats

-- Add new column to track actual listening time (not position)
ALTER TABLE playback_sessions 
ADD COLUMN IF NOT EXISTS actual_listening_seconds INTEGER DEFAULT 0;

-- Add comment to clarify the difference
COMMENT ON COLUMN playback_sessions.progress_seconds IS 'Current position in the audiobook (can skip)';
COMMENT ON COLUMN playback_sessions.actual_listening_seconds IS 'Actual time spent listening (cannot be gamed by skipping)';
COMMENT ON COLUMN playback_sessions.session_start IS 'When this listening session started';
COMMENT ON COLUMN playback_sessions.session_end IS 'When this listening session ended';

-- Create function to atomically increment listening time
CREATE OR REPLACE FUNCTION increment_listening_time(
  session_id UUID,
  seconds_to_add INTEGER,
  new_progress INTEGER,
  new_duration INTEGER,
  new_percentage DECIMAL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE playback_sessions
  SET 
    actual_listening_seconds = COALESCE(actual_listening_seconds, 0) + seconds_to_add,
    progress_seconds = new_progress,
    duration_seconds = new_duration,
    completion_percentage = new_percentage,
    session_end = NOW(),
    updated_at = NOW()
  WHERE id = session_id;
END;
$$;

-- Migrate existing data: Use time-based calculation for existing sessions
-- For sessions with session_start and session_end, calculate actual time
UPDATE playback_sessions
SET actual_listening_seconds = GREATEST(
  0,
  LEAST(
    EXTRACT(EPOCH FROM (COALESCE(session_end, NOW()) - session_start))::INTEGER,
    progress_seconds
  )
)
WHERE actual_listening_seconds = 0;

-- Note: This migration assumes existing sessions are legitimate
-- Future tracking will prevent skip-based inflation
