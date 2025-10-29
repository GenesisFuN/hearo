-- Development Storage Access Policies
-- Run this in Supabase SQL Editor to enable storage access

-- ============================================================
-- STORAGE BUCKET SETUP
-- ============================================================

-- Note: Buckets need to be created in the Supabase Dashboard first!
-- Go to: Storage → Create Buckets:
-- 1. "audiobooks" bucket (for audio files)
-- 2. "covers" bucket (for cover images)
-- 3. "voices" bucket (for voice samples)

-- Then run these policies:

-- ============================================================
-- STORAGE POLICIES FOR DEVELOPMENT
-- ============================================================

-- Allow authenticated users to upload audio files
CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audiobooks');

-- Allow authenticated users to read their own audio files
CREATE POLICY "Users can read own audio"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'audiobooks' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to published audio (optional)
CREATE POLICY "Public can read published audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audiobooks');

-- Allow users to update their own files
CREATE POLICY "Users can update own audio"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'audiobooks' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own audio"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audiobooks' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- COVER IMAGES POLICIES
-- ============================================================

CREATE POLICY "Authenticated users can upload covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'covers');

CREATE POLICY "Public can read covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'covers');

CREATE POLICY "Users can update own covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- VOICE SAMPLES POLICIES
-- ============================================================

CREATE POLICY "Authenticated users can upload voices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'voices');

CREATE POLICY "Users can read own voices"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'voices' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own voices"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'voices' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own voices"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'voices' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- VERIFY POLICIES
-- ============================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'objects'
ORDER BY policyname;

-- ============================================================
-- NOTES
-- ============================================================

/*
IMPORTANT: For local file storage (current setup):
- The code currently saves files to uploads/ directory on disk
- Storage policies above are for when you migrate to Supabase Storage
- For now, RLS policies on works/audio_files/uploads tables are sufficient

Current Setup:
✅ Files saved to: /uploads/text/ and /uploads/audio/
✅ Database tracks: works, uploads, audio_files tables
✅ RLS ensures: Users only see their own works

Future Migration to Supabase Storage:
1. Create buckets in Supabase Dashboard
2. Run storage policies above
3. Update upload routes to use supabase.storage.from('bucket').upload()
4. Update file URLs to use Supabase CDN URLs
*/
