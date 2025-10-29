-- Check if books are properly published in the database
SELECT 
  id,
  title,
  is_public,
  genre,
  status,
  created_at
FROM works
ORDER BY created_at DESC
LIMIT 10;
