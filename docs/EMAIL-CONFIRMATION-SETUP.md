# Email Confirmation Setup for Hearo

## Issue: No confirmation email received after signup

This happens when Supabase is set to auto-confirm users without email verification.

## Check Current Settings

1. **Go to Supabase Dashboard**
   - Your project: `wrsvzwgexjsdkpjfyokh.supabase.co`

2. **Navigate to Authentication → Providers → Email**
   - Click on "Email" provider
   - Look for these settings:

## Settings to Configure

### Option 1: Enable Email Confirmation (Recommended for Production)

**In Supabase Dashboard:**

- Authentication → Providers → Email
- ✅ **Enable email confirmations** (turn this ON)
- ✅ **Secure email change** (recommended)
- ✅ **Enable email OTP** (optional, adds extra security)

**Email Template Configuration:**

- Authentication → Email Templates
- Customize the "Confirm signup" template if needed
- Default should work fine

**After enabling:**

- Users will receive an email with a confirmation link
- Link format: `https://wrsvzwgexjsdkpjfyokh.supabase.co/auth/v1/verify?token=...`
- After clicking, they'll be redirected back to your app

### Option 2: Disable Email Confirmation (Development Only)

**In Supabase Dashboard:**

- Authentication → Providers → Email
- ❌ **Disable email confirmations** (turn this OFF)

**This means:**

- No confirmation email sent
- Users are immediately confirmed
- Can log in right after signup
- **Only use for development/testing!**

## Update Signup Flow for Auto-Confirm

If you choose to disable email confirmation for development, update the signup page to redirect immediately:

```tsx
// In src/app/(auth)/signup/page.tsx
try {
  await signUp(email, password, username, userType);
  // For auto-confirm, redirect directly to dashboard
  router.push("/dashboard");
  router.refresh();
} catch (err: any) {
  setError(err.message || "Failed to create account");
  setLoading(false);
}
```

## Current Flow in Your App

Your signup page currently shows "Check your email!" message because it assumes email confirmation is enabled.

**Two options:**

1. **Enable email confirmation in Supabase** (recommended)
   - More secure
   - Verifies email ownership
   - Better for production

2. **Disable email confirmation and update the code**
   - Faster for development
   - Skip email verification step
   - Users can log in immediately

## Recommended Setup

### For Development:

```
✅ Disable email confirmations
✅ Update signup page to redirect to /dashboard
✅ Users can test immediately
```

### For Production:

```
✅ Enable email confirmations
✅ Keep "Check your email" message
✅ Configure custom email templates
✅ Set up custom SMTP (optional, but recommended)
```

## Check User Status in Supabase

1. Go to **Authentication → Users**
2. Look at the user you just created
3. Check the **Email Confirmed** column
   - ✅ Green check = confirmed
   - ❌ Red X = not confirmed

## Test the Flow

### If Email Confirmation is ENABLED:

1. Sign up with real email
2. Check inbox (and spam folder)
3. Click confirmation link
4. Redirected to app
5. Can now log in

### If Email Confirmation is DISABLED:

1. Sign up with any email
2. Immediately confirmed
3. Can log in right away
4. No email sent

## Quick Fix for Development

Run this SQL in Supabase to manually confirm existing users:

```sql
-- See all users and their confirmation status
SELECT
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users;

-- Manually confirm a specific user (replace the email)
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'your-email@example.com';
```

## Next Steps

1. **Check Supabase settings** (Authentication → Providers → Email)
2. **Decide:** Email confirmation ON or OFF?
3. **If OFF:** Update signup page to skip "check email" message
4. **If ON:** Wait for confirmation email (check spam folder)
5. **Test the complete flow**

---

**Current Status:** Your trigger and RLS policies are working! The only issue is the email confirmation flow.
