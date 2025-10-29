# Social Engagement System Implementation Guide

## 📊 Overview

This system adds likes, comments, ratings, and view tracking to public books in Hearo. It provides the foundation for:

- **Recommendation algorithms** - Based on engagement patterns
- **Creator payout weighting** - Fair compensation based on popularity
- **Trending feeds** - Surface popular content

## 🗄️ Step 1: Database Setup

Run the SQL script in Supabase SQL Editor:

```bash
# File: docs/social-engagement-schema.sql
```

This creates:

### Tables

- **book_likes** - User likes on books (one per user/book)
- **book_comments** - Comments with optional nesting (replies)
- **book_ratings** - 1-5 star ratings (one per user/book)

### New Columns on `works` table

- `likes_count` - Total likes
- `comments_count` - Total comments
- `average_rating` - Calculated average (0.0-5.0)
- `ratings_count` - Number of ratings
- `views_count` - Total plays/views

### RLS Policies

- All tables have SELECT for authenticated users
- Users can INSERT/UPDATE/DELETE their own records
- Automatic count updates via triggers

## 📁 Step 2: API Routes Created

### Likes

- `POST /api/books/[id]/like` - Toggle like (like/unlike)
- `GET /api/books/[id]/like` - Get like status + count

### Comments

- `GET /api/books/[id]/comments` - Get all comments for a book
- `POST /api/books/[id]/comments` - Create a comment
  - Body: `{ commentText: string, parentCommentId?: string }`
- `PATCH /api/books/[id]/comments/[commentId]` - Update your comment
- `DELETE /api/books/[id]/comments/[commentId]` - Delete your comment

### Ratings

- `POST /api/books/[id]/rate` - Rate a book (1-5 stars)
  - Body: `{ rating: number }` (1-5)
- `GET /api/books/[id]/rate` - Get your rating + average
- `DELETE /api/books/[id]/rate` - Remove your rating

### Views

- `POST /api/books/[id]/view` - Track a view/play

## 🎨 Step 3: Update API Response

Update `/api/books/route.ts` to include engagement data:

```typescript
// In the SELECT query, add:
.select(`
  *,
  likes_count,
  comments_count,
  average_rating,
  ratings_count,
  views_count,
  audio_files (
    file_path,
    file_size_bytes,
    duration_seconds
  )
`)

// In the response mapping:
{
  ...existingFields,
  likes: work.likes_count || 0,
  comments: work.comments_count || 0,
  averageRating: work.average_rating || 0,
  ratingsCount: work.ratings_count || 0,
  views: work.views_count || 0
}
```

## 🎨 Step 4: Update Frontend Components

### BookCard Component

Add engagement UI to book cards:

```typescript
interface Book {
  // ... existing fields
  likes?: number;
  comments?: number;
  averageRating?: number;
  ratingsCount?: number;
  views?: number;
}

// In the component:
const [liked, setLiked] = useState(false);
const [likesCount, setLikesCount] = useState(book.likes || 0);

const handleLike = async () => {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const response = await fetch(`/api/books/${book.id}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  setLiked(data.liked);
  setLikesCount(prev => data.liked ? prev + 1 : prev - 1);
};

// In JSX:
<div className="flex items-center gap-4 text-sm text-gray-400">
  <button onClick={handleLike} className="flex items-center gap-1">
    <Heart className={liked ? "fill-red-500 text-red-500" : ""} />
    {likesCount}
  </button>

  <span className="flex items-center gap-1">
    <MessageCircle /> {book.comments || 0}
  </span>

  <span className="flex items-center gap-1">
    <Star className="fill-yellow-500 text-yellow-500" />
    {book.averageRating?.toFixed(1) || "—"} ({book.ratingsCount || 0})
  </span>

  <span className="flex items-center gap-1">
    <Play /> {book.views || 0} plays
  </span>
</div>
```

### Comments Section

```typescript
const [comments, setComments] = useState([]);
const [newComment, setNewComment] = useState("");

useEffect(() => {
  fetch(`/api/books/${bookId}/comments`)
    .then((res) => res.json())
    .then((data) => setComments(data.comments));
}, [bookId]);

const handleComment = async () => {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  await fetch(`/api/books/${bookId}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ commentText: newComment }),
  });
  // Refresh comments
};
```

### Star Rating Component

```typescript
const StarRating = ({ bookId, initialRating }) => {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);

  const handleRate = async (value: number) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    await fetch(`/api/books/${bookId}/rate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rating: value })
    });
    setRating(value);
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`cursor-pointer ${
            star <= (hover || rating)
              ? "fill-yellow-500 text-yellow-500"
              : "text-gray-400"
          }`}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => handleRate(star)}
        />
      ))}
    </div>
  );
};
```

## 📈 Step 5: Track Views

When a book is played:

```typescript
const handlePlay = async () => {
  // Track view
  await fetch(`/api/books/${bookId}/view`, { method: "POST" });

  // Play audio
  audioRef.current?.play();
};
```

## 🎯 Step 6: Build Features

Now you have data for:

### Trending Algorithm

```sql
-- Most liked in last 7 days
SELECT * FROM works
WHERE is_public = true
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY likes_count DESC
LIMIT 10;

-- Highest rated
SELECT * FROM works
WHERE is_public = true
  AND ratings_count >= 5  -- Minimum ratings threshold
ORDER BY average_rating DESC, ratings_count DESC
LIMIT 10;

-- Most viewed
SELECT * FROM works
WHERE is_public = true
ORDER BY views_count DESC
LIMIT 10;
```

### Recommendation Engine

```typescript
// Collaborative filtering: Users who liked this also liked...
// Content-based: Similar genre + high ratings
// Engagement-based: High likes + comments ratio
```

### Creator Payouts

```typescript
// Weight by engagement score
const engagementScore =
  likes * 1.0 +
  comments * 2.0 + // Comments worth more
  (averageRating / 5) * ratings * 3.0 + // Ratings weighted by quality
  views * 0.1; // Views worth less

// Distribute pool based on score percentage
const creatorShare = (creatorScore / totalScore) * payoutPool;
```

## 🔒 Security Notes

- All RLS policies enforce user ownership
- Comments limited to 1000 characters
- Ratings must be 1-5 integers
- Only public books can be engaged with
- Authentication required for all actions except viewing

## ✅ Testing Checklist

- [ ] Run SQL schema in Supabase
- [ ] Verify tables created with `\dt`
- [ ] Like a book (toggle on/off)
- [ ] Post a comment
- [ ] Rate a book (1-5 stars)
- [ ] Track a view
- [ ] Check counts update in `works` table
- [ ] Test RLS: Can't modify other users' data
- [ ] Display engagement stats on book cards
- [ ] Build trending page

## 🚀 Next Steps

1. **Run the SQL schema** - Create all tables and triggers
2. **Update book fetching** - Include engagement counts
3. **Add UI components** - Like buttons, star ratings, comment sections
4. **Track views** - On play/download
5. **Build trending page** - Use engagement data
6. **Create recommendation system** - ML algorithms
7. **Implement payouts** - Fair creator compensation

---

**Ready to transform Hearo into a social audio platform!** 🎧✨
