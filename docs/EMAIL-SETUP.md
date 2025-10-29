# Email Verification & Password Reset Setup

## Supabase Configuration

### Step 1: Enable Email Confirmation

1. Go to Supabase Dashboard → Authentication → Settings
2. Under "Email Auth", ensure these are enabled:
   - ✅ **Enable email confirmations** (require users to verify email)
   - ✅ **Enable email change confirmations** (when users update email)
   - ✅ **Secure email change** (prevents unauthorized email changes)

### Step 2: Configure Email Templates

Go to Authentication → Email Templates and customize:

#### **Confirm Signup Email**

Subject: `Verify your Hearo account`

Body:

```html
<h2>Welcome to Hearo! 🎧</h2>
<p>Hi there,</p>
<p>
  Thanks for signing up! Please verify your email address to start listening to
  amazing audiobooks.
</p>
<p><a href="{{ .ConfirmationURL }}">Verify Email Address</a></p>
<p>This link expires in 24 hours.</p>
<p>If you didn't create an account, you can safely ignore this email.</p>
<br />
<p>Happy listening!<br />The Hearo Team</p>
```

#### **Magic Link Email**

Subject: `Your Hearo magic link`

Body:

```html
<h2>Your Magic Link 🔗</h2>
<p>Click the link below to sign in to Hearo:</p>
<p><a href="{{ .ConfirmationURL }}">Sign In to Hearo</a></p>
<p>This link expires in 1 hour.</p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

#### **Reset Password Email**

Subject: `Reset your Hearo password`

Body:

```html
<h2>Reset Your Password 🔐</h2>
<p>Hi there,</p>
<p>We received a request to reset your Hearo password.</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>This link expires in 1 hour.</p>
<p>
  If you didn't request a password reset, you can safely ignore this email. Your
  password will remain unchanged.
</p>
<br />
<p>The Hearo Team</p>
```

#### **Email Change Confirmation**

Subject: `Confirm your new email address`

Body:

```html
<h2>Confirm Email Change 📧</h2>
<p>Hi there,</p>
<p>We received a request to change your Hearo account email to this address.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm New Email</a></p>
<p>This link expires in 24 hours.</p>
<p>
  If you didn't request this change, please ignore this email and contact
  support immediately.
</p>
```

### Step 3: Configure Redirect URLs

In Authentication → URL Configuration, add these:

**Site URL:** `http://localhost:3000` (development)
Update to production URL when deploying: `https://yourdomain.com`

**Redirect URLs (whitelist these):**

```
http://localhost:3000/**
https://yourdomain.com/**
http://localhost:3000/auth/callback
https://yourdomain.com/auth/callback
http://localhost:3000/auth/reset-password
https://yourdomain.com/auth/reset-password
```

### Step 4: Email Rate Limiting (Optional)

Under Authentication → Rate Limits:

- Email sending: 3 emails per hour per user (prevents spam)
- Password reset: 5 attempts per hour per IP

## Environment Variables

Add to `.env.local`:

```bash
# Already have these
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Site URL for email redirects
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Testing Email Flow

### Development Testing Options:

1. **Use Real Email** (Gmail, etc.)
   - Easiest for testing
   - Emails might go to spam initially

2. **Use Mailtrap.io** (Recommended for development)
   - Free service for testing emails
   - No emails sent to real addresses
   - Visual inbox to see emails

3. **Use Supabase Inbucket** (Free tier)
   - Built-in email testing in Supabase
   - Go to Authentication → Logs to see sent emails
   - Click to see email content

## Post-Implementation Testing Checklist

- [ ] New user signs up → receives verification email
- [ ] User clicks verify link → email confirmed, can access app
- [ ] User tries to access app without verifying → shown verification notice
- [ ] User clicks "Resend verification" → receives new email
- [ ] User clicks "Forgot password" → receives reset email
- [ ] User clicks reset link → can set new password
- [ ] User sets new password → can login with new password
- [ ] Password reset link expires after 1 hour
- [ ] Can't use same reset link twice
- [ ] Verification email expires after 24 hours

## Production Checklist

Before going live:

- [ ] Update Site URL to production domain
- [ ] Update all redirect URLs to production domain
- [ ] Test email delivery from production
- [ ] Consider using custom SMTP (SendGrid, AWS SES) for better deliverability
- [ ] Set up email monitoring/logging
- [ ] Test from multiple email providers (Gmail, Outlook, Yahoo)
- [ ] Check emails don't go to spam
