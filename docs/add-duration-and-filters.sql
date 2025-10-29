-- Add duration tracking and enhanced filtering columns to works table
-- Run this migration to support advanced search filters

-- 1. Add duration_seconds column to track total audiobook length
ALTER TABLE works 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;

-- 2. Add tags column for custom keywords (e.g., "beginner-friendly", "fast-paced")
ALTER TABLE works 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 3. Add content_tags column for content ratings (e.g., "family-friendly", "mature")
ALTER TABLE works 
ADD COLUMN IF NOT EXISTS content_tags TEXT[] DEFAULT '{}';

-- 4. Create index on tags for faster searches
CREATE INDEX IF NOT EXISTS idx_works_tags ON works USING GIN (tags);

-- 5. Create index on content_tags for filtering
CREATE INDEX IF NOT EXISTS idx_works_content_tags ON works USING GIN (content_tags);

-- 6. Create index on duration for range queries
CREATE INDEX IF NOT EXISTS idx_works_duration ON works (duration_seconds) WHERE duration_seconds > 0;

-- 7. Create index on genre for faster filtering
CREATE INDEX IF NOT EXISTS idx_works_genre ON works (genre);

-- 8. Create index on published_at for date range queries
CREATE INDEX IF NOT EXISTS idx_works_published_at ON works (published_at) WHERE published_at IS NOT NULL;

-- Backfill duration for existing works based on audio_files
-- This calculates total duration from all audio file chunks
UPDATE works w
SET duration_seconds = (
  SELECT COALESCE(SUM(af.duration_seconds), 0)
  FROM audio_files af
  WHERE af.work_id = w.id
)
WHERE duration_seconds = 0 
  AND EXISTS (SELECT 1 FROM audio_files WHERE work_id = w.id);

-- Create helper function to get duration category
CREATE OR REPLACE FUNCTION get_duration_category(seconds INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF seconds < 7200 THEN
    RETURN 'short';  -- Under 2 hours
  ELSIF seconds < 18000 THEN
    RETURN 'medium'; -- 2-5 hours
  ELSE
    RETURN 'long';   -- Over 5 hours
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON COLUMN works.duration_seconds IS 'Total audiobook duration in seconds';
COMMENT ON COLUMN works.tags IS 'Custom tags/keywords for searchability (e.g., beginner-friendly, fast-paced)';
COMMENT ON COLUMN works.content_tags IS 'Content rating tags (e.g., family-friendly, mature, educational)';
