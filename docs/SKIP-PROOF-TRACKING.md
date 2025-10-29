# Skip-Proof Listening Time Tracking

## Problem

Users could inflate their listening stats by skipping forward in audiobooks. For example:

- Listen for 5 minutes
- Skip forward 6 minutes
- Stats show 12 minutes (incorrect!)

The old system tracked **progress position** (where you are in the book) instead of **actual listening time** (how long you actually listened).

## Solution

### Two-Tier Tracking System

1. **`progress_seconds`** - Where you are in the book (can skip)
2. **`actual_listening_seconds`** - Real time spent listening (skip-proof)

### How It Works

#### Client-Side Tracking (`src/lib/progress.ts`)

The `ProgressTracker` class now:

1. **Monitors position changes** between updates
2. **Detects skips** by comparing time delta vs. actual elapsed time
3. **Only counts valid listening**:
   - Position change must be ≤ 2.2x elapsed time (allows 2x playback + buffer)
   - Example: 1 second passes → maximum 2.2 seconds of progress counts
   - Skip of 60 seconds → Not counted as listening time

```typescript
const positionDelta = currentTime - this.lastPosition;
const timeSinceLastUpdate = (Date.now() - this.lastSaveTime) / 1000;
const maxReasonableProgress = timeSinceLastUpdate * 2.2;

if (positionDelta > 0 && positionDelta <= maxReasonableProgress) {
  this.actualListeningSeconds += positionDelta; // ✅ Count it
}
// Skip detected → Don't count it ❌
```

#### Database Storage

**New Column**: `actual_listening_seconds`

- Increments atomically via `increment_listening_time()` function
- Prevents race conditions
- Cannot be manipulated by skipping

**Migration**: `docs/fix-listening-time-tracking.sql`

- Adds new column
- Migrates existing data using timestamp validation
- Creates atomic increment function

#### Stats Calculation (`src/app/api/stats/route.ts`)

Priority system:

1. **Prefer `actual_listening_seconds`** (new, skip-proof data)
2. **Fallback to timestamp validation** (old sessions)
3. **Last resort: raw progress** (legacy data without timestamps)

## Anti-Skip Protection

### What Gets Blocked

❌ **Skip forward 10 minutes** → Progress position updates, but actual listening time doesn't increase

❌ **Skip backward and replay** → Progress position may decrease, actual listening time still only counts once

❌ **Rapid chapter skipping** → Only real playback time counts

### What's Allowed

✅ **2x playback speed** → Counts 2 seconds for every 1 second of real time

✅ **Normal listening** → Everything counts 1:1

✅ **Pause and resume** → Timer pauses, resumes correctly

## Migration Steps

### 1. Run Database Migration

```sql
-- Run this in Supabase SQL Editor
-- File: docs/fix-listening-time-tracking.sql
```

This adds:

- `actual_listening_seconds` column
- `increment_listening_time()` function
- Migrates existing data
- Adds helpful comments

### 2. Deploy Code Changes

No additional steps needed - the code automatically:

- Uses new tracking for all new listening sessions
- Falls back gracefully for old sessions
- Maintains backward compatibility

### 3. Verify

After deployment, check logs for:

- `✅ Sessions fetched:` - Should see sessions being tracked
- No error messages about `actual_listening_seconds`

## Testing

### Scenario 1: Normal Listening

1. Listen for 5 minutes normally
2. Check stats → Should show ~5 minutes ✅

### Scenario 2: Skip Forward

1. Listen for 5 minutes
2. Skip forward 10 minutes
3. Check stats → Should show ~5 minutes (not 15) ✅

### Scenario 3: 2x Playback Speed

1. Listen for 5 real-world minutes at 2x speed
2. Should complete ~10 minutes of content
3. Check stats → Should show ~10 minutes ✅

### Scenario 4: Skip Backward

1. Listen for 5 minutes
2. Skip backward 3 minutes
3. Listen for 3 more minutes
4. Check stats → Should show ~8 minutes (5 + 3) ✅

## Implementation Details

### Update Frequency

Progress updates every **10 seconds** (auto-save interval)

Each update:

- Calculates time since last update
- Measures progress delta
- Validates against max reasonable progress (2.2x)
- Accumulates valid listening seconds
- Saves to database

### Buffer Explanation

**Why 2.2x instead of exactly 2x?**

Allows for:

- Network latency
- Timer imprecision
- UI throttling
- Race conditions

Without buffer: Legitimate 2x playback might occasionally be rejected

### Database Function

```sql
CREATE OR REPLACE FUNCTION increment_listening_time(...)
```

**Why a function?**

- **Atomic**: No race conditions if multiple tabs/devices
- **Secure**: Can't be bypassed with direct SQL
- **Accurate**: Increments in one transaction

## Monitoring

### What to Watch

Look for patterns in logs:

```
⚠️ Adjusted suspicious progress: 600s -> 120s
```

This indicates:

- Someone tried to count 10 minutes (600s)
- But only listened for 2 minutes (120s)
- System corrected it automatically

### False Positives

Rare, but possible:

- Network disconnection → Resume later → Large position jump
- System clock change
- Browser tab sleeping for extended period

These are logged but shouldn't affect legitimate users since they represent breaks in listening anyway.

## Future Enhancements

Potential additions:

- Session continuity detection (detect if user left page open but stopped playing)
- Device fingerprinting (detect if multiple devices trying to inflate stats)
- Rate limiting per day
- Pattern detection (detect automated bot behavior)

## Backward Compatibility

✅ **Old sessions** without `actual_listening_seconds` still work
✅ **API** returns valid data for both old and new sessions
✅ **Stats calculations** gracefully handle missing data
✅ **No data loss** during migration

## Summary

| Metric                | Before              | After               |
| --------------------- | ------------------- | ------------------- |
| Skip forward 10 min   | +10 min to stats ❌ | +0 min to stats ✅  |
| Listen 5 min at 2x    | +5 min to stats ❌  | +10 min to stats ✅ |
| Listen 5 min normally | +5 min to stats ✅  | +5 min to stats ✅  |

**Result**: Listening stats now reflect **actual time spent listening**, not just progress through the content.
