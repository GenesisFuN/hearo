# Hearo Implementation Guide - Getting Started

## 🎯 Quick Start - 30 Minutes to Working Auth

Follow these steps to implement authentication and database for Hearo.

---

## Step 1: Supabase Setup (5 minutes)

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `hearo` (or your choice)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to you
4. Click **"Create new project"**
5. Wait 2-3 minutes for setup

### 1.2 Get API Keys

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)
   - **service_role key** (even longer string - keep this SECRET!)

---

## Step 2: Database Schema (5 minutes)

### 2.1 Run SQL Schema

1. In Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Copy the entire contents of `docs/database-schema-complete.sql`
4. Paste into the SQL editor
5. Click **"Run"** (or press Ctrl+Enter)
6. Wait for completion (should see green checkmark)

✅ You now have all tables, RLS policies, and triggers set up!

### 2.2 Verify Tables Created

1. Click **Table Editor** (left sidebar)
2. You should see tables:
   - `profiles`
   - `works`
   - `uploads`
   - `audio_files`
   - `subscriptions`
   - etc.

---

## Step 3: Environment Variables (3 minutes)

### 3.1 Update `.env.local`

Create or update `c:\Users\dane\hearo\.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your_service_role_key

# Session
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_random_string_here

# Existing TTS services (keep these)
COQUI_SERVER_URL=http://localhost:8000
ELEVENLABS_API_KEY=your_elevenlabs_key
```

**Generate NEXTAUTH_SECRET:**

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.2 Restart Next.js Dev Server

```powershell
# Stop current server (Ctrl+C)
# Start again
npm run dev
```

---

## Step 4: Install Dependencies (2 minutes)

```powershell
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/ssr
```

---

## Step 5: Create Supabase Client (5 minutes)

### 5.1 Create `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### 5.2 Create `src/lib/supabase/server.ts`

```typescript
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle cookie setting errors
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete({ name, ...options });
          } catch (error) {
            // Handle cookie removal errors
          }
        },
      },
    }
  );
}
```

---

## Step 6: Auth Context (5 minutes)

### 6.1 Create `src/contexts/AuthContext.tsx`

```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

### 6.2 Update Root Layout

Update `src/app/layout.tsx`:

```typescript
import { AuthProvider } from '@/contexts/AuthContext'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {/* Your existing providers */}
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

---

## Step 7: Create Auth Pages (5 minutes)

### 7.1 Create Login Page

Create `src/app/(auth)/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Log In to Hearo</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
```

### 7.2 Create Signup Page

Create `src/app/(auth)/signup/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [userType, setUserType] = useState<'listener' | 'creator'>('listener')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          user_type: userType,
          display_name: username,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Success - redirect to dashboard
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Sign Up for Hearo</h1>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              placeholder="johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">I am a...</label>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="listener">Listener (I want to listen to audiobooks)</option>
              <option value="creator">Creator (I want to create audiobooks)</option>
            </select>
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
```

---

## Step 8: Test Authentication (3 minutes)

### 8.1 Test Signup

1. Go to `http://localhost:3000/signup`
2. Fill in form:
   - Email: `test@example.com`
   - Username: `testuser`
   - Password: `password123`
   - Type: `Creator`
3. Click **"Sign Up"**
4. Should redirect to `/dashboard`

### 8.2 Verify in Supabase

1. Go to Supabase → **Authentication** → **Users**
2. You should see your new user!
3. Go to **Table Editor** → **profiles**
4. You should see the profile row created automatically!

### 8.3 Test Login

1. Open incognito window
2. Go to `http://localhost:3000/login`
3. Use same credentials
4. Should log in successfully

---

## Step 9: Add User Menu (5 minutes)

Update your existing navigation to show user info:

```typescript
'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'link'

export function UserMenu() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return (
      <div className="flex gap-2">
        <Link href="/login" className="btn">Log In</Link>
        <Link href="/signup" className="btn btn-primary">Sign Up</Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/dashboard">Dashboard</Link>
      <span>{user.email}</span>
      <button onClick={signOut} className="btn">Sign Out</button>
    </div>
  )
}
```

---

## Step 10: Create Basic Dashboard (2 minutes)

Create `src/app/dashboard/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p>Welcome, {profile?.display_name || profile?.username || 'User'}!</p>
        <p>Email: {session.user.email}</p>
        <p>User Type: {profile?.user_type}</p>
        <p>Subscription: {profile?.subscription_tier}</p>
      </div>
    </div>
  )
}
```

---

## ✅ You're Done!

You now have:

- ✅ Complete database schema
- ✅ JWT authentication with Supabase
- ✅ Automatic session management
- ✅ Login/signup pages
- ✅ Protected dashboard
- ✅ User profiles
- ✅ Row-level security

---

## Next Steps

### Immediate:

1. ✅ Test creating a second user
2. ✅ Try logging out and back in
3. ✅ Check the dashboard loads correctly

### Soon:

1. **Upload Integration**: Connect existing upload routes to new database
2. **Creator Dashboard**: Show user's works and uploads
3. **Listener Dashboard**: Show play history and favorites
4. **Subscription UI**: Manage subscription tiers

### Later:

1. **Email Verification**: Enable in Supabase settings
2. **Password Reset**: Built-in with Supabase
3. **OAuth**: Add Google/GitHub login
4. **Profile Editing**: Let users update their info

---

## Troubleshooting

### "User already registered"

- Email already used. Try different email or use login page.

### "Invalid login credentials"

- Check email/password are correct
- Verify user exists in Supabase → Authentication

### "Database error"

- Verify SQL schema ran successfully
- Check RLS policies are enabled

### Session not persisting

- Clear browser cookies
- Restart Next.js dev server
- Check `.env.local` has correct Supabase URL

---

## Need Help?

1. Check `docs/AUTH-SETUP.md` for detailed auth documentation
2. Check Supabase docs: [supabase.com/docs](https://supabase.com/docs)
3. Verify all environment variables are set correctly

---

**Time to complete**: ~30 minutes
**Result**: Fully working authentication system with database! 🎉
