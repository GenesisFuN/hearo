-- STEP 1: Remove any existing storage policies
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow all uploads for development" ON storage.objects;
DROP POLICY IF EXISTS "Allow all reads for development" ON storage.objects;
DROP POLICY IF EXISTS "Allow all updates for development" ON storage.objects;
DROP POLICY IF EXISTS "Allow all deletes for development" ON storage.objects;

-- STEP 2: Create permissive policies for development (no authentication required)
CREATE POLICY "Allow all uploads for development" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'audiobooks');

CREATE POLICY "Allow all reads for development" ON storage.objects
FOR SELECT USING (bucket_id = 'audiobooks');

CREATE POLICY "Allow all updates for development" ON storage.objects
FOR UPDATE USING (bucket_id = 'audiobooks');

CREATE POLICY "Allow all deletes for development" ON storage.objects
FOR DELETE USING (bucket_id = 'audiobooks');