# Hearo Authentication & Session Management

## Overview

Hearo uses **Supabase Auth** for authentication with JWT tokens and automatic session management.

## Authentication Flow

```
User Sign Up/Login
    ↓
Supabase Auth (JWT issued)
    ↓
Profile created automatically (trigger)
    ↓
JWT stored in httpOnly cookie
    ↓
Auto-refresh on expiration
```

## Setup Instructions

### 1. Environment Variables

Add to `.env.local`:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Session
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_key_here

# TTS Services
COQUI_SERVER_URL=http://localhost:8000
ELEVENLABS_API_KEY=your_elevenlabs_key
```

### 2. Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 3. Initialize Supabase Client

Create `src/lib/supabase/client.ts`:

```typescript
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// For client components
export const createClient = () => createClientComponentClient();

// For server components
export const createServerClient = () =>
  createServerComponentClient({ cookies });

// For server actions
export const createServiceClient = () => {
  return createClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  });
};
```

### 4. Auth Context Provider

Create `src/contexts/AuthContext.tsx`:

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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
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

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

### 5. Protect Routes with Middleware

Create `src/middleware.ts`:

```typescript
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes
  const protectedRoutes = ["/studio", "/profile", "/dashboard"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !session) {
    // Redirect to login
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ["/studio/:path*", "/profile/:path*", "/dashboard/:path*"],
};
```

## JWT Token Structure

```json
{
  "aud": "authenticated",
  "exp": 1234567890,
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "authenticated",
  "app_metadata": {
    "provider": "email",
    "providers": ["email"]
  },
  "user_metadata": {
    "username": "johndoe",
    "user_type": "creator"
  }
}
```

## Session Management

### Auto-Refresh

- Tokens expire after 1 hour (configurable)
- Supabase client auto-refreshes before expiration
- Refresh token valid for 30 days (configurable)

### Cookie Settings

```typescript
{
  name: 'sb-access-token',
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  }
}
```

## API Routes with Auth

### Protected API Route Example

```typescript
// src/app/api/protected/route.ts
import { createServerClient } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Access user data
  const userId = session.user.id;

  // Your protected logic here
  return NextResponse.json({ data: "Protected data" });
}
```

### Get User Profile

```typescript
export async function getUserProfile(userId: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      *,
      creator_profiles (*),
      subscriptions (*)
    `
    )
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}
```

## Row Level Security (RLS)

All database queries automatically enforce RLS policies using the JWT:

```sql
-- Example: Users can only see their own uploads
CREATE POLICY "Users can view own uploads"
  ON uploads FOR SELECT
  USING (user_id = auth.uid());
```

The `auth.uid()` function extracts the user ID from the JWT automatically.

## Authentication Pages

### Sign Up Page

```typescript
// src/app/(auth)/signup/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          user_type: userType,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Redirect to email confirmation or dashboard
    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSignUp}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <select value={userType} onChange={(e) => setUserType(e.target.value as any)}>
        <option value="listener">Listener</option>
        <option value="creator">Creator</option>
      </select>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Sign Up'}
      </button>
    </form>
  )
}
```

### Login Page

```typescript
// src/app/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(redirectTo)
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Log In'}
      </button>
    </form>
  )
}
```

## Security Best Practices

### 1. Use httpOnly Cookies

✅ Automatic with Supabase Auth

### 2. Validate JWT on Server

✅ RLS policies automatically validate

### 3. Refresh Tokens Securely

✅ Supabase handles rotation

### 4. CSRF Protection

✅ SameSite=Lax cookies

### 5. Rate Limiting

```typescript
// Add rate limiting to API routes
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export async function POST(request: Request) {
  try {
    await limiter.check(request, 10); // 10 requests per minute
    // Your logic here
  } catch {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
}
```

## Testing Authentication

### Get Current User

```typescript
const {
  data: { user },
} = await supabase.auth.getUser();
console.log("Current user:", user);
```

### Check Session

```typescript
const {
  data: { session },
} = await supabase.auth.getSession();
console.log("Active session:", session);
```

### Verify JWT

```typescript
const token = session?.access_token;
// Supabase automatically validates on every request
```

## Troubleshooting

### Session Not Persisting

- Check cookie settings in browser
- Ensure `NEXTAUTH_URL` matches your domain
- Verify Supabase URL in `.env.local`

### RLS Policies Blocking Access

- Check policies in Supabase dashboard
- Verify `auth.uid()` returns correct user ID
- Test with service role key (bypasses RLS)

### Token Refresh Failed

- Check internet connection
- Verify Supabase project is active
- Clear cookies and re-login

## Next Steps

1. ✅ Run `database-schema-complete.sql` in Supabase
2. ✅ Configure environment variables
3. ✅ Install Supabase dependencies
4. ✅ Create auth pages (login/signup)
5. ✅ Add AuthProvider to app layout
6. ✅ Implement protected routes
7. ✅ Create user dashboard

---

**Security Note**: Never expose service role key in client code! Only use in server-side code.
