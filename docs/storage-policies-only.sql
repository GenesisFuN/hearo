-- ============================================================
-- SUPABASE STORAGE POLICIES
-- Run this in Supabase SQL Editor AFTER creating the 3 buckets
-- ============================================================

-- NOTE: RLS is already enabled on storage.objects by default in Supabase
-- Skip the ALTER TABLE command - it's already done!

-- ============================================================
-- AUDIOBOOKS BUCKET POLICIES (public bucket for streaming)
-- ============================================================

CREATE POLICY "audiobooks_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audiobooks' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "audiobooks_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'audiobooks');

CREATE POLICY "audiobooks_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'audiobooks' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "audiobooks_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'audiobooks' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- TEXT-UPLOADS BUCKET POLICIES (private bucket)
-- ============================================================

CREATE POLICY "text_uploads_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'text-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "text_uploads_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'text-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "text_uploads_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'text-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "text_uploads_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'text-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- COVERS BUCKET POLICIES (public bucket for images)
-- ============================================================

CREATE POLICY "covers_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "covers_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'covers');

CREATE POLICY "covers_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "covers_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check all buckets exist
SELECT id, name, public FROM storage.buckets;

-- Check all policies were created
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

-- You should see 12 policies (4 per bucket)
