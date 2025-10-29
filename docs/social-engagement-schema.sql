-- Social Engagement System for Public Books
-- Run this in Supabase SQL Editor

-- ============================================
-- LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS book_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one like per user per book
  UNIQUE(user_id, work_id)
);

-- Add index for faster queries
CREATE INDEX idx_book_likes_work_id ON book_likes(work_id);
CREATE INDEX idx_book_likes_user_id ON book_likes(user_id);

-- RLS Policies for likes
ALTER TABLE book_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
ON book_likes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can like books"
ON book_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
ON book_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS book_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  parent_comment_id UUID REFERENCES book_comments(id) ON DELETE CASCADE, -- For nested replies
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Validation
  CONSTRAINT comment_text_length CHECK (char_length(comment_text) >= 1 AND char_length(comment_text) <= 1000)
);

-- Add indexes
CREATE INDEX idx_book_comments_work_id ON book_comments(work_id);
CREATE INDEX idx_book_comments_user_id ON book_comments(user_id);
CREATE INDEX idx_book_comments_parent ON book_comments(parent_comment_id);

-- RLS Policies for comments
ALTER TABLE book_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
ON book_comments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create comments"
ON book_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON book_comments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON book_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- RATINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS book_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one rating per user per book
  UNIQUE(user_id, work_id)
);

-- Add indexes
CREATE INDEX idx_book_ratings_work_id ON book_ratings(work_id);
CREATE INDEX idx_book_ratings_user_id ON book_ratings(user_id);

-- RLS Policies for ratings
ALTER TABLE book_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings"
ON book_ratings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can rate books"
ON book_ratings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
ON book_ratings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
ON book_ratings FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- ADD ENGAGEMENT COLUMNS TO WORKS TABLE
-- ============================================
ALTER TABLE works 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS ratings_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- ============================================
-- FUNCTIONS TO UPDATE COUNTS
-- ============================================

-- Function to update likes count
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE works 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.work_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE works 
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.work_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update comments count
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE works 
    SET comments_count = comments_count + 1 
    WHERE id = NEW.work_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE works 
    SET comments_count = GREATEST(comments_count - 1, 0)
    WHERE id = OLD.work_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update average rating
CREATE OR REPLACE FUNCTION update_average_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating NUMERIC(3,2);
  rating_count INTEGER;
BEGIN
  SELECT AVG(rating)::NUMERIC(3,2), COUNT(*)
  INTO avg_rating, rating_count
  FROM book_ratings
  WHERE work_id = COALESCE(NEW.work_id, OLD.work_id);
  
  UPDATE works
  SET 
    average_rating = COALESCE(avg_rating, 0.0),
    ratings_count = rating_count
  WHERE id = COALESCE(NEW.work_id, OLD.work_id);
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for likes count
DROP TRIGGER IF EXISTS trigger_update_likes_count ON book_likes;
CREATE TRIGGER trigger_update_likes_count
AFTER INSERT OR DELETE ON book_likes
FOR EACH ROW
EXECUTE FUNCTION update_likes_count();

-- Trigger for comments count
DROP TRIGGER IF EXISTS trigger_update_comments_count ON book_comments;
CREATE TRIGGER trigger_update_comments_count
AFTER INSERT OR DELETE ON book_comments
FOR EACH ROW
EXECUTE FUNCTION update_comments_count();

-- Trigger for average rating
DROP TRIGGER IF EXISTS trigger_update_average_rating ON book_ratings;
CREATE TRIGGER trigger_update_average_rating
AFTER INSERT OR UPDATE OR DELETE ON book_ratings
FOR EACH ROW
EXECUTE FUNCTION update_average_rating();

-- ============================================
-- VERIFY INSTALLATION
-- ============================================
SELECT 
  table_name, 
  COUNT(*) as policy_count
FROM information_schema.tables t
LEFT JOIN pg_policies p ON p.tablename = t.table_name
WHERE t.table_schema = 'public' 
  AND t.table_name IN ('book_likes', 'book_comments', 'book_ratings')
GROUP BY table_name
ORDER BY table_name;
