# Book Cover Upload - Complete Fix

## Summary

Fixed two issues preventing cover image uploads:

1. ✅ Wrong storage bucket (was: `audio-files`, now: `covers`)
2. ✅ Incorrect RLS policies (now checks book ownership properly)

---

## Problem 1: Wrong Bucket

### The Issue

Code tried to upload to `audio-files` bucket, but you have a dedicated `covers` bucket.

### The Fix

Changed `EditBookModal.tsx`:

```typescript
// Before
await supabase.storage.from("audio-files").upload(...)  ❌

// After
await supabase.storage.from("covers").upload(...)  ✅
```

---

## Problem 2: Broken Storage Policies

### Why Old Policies Failed

**Old policy:**

```sql
(storage.foldername(name))[1] = (auth.uid())::text
```

**Filename structure:**

```
33047dce-7881-492a-9860-bfb05bae19d5-1729363200000.jpg
└────────────book_id──────────────┘└──timestamp──┘
```

**Problems:**

1. No folders (files at root) → `foldername()` returns `null`
2. Filename starts with `book_id`, not `user_id`
3. Policy checked: `null == user_id` → ❌ Always fails

### New Policy Solution

**Changed filename format** to use underscore separator:

```typescript
// EditBookModal.tsx
const fileName = `${book.id}_${Date.now()}.${fileExt}`;
//                              ^ underscore instead of dash
```

**New filename structure:**

```
33047dce-7881-492a-9860-bfb05bae19d5_1729363200000.jpg
└────────────book_id──────────────┘^└──timestamp──┘
                          underscore separator
```

**New policies** check book ownership:

```sql
-- Extract book ID from filename
split_part(name, '_', 1)  → '33047dce-7881-492a-9860-bfb05bae19d5'

-- Look up who owns this book
SELECT creator_id FROM works WHERE id::text = split_part(name, '_', 1)

-- Check if current user owns it
... = auth.uid()  → ✅ Correctly validates ownership
```

---

## Required SQL Migrations

### 1. Add cover_image column

📄 **File:** `docs/add-cover-image-column.sql`

```sql
ALTER TABLE works ADD COLUMN IF NOT EXISTS cover_image TEXT;
CREATE INDEX IF NOT EXISTS idx_works_cover_image ON works(cover_image)
  WHERE cover_image IS NOT NULL;
```

### 2. Fix storage policies

📄 **File:** `docs/covers-bucket-policies.sql`

This will:

- Drop old broken policies
- Create new policies that check book ownership
- Allow public read access for displaying covers

**Policies created:**

1. ✅ Users can upload covers for **their own books**
2. ✅ Users can update covers for **their own books**
3. ✅ Users can delete covers for **their own books**
4. ✅ Anyone can view all covers (public read)

---

## Files Modified

### Code Changes

- ✅ `src/components/EditBookModal.tsx`
  - Changed bucket: `audio-files` → `covers`
  - Changed filename: `{id}-{time}` → `{id}_{time}` (underscore)

### Documentation

- ✅ `docs/covers-bucket-policies.sql` - NEW fixed policies
- ✅ `docs/BOOK-EDITING-SETUP.md` - Updated instructions
- ✅ `docs/COVER-UPLOAD-FIX.md` - This document

---

## Testing Checklist

After running both SQL migrations:

### Upload Test

1. Go to Studio → My Books
2. Click edit (pencil icon) on any book
3. Click "Change Cover" and select an image (< 5MB, JPG/PNG)
4. Should upload successfully ✅
5. Cover preview should appear in modal ✅

### Permissions Test

1. Try to upload cover for **your own book** → Should work ✅
2. Try to edit/delete your own cover → Should work ✅
3. Cover should be visible publicly on book cards ✅

### Error Scenarios

- Upload file > 5MB → Should show error ❌
- Upload non-image file → Should show error ❌
- Try to edit someone else's book → Should fail ❌

---

## How It Works Now

### Filename Format

```
{book_uuid}_{timestamp}.{ext}

Example:
33047dce-7881-492a-9860-bfb05bae19d5_1729363200000.jpg
```

### Policy Flow

```
1. User uploads cover for book X
2. Policy extracts book_id from filename: split_part(name, '_', 1)
3. Policy queries: SELECT creator_id FROM works WHERE id = book_id
4. Policy checks: creator_id == current_user_id?
5. If yes → ✅ Allow upload
6. If no → ❌ Deny upload
```

### Storage Structure

```
covers/
├── book-uuid-1_1729363200000.jpg  ← User A's book
├── book-uuid-2_1729363300000.jpg  ← User B's book
└── book-uuid-3_1729363400000.jpg  ← User A's book

Ownership verified via works table, not filename!
```

---

## Before/After Comparison

### Before

- ❌ Wrong bucket (`audio-files`)
- ❌ Policy checked `foldername` (doesn't exist)
- ❌ Policy checked user ID (filename has book ID)
- ❌ Uploads always failed

### After

- ✅ Correct bucket (`covers`)
- ✅ Policy extracts book ID from filename
- ✅ Policy checks book ownership in database
- ✅ Uploads work for book owners only

---

**Status**: ✅ Complete - Ready to test after running SQL migrations  
**Date**: October 19, 2025
