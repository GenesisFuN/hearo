# Fix: Books Not Appearing in Community/Discover

## 🐛 Problem

**Symptom:**

- Book shows "Book already published" in console
- Book has `is_public = true` in database
- But book doesn't appear in `/public/books` or `/discover` pages

**Root Cause:**
The publish/unpublish endpoints were still using the **old local file system** (`registry.json`) instead of updating the Supabase database.

---

## ✅ Solution Applied

### 1. Fixed `/api/books/publish/route.ts`

**Before (Broken):**

```typescript
// Old code wrote to local registry.json file
const registry = JSON.parse(await readFile("registry.json"));
registry.push(publishedBook);
await writeFile("registry.json", JSON.stringify(registry));
```

**After (Fixed):**

```typescript
// Now updates Supabase database
await supabase
  .from("works")
  .update({
    is_public: true,
    genre: genre,
  })
  .eq("id", bookId);
```

**What It Does Now:**

1. ✅ Verifies book exists and user owns it
2. ✅ Checks if book status is `'published'` (audio generation complete)
3. ✅ Sets `is_public = true` in database
4. ✅ Sets `genre` field for categorization
5. ✅ Returns share URL: `/public/book/{bookId}`

### 2. Fixed `/api/books/unpublish/route.ts`

**Before (Broken):**

```typescript
// Old code removed from registry.json
const registry = JSON.parse(await readFile("registry.json"));
registry.splice(bookIndex, 1);
await writeFile("registry.json", JSON.stringify(registry));
```

**After (Fixed):**

```typescript
// Now updates Supabase database
await supabase.from("works").update({ is_public: false }).eq("id", bookId);
```

**What It Does Now:**

1. ✅ Verifies book exists and user owns it
2. ✅ Sets `is_public = false` in database
3. ✅ Removes book from community/discover pages

### 3. Added Genre Column

Created SQL migration: `docs/add-genre-column.sql`

```sql
ALTER TABLE works
ADD COLUMN IF NOT EXISTS genre VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_works_genre
ON works(genre) WHERE is_public = true;
```

**Run this in Supabase SQL Editor before publishing books.**

---

## 🔄 How It Works Now

### Publishing Flow:

1. **User clicks "Share" button**
2. **Genre dialog opens** → User selects genre (Fantasy, Sci-fi, etc.)
3. **POST /api/books/publish** with `{ bookId, genre }`
4. **Backend validates:**
   - Book exists
   - User owns book
   - Book status is `'published'` (has audio)
5. **Backend updates database:**
   ```sql
   UPDATE works
   SET is_public = true, genre = 'Fantasy'
   WHERE id = bookId AND creator_id = userId;
   ```
6. **Book appears in community pages** because:
   - `/api/public/books` queries: `WHERE is_public = true AND status = 'published'`
   - Both conditions are now met!

### Unpublishing Flow:

1. **User clicks "Unshare" button**
2. **POST /api/books/unpublish** with `{ bookId }`
3. **Backend updates:**
   ```sql
   UPDATE works
   SET is_public = false
   WHERE id = bookId AND creator_id = userId;
   ```
4. **Book removed from community pages**

---

## 📁 Files Changed

### API Routes (Fixed)

- ✅ `src/app/api/books/publish/route.ts` - Now uses Supabase database
- ✅ `src/app/api/books/unpublish/route.ts` - Now uses Supabase database

### Database Migrations (New)

- ✅ `docs/add-genre-column.sql` - Adds genre column to works table

### No Changes Needed

- ✅ `src/components/BookLibrary.tsx` - Already working correctly
- ✅ `src/app/api/public/books/route.ts` - Already queries database correctly
- ✅ `public/books/registry.json` - Can remain empty forever

---

## 🚀 Setup Steps

### 1. Run SQL Migration

In **Supabase SQL Editor**, run:

```sql
-- From docs/add-genre-column.sql
ALTER TABLE works
ADD COLUMN IF NOT EXISTS genre VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_works_genre
ON works(genre) WHERE is_public = true;
```

### 2. Test Publishing

1. **Upload a book** (or use existing published book)
2. **Click "Share" button**
3. **Select genre** (e.g., "Fantasy")
4. **Check console:** Should say "Book published successfully"
5. **Go to `/public/books`** → Book should appear!

### 3. Verify Database

In Supabase dashboard:

```sql
-- Check public books
SELECT id, title, is_public, status, genre
FROM works
WHERE is_public = true;

-- Should show your published book with genre
```

---

## 🧪 Testing Checklist

- [ ] Run `add-genre-column.sql` in Supabase
- [ ] Publish a book with genre "Fantasy"
- [ ] Check `/public/books` - Book appears ✓
- [ ] Check `/discover` - Book appears ✓
- [ ] Click "Unshare" button
- [ ] Book disappears from public pages ✓
- [ ] Publish again - Works correctly ✓

---

## 🔍 Debugging

### If book still doesn't appear:

1. **Check database:**

   ```sql
   SELECT id, title, is_public, status, genre
   FROM works
   WHERE id = 'YOUR_BOOK_ID';
   ```

   Should show:
   - `is_public: true`
   - `status: 'published'`
   - `genre: 'Fantasy'` (or other genre)

2. **Check API response:**

   ```bash
   curl http://localhost:3000/api/public/books
   ```

   Should return array with your book.

3. **Check browser console:**
   - Look for errors in Network tab
   - Check if `/api/public/books` returns data

### Common Issues:

**"Book must be fully processed"**

- Book status is not `'published'`
- Audio generation may have failed
- Check `progress_percent` should be 100

**"Book not found"**

- `bookId` incorrect
- Book belongs to different user
- Check `creator_id` matches your user ID

**Book appears but no audio**

- Check `audio_files` table has record
- Verify `file_path` is correct
- Check Supabase Storage for MP3 file

---

## 📊 What Changed vs Old System

### Old (Local Files):

```
Publish → Write to registry.json
Query → Read from registry.json
Unpublish → Remove from registry.json
```

**Problems:**

- ❌ Separate from main database
- ❌ No integration with engagement system
- ❌ Lost on deployment
- ❌ Race conditions

### New (Database):

```
Publish → UPDATE works SET is_public = true
Query → SELECT * FROM works WHERE is_public = true
Unpublish → UPDATE works SET is_public = false
```

**Benefits:**

- ✅ Single source of truth
- ✅ Integrated with likes/ratings/views
- ✅ Persistent across deployments
- ✅ Thread-safe
- ✅ RLS security

---

## 🎯 Result

**Now when you publish a book:**

1. ✅ Database updated: `is_public = true`, `genre` set
2. ✅ Appears in `/public/books` immediately
3. ✅ Appears in `/discover` page
4. ✅ Has engagement features (likes, ratings, views)
5. ✅ Share URL works: `/public/book/{bookId}`
6. ✅ Can unpublish to make private again

**The old local registry.json system is completely removed!** 🎉

---

## 📝 Summary

**Problem:** Publish endpoint wrote to local file instead of database

**Solution:** Rewrote publish/unpublish to update Supabase `works` table

**Setup Required:**

1. Run SQL migration to add `genre` column
2. That's it!

**Test:** Publish a book → Should appear in community pages ✓

Your books will now properly appear in Community/Discover! 📚✨
