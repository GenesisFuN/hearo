-- Delete old locally-uploaded public books (before Supabase integration)
-- Run this in Supabase SQL Editor

-- Step 1: Identify old local books (uploaded before Supabase migration)
-- These are books with is_public=true AND storage_bucket IS NULL or storage_path points to local files
SELECT 
  w.id,
  w.title,
  w.creator_id,
  w.status,
  w.is_public,
  w.created_at,
  af.storage_bucket,
  af.storage_path,
  af.file_path
FROM works w
LEFT JOIN audio_files af ON af.work_id = w.id
WHERE w.is_public = true
ORDER BY w.created_at DESC;

-- Step 2: Check for books with NULL storage_bucket (old local uploads)
SELECT 
  w.id,
  w.title,
  w.is_public,
  af.filename,
  af.storage_bucket,
  af.file_path
FROM works w
LEFT JOIN audio_files af ON af.work_id = w.id
WHERE w.is_public = true 
  AND (af.storage_bucket IS NULL OR af.storage_bucket = '');

-- Step 3: DELETE old local books (Execute after reviewing above)
-- This removes books that don't have proper Supabase storage

-- Delete audio_files records for old local books
DELETE FROM audio_files 
WHERE work_id IN (
  SELECT id FROM works 
  WHERE is_public = true
) AND (storage_bucket IS NULL OR storage_bucket = '');

-- Delete works that are public AND either have no audio files or only had local audio files
DELETE FROM works 
WHERE is_public = true
  AND id NOT IN (
    SELECT DISTINCT work_id 
    FROM audio_files 
    WHERE storage_bucket IS NOT NULL 
      AND storage_bucket != ''
  );

-- Step 4: Verify deletion
SELECT COUNT(*) as remaining_public_books FROM works WHERE is_public = true;
SELECT COUNT(*) as total_books FROM works;

-- Note: This only deletes database records. 
-- Since these were local files, they're already gone from the local filesystem.
-- Any orphaned Supabase storage files can be cleaned up from the Dashboard if needed.
