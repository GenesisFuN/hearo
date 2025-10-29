-- ============================================================
-- Hearo Complete Database Schema
-- PostgreSQL with Supabase Auth Integration
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- AUTHENTICATION & USER PROFILES
-- ============================================================

-- Supabase auth.users table is handled by Supabase Auth
-- We extend it with our own profiles table

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
  external_subscription_id TEXT, -- Stripe subscription ID, etc.
  
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
  
  -- Usage details
  action TEXT NOT NULL, -- 'tts_generation', 'upload', 'download', etc.
  resource_type TEXT, -- 'audio', 'text', etc.
  resource_id UUID,
  
  -- Metrics
  quantity INTEGER DEFAULT 1,
  size_bytes BIGINT,
  duration_seconds NUMERIC(10,2),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WORKS & CONTENT
-- ============================================================

CREATE TYPE work_status AS ENUM ('draft', 'processing', 'published', 'archived', 'failed');
CREATE TYPE work_type AS ENUM ('audiobook', 'podcast', 'narration', 'other');
CREATE TYPE content_rating AS ENUM ('everyone', 'teen', 'mature', 'explicit');

-- Works (audiobooks, podcasts, etc.)
CREATE TABLE works (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Basic info
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  work_type work_type NOT NULL DEFAULT 'audiobook',
  
  -- Content details
  author TEXT,
  narrator TEXT,
  language TEXT DEFAULT 'en',
  duration_seconds INTEGER,
  content_rating content_rating DEFAULT 'everyone',
  
  -- Media
  cover_image_url TEXT,
  audio_file_id UUID, -- Final combined audio
  
  -- Status
  status work_status NOT NULL DEFAULT 'draft',
  is_public BOOLEAN DEFAULT false,
  
  -- Metadata
  tags TEXT[],
  genres TEXT[],
  metadata JSONB DEFAULT '{}',
  
  -- Stats
  total_plays INTEGER DEFAULT 0,
  total_downloads INTEGER DEFAULT 0,
  total_favorites INTEGER DEFAULT 0,
  
  -- Timestamps
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
  
  -- Upload details
  upload_type upload_type NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT,
  
  -- Processing
  status upload_status NOT NULL DEFAULT 'uploading',
  progress_percentage INTEGER DEFAULT 0,
  error_message TEXT,
  
  -- TTS settings (for text uploads)
  tts_provider TEXT, -- 'coqui', 'elevenlabs'
  tts_settings JSONB DEFAULT '{}',
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audio files (generated or uploaded)
CREATE TABLE audio_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_id UUID REFERENCES works(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES uploads(id) ON DELETE SET NULL,
  
  -- File details
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT DEFAULT 'audio/wav',
  
  -- Audio properties
  duration_seconds NUMERIC(10,2),
  sample_rate INTEGER,
  bit_rate INTEGER,
  channels INTEGER DEFAULT 1,
  
  -- Generation details (if TTS generated)
  is_generated BOOLEAN DEFAULT false,
  tts_provider TEXT,
  tts_model TEXT,
  
  -- Storage
  storage_bucket TEXT, -- Supabase storage bucket
  storage_path TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Processing queue for background jobs
CREATE TABLE processing_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
  
  -- Job details
  job_type TEXT NOT NULL, -- 'tts_generation', 'audio_processing', etc.
  priority INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  
  -- Processing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Job data
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
  
  -- Voice details
  voice_name TEXT NOT NULL,
  description TEXT,
  
  -- File details
  audio_file_id UUID REFERENCES audio_files(id) ON DELETE CASCADE,
  sample_duration_seconds NUMERIC(10,2),
  
  -- Quality/validation
  is_verified BOOLEAN DEFAULT false,
  quality_score NUMERIC(3,2), -- 0.00 to 1.00
  
  -- Usage
  is_public BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SOCIAL FEATURES
-- ============================================================

-- User follows
CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Favorites/bookmarks
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, work_id)
);

