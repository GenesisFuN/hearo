# Progress Tracking - Debugging History

## Problem: Resume Functionality Not Working

This document chronicles the debugging process for the playback progress tracking feature. The issue was that progress wasn't being saved despite the system appearing to run correctly.

## Timeline of Issues and Fixes

### Issue #1: Database Error with .single()

**Symptom**: Console error "Cannot coerce to single JSON object"  
**Cause**: Using `.single()` when no progress exists throws error  
**Fix**: Changed to `.maybeSingle()` in both `getProgress()` and `saveProgress()`

```typescript
// ❌ OLD - Throws error if no rows
.single()

// ✅ NEW - Returns null if no rows
.maybeSingle()
```

**Files Modified**:

- `src/lib/progress.ts` (lines 59, 130)

**Result**: No more errors, but progress still not saving

---

### Issue #2: ProgressTracker Created but update() Never Called

**Symptom**: Console logs showed:

```
[ProgressTracker] Created for work ...
[ProgressTracker] Interval triggered, but no pending progress
```

**Investigation**:

- ✅ Tracker was being instantiated
- ✅ Interval was running every 10 seconds
- ❌ `update()` method never called
- ❌ `pendingProgress` always null

**Hypothesis**: The condition checking `duration > 0` was false

---

### Issue #3: State Duration was 0

**Symptom**: Added debug logging to `updateTime()`:

```javascript
console.log({
  currentTime: audio.currentTime.toFixed(1),
  duration: duration, // ❌ This was 0!
  hasProgressTracker: !!progressTrackerRef.current,
});
```

**Console Output**:

```
{currentTime: '5.3', duration: 0, hasProgressTracker: true}
```

**Analysis**:

- `audio.currentTime` was updating correctly (5.3 seconds)
- `progressTrackerRef.current` existed (tracker created)
- BUT `duration` state variable was **0** even though audio was playing!

**Root Cause**: React state updates asynchronously. The `updateTime()` callback was accessing stale state before the `onLoadedMetadata` event had updated the duration.

---

### Issue #4: THE FIX - Direct DOM Property Access

**Solution**: Access `audio.duration` directly from HTMLAudioElement instead of React state

**Code Change**:

```typescript
// ❌ OLD - Uses React state (async, might be stale)
const updateTime = () => {
  if (progressTrackerRef.current && duration > 0) {
    progressTrackerRef.current.update(audio.currentTime, duration);
  }
};

// ✅ NEW - Uses DOM property directly (always current)
const updateTime = () => {
  const audioDuration = audio.duration; // Get directly from element
  if (
    progressTrackerRef.current &&
    isFinite(audioDuration) &&
    audioDuration > 0
  ) {
    progressTrackerRef.current.update(audio.currentTime, audioDuration);
  }
};
```

**Files Modified**:

- `src/components/AudioPlayer.tsx` (lines 25-44)

**Result**: ✅ Progress tracking works perfectly!

---

## Key Learnings

### 1. React State vs DOM Properties

When working with native HTML elements (like `<audio>`), prefer accessing DOM properties directly in event handlers rather than relying on React state.

**Why**: State updates are asynchronous and batched. Event handlers may run before state updates complete.

### 2. .single() vs .maybeSingle()

In Supabase queries where results might not exist:

- Use `.maybeSingle()` for optional data (returns `null` if no rows)
- Use `.single()` only when row is guaranteed to exist (throws error if not)

### 3. Debug Logging Strategy

Add targeted console.logs to trace execution flow:

1. Function entry/exit points
2. Conditional branches (log when conditions are true/false)
3. Variable values at critical points
4. Async operation results

**Example from this debugging session**:

```typescript
// Log every 5 seconds to avoid console spam
if (Math.floor(currentTime) % 5 === 0 && currentTime > 0) {
  console.log("[Component] Key values:", {
    stateValue: duration, // React state
    domValue: audio.duration, // Direct DOM access
    difference: audio.duration - duration,
  });
}
```

### 4. Interval Patterns

For periodic saves with frequent updates:

