# Hearo MVP Deployment Checklist

## Pre-Deployment Preparation

### 1. Environment Configuration

- [ ] Production environment variables configured
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` - Production Supabase URL
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Production anon key
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key (keep secret!)
  - [ ] `COQUI_SERVER_URL` - Production TTS server URL
  - [ ] `CHATTERBOX_SERVER_URL` - Production Chatterbox server URL (if using)
  - [ ] `NEXT_PUBLIC_SITE_URL` - Production site URL
  - [ ] `NODE_ENV=production`

- [ ] Verify all environment variables are set
  ```bash
  # Check .env.production file exists and is complete
  # Never commit .env files to git!
  ```

### 2. Supabase Configuration

#### Database Setup

- [ ] Run all database migrations in order:
  1. [ ] `docs/database-schema-complete.sql` - Core schema
  2. [ ] `docs/add-genre-column.sql` - Genre system
  3. [ ] `docs/add-duration-and-filters.sql` - Discovery filters
  4. [ ] `docs/followers-schema.sql` - Social features
  5. [ ] `docs/analytics-schema.sql` - Analytics system
  6. [ ] `docs/recommendations-schema-fix.sql` - Recommendations engine

- [ ] Verify all database functions exist:

  ```sql
  -- Check in Supabase SQL editor
  SELECT routine_name
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  ORDER BY routine_name;
  ```

  - [ ] `get_user_top_genres`
  - [ ] `get_user_favorite_authors`
  - [ ] `get_personalized_recommendations`
  - [ ] `get_similar_books`

- [ ] Verify all tables exist:
  - [ ] `profiles`
  - [ ] `works`
  - [ ] `audio_files`
  - [ ] `playback_sessions`
  - [ ] `likes`
  - [ ] `comments`
  - [ ] `ratings`
  - [ ] `followers`
  - [ ] `listening_stats`
  - [ ] `page_views`
  - [ ] `search_queries`

#### Row Level Security (RLS) Policies

- [ ] Verify RLS is enabled on all tables:

  ```sql
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public';
  ```

- [ ] Test RLS policies work correctly:
  - [ ] Users can only see their own private works
  - [ ] Users can see all published works
  - [ ] Users can only edit their own content
  - [ ] Users can only view their own playback sessions

#### Storage Buckets

- [ ] `audio-files` bucket configured
  - [ ] Public read access enabled
  - [ ] RLS policies set up
  - [ ] File size limit: 100MB per file
  - [ ] Allowed mime types: audio/mpeg, audio/wav
- [ ] `covers` bucket configured
  - [ ] Public read access enabled
  - [ ] RLS policies set up
  - [ ] File size limit: 5MB per file
  - [ ] Allowed mime types: image/jpeg, image/png, image/webp

- [ ] Verify storage policies:
  ```sql
  -- Check in Supabase SQL editor
  SELECT * FROM storage.policies;
  ```

#### Authentication

- [ ] Email confirmation settings:
  - [ ] Enable email confirmation (recommended for production)
  - [ ] Or disable if you want passwordless onboarding
  - [ ] Configure email templates with your branding

- [ ] Auth providers configured:
  - [ ] Email/password enabled
  - [ ] (Optional) Google OAuth
  - [ ] (Optional) GitHub OAuth

- [ ] Site URL configured in Supabase dashboard:
  - [ ] Add production URL to allowed redirect URLs
  - [ ] Remove localhost URLs from production

- [ ] Rate limiting configured:
  - [ ] Auth rate limits appropriate for your scale
  - [ ] API rate limits set

### 3. TTS Server Deployment

#### Option A: Self-Hosted Coqui TTS (Recommended)

- [ ] Server requirements met:
  - [ ] GPU recommended (NVIDIA with CUDA)
  - [ ] 8GB+ RAM
  - [ ] 20GB+ storage for models

- [ ] Install dependencies on server:

  ```bash
  pip install -r coqui-requirements.txt
  ```

- [ ] Download TTS models:

  ```bash
  tts --model_name tts_models/en/vctk/vits --list_speaker_idxs
  ```

- [ ] Configure `coqui-server.py`:
  - [ ] Set correct port (default: 5001)
  - [ ] Configure CORS for your domain
  - [ ] Set max queue size

- [ ] Start TTS server:

  ```bash
  python coqui-server.py
  ```

- [ ] Test TTS server:

  ```bash
  curl -X POST http://your-server:5001/generate \
    -H "Content-Type: application/json" \
    -d '{"text":"Test","speaker_id":"p225"}'
  ```

- [ ] Set up as system service (Linux):
  ```bash
  # Create /etc/systemd/system/coqui-tts.service
  # Enable and start service
  sudo systemctl enable coqui-tts
  sudo systemctl start coqui-tts
  ```

#### Option B: ElevenLabs API (Fallback)

- [ ] ElevenLabs API key configured
- [ ] Usage limits monitored
- [ ] Billing alerts set up

### 4. Application Deployment

#### Build and Test

- [ ] Run production build locally:

  ```bash
  npm run build
  ```

- [ ] Fix any build errors or warnings

- [ ] Test production build locally:

  ```bash
  npm run start
  ```

- [ ] Run test suite (if available):
  ```bash
  npm test
  ```

#### Deployment Platform Setup

##### Option A: Vercel (Recommended for Next.js)

- [ ] Connect GitHub repository to Vercel
- [ ] Configure environment variables in Vercel dashboard
- [ ] Set up production domain
- [ ] Configure build settings:
  - Build command: `npm run build`
  - Output directory: `.next`
  - Install command: `npm install`

- [ ] Enable automatic deployments from main branch
- [ ] Deploy and test

##### Option B: Self-Hosted (Docker)

- [ ] Create production Dockerfile
- [ ] Build Docker image
- [ ] Set up reverse proxy (nginx/Caddy)
- [ ] Configure SSL certificates
- [ ] Start containers with docker-compose
- [ ] Set up health checks

##### Option C: AWS/GCP/Azure

- [ ] Follow platform-specific Next.js deployment guide
- [ ] Configure load balancer
- [ ] Set up auto-scaling
- [ ] Configure CDN

### 5. Domain and SSL

- [ ] Domain registered and configured
- [ ] DNS records pointing to deployment:
  - [ ] A record for root domain
  - [ ] CNAME for www subdomain
  - [ ] (Optional) TXT records for email verification

- [ ] SSL certificate installed and valid
- [ ] HTTPS redirect enabled
- [ ] Test SSL configuration: https://www.ssllabs.com/ssltest/

### 6. Performance Optimization

- [ ] Enable Next.js Image Optimization
- [ ] Configure CDN for static assets
- [ ] Enable gzip/brotli compression
- [ ] Set up edge caching for API routes (if applicable)
- [ ] Optimize database queries with indexes:
  ```sql
  -- Verify indexes exist
  SELECT tablename, indexname
  FROM pg_indexes
  WHERE schemaname = 'public';
  ```

### 7. Monitoring and Logging

#### Application Monitoring

- [ ] Set up error tracking (Sentry, LogRocket, or similar)

  ```typescript
  // Add to src/lib/errorHandling.ts
  // Uncomment Sentry integration
  ```

- [ ] Configure application logging:
  - [ ] Error logs
  - [ ] Performance metrics
  - [ ] User analytics

#### Server Monitoring

- [ ] TTS server uptime monitoring
- [ ] Database connection monitoring
- [ ] API response time monitoring
- [ ] Storage usage monitoring

#### Set Up Alerts

- [ ] Server down alerts
- [ ] High error rate alerts
- [ ] Database performance alerts
- [ ] Storage quota alerts
- [ ] API rate limit alerts

### 8. Security Hardening

- [ ] Security headers configured:

  ```typescript
  // Add to next.config.ts
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  }
  ```

- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all API endpoints
- [ ] SQL injection protection (via Supabase prepared statements)
- [ ] XSS protection in place
- [ ] CSRF protection enabled

### 9. Content and Assets

- [ ] Upload default cover images
- [ ] Create sample content (optional)
- [ ] Set up 404 and error pages
- [ ] Configure sitemap.xml
- [ ] Configure robots.txt
- [ ] Set up OG images for social sharing

### 10. Testing in Production

- [ ] Complete end-to-end testing (use MVP-TESTING-PLAN.md)
- [ ] Test on multiple devices:
  - [ ] Desktop Chrome
  - [ ] Desktop Firefox
  - [ ] Desktop Safari
  - [ ] Mobile iOS Safari
  - [ ] Mobile Android Chrome
- [ ] Test audio playback on all devices
- [ ] Test book upload and TTS generation
- [ ] Test user authentication flow
- [ ] Test payment flow (if implemented)
- [ ] Load testing (optional but recommended)

### 11. Legal and Compliance

- [ ] Privacy Policy published
- [ ] Terms of Service published
- [ ] Cookie consent (if using tracking cookies)
- [ ] GDPR compliance (if serving EU users)
- [ ] CCPA compliance (if serving California users)
- [ ] Content moderation policy
- [ ] DMCA takedown procedure

### 12. Backup and Recovery

- [ ] Database backup strategy:
  - [ ] Enable Supabase automated backups
  - [ ] Test restore procedure
  - [ ] Document recovery steps

- [ ] Storage backup strategy:
  - [ ] Regular backup of audio files
  - [ ] Backup of cover images
  - [ ] Test restore procedure

- [ ] Code backup:
  - [ ] Repository backed up (GitHub/GitLab)
  - [ ] Tagged release versions

### 13. Documentation

- [ ] API documentation updated
- [ ] User guide/help center created
- [ ] Developer documentation complete
- [ ] Deployment procedures documented
- [ ] Incident response playbook created

## Launch Day Checklist

### Before Launch

- [ ] All team members briefed
- [ ] Support channels ready (email, chat, etc.)
- [ ] Monitoring dashboards open
- [ ] Rollback plan prepared
- [ ] Announcement content ready

### Launch

- [ ] Deploy to production
- [ ] Smoke test critical paths
- [ ] Monitor error rates
- [ ] Monitor server load
- [ ] Announce launch

### After Launch (First 24 Hours)

- [ ] Monitor error tracking dashboard
- [ ] Check server resources (CPU, memory, disk)
- [ ] Monitor TTS queue performance
- [ ] Review user feedback
- [ ] Address critical bugs immediately
- [ ] Document any issues and resolutions

## Post-Launch Optimization

### Week 1

- [ ] Analyze user behavior
- [ ] Identify bottlenecks
- [ ] Optimize slow queries
- [ ] Fix reported bugs
- [ ] Gather user feedback

### Month 1

- [ ] Review analytics data
- [ ] Plan feature improvements
- [ ] Optimize infrastructure costs
- [ ] Improve documentation
- [ ] Plan next iteration

## Rollback Procedure

If critical issues arise:

1. [ ] Immediately revert to previous deployment
2. [ ] Notify users of downtime (if applicable)
3. [ ] Diagnose issue in staging environment
4. [ ] Fix and test thoroughly
5. [ ] Redeploy with fix
6. [ ] Post-mortem meeting

## Support and Maintenance

### Daily

- [ ] Monitor error rates
- [ ] Check server health
- [ ] Review support tickets

### Weekly

- [ ] Review analytics
- [ ] Database maintenance
- [ ] Update dependencies (security patches)

### Monthly

- [ ] Review infrastructure costs
- [ ] Optimize database performance
- [ ] Review and update documentation
- [ ] Plan feature roadmap

## Emergency Contacts

- Infrastructure Provider Support: ****\_\_\_****
- Database (Supabase) Support: ****\_\_\_****
- Domain Registrar Support: ****\_\_\_****
- Team Lead: ****\_\_\_****
- DevOps Engineer: ****\_\_\_****

## Notes

- Keep this checklist updated as your deployment process evolves
- Document any deviations from this checklist
- Share lessons learned with the team
- Review and improve this checklist after each deployment

---

**Last Updated:** [Date]
**Deployment Version:** v1.0.0 (MVP)
**Deployed By:** ****\_\_\_****
