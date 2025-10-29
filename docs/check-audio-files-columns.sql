-- Get the full column details including nullable
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'audio_files'
ORDER BY ordinal_position;