-- Listening history
CREATE TABLE play_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  
  -- Playback details
  position_seconds NUMERIC(10,2) DEFAULT 0,
  duration_listened_seconds NUMERIC(10,2) DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  
  -- Session
  session_id UUID,
  device_info JSONB DEFAULT '{}',
  
  last_played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  -- Comment content
  content TEXT NOT NULL,
  
  -- Status
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  
  -- Timestamps
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ANALYTICS & REPORTING
-- ============================================================

-- Daily stats rollup
CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  work_id UUID REFERENCES works(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Metrics
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

-- Profiles
CREATE INDEX idx_profiles_user_type ON profiles(user_type);
CREATE INDEX idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX idx_profiles_username ON profiles(username);

-- Subscriptions
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Works
CREATE INDEX idx_works_creator_id ON works(creator_id);
CREATE INDEX idx_works_status ON works(status);
CREATE INDEX idx_works_is_public ON works(is_public);
CREATE INDEX idx_works_slug ON works(slug);
CREATE INDEX idx_works_tags ON works USING GIN(tags);

-- Uploads
CREATE INDEX idx_uploads_user_id ON uploads(user_id);
CREATE INDEX idx_uploads_work_id ON uploads(work_id);
CREATE INDEX idx_uploads_status ON uploads(status);

-- Audio files
CREATE INDEX idx_audio_files_user_id ON audio_files(user_id);
CREATE INDEX idx_audio_files_work_id ON audio_files(work_id);

-- Processing queue
CREATE INDEX idx_processing_queue_status ON processing_queue(status);
CREATE INDEX idx_processing_queue_priority ON processing_queue(priority DESC);

-- Social
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_play_history_user_id ON play_history(user_id);
CREATE INDEX idx_play_history_work_id ON play_history(work_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
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

-- Profiles: Users can read all profiles, update their own
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Works: Public works viewable by all, creators manage own works
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

-- Uploads: Users can only access own uploads
CREATE POLICY "Users can view own uploads"
  ON uploads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own uploads"
  ON uploads FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own uploads"
  ON uploads FOR UPDATE
  USING (user_id = auth.uid());

-- Audio files: Users can access own files, public files via works
CREATE POLICY "Users can view own audio files"
  ON audio_files FOR SELECT
  USING (
    user_id = auth.uid() OR
    work_id IN (SELECT id FROM works WHERE is_public = true)
  );

-- Favorites: Users manage own favorites
CREATE POLICY "Users can manage own favorites"
  ON favorites FOR ALL
  USING (user_id = auth.uid());

-- Play history: Users access own history
CREATE POLICY "Users can manage own play history"
  ON play_history FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
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

-- Create profile on user signup
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

-- Update work stats
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

-- Subscription tier limits
CREATE TABLE subscription_tiers (
  tier subscription_tier PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly NUMERIC(10,2),
  
  -- Limits
  monthly_upload_limit INTEGER,
  storage_limit_gb NUMERIC(10,2),
  can_use_coqui BOOLEAN DEFAULT false,
  can_use_elevenlabs BOOLEAN DEFAULT false,
  can_clone_voice BOOLEAN DEFAULT false,
  
  -- Features
  features JSONB DEFAULT '{}'
);

INSERT INTO subscription_tiers (tier, name, price_monthly, monthly_upload_limit, storage_limit_gb, can_use_coqui, can_use_elevenlabs, can_clone_voice) VALUES
  ('free', 'Free', 0, 3, 0.5, false, true, false),
  ('basic', 'Basic', 9.99, 10, 5, true, true, false),
  ('premium', 'Premium', 19.99, 50, 20, true, true, true),
  ('creator', 'Creator', 49.99, NULL, 100, true, true, true);

-- ============================================================
-- NOTES
-- ============================================================

/*
Authentication Flow:
1. User signs up via Supabase Auth
2. Trigger creates profile automatically
3. JWT contains user_id and role
4. RLS policies enforce access control

Session Management:
- Supabase handles JWT tokens
- Tokens stored in httpOnly cookies
- Auto-refresh on expiration
- Logout clears tokens

Usage:
- Use Supabase client for auth
- Access user via auth.uid() in policies
- Client gets JWT automatically
*/
