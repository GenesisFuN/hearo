-- Add genre column to works table for categorizing public books
-- Run this in Supabase SQL Editor

-- Add genre column if it doesn't exist
ALTER TABLE works 
ADD COLUMN IF NOT EXISTS genre VARCHAR(50);

-- Add index for faster queries on public books by genre
CREATE INDEX IF NOT EXISTS idx_works_genre ON works(genre) WHERE is_public = true;

-- Verify column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'works' AND column_name = 'genre';
