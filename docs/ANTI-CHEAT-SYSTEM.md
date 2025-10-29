# Anti-Cheat System for Listening Stats & Achievements

## Overview

This system prevents users from gaming achievements by skipping through audiobooks or artificially inflating their listening time.

## Protection Mechanisms

### 1. **Books Completed Validation**

Located in: `src/app/api/stats/route.ts`

**Requirements for a book to count as "completed":**

- ✅ Progress must be ≥ 95% of total duration
- ✅ Actual session time must be ≥ 50% of content duration
- ✅ **Each book only counts ONCE** (prevents re-completing same book)

**Why 50%?**

- Allows playback speeds up to **2x** (our maximum available playback speed)
- Example: 10-hour book can be completed in 5 hours minimum
- Prevents skip-through completion (10-hour book in 5 minutes = blocked)

**Unique Book Protection:**

- Uses a `Set` to track completed `work_id`s
- Re-listening to same book won't inflate your completion count
- Prevents gaming: Can't complete same 1-hour book 100 times to get "Literary Legend"

**Logging:**

- Suspicious completions are logged: `🚫 Suspicious completion detected`
- Includes work_id and time comparison

### 2. **Listening Hours Validation**

**Protection:**

- Caps progress at 2x the actual session duration
- Example: 1 hour session can count maximum 2 hours of progress
- Allows for 2x speed listening (our maximum available playback speed)

**Logging:**

- Adjusted progress is logged: `⚠️ Adjusted suspicious progress`
- Shows original vs adjusted values

### 3. **Fallback for Legacy Data**

If `session_start` or `session_end` is missing (old data):

- Progress values are accepted as-is
- Ensures backward compatibility
- Future sessions will have full validation

## Implementation Details

### Database Columns Used

```sql
playback_sessions:
- session_start TIMESTAMPTZ
- session_end TIMESTAMPTZ
- progress_seconds INTEGER
- duration_seconds INTEGER
```

### Calculation Logic

**Time Validation:**

```typescript
sessionDurationSeconds = (session_end - session_start) / 1000;
minRequiredTime = duration_seconds * 0.4; // 40% minimum
maxAllowedProgress = sessionDurationSeconds * 3; // 3x maximum
```

## Adjusting Strictness

### Make More Strict

Reduce the multipliers in `/api/stats/route.ts`:

```typescript
// Books: Require 60% of duration (max 1.67x speed)
const minRequiredTime = s.duration_seconds * 0.6;

// Hours: Cap at 1.5x speed
const maxAllowedProgress = sessionDurationSeconds * 1.5;
```

### Make More Lenient

Increase the multipliers:

```typescript
// Books: Require 40% of duration (max 2.5x speed)
const minRequiredTime = s.duration_seconds * 0.4;

// Hours: Cap at 3x speed
const maxAllowedProgress = sessionDurationSeconds * 3;
```

## Additional Improvements (Future)

### 1. **Session Continuity Check**

- Track if sessions have realistic gaps
- Flag accounts with 24/7 listening patterns

### 2. **IP/Device Validation**

- Detect same user listening on multiple devices simultaneously
- Reasonable: Switch between phone/desktop
- Suspicious: 5 devices playing at once

### 3. **Progress Pattern Analysis**

- Normal: Gradual progress over time
- Suspicious: Instant jumps (0% → 100%)

### 4. **Rate Limiting**

```typescript
// Max listening hours per day (accounting for speed)
const MAX_DAILY_HOURS = 24 * 2; // 48 hours at 2x speed
```

### 5. **Achievement Unlock Throttling**

- Prevent bulk unlocking achievements at once
- Add cooldown periods between major achievements

## Monitoring

Add to your analytics dashboard:

1. Average session duration vs progress
2. Playback speed distribution (calculate from ratio)
3. Flagged suspicious sessions count
4. Achievement unlock velocity

## Testing

Test with realistic scenarios:

```javascript
// VALID: 10-hour book, 5-hour session, 2x speed
duration: 36000s, session: 18000s → ✅ Counts

// INVALID: 10-hour book, 5-minute session
duration: 36000s, session: 300s → 🚫 Blocked

// VALID: 2-hour listening at 2x speed (1 hour real time)
progress: 7200s, session: 3600s → ✅ Counts

// INVALID: Claiming 10 hours from 1-hour session
progress: 36000s, session: 3600s → ⚠️ Capped to 7200s
```

## Current Settings Summary

| Metric          | Minimum         | Maximum         | Reason              |
| --------------- | --------------- | --------------- | ------------------- |
| Book Completion | 95% progress    | -               | Standard completion |
| Session Time    | 50% of duration | -               | Allows 2x speed     |
| Listening Hours | -               | 2x session time | Allows 2x speed     |
| Completion Rate | 0.95            | 1.0             | Industry standard   |

## Security Notes

- All validation happens server-side (cannot be bypassed)
- Logs provide audit trail for investigation
- Backward compatible with old data
- No impact on legitimate users
- Suspicious activity is logged, not blocked (allows manual review)

## Status

✅ **IMPLEMENTED** - Anti-cheat active for:

- Books completed calculations
- Listening hours calculations
- Achievement progress tracking

⏳ **FUTURE** - Could add:

- Pattern analysis
- Rate limiting
- Multi-device detection
- Automated suspension system
