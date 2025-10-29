# Analytics Setup Guide

## Step 1: Run Database Migration

Go to your Supabase dashboard SQL editor and run the migration:

```sql
-- Copy and paste the entire contents of docs/analytics-schema.sql
```

This will create:

- ✅ `analytics_events` - Time-series event tracking
- ✅ `playback_sessions` - Detailed listening sessions
- ✅ `daily_stats` - Aggregated daily metrics per work
- ✅ `follower_stats` - Daily follower growth tracking
- ✅ Indexes for performance
- ✅ RLS policies for security
- ✅ Triggers for auto-calculations
- ✅ Aggregation functions

## Step 2: Test the API

The analytics API is now available at:

**Track Events:**

```
POST /api/analytics/track
Body: {
  workId: "uuid",
  eventType: "view" | "play_start" | "play_progress" | "play_complete" | "like" | "comment" | "share",
  eventData: { /* optional JSONB data */ }
}
```

**Get Analytics Dashboard:**

```
GET /api/analytics?days=30
GET /api/analytics?workId=uuid&days=7
```

## Step 3: View Your Analytics

Navigate to `/analytics` in your app to see your creator dashboard!

## Next Steps

Now we need to integrate tracking calls throughout the app:

### 1. Track Views on Book Pages

Add to `src/app/book/[id]/page.tsx`:

```typescript
useEffect(() => {
  trackEvent(bookId, "view");
}, [bookId]);
```

### 2. Track Playback in AudioPlayer

Add to your audio player component:

- Track `play_start` when user clicks play
- Track `play_progress` every 30 seconds
- Track `play_complete` when >90% completed

### 3. Track Likes and Comments

Already happening via existing actions - just add analytics call:

```typescript
await fetch("/api/analytics/track", {
  method: "POST",
  body: JSON.stringify({
    workId: bookId,
    eventType: "like",
  }),
});
```

## Aggregation Jobs

The schema includes functions for daily aggregation:

- `aggregate_daily_stats(date)` - Aggregate playback and engagement metrics
- `aggregate_follower_stats(date)` - Track follower growth

You can call these manually or set up a cron job:

```sql
SELECT aggregate_daily_stats(CURRENT_DATE - INTERVAL '1 day');
SELECT aggregate_follower_stats(CURRENT_DATE - INTERVAL '1 day');
```

## Security

- ✅ RLS policies ensure creators can only view their own analytics
- ✅ Anonymous users can create events (for public books)
- ✅ Admin role can aggregate stats
- ✅ User IDs are optional (allows anonymous tracking)
