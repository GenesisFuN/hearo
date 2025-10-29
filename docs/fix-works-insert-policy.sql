-- Fix: Allow authenticated users to insert works
-- Run this in Supabase SQL Editor

-- Check current policies on works table
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'works'
ORDER BY cmd, policyname;

-- Drop and recreate the INSERT policy for works
DROP POLICY IF EXISTS "Creators can insert own works" ON works;

CREATE POLICY "Creators can insert own works"
ON works FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid());

-- Also check if there's a more permissive policy needed
-- If users should be able to create works without creator_id set initially:
DROP POLICY IF EXISTS "Users can create works" ON works;

CREATE POLICY "Users can create works"
ON works FOR INSERT
TO authenticated
WITH CHECK (true);

-- Verify policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
FROM pg_policies
WHERE tablename = 'works' AND cmd = 'INSERT'
ORDER BY policyname;
