# Continue Listening Feature

## Overview

Added a "Continue Listening" section to the Library page that shows audiobooks users are currently listening to with their playback progress.

## Implementation Date

October 19, 2025

## Components Created

### 1. API Endpoint: `/api/continue-listening`

**File:** `src/app/api/continue-listening/route.ts`

**Functionality:**

- Queries `playback_progress` table for current user
- Filters books with progress > 0% and < 95% (in-progress only)
- Joins with `works` and `profiles` tables for complete book info
- Sorts by `last_updated` DESC (most recent first)
- Returns formatted book data with progress information

**Response Format:**

```json
{
  "books": [
    {
      "id": "uuid",
      "title": "Book Title",
      "artist": "Narrator Name",
      "coverImage": "https://...",
      "currentTime": 1234,
      "duration": 5000,
      "progress": 45,
      "lastListened": "2025-10-19T..."
    }
  ]
}
```

### 2. UI Component: `ContinueListeningCard`

**File:** `src/components/ContinueListeningCard.tsx`

**Features:**

- **2:3 Aspect Ratio Cover** - Matches book cover proportions
- **Progress Bar** - Visual progress indicator at bottom of cover
- **Hover Play Button** - Large circular play button appears on hover
- **Progress Info** - Shows percentage complete and time remaining
- **Compact Design** - 192px (12rem) wide cards for horizontal scrolling

**Visual Elements:**

- Cover image with fallback 📚 emoji
- Progress bar with accent color
- Play button (64px) with hover scale effect
- Title (line-clamp-2)
- Artist name (line-clamp-1)
- Progress percentage in accent color
- Time remaining in subdued color

### 3. Library Page Integration

**File:** `src/app/library/page.tsx`

**Location:** Between header and tabs section

**Behavior:**

- Only shows when user has books in progress
- Horizontal scrolling carousel
- Hidden scrollbar (scrollbar-hide class)
- Fetches data on page load
- Updates when library data refreshes

## User Experience

### Flow

1. User starts listening to a book
2. Progress is automatically saved every 10 seconds
3. Progress appears in "Continue Listening" on Library page
4. User clicks play button or cover to resume
5. Playback resumes from saved position

### Edge Cases Handled

- **No cover image:** Shows 📚 emoji fallback
- **Near completion (>95%):** Book removed from Continue Listening
- **Zero duration:** Filtered out (invalid audio)
- **Not started:** Only shows books with progress > 0%

## Progress Calculation

```typescript
progress = (currentTime / duration) * 100;
remaining = duration - currentTime;
```

**Thresholds:**

- Min: > 0% (has started)
- Max: < 95% (not completed)

## Styling

### Carousel

- Horizontal scroll with hidden scrollbar
- 16px gap between cards
- Padding on edges for overflow visibility
- Smooth scrolling behavior

### Card Dimensions

- Width: 192px (w-48)
- Height: Auto (maintains 2:3 ratio)
- Cover: Full width with 2:3 aspect ratio
- Progress bar: 4px height

### Colors

- Progress bar background: surface/60
- Progress fill: accent
- Progress %: accent
- Time remaining: text-light/50

## CSS Additions

**File:** `src/styles/globals.css`

```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

## Database Schema Used

### Tables

- `playback_progress` - Stores current playback position
- `works` - Book metadata
- `profiles` - Creator information

### Columns Queried

```sql
playback_progress:
  - work_id
  - user_id
  - current_time
  - duration
  - last_updated

works:
  - id
  - title
  - description
  - genre
  - cover_image
  - creator_id

profiles:
  - username
  - display_name
```

## Future Enhancements

### Possible Additions

- [ ] "Resume All" button to create a queue
- [ ] Sort options (recently played, most progress, title)
- [ ] Remove/hide books from Continue Listening
- [ ] See Continue Listening on homepage too
- [ ] Show book series together
- [ ] "Mark as Complete" button at 90%+
- [ ] Progress sync across devices (already works via DB)
- [ ] Estimated time to finish calculation

## Testing Checklist

✅ Books appear after starting playback
✅ Progress percentage displays correctly
✅ Play button resumes from saved position
✅ Horizontal scroll works smoothly
✅ Fallback image shows when no cover
✅ Books disappear after 95% completion
✅ Sorts by most recently played
✅ Responsive on mobile/tablet/desktop
✅ Loading state handled properly
✅ Empty state (no books) handled

## Performance Notes

- Queries run on page load only
- No real-time updates (requires manual refresh)
- Efficient with LIMIT and proper indexes
- Join queries optimized in Supabase

## Accessibility

- Play buttons have aria-labels
- Images have alt text
- Keyboard navigable (scroll with arrow keys)
- Color contrast meets WCAG standards
- Focus states on interactive elements

## Related Features

- Progress Tracking System (`src/lib/progress.ts`)
- Audio Player (`src/components/AudioPlayer.tsx`)
- Playback Analytics (`src/lib/analytics.ts`)
- Resume Prompt in Audio Player
