# Supabase Singleton Client - Fixed

## Problem

The application was creating multiple Supabase client instances throughout the codebase, causing this warning:

```
Multiple GoTrueClient instances detected in the same browser context.
It is not an error, but this should be avoided as it may produce
undefined behavior when used concurrently under the same storage key.
```

### Where It Was Happening

Every time these functions were called, a new client was created:

- `saveProgress()` in `progress.ts` - 3 instances (save/get/clear)
- `trackEvent()` in `analytics.ts` - 1 instance
- Every analytics tracking call
- Every progress save (every 10 seconds!)

This resulted in **dozens of client instances** being created during a typical listening session.

## Solution

Use the existing singleton Supabase client from `src/lib/supabase.ts` across the entire application.

### Changes Made

#### 1. `src/lib/progress.ts`

**Before:**

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function saveProgress(...) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey); // ❌ New instance
  // ...
}
```

**After:**

```typescript
import { supabase } from "./supabase"; // ✅ Use singleton

export async function saveProgress(...) {
  const { data: { session } } = await supabase.auth.getSession();
  // ...
}
```

#### 2. `src/lib/analytics.ts`

**Before:**

```typescript
export async function trackEvent(...) {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ); // ❌ New instance every time
  // ...
}
```

**After:**

```typescript
import { supabase } from "./supabase"; // ✅ Use singleton

export async function trackEvent(...) {
  const { data: { session } } = await supabase.auth.getSession();
  // ...
}
```

## Benefits

✅ **No more warnings** - Single client instance across the app  
✅ **Consistent auth state** - All code uses the same auth session  
✅ **Better performance** - No overhead of creating multiple clients  
✅ **Simpler code** - No need to pass URLs/keys around  
✅ **Safer** - Prevents potential race conditions with concurrent auth operations

## The Singleton Client

Located in `src/lib/supabase.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});
```

This client is created **once** when the module is first imported and reused everywhere.

## Usage Pattern

### ✅ Correct - Import the singleton

```typescript
import { supabase } from "@/lib/supabase";

// Use directly
const {
  data: { session },
} = await supabase.auth.getSession();
const { data, error } = await supabase.from("table").select();
```

### ❌ Incorrect - Creating new clients

```typescript
import { createClient } from "@supabase/supabase-js";

// Don't do this!
const supabase = createClient(url, key);
```

## Testing

After the fix, the warning should disappear completely. You can verify by:

1. Hard refresh the browser (Ctrl+Shift+R)
2. Play a book for 30+ seconds
3. Check the console - **no warnings** ✅

## Files Modified

- ✅ `src/lib/progress.ts` - Now imports singleton
- ✅ `src/lib/analytics.ts` - Now imports singleton
- ✅ Deleted `src/lib/supabase-client.ts` (duplicate of existing singleton)

## Server-Side Note

The API route in `src/app/api/books/[id]/update/route.ts` correctly creates a **server-side** client with the service key. This is intentional and separate from the browser client:

```typescript
// ✅ This is fine - server-side with service key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});
```

Server-side clients need elevated permissions and don't share state with browser clients.

---

**Status**: ✅ Fixed  
**Warning eliminated**: Yes  
**Performance impact**: Positive (fewer client instances)  
**Date**: October 19, 2025
