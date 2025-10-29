# Supabase Storage Setup Guide

## Step 1: Create Storage Buckets in Supabase Dashboard

1. **Go to Supabase Dashboard** → Your Project → **Storage**
2. **Click "Create a new bucket"**

Create these 3 buckets:

### Bucket 1: `audiobooks`

- **Name:** `audiobooks`
- **Public:** ✅ Yes (for streaming audio)
- **File size limit:** 50 MB
- **Allowed MIME types:** audio/mpeg, audio/mp3, audio/wav

### Bucket 2: `text-uploads`

- **Name:** `text-uploads`
- **Public:** ❌ No (private text files)
- **File size limit:** 10 MB
- **Allowed MIME types:** text/plain, application/pdf, text/markdown

### Bucket 3: `covers`

- **Name:** `covers`
- **Public:** ✅ Yes (for cover images)
- **File size limit:** 5 MB
- **Allowed MIME types:** image/jpeg, image/png, image/webp

## Step 2: Configure Storage Policies

**IMPORTANT:** Don't run SQL for storage policies! Use the Supabase Dashboard instead.

### Option A: Use the Dashboard (RECOMMENDED)

For each bucket, go to **Storage → [bucket name] → Policies**:

#### For `audiobooks` bucket:

1. Click **"New Policy"**
2. Choose **"Custom"** or use templates:
   - ✅ **INSERT**: Allow authenticated users, add check: `(storage.foldername(name))[1] = auth.uid()::text`
   - ✅ **SELECT**: Allow public (for streaming)
   - ✅ **UPDATE**: Allow authenticated users who own the file
   - ✅ **DELETE**: Allow authenticated users who own the file

#### For `text-uploads` bucket:

1. Click **"New Policy"**
2. Similar to above, but **SELECT** is authenticated only (not public)

#### For `covers` bucket:

1. Click **"New Policy"**
2. Similar to audiobooks (public SELECT for viewing covers)

### Option B: Use SQL (ALTERNATIVE)

If you prefer SQL, enable RLS first, then create policies:

```sql
-- Step 1: Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 2: Create policies for audiobooks bucket
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

-- Step 3: Create policies for text-uploads bucket
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

-- Step 4: Create policies for covers bucket
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
```

## Step 3: Verify Buckets are Created

Run this in Supabase SQL Editor to check:

```sql
-- Check all buckets
SELECT id, name, public FROM storage.buckets;

-- Check policies
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
```

You should see:

- 3 buckets: `audiobooks`, `text-uploads`, `covers`
- 12 policies (4 per bucket: INSERT, SELECT, UPDATE, DELETE)

## Step 4: Test Upload from Supabase Dashboard

1. Go to **Storage** → **audiobooks** bucket
2. Click **Upload file**
3. Try uploading a test file
4. Should work! ✅

## Step 5: Your Storage URLs

```
Text uploads: https://wrsvzwgexjsdkpjfyokh.supabase.co/storage/v1/object/text-uploads/
Audiobooks:   https://wrsvzwgexjsdkpjfyokh.supabase.co/storage/v1/object/public/audiobooks/
Covers:       https://wrsvzwgexjsdkpjfyokh.supabase.co/storage/v1/object/public/covers/
```

## File Structure in Supabase Storage

Files will be organized by user ID:

```
audiobooks/
  ├── [user-id-1]/
  │   ├── 1234567890-story.mp3
  │   └── 1234567891-novel.mp3
  └── [user-id-2]/
      └── 1234567892-book.mp3

text-uploads/
  ├── [user-id-1]/
  │   ├── 1234567890-story.txt
  │   └── 1234567891-novel.txt
  └── [user-id-2]/
      └── 1234567892-book.txt
```

## Why This Structure?

- ✅ **User isolation:** Each user has their own folder
- ✅ **RLS enforcement:** Storage policies check folder matches user ID
- ✅ **Easy cleanup:** Delete user folder when user deletes account
- ✅ **CDN delivery:** Supabase handles caching and delivery

## Next Steps

After setting up buckets:

1. ✅ Create 3 buckets in Supabase Dashboard
2. ✅ Run the SQL policies above
3. ✅ Code will be updated to use Supabase Storage
4. ✅ Test uploading a file

---

**Ready?** Create the 3 buckets, run the policies, then let me know!
