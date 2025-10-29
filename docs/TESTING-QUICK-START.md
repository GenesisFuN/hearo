# MVP Testing Quick Start Guide

This is a condensed version of the full testing plan for quick reference. For detailed testing procedures, see `MVP-TESTING-PLAN.md`.

## Pre-Testing Setup

### Environment

- [ ] Testing environment deployed (staging or production)
- [ ] Test user accounts created
- [ ] Sample content uploaded
- [ ] All services running (Next.js app, TTS server, Database)

### Test Data

- [ ] At least 3 test user accounts
- [ ] At least 5 published books
- [ ] Various genres represented
- [ ] Mix of short/medium/long books

## Critical Path Testing (15 minutes)

These are the most important user flows that MUST work:

### 1. Sign Up & Sign In (2 min)

```
Test: Can new users create accounts and sign in?
✅ Sign up with email/password
✅ Receive confirmation email (if enabled)
✅ Sign in successfully
✅ Stay signed in after page refresh
```

### 2. Create Book (3 min)

```
Test: Can users upload and create books?
✅ Upload .txt file
✅ See TTS processing progress
✅ Book appears in "My Books"
✅ Book is playable after processing
```

### 3. Playback (3 min)

```
Test: Does audio playback work?
✅ Play button starts playback
✅ Pause/play controls work
✅ Progress bar shows correct position
✅ Volume control works
✅ Mobile playback works
```

### 4. Discovery (2 min)

```
Test: Can users find books?
✅ Browse trending books
✅ Search by title/author
✅ Use filters (genre, duration)
✅ View recommendations (if logged in)
```

### 5. Social Features (2 min)

```
Test: Can users engage with content?
✅ Like a book
✅ Leave a comment
✅ Rate a book
✅ Follow an author
```

### 6. Progress Tracking (3 min)

```
Test: Does progress save correctly?
✅ Pause and refresh page
✅ Resume from correct position
✅ "Continue Listening" shows current book
✅ Progress bar updates
```

## Smoke Test (5 minutes)

Quick test after any deployment:

```bash
# 1. Homepage loads
✅ Navigate to https://yoursite.com
✅ Page loads in < 3 seconds

# 2. Authentication works
✅ Sign in with test account
✅ See user dashboard

# 3. Core features accessible
✅ Can browse books
✅ Can search for books
✅ Can play audio

# 4. No console errors
✅ Open browser console
✅ No red errors visible
```

## Device Testing Matrix

Test on these devices/browsers (30 minutes total):

| Device  | Browser | Priority        |
| ------- | ------- | --------------- |
| Desktop | Chrome  | 🔴 Critical     |
| Desktop | Firefox | 🟡 Important    |
| Desktop | Safari  | 🟡 Important    |
| iPhone  | Safari  | 🔴 Critical     |
| Android | Chrome  | 🔴 Critical     |
| iPad    | Safari  | 🟢 Nice to have |

### For Each Device:

1. Sign in
2. Play a book
3. Use basic controls (play/pause/skip)
4. Check mobile player modal

## Error Scenarios (10 minutes)

### Network Errors

```bash
# Test offline behavior
1. Start playing a book
2. Disconnect internet
3. Try to search or load new content
✅ See user-friendly error message
✅ Can still control current playback
```

### Invalid Input

```bash
# Test validation
1. Try to upload empty file
2. Try to upload wrong file type
3. Try to comment with empty text
✅ See validation error messages
✅ Form doesn't submit
```

### Authentication Errors

```bash
# Test session handling
1. Sign in
2. Clear browser cookies/localStorage
3. Try to perform authenticated action
✅ Redirected to sign in
✅ No crash or blank page
```

## Performance Benchmarks

### Page Load Times

- Homepage: < 2 seconds ⏱️
- Discover page: < 3 seconds ⏱️
- Book page: < 2 seconds ⏱️
- Search results: < 1 second ⏱️

### Audio Playback

- Time to first play: < 2 seconds ⏱️
- Seek response: < 500ms ⏱️
- No buffering for normal connections 📶

### TTS Processing

