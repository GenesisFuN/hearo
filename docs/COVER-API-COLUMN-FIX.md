# Cover Images - Final Database Column Fix

## Issue Found

Profile page and Following feed were querying the wrong column name from the database.

## Fixed API Routes

### 1. Profile API - `src/app/api/profile/[username]/route.ts`

**Before:**

```typescript
.select(`
  ...
  cover_image_url,  // ❌ Wrong column name
  ...
`)
```

**After:**

```typescript
.select(`
  ...
  cover_image,      // ✅ Correct column name
  ...
`)
```

### 2. Following Feed API - `src/app/api/feed/following/route.ts`

**Before:**

```typescript
.select(`
  ...
  cover_image_url,  // ❌ Wrong column name
  ...
`)
```

**After:**

```typescript
.select(`
  ...
  cover_image,      // ✅ Correct column name
  ...
`)
```

## Why This Matters

The database column is `cover_image`, not `cover_image_url`. When the API queries for the wrong column:

- Database returns `null` for that field
- API transforms `null` → `coverImage: null`
- UI receives `book.coverImage = null`
- Fallback icon displays instead of cover

## Complete API Status

| API Route                 | Database Query             | Data Transform        | Status            |
| ------------------------- | -------------------------- | --------------------- | ----------------- |
| `/api/books`              | ✅ `cover_image`           | ✅ `work.cover_image` | ✅ Fixed          |
| `/api/public/books`       | ✅ `cover_image`           | ✅ `work.cover_image` | ✅ Fixed          |
| `/api/public/book/[id]`   | ✅ `cover_image`           | ✅ `work.cover_image` | ✅ Fixed          |
| `/api/profile/[username]` | ✅ `cover_image`           | ✅ `work.cover_image` | ✅ **JUST FIXED** |
| `/api/feed/following`     | ✅ `cover_image`           | ✅ `work.cover_image` | ✅ **JUST FIXED** |
| `/api/playlists/[id]`     | ✅ Uses `work.cover_image` | ✅ Direct access      | ✅ Already OK     |

## Testing

**Refresh your browser** and check:

1. Go to your profile page → Should see book covers
2. Go to Library → Following tab → Should see covers from followed users
3. Audio player → Should show cover when playing

---

**Status:** ✅ All API routes now correctly query `cover_image` column  
**Date:** October 19, 2025
