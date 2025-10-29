# Production Deployment Instructions

## Step 1: Deploy to Vercel

### 1.1 Push to GitHub

```bash
git add .
git commit -m "Production ready - cleaned debug logs, added secure secrets"
git push
```

### 1.2 Deploy on Vercel

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure environment variables (copy from .env.local):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ELEVENLABS_API_KEY`
   - `COQUI_SERVER_URL`
   - `NEXT_PUBLIC_COQUI_URL`
   - `NEXTAUTH_SECRET` (use the generated one from .env.local)
   - `NEXTAUTH_URL` (set to your Vercel URL, e.g., https://hearo.vercel.app)

5. Click "Deploy"

### 1.3 After First Deployment

- Note your production URL (e.g., `hearo.vercel.app`)
- Update `NEXTAUTH_URL` in Vercel environment variables to match
- Redeploy

## Step 2: Update CORS on GPU Server

SSH into your RunPod instance and update server.py:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.vercel.app",
        "https://hearo.vercel.app",  # Add your actual production domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Restart the server:

```bash
python3.10 -m uvicorn server:app --host 0.0.0.0 --port 8000
```

## Step 3: Update Supabase Settings

In Supabase Dashboard → Authentication → URL Configuration:

**Add to Redirect URLs:**

- `https://hearo.vercel.app/**`
- `https://hearo.vercel.app/auth/callback`

**Update Site URL:**

- Change from `http://localhost:3001` to `https://hearo.vercel.app`

## Step 4: Run Worker (Temporary Solution)

For now, run the worker locally on your machine:

```bash
npm run worker
```

Keep this terminal running. The worker will process jobs from anywhere.

**Note:** For production, you'll want to deploy the worker to:

- A VPS (DigitalOcean, AWS)
- Railway/Render
- Or migrate to Inngest (see next section)

## Step 5: Test Your Production App

1. Visit your Vercel URL
2. Sign up for a new account
3. Try uploading a book
4. Check that audio generates (worker must be running)

## Optional: Migrate to Inngest (Serverless Workers)

If you want workers to run automatically without keeping a terminal open:

1. Sign up at https://inngest.com (free tier available)
2. Run: `npm install inngest`
3. Follow the Inngest setup guide in `INNGEST-SETUP.md` (to be created)

This will make workers run automatically on Vercel without a separate server.

## Monitoring

- **Vercel Dashboard:** Check deployment logs
- **Supabase Dashboard:** Monitor database queries
- **RunPod:** Check GPU usage
- **Worker Terminal:** Watch job processing

## Troubleshooting

**Upload fails:**

- Check worker is running
- Check COQUI_SERVER_URL is correct
- Check RunPod GPU server is running

**Auth not working:**

- Check NEXTAUTH_URL matches your domain
- Check Supabase redirect URLs include production domain

**CORS errors:**

- Update RunPod server CORS to include production URL
- Restart RunPod server
