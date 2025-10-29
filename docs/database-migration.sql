-- ============================================================
-- Hearo Database Migration
-- Safely upgrade from old schema to new schema
-- ============================================================

-- Step 1: Drop old tables that will be replaced
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS author_subscriptions CASCADE;
DROP TABLE IF EXISTS books CASCADE;

-- Step 2: Drop and recreate profiles with new structure
DROP TABLE IF EXISTS profiles CASCADE;

-- Step 3: Drop old triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- ============================================================
-- Now run the complete schema
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- AUTHENTICATION & USER PROFILES
-- ============================================================

CREATE TYPE user_type AS ENUM ('listener', 'creator');
CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'premium', 'creator');

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type user_type NOT NULL DEFAULT 'listener',
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  subscription_tier subscription_tier NOT NULL DEFAULT 'free',
  
  -- Preferences
  preferred_language TEXT DEFAULT 'en',
  email_notifications BOOLEAN DEFAULT true,
  
  -- Stats
  total_uploads INTEGER DEFAULT 0,
  total_listens INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ
);

-- Creator profiles (additional info for creators)
CREATE TABLE creator_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Creator info
  creator_name TEXT NOT NULL,
  website_url TEXT,
  social_links JSONB DEFAULT '{}',
  
  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  
  -- Stats
  total_works INTEGER DEFAULT 0,
  total_followers INTEGER DEFAULT 0,
  
  -- Settings
  allow_downloads BOOLEAN DEFAULT true,
  allow_comments BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTIONS & BILLING
-- ============================================================

CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'paused');
CREATE TYPE payment_provider AS ENUM ('stripe', 'paypal', 'manual');

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Subscription details
  tier subscription_tier NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  
  -- Billing
  payment_provider payment_provider,
  external_subscription_id TEXT,
  
  -- Dates
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  
  -- Usage limits
  monthly_upload_limit INTEGER,
  monthly_uploads_used INTEGER DEFAULT 0,
  storage_limit_gb NUMERIC(10,2),
  storage_used_gb NUMERIC(10,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  
  quantity INTEGER DEFAULT 1,
  size_bytes BIGINT,
  duration_seconds NUMERIC(10,2),
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WORKS & CONTENT
-- ============================================================

CREATE TYPE work_status AS ENUM ('draft', 'processing', 'published', 'archived', 'failed');
CREATE TYPE work_type AS ENUM ('audiobook', 'podcast', 'narration', 'other');
CREATE TYPE content_rating AS ENUM ('everyone', 'teen', 'mature', 'explicit');

CREATE TABLE works (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  work_type work_type NOT NULL DEFAULT 'audiobook',
  
  author TEXT,
  narrator TEXT,
  language TEXT DEFAULT 'en',
  duration_seconds INTEGER,
  content_rating content_rating DEFAULT 'everyone',
  
  cover_image_url TEXT,
  audio_file_id UUID,
  
  status work_status NOT NULL DEFAULT 'draft',
  is_public BOOLEAN DEFAULT false,
  
  tags TEXT[],
  genres TEXT[],
  metadata JSONB DEFAULT '{}',
  
  total_plays INTEGER DEFAULT 0,
  total_downloads INTEGER DEFAULT 0,
  total_favorites INTEGER DEFAULT 0,
  
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPLOADS & FILE PROCESSING
-- ============================================================

CREATE TYPE upload_status AS ENUM ('uploading', 'uploaded', 'processing', 'processed', 'failed');
CREATE TYPE upload_type AS ENUM ('text', 'audio', 'voice_sample');

CREATE TABLE uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_id UUID REFERENCES works(id) ON DELETE CASCADE,
  
  upload_type upload_type NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT,
  
  status upload_status NOT NULL DEFAULT 'uploading',
  progress_percentage INTEGER DEFAULT 0,
  error_message TEXT,
  
  tts_provider TEXT,
  tts_settings JSONB DEFAULT '{}',
  
  metadata JSONB DEFAULT '{}',
  
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audio_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_id UUID REFERENCES works(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES uploads(id) ON DELETE SET NULL,
  
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT DEFAULT 'audio/wav',
  
  duration_seconds NUMERIC(10,2),
  sample_rate INTEGER,
  bit_rate INTEGER,
  channels INTEGER DEFAULT 1,
  
  is_generated BOOLEAN DEFAULT false,
  tts_provider TEXT,
  tts_model TEXT,
  
  storage_bucket TEXT,
  storage_path TEXT,
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE processing_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
  
  job_type TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  job_data JSONB DEFAULT '{}',
  result_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VOICE CLONING
-- ============================================================

CREATE TABLE voice_samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  voice_name TEXT NOT NULL,
  description TEXT,
  
  audio_file_id UUID REFERENCES audio_files(id) ON DELETE CASCADE,
  sample_duration_seconds NUMERIC(10,2),
  
  is_verified BOOLEAN DEFAULT false,
  quality_score NUMERIC(3,2),
  
  is_public BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SOCIAL FEATURES
-- ============================================================

CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, work_id)
);

CREATE TABLE play_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  
  position_seconds NUMERIC(10,2) DEFAULT 0,
  duration_listened_seconds NUMERIC(10,2) DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  
  session_id UUID,
  device_info JSONB DEFAULT '{}',
  
  last_played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ANALYTICS & REPORTING
-- ============================================================

CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  work_id UUID REFERENCES works(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  plays INTEGER DEFAULT 0,
  unique_listeners INTEGER DEFAULT 0,
  total_listen_time_seconds INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, work_id, date)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_profiles_user_type ON profiles(user_type);
CREATE INDEX idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX idx_profiles_username ON profiles(username);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

CREATE INDEX idx_works_creator_id ON works(creator_id);
CREATE INDEX idx_works_status ON works(status);
CREATE INDEX idx_works_is_public ON works(is_public);
CREATE INDEX idx_works_slug ON works(slug);
CREATE INDEX idx_works_tags ON works USING GIN(tags);

CREATE INDEX idx_uploads_user_id ON uploads(user_id);
CREATE INDEX idx_uploads_work_id ON uploads(work_id);
CREATE INDEX idx_uploads_status ON uploads(status);

CREATE INDEX idx_audio_files_user_id ON audio_files(user_id);
CREATE INDEX idx_audio_files_work_id ON audio_files(work_id);

CREATE INDEX idx_processing_queue_status ON processing_queue(status);
CREATE INDEX idx_processing_queue_priority ON processing_queue(priority DESC);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_play_history_user_id ON play_history(user_id);
CREATE INDEX idx_play_history_work_id ON play_history(work_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Public works are viewable by everyone"
  ON works FOR SELECT
  USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Creators can insert own works"
  ON works FOR INSERT
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can update own works"
  ON works FOR UPDATE
  USING (creator_id = auth.uid());

CREATE POLICY "Creators can delete own works"
  ON works FOR DELETE
  USING (creator_id = auth.uid());

CREATE POLICY "Users can view own uploads"
  ON uploads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own uploads"
  ON uploads FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own uploads"
  ON uploads FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own audio files"
  ON audio_files FOR SELECT
  USING (
    user_id = auth.uid() OR
    work_id IN (SELECT id FROM works WHERE is_public = true)
  );

CREATE POLICY "Users can manage own favorites"
  ON favorites FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own play history"
  ON play_history FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_profiles_updated_at BEFORE UPDATE ON creator_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_works_updated_at BEFORE UPDATE ON works
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_uploads_updated_at BEFORE UPDATE ON uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audio_files_updated_at BEFORE UPDATE ON audio_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'display_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_work_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE works 
    SET total_plays = total_plays + 1
    WHERE id = NEW.work_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_play_history_created
  AFTER INSERT ON play_history
  FOR EACH ROW EXECUTE FUNCTION update_work_stats();

-- ============================================================
-- INITIAL DATA
-- ============================================================

CREATE TABLE subscription_tiers (
  tier subscription_tier PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly NUMERIC(10,2),
  
  monthly_upload_limit INTEGER,
  storage_limit_gb NUMERIC(10,2),
  can_use_coqui BOOLEAN DEFAULT false,
  can_use_elevenlabs BOOLEAN DEFAULT false,
  can_clone_voice BOOLEAN DEFAULT false,
  
  features JSONB DEFAULT '{}'
);

INSERT INTO subscription_tiers (tier, name, price_monthly, monthly_upload_limit, storage_limit_gb, can_use_coqui, can_use_elevenlabs, can_clone_voice) VALUES
  ('free', 'Free', 0, 3, 0.5, false, true, false),
  ('basic', 'Basic', 9.99, 10, 5, true, true, false),
  ('premium', 'Premium', 19.99, 50, 20, true, true, true),
  ('creator', 'Creator', 49.99, NULL, 100, true, true, true);

-- ============================================================
-- DONE!
-- ============================================================
