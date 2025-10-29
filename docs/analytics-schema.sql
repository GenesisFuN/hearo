-- Analytics Schema for Hearo
-- Tracks detailed user engagement and listening behavior

-- Create analytics_events table for time-series data
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Event types:
-- 'view' - Book page viewed
-- 'play_start' - User started playing
-- 'play_progress' - Periodic progress updates (every 30 seconds)
-- 'play_complete' - User finished the book (reached 90%+)
-- 'like' - User liked the book
-- 'comment' - User commented
-- 'share' - User shared the book

-- Create playback_sessions table for detailed listening analytics
CREATE TABLE IF NOT EXISTS playback_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  progress_seconds INTEGER DEFAULT 0,
  completion_percentage DECIMAL(5,2) DEFAULT 0.00,
  device_type VARCHAR(50),
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create daily_stats table for aggregated metrics (for faster queries)
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views_count INTEGER DEFAULT 0,
  plays_count INTEGER DEFAULT 0,
  completions_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  unique_listeners INTEGER DEFAULT 0,
  total_listen_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate daily stats
  UNIQUE(work_id, date)
);

-- Create follower_stats table for tracking follower growth
CREATE TABLE IF NOT EXISTS follower_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  new_followers INTEGER DEFAULT 0,
  lost_followers INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_work_id ON analytics_events(work_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);

CREATE INDEX IF NOT EXISTS idx_playback_sessions_work_id ON playback_sessions(work_id);
CREATE INDEX IF NOT EXISTS idx_playback_sessions_user_id ON playback_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_playback_sessions_created_at ON playback_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_stats_work_id ON daily_stats(work_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date DESC);

CREATE INDEX IF NOT EXISTS idx_follower_stats_user_id ON follower_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_follower_stats_date ON follower_stats(date DESC);

-- Enable Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE follower_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view analytics for their works" ON analytics_events;
DROP POLICY IF EXISTS "Anyone can create analytics events" ON analytics_events;

DROP POLICY IF EXISTS "Users can view sessions for their works" ON playback_sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON playback_sessions;
DROP POLICY IF EXISTS "Anyone can create playback sessions" ON playback_sessions;

DROP POLICY IF EXISTS "Users can view stats for their works" ON daily_stats;
DROP POLICY IF EXISTS "System can manage daily stats" ON daily_stats;

DROP POLICY IF EXISTS "Users can view their own follower stats" ON follower_stats;
DROP POLICY IF EXISTS "System can manage follower stats" ON follower_stats;

-- RLS Policies for analytics_events

-- Creators can view analytics for their works
CREATE POLICY "Users can view analytics for their works"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM works
      WHERE works.id = analytics_events.work_id
      AND works.creator_id = auth.uid()
    )
  );

-- Anyone can create analytics events (for tracking)
CREATE POLICY "Anyone can create analytics events"
  ON analytics_events
  FOR INSERT
  TO public
  WITH CHECK (true);

-- RLS Policies for playback_sessions

-- Creators can view sessions for their works
CREATE POLICY "Users can view sessions for their works"
  ON playback_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM works
      WHERE works.id = playback_sessions.work_id
      AND works.creator_id = auth.uid()
    )
  );

-- Users can manage their own playback sessions
CREATE POLICY "Users can manage their own sessions"
  ON playback_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anyone can create playback sessions (for anonymous tracking)
CREATE POLICY "Anyone can create playback sessions"
  ON playback_sessions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- RLS Policies for daily_stats

-- Creators can view stats for their works
CREATE POLICY "Users can view stats for their works"
  ON daily_stats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM works
      WHERE works.id = daily_stats.work_id
      AND works.creator_id = auth.uid()
    )
  );

-- System/service role can manage daily stats (for aggregation)
CREATE POLICY "System can manage daily stats"
  ON daily_stats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for follower_stats

-- Users can view their own follower stats
CREATE POLICY "Users can view their own follower stats"
  ON follower_stats
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- System/service role can manage follower stats (for aggregation)
CREATE POLICY "System can manage follower stats"
  ON follower_stats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to update playback session
CREATE OR REPLACE FUNCTION update_playback_session()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Calculate completion percentage
  IF NEW.duration_seconds > 0 THEN
    NEW.completion_percentage = (NEW.progress_seconds::DECIMAL / NEW.duration_seconds::DECIMAL) * 100;
  END IF;
  
  -- Mark as completed if > 90%
  IF NEW.completion_percentage >= 90 THEN
    NEW.is_completed = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update playback session
DROP TRIGGER IF EXISTS trigger_update_playback_session ON playback_sessions;
CREATE TRIGGER trigger_update_playback_session
  BEFORE UPDATE ON playback_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_playback_session();

-- Function to aggregate daily stats (run this periodically via cron or scheduled job)
CREATE OR REPLACE FUNCTION aggregate_daily_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
  -- Insert or update daily stats for each work
  INSERT INTO daily_stats (work_id, date, views_count, plays_count, completions_count, 
                           likes_count, comments_count, unique_listeners, total_listen_time_seconds)
  SELECT 
    work_id,
    target_date,
    COUNT(*) FILTER (WHERE event_type = 'view') as views_count,
    COUNT(*) FILTER (WHERE event_type = 'play_start') as plays_count,
    COUNT(*) FILTER (WHERE event_type = 'play_complete') as completions_count,
    COUNT(*) FILTER (WHERE event_type = 'like') as likes_count,
    COUNT(*) FILTER (WHERE event_type = 'comment') as comments_count,
    COUNT(DISTINCT user_id) as unique_listeners,
    COALESCE(SUM((event_data->>'duration_seconds')::INTEGER), 0) as total_listen_time_seconds
  FROM analytics_events
  WHERE DATE(created_at) = target_date
  GROUP BY work_id
  ON CONFLICT (work_id, date)
  DO UPDATE SET
    views_count = EXCLUDED.views_count,
    plays_count = EXCLUDED.plays_count,
    completions_count = EXCLUDED.completions_count,
    likes_count = EXCLUDED.likes_count,
    comments_count = EXCLUDED.comments_count,
    unique_listeners = EXCLUDED.unique_listeners,
    total_listen_time_seconds = EXCLUDED.total_listen_time_seconds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to aggregate follower stats (run daily)
CREATE OR REPLACE FUNCTION aggregate_follower_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
  -- Calculate follower stats for each user
  INSERT INTO follower_stats (user_id, date, followers_count, following_count)
  SELECT 
    p.id as user_id,
    target_date,
    COALESCE(p.followers_count, 0) as followers_count,
    COALESCE(p.following_count, 0) as following_count
  FROM profiles p
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    followers_count = EXCLUDED.followers_count,
    following_count = EXCLUDED.following_count;
    
  -- Calculate new/lost followers compared to previous day
  UPDATE follower_stats fs
  SET 
    new_followers = GREATEST(fs.followers_count - COALESCE(prev.followers_count, 0), 0),
    lost_followers = GREATEST(COALESCE(prev.followers_count, 0) - fs.followers_count, 0)
  FROM follower_stats prev
  WHERE fs.date = target_date
    AND prev.user_id = fs.user_id
    AND prev.date = target_date - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
