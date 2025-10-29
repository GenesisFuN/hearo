-- Add is_secret column to achievements table (only if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'achievements' AND column_name = 'is_secret'
  ) THEN
    ALTER TABLE achievements ADD COLUMN is_secret BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add secret achievement types
-- These require special tracking logic

-- Insert secret achievements
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, is_secret)
VALUES 
  ('Night Owl', 'Listen between midnight and 4 AM for 3 different nights', '🦉', 'listening', 'night_sessions', 3, TRUE),
  ('Marathon Listener', 'Listen for 5 hours in a single session without stopping', '🏃', 'listening', 'session_length', 5, TRUE),
  ('Early Bird', 'Listen between 5 AM and 7 AM for 7 different mornings', '🐦', 'listening', 'morning_sessions', 7, TRUE),
  ('Weekend Warrior', 'Complete 3 books entirely on weekends', '⚔️', 'listening', 'weekend_books', 3, TRUE),
  ('Speed Reader', 'Listen to an entire book at 2x speed or higher', '⚡', 'listening', 'speed_book', 1, TRUE),
  ('Midnight Reader', 'Finish a book between 11 PM and 1 AM', '🌙', 'listening', 'midnight_finish', 1, TRUE),
  ('Genre Explorer', 'Listen to at least 1 book from each available genre', '🗺️', 'listening', 'genre_variety', 1, TRUE);

-- Insert regular engagement achievements
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, is_secret, reward_type)
VALUES 
  ('First Impression', 'Leave your first like on a book', '👍', 'engagement', 'likes', 1, FALSE, 'badge'),
  ('Supportive Listener', 'Like 10 different books', '💝', 'engagement', 'likes', 10, FALSE, 'badge'),
  ('Super Fan', 'Like 50 different books', '⭐', 'engagement', 'likes', 50, FALSE, 'badge'),
  ('Voice of the Community', 'Leave your first comment on a book', '💬', 'engagement', 'comments', 1, FALSE, 'badge'),
  ('Conversation Starter', 'Leave 10 comments on books', '🗣️', 'engagement', 'comments', 10, FALSE, 'badge'),
  ('Book Critic', 'Leave 50 comments on books', '📝', 'engagement', 'comments', 50, FALSE, 'badge');

-- Create table to track special achievement progress for users
CREATE TABLE IF NOT EXISTS user_secret_achievement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  progress_data JSONB DEFAULT '{}', -- Store custom progress data
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE user_secret_achievement_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own secret achievement progress"
  ON user_secret_achievement_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own secret achievement progress"
  ON user_secret_achievement_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own secret achievement progress"
  ON user_secret_achievement_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON COLUMN achievements.is_secret IS 'If true, hide name/description until unlocked';
COMMENT ON TABLE user_secret_achievement_progress IS 'Tracks progress for secret achievements with custom logic';
COMMENT ON COLUMN user_secret_achievement_progress.progress_data IS 'JSON data: {night_dates: ["2025-01-01"], session_start: "timestamp", etc}';
