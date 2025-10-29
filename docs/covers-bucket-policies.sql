-- Storage policies for the 'covers' bucket
-- Run this in Supabase SQL Editor

-- IMPORTANT: First, drop the old incorrect policies if they exist
DROP POLICY IF EXISTS "Users can upload their own book covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own book covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own book covers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view cover images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload covers for their books" ON storage.objects;
DROP POLICY IF EXISTS "Users can update covers for their books" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete covers for their books" ON storage.objects;
DROP POLICY IF EXISTS "Public can view cover images" ON storage.objects;

-- Policy 1: Allow authenticated users to upload covers for their own books
-- Filename format: {book_id}_{timestamp}.jpg (underscore separates UUID from timestamp)
CREATE POLICY "Users can upload covers for their books"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'covers' AND
  (
    -- Extract book ID from filename (before the underscore)
    SELECT creator_id FROM works 
    WHERE id::text = split_part(name, '_', 1)
  ) = auth.uid()
);

-- Policy 2: Allow authenticated users to update covers for their own books
CREATE POLICY "Users can update covers for their books"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'covers' AND
  (
    SELECT creator_id FROM works 
    WHERE id::text = split_part(name, '_', 1)
  ) = auth.uid()
);

-- Policy 3: Allow authenticated users to delete covers for their own books
CREATE POLICY "Users can delete covers for their books"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'covers' AND
  (
    SELECT creator_id FROM works 
    WHERE id::text = split_part(name, '_', 1)
  ) = auth.uid()
);

-- Policy 4: Allow anyone to view/download cover images (public read)
CREATE POLICY "Public can view cover images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'covers');
