# 🧪 Hearo MVP - End-to-End Testing Plan

**Date:** October 21, 2025  
**Status:** Ready for Testing

## Test Environment Setup

### Prerequisites

- [ ] Supabase project running
- [ ] Coqui TTS server running (`npm run coqui`)
- [ ] TTS worker running (`npm run worker`)
- [ ] Next.js dev server running (`npm run dev`)
- [ ] Test user account created

---

## 1️⃣ Authentication Flow (Critical)

### Sign Up

- [ ] Navigate to `/auth/signup`
- [ ] Enter email and password
- [ ] Submit form
- [ ] ✅ **Expected:** Redirect to home, user logged in
- [ ] ❌ **Error Cases:** Invalid email, weak password, duplicate email

### Sign In

- [ ] Navigate to `/auth/signin`
- [ ] Enter credentials
- [ ] Submit form
- [ ] ✅ **Expected:** Redirect to home, user logged in
- [ ] ❌ **Error Cases:** Wrong password, user not found

### Sign Out

- [ ] Click sign out button
- [ ] ✅ **Expected:** Redirect to home, user logged out
- [ ] Protected routes should redirect to signin

---

## 2️⃣ Book Creation Flow (Critical)

### Upload Text

- [ ] Navigate to `/studio`
- [ ] Paste or type book text
- [ ] Enter title and description
- [ ] Select genre from 24 options
- [ ] Select voice (6 Coqui voices available)
- [ ] Optional: Upload cover image
- [ ] Click "Generate Audiobook"
- [ ] ✅ **Expected:** Job created, shows processing status
- [ ] ❌ **Error Cases:** Empty text, no title, invalid file upload

### Monitor TTS Progress

- [ ] Wait for TTS queue to process
- [ ] Check worker terminal for job progress
- [ ] ✅ **Expected:** See chapters being processed
- [ ] ✅ **Expected:** Job completes, book status → "published"
- [ ] ❌ **Error Cases:** Worker crash, TTS server down, timeout

### View Created Book

- [ ] Navigate to "My Books"
- [ ] Find newly created book
- [ ] Click to open book detail page
- [ ] ✅ **Expected:** Shows title, cover, duration, play button
- [ ] ❌ **Error Cases:** Book not showing, audio file missing

---

## 3️⃣ Playback Flow (Critical)

### Basic Playback

- [ ] Open any book detail page
- [ ] Click play button
- [ ] ✅ **Expected:** Audio starts playing
- [ ] ✅ **Expected:** Mini player appears at bottom
- [ ] ✅ **Expected:** Progress bar updates
- [ ] ❌ **Error Cases:** Audio fails to load, 404 on audio file

### Player Controls

- [ ] Test pause button → should pause audio
- [ ] Test play button → should resume audio
- [ ] Test seek bar → should jump to position
- [ ] Test volume slider → should adjust volume
- [ ] Test speed control (0.5x - 2.5x) → should change playback rate
- [ ] ✅ **Expected:** All controls work smoothly
- [ ] ❌ **Error Cases:** Controls unresponsive, audio skips

### Now Playing Modal

- [ ] Click "Now Playing" or expand mini player
- [ ] ✅ **Expected:** Fullscreen modal opens
- [ ] ✅ **Expected:** Shows large cover image
- [ ] ✅ **Expected:** Shows title, author, progress
- [ ] Test ESC key → should close modal
- [ ] Test backdrop click → should close modal

---

## 4️⃣ Progress Tracking (Critical)

### Auto-Resume

- [ ] Play a book for 30 seconds
- [ ] Navigate away from page
- [ ] Return to book detail page
- [ ] Click play
- [ ] ✅ **Expected:** Resumes from where you left off
- [ ] ❌ **Error Cases:** Starts from beginning, wrong position

### Progress Bars

- [ ] Check book cards on discover page
- [ ] ✅ **Expected:** Shows progress bar if partially listened
- [ ] Check "Continue Listening" section on home
- [ ] ✅ **Expected:** Shows books with 5-95% progress
- [ ] Complete a book (listen to 95%+)
- [ ] ✅ **Expected:** Book removed from "Continue Listening"

### Skip-Proof Tracking

- [ ] Play a book normally for 2 minutes
- [ ] Check analytics page
- [ ] ✅ **Expected:** ~2 minutes of listening time recorded
- [ ] Try skipping ahead rapidly (multiple times)
- [ ] ✅ **Expected:** Time tracked accurately (not inflated)

---

## 5️⃣ Discovery & Search (Important)

### Browse Discovery Page

