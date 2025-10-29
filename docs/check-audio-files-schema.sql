-- Check if the published book has audio files
SELECT 
  w.id as work_id,
  w.title,
  w.is_public,
  w.status,
  af.id as audio_file_id,
  af.file_path,
  af.file_size_bytes
FROM works w
LEFT JOIN audio_files af ON w.id = af.work_id
WHERE w.id = 'c49c6faa-7241-4f06-9487-61ae8d9f05a2';