```typescript
class Tracker {
  private pendingData = null;

  // Called frequently (every frame)
  update(data) {
    this.pendingData = data; // Just store, don't save yet
  }

  // Called periodically (every 10s)
  private autoSave = setInterval(() => {
    if (this.pendingData) {
      this.save(this.pendingData); // Save accumulated data
    }
  }, 10000);
}
```

This pattern prevents excessive database writes while ensuring recent data is saved.

## Debugging Tools Used

### Browser Console

- `console.log()` for tracing execution
- Chrome DevTools Network tab for API calls
- Application tab for localStorage inspection

### Supabase Dashboard

- Table Editor to verify saved sessions
- SQL Editor to run manual queries
- Logs tab to check for RLS policy blocks

### VS Code

- File search for tracking function usage
- Find references to understand call chains
- Git diff to track changes between iterations

## Console Log Progression

### Initial (Broken)

```
[ProgressTracker] Created for work 33047dce...
[ProgressTracker] Interval triggered, but no pending progress
[ProgressTracker] Interval triggered, but no pending progress
```

### After Adding Debug Logs

```
[AudioPlayer] updateTime called: {currentTime: '5.3', duration: 0}
[AudioPlayer] updateTime called: {currentTime: '10.5', duration: 0}
[ProgressTracker] Interval triggered, but no pending progress
```

### After Fix (Working)

```
[ProgressTracker] Update called: {currentTime: '5.2', duration: '345.0'}
[ProgressTracker] Update called: {currentTime: '10.3', duration: '345.0'}
[ProgressTracker] Interval triggered, saving...
[ProgressTracker] Saving progress for 33047dce: {percentage: '2.8%'}
[saveProgress] Successfully created
```

## Testing Commands

### Check Database

```sql
-- View all saved progress
SELECT
  ps.*,
  w.title as book_title
FROM playback_sessions ps
JOIN works w ON w.id = ps.work_id
ORDER BY ps.updated_at DESC;

-- Check specific user's progress
SELECT * FROM playback_sessions
WHERE user_id = 'YOUR_USER_ID'
ORDER BY updated_at DESC;
```

### Check localStorage (Anonymous Users)

```javascript
// View all progress entries
Object.keys(localStorage)
  .filter((key) => key.startsWith("progress_"))
  .forEach((key) => {
    console.log(key, JSON.parse(localStorage.getItem(key)));
  });

// Clear all progress
Object.keys(localStorage)
  .filter((key) => key.startsWith("progress_"))
  .forEach((key) => localStorage.removeItem(key));
```

## Final Working Flow

1. **User presses play**
   - `AudioPlayer` creates `ProgressTracker` instance
   - Tracker starts 10-second interval

2. **Audio plays**
   - `updateTime()` fires every ~300ms (timeupdate event)
   - Gets `audio.duration` directly from DOM (e.g., 345.0)
   - Calls `tracker.update(currentTime, duration)`
   - Updates `pendingProgress` object

3. **Every 10 seconds**
   - Interval fires
   - Checks `if (pendingProgress)` → true
   - Calls `saveProgress(workId, currentTime, duration)`
   - Saves to database or localStorage

4. **User switches books**
   - `tracker.stop()` called
   - Final save with latest position
   - Cleans up interval

5. **User returns later**
   - `getProgress(workId)` retrieves saved position
   - If >30 seconds, shows resume prompt
   - User clicks "Resume" → jumps to saved time

## Lessons for Future Features

1. **Always test the "no data" case** - Use `.maybeSingle()` for optional queries
2. **Don't rely on state in event handlers** - Access DOM directly when possible
3. **Add comprehensive logging early** - Saves hours of debugging later
4. **Test the full user journey** - From first play through closing and reopening
5. **Verify database writes** - Don't assume saves worked, check the table

## Time Investment

- Initial implementation: 2 hours
- Debugging iteration #1 (.maybeSingle fix): 20 minutes
- Debugging iteration #2 (logging): 30 minutes
- Debugging iteration #3 (duration fix): 15 minutes
- Testing and verification: 30 minutes
- Documentation: 45 minutes

**Total**: ~4.5 hours from concept to working feature with docs

---

**Status**: ✅ Resolved and documented  
**Last Updated**: October 19, 2025
