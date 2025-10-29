-- Quick check: Verify RLS policies are working correctly
-- Run these queries in Supabase SQL Editor to test

-- 1. Check all works in the database
SELECT 
  id,
  title,
  creator_id,
  is_public,
  created_at
FROM works
ORDER BY created_at DESC;

-- 2. Check which user created which works
SELECT 
  w.id,
  w.title,
  p.username as creator,
  p.email,
  w.is_public,
  w.created_at
FROM works w
JOIN profiles p ON w.creator_id = p.id
ORDER BY w.created_at DESC;

-- 3. Verify RLS policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'works'
ORDER BY cmd;