- 100 words: ~2-5 minutes ⏳
- 1000 words: ~15-30 minutes ⏳

## Common Issues & Fixes

### Issue: Audio won't play

```
Check:
- Is TTS processing complete?
- Is audio file uploaded to storage?
- Browser console for errors?
- Try different browser?
```

### Issue: Progress not saving

```
Check:
- User is signed in?
- Database connection?
- Check browser console for errors?
- Verify playback_sessions table has data?
```

### Issue: Recommendations not showing

```
Check:
- User has listening history?
- Database functions installed?
- API returns data (check Network tab)?
```

### Issue: TTS queue not processing

```
Check:
- TTS server running?
- Check TTS server logs
- Database queue has jobs?
- Worker script running?
```

## Quick Database Checks

```sql
-- Check if books exist
SELECT COUNT(*) FROM works;

-- Check if audio files uploaded
SELECT COUNT(*) FROM audio_files;

-- Check TTS queue status
SELECT status, COUNT(*)
FROM tts_queue
GROUP BY status;

-- Check user activity
SELECT COUNT(*) FROM playback_sessions;

-- Check social engagement
SELECT
  (SELECT COUNT(*) FROM likes) as likes,
  (SELECT COUNT(*) FROM comments) as comments,
  (SELECT COUNT(*) FROM ratings) as ratings;
```

## Testing Checklist

### Before Launch

- [ ] All critical paths tested
- [ ] Tested on all priority devices
- [ ] Error scenarios handled gracefully
- [ ] Performance benchmarks met
- [ ] No console errors in production
- [ ] Database migrations applied
- [ ] Environment variables set
- [ ] SSL certificate valid
- [ ] Error tracking configured

### After Launch (First Hour)

- [ ] Monitor error rates
- [ ] Check server resources
- [ ] Review real user feedback
- [ ] Fix any critical bugs
- [ ] Announce if stable

### After Launch (First Day)

- [ ] Review analytics
- [ ] Check TTS queue performance
- [ ] Monitor database performance
- [ ] Gather user feedback
- [ ] Plan bug fixes

## Emergency Procedures

### If Critical Bug Found:

1. **Assess Impact** - How many users affected?
2. **Quick Fix or Rollback?** - Can we fix in < 1 hour?
3. **Communicate** - Update users if needed
4. **Deploy Fix** - Test on staging first
5. **Monitor** - Watch error rates after fix
6. **Post-Mortem** - Document and prevent recurrence

### Rollback Procedure:

```bash
# If using Vercel
vercel rollback [previous-deployment-url]

# If using Git + Server
git revert HEAD
npm run build
npm run start

# Verify rollback worked
curl https://yoursite.com/api/health
```

## Testing Tools

### Browser DevTools

- **Console**: Check for errors
- **Network**: Monitor API calls
- **Application**: Check localStorage/cookies
- **Performance**: Measure page load times

### Recommended Extensions

- **React DevTools**: Debug React components
- **Lighthouse**: Performance auditing
- **WAVE**: Accessibility testing
- **EditThisCookie**: Manage test cookies

### Command Line Tools

```bash
# Test API endpoints
curl -X GET https://yoursite.com/api/recommendations \
  -H "Authorization: Bearer TOKEN"

# Check page speed
curl -o /dev/null -s -w 'Total: %{time_total}s\n' https://yoursite.com

# Check SSL
openssl s_client -connect yoursite.com:443
```

## Success Criteria

MVP is ready to launch when:

- ✅ All critical paths work on all priority devices
- ✅ No critical bugs in error tracking
- ✅ Performance benchmarks met
- ✅ Error handling shows user-friendly messages
- ✅ Progress saving is reliable
- ✅ TTS queue processes jobs consistently
- ✅ Database queries are fast
- ✅ No major security issues
- ✅ Deployment checklist complete
- ✅ Team confident in stability

---

**Need more detail?** See `docs/MVP-TESTING-PLAN.md`
**Deployment ready?** See `docs/DEPLOYMENT-CHECKLIST.md`
**Found bugs?** Document in `docs/MVP-TESTING-PLAN.md` bug tracking section