- [ ] Navigate to `/discover`
- [ ] ✅ **Expected:** Shows "Trending Books" section
- [ ] ✅ **Expected:** Shows "Recently Added" section
- [ ] ✅ **Expected:** Shows "Trending Authors" section
- [ ] ✅ **Expected:** Shows "Recommended for You" (if user has listening history)

### Search Functionality

- [ ] Enter search term in search bar
- [ ] ✅ **Expected:** Shows matching results
- [ ] ✅ **Expected:** Highlights search term
- [ ] Try empty search → should show all books
- [ ] ❌ **Error Cases:** Search breaks, no results message missing

### Advanced Filters

- [ ] Open "Advanced Filters" panel
- [ ] Select multiple genres
- [ ] ✅ **Expected:** Shows books matching ANY selected genre
- [ ] Select duration filter (short/medium/long)
- [ ] ✅ **Expected:** Filters by book length
- [ ] Select date range (week/month/year)
- [ ] ✅ **Expected:** Filters by publish date
- [ ] Enter author name
- [ ] ✅ **Expected:** Filters by author
- [ ] Select content tags (family-friendly, etc.)
- [ ] ✅ **Expected:** Filters by tags
- [ ] Click "Clear All"
- [ ] ✅ **Expected:** All filters reset

### URL Persistence

- [ ] Apply some filters
- [ ] Copy URL
- [ ] Open in new tab
- [ ] ✅ **Expected:** Filters preserved in URL
- [ ] ✅ **Expected:** Same results shown

---

## 6️⃣ Social Features (Important)

### Likes

- [ ] Open any book detail page
- [ ] Click heart/like button
- [ ] ✅ **Expected:** Like count increases, button fills
- [ ] Click again to unlike
- [ ] ✅ **Expected:** Like count decreases, button unfills
- [ ] ❌ **Error Cases:** Can't unlike, double-counting

### Comments

- [ ] Scroll to comments section
- [ ] Enter a comment
- [ ] Click submit
- [ ] ✅ **Expected:** Comment appears immediately
- [ ] ✅ **Expected:** Shows your avatar and username
- [ ] Try deleting your comment
- [ ] ✅ **Expected:** Comment removed
- [ ] ❌ **Error Cases:** Comment doesn't post, can't delete

### Ratings

- [ ] Click star rating (1-5 stars)
- [ ] ✅ **Expected:** Rating saved
- [ ] ✅ **Expected:** Average rating updates
- [ ] Try changing rating
- [ ] ✅ **Expected:** Updates to new rating
- [ ] ❌ **Error Cases:** Rating not saved, can't update

### Follow Authors

- [ ] Navigate to author profile page
- [ ] Click "Follow" button
- [ ] ✅ **Expected:** Button changes to "Following"
- [ ] Click "Following" to unfollow
- [ ] ✅ **Expected:** Button changes to "Follow"
- [ ] Check "Following" feed
- [ ] ✅ **Expected:** Shows books from followed authors

---

## 7️⃣ Library Features (Important)

### Save Books

- [ ] Click bookmark/save button on any book
- [ ] ✅ **Expected:** Button fills/changes state
- [ ] Navigate to Library page
- [ ] ✅ **Expected:** Saved book appears
- [ ] Unsave book from library
- [ ] ✅ **Expected:** Book removed from library

### My Books

- [ ] Navigate to "My Books" tab
- [ ] ✅ **Expected:** Shows all books you created
- [ ] ✅ **Expected:** Shows draft/processing/published status
- [ ] Click edit on a book
- [ ] ✅ **Expected:** Opens edit modal
- [ ] Try publishing a book
- [ ] ✅ **Expected:** Book becomes public

### Continue Listening

- [ ] Check home page
- [ ] ✅ **Expected:** Shows "Continue Listening" section
- [ ] ✅ **Expected:** Shows books with 5-95% progress
- [ ] ✅ **Expected:** Shows progress percentage
- [ ] ✅ **Expected:** Shows time remaining
- [ ] Click a book
- [ ] ✅ **Expected:** Resumes from saved position

---

## 8️⃣ Recommendations (New Feature)

### Personalized Recommendations

- [ ] Listen to at least 2-3 books (5+ minutes each)
- [ ] Navigate to `/discover`
- [ ] ✅ **Expected:** "Recommended for You" section appears
- [ ] ✅ **Expected:** Shows 8 recommendations
- [ ] ✅ **Expected:** Each book has reasoning badge
- [ ] Check badge text
- [ ] ✅ **Expected:** Says "Based on your interest in [Genre]" or "From favorite author"
- [ ] ❌ **Error Cases:** No recommendations shown, wrong reasoning

### Recommendation Quality

