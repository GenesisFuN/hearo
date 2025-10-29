# Fix: Users Seeing Other Users' Books

## Problem

Both users can see the same books in "My Books" because the `/api/books` route reads from the **file system** instead of the **database**.

## Root Cause

The current `src/app/api/books/route.ts` does:

```typescript
// WRONG: Reads from uploads/ directory
const textFiles = await readdir(textDir);
```

This lists ALL files on disk, regardless of who created them.

## Solution

Update the route to query the **database** instead, which has proper RLS (Row Level Security).

### Quick Fix: Replace the API route

I've created a new version at: `src/app/api/books/route-database.ts`

**To fix:**

1. Delete the old `src/app/api/books/route.ts`
2. Rename `route-database.ts` to `route.ts`

Or just replace the entire content of `route.ts` with the content from `route-database.ts`.

The new version:

- ✅ Authenticates the user
- ✅ Queries the `works` table from Supabase
- ✅ Filters by `creator_id = user.id`
- ✅ RLS policies automatically enforce user isolation

## Why This Fixes It

**File system** = No ownership concept, everyone sees all files
**Database** = `creator_id` field + RLS policies = proper user isolation

The RLS policies ensure:

- User A only sees works where `creator_id = User A's ID`
- User B only sees works where `creator_id = User B's ID`
- No cross-contamination

## Testing

1. Replace the route file
2. Sign in as User 1 - should only see their books
3. Sign in as User 2 - should only see their books

**Note:** This assumes books have been saved to the database with the correct `creator_id`. If books only exist as files on disk, you'll need to upload them again through the UI so they get saved to the database properly.
