-- Add progress_percent column to works table
-- Run this in Supabase SQL Editor

ALTER TABLE works 
ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_works_progress 
ON works(status, progress_percent);

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'works' AND column_name = 'progress_percent';
