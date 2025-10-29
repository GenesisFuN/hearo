# Secret Achievements Setup Guide

## Overview

Secret achievements add mystery and excitement to the listening experience. Users won't know what they need to do until they unlock these achievements!

## Database Setup

Run the SQL file to set up the schema:

```bash
# In Supabase SQL Editor, run:
docs/add-secret-achievements.sql
```

This will:

1. Add `is_secret` column to achievements table
2. Create 7 secret achievements:
   - 🦉 **Night Owl**: Listen between midnight-4am for 3 nights
   - 🏃 **Marathon Listener**: Listen for 5 hours in a single session
   - 🐦 **Early Bird**: Listen between 5-7am for 7 mornings
   - ⚔️ **Weekend Warrior**: Complete 3 books entirely on weekends
   - ⚡ **Speed Reader**: Listen to entire book at 2x+ speed (future)
   - 🌙 **Midnight Reader**: Finish a book between 11pm-1am
   - 🗺️ **Genre Explorer**: Listen to at least 1 book from every available genre
3. Create 6 engagement achievements (visible):
   - 👍 **First Impression**: Leave your first like (1 like)
   - 💝 **Supportive Listener**: Like 10 different books
   - ⭐ **Super Fan**: Like 50 different books
   - 💬 **Voice of the Community**: Leave your first comment (1 comment)
   - 🗣️ **Conversation Starter**: Leave 10 comments
   - 📝 **Book Critic**: Leave 50 comments
4. Create `user_secret_achievement_progress` table for custom tracking

## How It Works

### Frontend (UI)

- **Locked secret achievements** show as:
  - Icon: 🔒 (with pulse animation)
  - Name: "???"
  - Description: "Secret Achievement - Unlock to reveal!"
  - Purple border and gradient background
  - No progress bar (keeps it mysterious)

- **Unlocked secret achievements** show as:
  - Regular achievement card with purple styling
  - "🔓 Secret Unlocked!" badge at top
  - Full name and description revealed
  - Purple text color and border

### Backend (API)

#### Stats API (`/api/stats`)

- Automatically masks secret achievements when locked
- Shows full details once unlocked
- Part of regular achievement flow

#### Secret Achievement Checker (`/api/check-secret-achievements`)

- Checks for secret achievement completion
- Analyzes playback history for special patterns:
  - **Night Owl**: Counts unique nights with listening between 12am-4am
  - **Early Bird**: Counts unique mornings with listening between 5am-7am
  - **Marathon Listener**: Finds sessions longer than 5 hours
  - **Weekend Warrior**: Counts books completed on Saturday/Sunday
  - **Midnight Reader**: Finds book completions between 11pm-1am
- Auto-unlocks when requirements met
- Returns list of newly unlocked achievements

## Usage

### Manual Check

Call the secret achievements checker when users visit their stats page:

```typescript
// In ListeningStats component
useEffect(() => {
  const checkSecrets = async () => {
    const response = await fetch("/api/check-secret-achievements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionData: {} }),
    });
    const data = await response.json();

    if (data.newlyUnlocked?.length > 0) {
      // Show toast notification for newly unlocked secrets!
      toast.success(
        `🎉 Secret Achievement Unlocked: ${data.newlyUnlocked.join(", ")}`
      );
    }
  };

  checkSecrets();
}, []);
```

### Automatic Background Checking

You could also check periodically:

- After each playback session ends
- Once per day when user opens app
- When user completes a book

## Adding New Secret Achievements

1. **Add to database**:

```sql
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, is_secret)
VALUES (
  'Your Achievement Name',
  'The secret requirement description',
  '🎯',
  'listening',
  'custom_type',  -- Define your own type
  1,
  TRUE  -- Mark as secret
);
```

2. **Add detection logic** in `check-secret-achievements/route.ts`:

```typescript
case "custom_type": {
  // Your custom logic here
  // Query playback_sessions or other tables
  // Set shouldUnlock = true when requirements met
  break;
}
```

## Future Enhancements

- Add playback speed tracking to enable Speed Reader achievement
- Add social achievements (e.g., "First Follower", "Popular Author")
- Add seasonal achievements (e.g., "Summer Reading Challenge")
- Add achievement hints after X attempts
- Add achievement categories in UI

## Testing

Test secret achievements by:

1. Creating test playback sessions with specific timestamps
2. Running the checker API manually
3. Verifying UI shows "???" for locked secrets
4. Completing requirements and checking unlock

Example test query:

```sql
-- Create a test night session
INSERT INTO playback_sessions (user_id, book_id, session_start, session_end, actual_listening_seconds, progress_seconds, duration_seconds)
VALUES (
  'your-user-id',
  'some-book-id',
  '2025-10-23 02:00:00',  -- 2 AM
  '2025-10-23 02:30:00',
  1800,
  1800,
  3600
);

-- Then call /api/check-secret-achievements
```

## Notes

- Secret achievements don't show progress bars (keeps mystery alive)
- They're included in achievement count but hidden in lists
- Progressive achievement system treats them normally (shows next secret to unlock)
- Auto-unlock still works - they'll unlock when requirements met
- Users discover them naturally through varied listening patterns
