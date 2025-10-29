-- Fix: Allow public viewing of comments
-- Run this in Supabase SQL Editor

-- Drop the existing policy
DROP POLICY IF EXISTS "Anyone can view comments" ON book_comments;

-- Create new policy that allows both authenticated and anonymous users to view comments
CREATE POLICY "Anyone can view comments on public books"
ON book_comments FOR SELECT
USING (
  work_id IN (
    SELECT id FROM works WHERE is_public = true
  )
);

-- Verify the policy was created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
FROM pg_policies
WHERE tablename = 'book_comments'
ORDER BY policyname;
