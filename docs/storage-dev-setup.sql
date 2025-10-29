-- Check Database Tables and Relationships
-- Run this in Supabase SQL Editor to diagnose issues

-- ============================================================
-- Step 1: Check if all required tables exist
-- ============================================================

SELECT 
  tablename,
  schemaname
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'works', 'uploads', 'audio_files')
ORDER BY tablename;

-- ============================================================
-- Step 2: Check foreign key relationships
-- ============================================================

SELECT
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('works', 'uploads', 'audio_files')
ORDER BY tc.table_name;

-- ============================================================
-- Step 3: Check if audio_files table has correct structure
-- ============================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'audio_files'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================
-- Step 4: Check if any data exists
-- ============================================================

SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'works', COUNT(*) FROM works
UNION ALL
SELECT 'uploads', COUNT(*) FROM uploads
UNION ALL
SELECT 'audio_files', COUNT(*) FROM audio_files;

-- ============================================================
-- Step 5: Check RLS policies on audio_files
-- ============================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'audio_files'
ORDER BY cmd;

-- ============================================================
-- Step 6: Test the actual query from the API
-- ============================================================

-- Replace YOUR_USER_ID with an actual user ID from profiles table
-- Get a user ID first:
SELECT id, username, email FROM profiles LIMIT 1;

-- Then test the query (replace the UUID):
/*
SELECT 
  w.id,
  w.title,
  w.description,
  w.cover_image_url,
  w.status,
  w.is_public,
  w.created_at
FROM works w
WHERE w.creator_id = 'YOUR_USER_ID'
ORDER BY w.created_at DESC;
*/

-- ============================================================
-- Step 7: Check if audio_files has proper relationship
-- ============================================================

-- This query checks if the join will work
SELECT 
  w.id as work_id,
  w.title,
  COUNT(af.id) as audio_file_count
FROM works w
LEFT JOIN audio_files af ON af.work_id = w.id
GROUP BY w.id, w.title;
