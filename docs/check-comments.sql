-- Check if comments exist in the database
-- Run this in Supabase SQL Editor

-- 1. Check all comments
SELECT 
  id,
  user_id,
  work_id,
  comment_text,
  parent_comment_id,
  created_at
FROM book_comments
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check specific work
SELECT 
  id,
  user_id,
  work_id,
  comment_text,
  created_at
FROM book_comments
WHERE work_id = 'c49c6faa-7241-4f06-9487-61ae8d9f05a2';

-- 3. Check if the work exists
SELECT 
  id,
  title,
  is_public,
  comments_count
FROM works
WHERE id = 'c49c6faa-7241-4f06-9487-61ae8d9f05a2';

-- 4. Check comment counts
SELECT 
  w.id,
  w.title,
  w.comments_count as count_column,
  COUNT(c.id) as actual_count
FROM works w
LEFT JOIN book_comments c ON c.work_id = w.id
WHERE w.id = 'c49c6faa-7241-4f06-9487-61ae8d9f05a2'
GROUP BY w.id, w.title, w.comments_count;
