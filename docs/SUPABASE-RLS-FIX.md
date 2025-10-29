# Supabase Storage RLS Fix ✅

## Problem

When uploading files, you got this error:

```
Upload failed: 500 - Failed to upload file: new row violates row-level security policy
```

## Root Cause

The upload route was using an **unauthenticated** Supabase client created at the module level:

```typescript
// ❌ WRONG - Module-level client without authentication
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

This meant that even though we were verifying the user's token, the Supabase Storage API calls were being made **without authentication**, so the RLS policies rejected them.

## Solution

Create an **authenticated Supabase client for each request** with the user's token:

```typescript
// ✅ CORRECT - Per-request authenticated client
const token = authorization.replace("Bearer ", "");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  }
);
```

## Changes Made

### 1. Removed Module-Level Supabase Client

**File:** `src/app/api/upload/text/route.ts`

- Removed the global `supabase` constant
- Now creates authenticated client per request

### 2. Updated POST Function

```typescript
export async function POST(request: NextRequest) {
  // Get auth token from header
  const token = authorization.replace("Bearer ", "");

  // Create authenticated client with token
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  // All Supabase calls now use authenticated client
  await supabase.storage.from("text-uploads").upload(...);
}
```

### 3. Updated processWithElevenLabs Function

Added `supabaseClient` parameter to accept authenticated client:

```typescript
async function processWithElevenLabs(
  textFilePath: string,
  originalFilename: string,
  aiSettings: any,
  bookId: string,
  subscription?: UserSubscription,
  userId?: string,
  workId?: string,
  textContentParam?: string,
  supabaseClient?: any // NEW PARAMETER
) {
  // Use provided client or create service role client
  const supabase = supabaseClient || createClient(...);

  // Download from storage
  await supabase.storage.from("text-uploads").download(...);

  // Upload audio
  await supabase.storage.from("audiobooks").upload(...);
}
```

### 4. Updated checkForDuplicateContent Function

Added `supabaseClient` parameter:

```typescript
async function checkForDuplicateContent(
  newContent: string,
  userId: string,
  supabaseClient: any // NEW PARAMETER
) {
  const { data: existingWorks } = await supabaseClient
    .from("works")
    .select("id, title")
    .eq("creator_id", userId);
}
```

## Why This Fixes the RLS Error

### Before (❌ Failed):

```
User → Frontend → API Route → Supabase Storage
                      ↓
                (unauthenticated client)
                      ↓
              RLS Policy: ❌ REJECT
              "No user ID to check against!"
```

### After (✅ Works):

```
User → Frontend → API Route → Supabase Storage
                      ↓
            (authenticated client with token)
                      ↓
              RLS Policy: ✅ ALLOW
              "User ID matches folder name!"
```

## How RLS Policies Work Now

The storage policies check that the folder name matches the authenticated user ID:

```sql
-- Storage policy
CREATE POLICY "text_uploads_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'text-uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

When you upload with path `{user-id}/filename.txt`:

1. ✅ Client is authenticated with user's token
2. ✅ RLS policy checks: `auth.uid()` = extracted user ID from path
3. ✅ Match! Upload allowed

## Testing the Fix

### 1. Try uploading a file again:

```bash
1. Go to http://localhost:3000/studio
2. Click "Upload" tab
3. Select a .txt file
4. Click "Upload"
```

### 2. Check for success:

```bash
# Should see success message
✅ File uploaded successfully, AI processing started

# Check browser console
✓ No RLS errors
✓ Upload successful
```

### 3. Verify in Supabase Dashboard:

```bash
# Go to Storage → text-uploads bucket
# Should see: your-user-id/timestamp-filename.txt
```

## Additional Notes

### Service Role Key (Optional)

For background processing, you may want to add a service role key to `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

This bypasses RLS for server-side operations (like audio generation) that run after the user's session might expire.

Get it from: Supabase Dashboard → Settings → API → `service_role` key

**⚠️ IMPORTANT:** Never expose this key to the frontend! Only use in API routes.

### Why Per-Request Clients?

- ✅ Each user gets their own authenticated session
- ✅ RLS policies work correctly
- ✅ No cross-user data leakage
- ✅ Secure by design

---

**Ready to test!** Upload a file and it should work now! 🚀
