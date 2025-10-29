# Hearo - Production Deployment Guide

## 🚀 Quick Deploy (5 minutes)

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Production ready with Inngest workers"
git push
```

### Step 2: Deploy to Vercel

1. **Go to [Vercel](https://vercel.com)**
2. Click **"Add New Project"**
3. **Import your GitHub repository**
4. **Framework Preset**: Next.js (auto-detected)
5. **Configure Environment Variables** (copy from `.env.local`):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://wrsvzwgexjsdkpjfyokh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# AI Services
ELEVENLABS_API_KEY=your_elevenlabs_key_here
COQUI_SERVER_URL=https://jabvvfgpa3902q-8000.proxy.runpod.net
NEXT_PUBLIC_COQUI_URL=https://jabvvfgpa3902q-8000.proxy.runpod.net

# NextAuth
NEXTAUTH_SECRET=gcyKclbTgXRVEdL2Qa7mc0yX++Lp2lq0cpAlogeuvjk=
NEXTAUTH_URL=https://your-app.vercel.app  # UPDATE after first deploy
```

6. Click **"Deploy"**
7. Wait 2-3 minutes for build

### Step 3: Update NEXTAUTH_URL

After first deployment:

1. Note your Vercel URL (e.g., `https://hearo-abc123.vercel.app`)
2. Go to **Vercel Dashboard** → **Settings** → **Environment Variables**
3. Edit `NEXTAUTH_URL` to match your production URL
4. **Redeploy**

### Step 4: Setup Inngest (Background Workers)

1. **Sign up at [Inngest.com](https://inngest.com)** (Free tier)
2. Create a new app called **"Hearo"**
3. Copy your keys:
   - `INNGEST_EVENT_KEY`
   - `INNGEST_SIGNING_KEY`
4. Add to Vercel environment variables
5. **Sync with Vercel:**
   - In Inngest dashboard, click **"Sync"**
   - Enter your Vercel URL: `https://your-app.vercel.app/api/inngest`
   - Click **"Sync App"**

### Step 5: Update Supabase

In **Supabase Dashboard** → **Authentication** → **URL Configuration**:

**Site URL:**

```
https://your-app.vercel.app
```

**Redirect URLs (add these):**

```
https://your-app.vercel.app/**
https://your-app.vercel.app/auth/callback
```

### Step 6: Update RunPod CORS

SSH into RunPod and update `server.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.vercel.app",
        "https://your-app.vercel.app",  # Your actual domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Restart server:

```bash
python3.10 -m uvicorn server:app --host 0.0.0.0 --port 8000
```

---

## ✅ You're Live!

Your app is now running in production:

- ✅ Frontend on Vercel (auto-scales)
- ✅ Workers on Inngest (serverless, auto-scales)
- ✅ GPU server on RunPod
- ✅ Database on Supabase

**No terminals to keep open!** Everything runs automatically.

---

## 🧪 Test Your Deployment

1. Visit your Vercel URL
2. Sign up for a new account
3. Upload a text file
4. Watch it process automatically
5. Play the generated audiobook

---

## 📊 Monitor Your App

**Vercel Dashboard:**

- Deployment logs
- Error tracking
- Performance metrics

**Inngest Dashboard:**

- Function runs
- Job status
- Execution logs

**Supabase Dashboard:**

- Database queries
- User signups
- Storage usage

**RunPod:**

- GPU usage
- Server logs

---

## 🔧 Troubleshooting

### Upload fails

**Check:**

- RunPod server is running
- CORS includes production domain
- Inngest is synced

### Auth not working

**Check:**

- NEXTAUTH_URL matches domain
- Supabase redirect URLs correct

### Workers not running

**Check:**

- Inngest keys in Vercel
- Inngest app synced
- Check Inngest dashboard for errors

---

## 🎯 Next Steps

### Custom Domain (Optional)

1. Buy domain (Namecheap, GoDaddy, etc.)
2. Add to Vercel project
3. Update all URLs (NEXTAUTH_URL, Supabase, RunPod)

### Email Setup

- Configure SMTP in Supabase
- Enable email confirmations
- Customize email templates

### Analytics

- Add Google Analytics
- Setup error tracking (Sentry)
- Monitor user behavior

### Scaling

- Upgrade RunPod GPU as needed
- Increase Supabase plan for more users
- Inngest auto-scales (no action needed)

---

## 💰 Cost Estimate

**Free Tier:**

- Vercel: Free (hobby plan)
- Inngest: Free (up to 50k events/month)
- Supabase: Free (500MB database, 1GB storage)
- RunPod: ~$0.34/hour (RTX 3090)

**Total: ~$250/month** (if RunPod runs 24/7)

**To save costs:**

- Stop RunPod when not in use
- Or switch to RunPod Serverless (pay per use)

---

## 🎉 Congratulations!

Your app is now in production and ready for users!