- [ ] Check if recommendations match your listening history
- [ ] ✅ **Expected:** Recommendations are relevant
- [ ] ✅ **Expected:** Excludes already-saved books
- [ ] ✅ **Expected:** Excludes already-listened books (>10% progress)

---

## 9️⃣ Analytics (Important)

### Personal Stats

- [ ] Navigate to analytics page
- [ ] ✅ **Expected:** Shows total listening time
- [ ] ✅ **Expected:** Shows books completed count
- [ ] ✅ **Expected:** Shows favorite genres chart
- [ ] ✅ **Expected:** Shows listening history timeline
- [ ] Try different time ranges (7 days, 30 days, all time)
- [ ] ✅ **Expected:** Stats update correctly

### Skip-Proof Verification

- [ ] Play a book for 1 minute
- [ ] Skip ahead 10 minutes
- [ ] Check analytics
- [ ] ✅ **Expected:** Shows ~1 minute listening time (not 11 minutes)
- [ ] ✅ **Expected:** Prevents inflated stats

---

## 🔟 Mobile & Responsive (Important)

### Mobile Browsers

- [ ] Open on mobile device or browser dev tools
- [ ] Test all pages (home, discover, book detail, library)
- [ ] ✅ **Expected:** Layout adapts to screen size
- [ ] ✅ **Expected:** Touch controls work
- [ ] ✅ **Expected:** Player controls accessible
- [ ] ❌ **Error Cases:** Broken layouts, buttons too small

### Player on Mobile

- [ ] Play audio on mobile
- [ ] Lock screen
- [ ] ✅ **Expected:** Playback continues
- [ ] ✅ **Expected:** Lock screen controls appear
- [ ] Unlock and navigate away
- [ ] ✅ **Expected:** Mini player still visible

---

## 1️⃣1️⃣ Theme System (Nice to Have)

### Dark/Light Mode

- [ ] Toggle theme switch
- [ ] ✅ **Expected:** Theme changes immediately
- [ ] ✅ **Expected:** All pages respect theme
- [ ] ✅ **Expected:** Theme persists on refresh
- [ ] Check player modal
- [ ] ✅ **Expected:** Theme applies to modal

---

## 1️⃣2️⃣ Error Scenarios (Critical)

### Network Errors

- [ ] Disconnect internet
- [ ] Try to load a page
- [ ] ✅ **Expected:** Shows error message
- [ ] ✅ **Expected:** Retry button available
- [ ] Reconnect internet
- [ ] Click retry
- [ ] ✅ **Expected:** Page loads

### Server Errors

- [ ] Stop Coqui TTS server
- [ ] Try to create a book
- [ ] ✅ **Expected:** Shows clear error message
- [ ] ✅ **Expected:** Job doesn't get stuck

### Invalid Data

- [ ] Try to play a book with missing audio file
- [ ] ✅ **Expected:** Shows "Audio not available" error
- [ ] Try to access non-existent book (/public/book/fake-id)
- [ ] ✅ **Expected:** 404 page or error message

---

## 📊 Performance Tests

### Page Load Times

- [ ] Measure home page load time → Target: < 2s
- [ ] Measure discover page load time → Target: < 3s
- [ ] Measure book detail load time → Target: < 2s

### Search Performance

- [ ] Search with filters applied → Target: < 1s response
- [ ] Browse discovery page → Should load within 2s

### Player Performance

- [ ] Audio should start within 1-2 seconds
- [ ] Seek should respond within 500ms
- [ ] Progress tracking shouldn't lag

---

## ✅ Testing Checklist Summary

### Critical (Must Pass)

- [ ] User can sign up and sign in
- [ ] User can create a book and it processes successfully
- [ ] User can play audio and controls work
- [ ] Progress tracking and auto-resume work
- [ ] Error handling shows helpful messages

### Important (Should Pass)

- [ ] Discovery and search work correctly
- [ ] Social features (likes, comments, ratings) work
- [ ] Library and saved books work
- [ ] Recommendations appear and are relevant
- [ ] Analytics show accurate data

### Nice to Have (Good to Pass)

- [ ] Mobile responsive works well
- [ ] Theme system works
- [ ] Performance meets targets

---

## 🐛 Bug Tracking

### Critical Bugs Found

1.
2.
3.

### Important Bugs Found

1.
2.
3.

### Minor Issues

1.
2.
3.

---

## 📝 Testing Notes

**Tested By:**  
**Date:**  
**Browser:**  
**Device:**

**Overall Status:** ⬜ Not Started | 🟡 In Progress | ✅ Complete | ❌ Failed

**Notes:**
