-- Listening Stats and Achievements Schema
-- Run this in Supabase SQL Editor

-- Create achievements table (defines all possible achievements)
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon VARCHAR(50), -- emoji or icon identifier
  category VARCHAR(50), -- 'listening', 'social', 'creator', 'streak'
  requirement_type VARCHAR(50), -- 'hours', 'books', 'streak_days', 'followers'
  requirement_value INTEGER NOT NULL,
  reward_type VARCHAR(50), -- 'badge', 'theme', 'avatar_border', 'credits'
  reward_data JSONB, -- stores reward details like color codes, image URLs, credit amount
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_achievements table (tracks what users have unlocked)
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate unlocks
  UNIQUE(user_id, achievement_id)
);

-- Create listening_stats table (cached stats for performance)
CREATE TABLE IF NOT EXISTS listening_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_listening_seconds INTEGER DEFAULT 0,
  books_completed INTEGER DEFAULT 0,
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  last_listened_date DATE,
  total_books_started INTEGER DEFAULT 0,
  favorite_genre VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_listening_stats_user_id ON listening_stats(user_id);

-- Enable Row Level Security
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievements (public read)
CREATE POLICY "Anyone can view achievements"
ON achievements
FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements"
ON user_achievements
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
ON user_achievements
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for listening_stats
CREATE POLICY "Users can view their own listening stats"
ON listening_stats
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own listening stats"
ON listening_stats
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listening stats"
ON listening_stats
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Insert default achievements
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, reward_type, reward_data) VALUES
-- Listening Hours
('First Steps', 'Listen to your first hour of audiobooks', '🎧', 'listening', 'hours', 1, 'badge', '{"color": "#3B82F6"}'),
('Getting Started', 'Listen to 10 hours of audiobooks', '📚', 'listening', 'hours', 10, 'badge', '{"color": "#8B5CF6"}'),
('Dedicated Listener', 'Listen to 50 hours of audiobooks', '🎵', 'listening', 'hours', 50, 'theme', '{"themeId": "purple", "name": "Purple Dream"}'),
('Audiobook Enthusiast', 'Listen to 100 hours of audiobooks', '🌟', 'listening', 'hours', 100, 'badge', '{"color": "#F59E0B"}'),
('Master Listener', 'Listen to 500 hours of audiobooks', '👑', 'listening', 'hours', 500, 'theme', '{"themeId": "gold", "name": "Golden Hour"}'),

-- Books Completed
('First Book', 'Complete your first audiobook', '✅', 'listening', 'books', 1, 'badge', '{"color": "#10B981"}'),
('Bookworm', 'Complete 5 audiobooks', '📖', 'listening', 'books', 5, 'badge', '{"color": "#3B82F6"}'),
('Avid Reader', 'Complete 25 audiobooks', '📚', 'listening', 'books', 25, 'avatar_border', '{"borderStyle": "gradient", "colors": ["#3B82F6", "#8B5CF6"]}'),
('Reading Champion', 'Complete 50 audiobooks', '🏆', 'listening', 'books', 50, 'credits', '{"amount": 5}'),
('Literary Legend', 'Complete 100 audiobooks', '⭐', 'listening', 'books', 100, 'theme', '{"themeId": "cosmic", "name": "Cosmic Reader"}'),

-- Streak Days
('Streak Starter', 'Listen for 3 days in a row', '🔥', 'streak', 'streak_days', 3, 'badge', '{"color": "#EF4444"}'),
('Week Warrior', 'Listen for 7 days in a row', '⚡', 'streak', 'streak_days', 7, 'badge', '{"color": "#F59E0B"}'),
('Month Master', 'Listen for 30 days in a row', '💫', 'streak', 'streak_days', 30, 'avatar_border', '{"borderStyle": "fire", "colors": ["#EF4444", "#F59E0B"]}'),
('Consistency King', 'Listen for 100 days in a row', '👑', 'streak', 'streak_days', 100, 'credits', '{"amount": 10}'),
('Unstoppable', 'Listen for 365 days in a row', '🌟', 'streak', 'streak_days', 365, 'theme', '{"themeId": "fire", "name": "Eternal Flame"}')
ON CONFLICT (name) DO NOTHING;

-- Add comments
COMMENT ON TABLE achievements IS 'Defines all possible achievements users can unlock';
COMMENT ON TABLE user_achievements IS 'Tracks which achievements users have unlocked';
COMMENT ON TABLE listening_stats IS 'Cached listening statistics for each user';
