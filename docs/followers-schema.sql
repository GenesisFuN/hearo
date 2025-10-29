-- Create followers table
CREATE TABLE IF NOT EXISTS followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate follows
  UNIQUE(user_id, following_id),
  
  -- Prevent self-following
  CHECK (user_id != following_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_followers_user_id ON followers(user_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers(following_id);
CREATE INDEX IF NOT EXISTS idx_followers_created_at ON followers(created_at DESC);

-- Enable Row Level Security
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view followers" ON followers;
DROP POLICY IF EXISTS "Users can follow others" ON followers;
DROP POLICY IF EXISTS "Users can unfollow others" ON followers;

-- RLS Policies

-- Anyone can view follower relationships
CREATE POLICY "Anyone can view followers"
  ON followers
  FOR SELECT
  TO public
  USING (true);

-- Authenticated users can create follow relationships
CREATE POLICY "Users can follow others"
  ON followers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own follow relationships
CREATE POLICY "Users can unfollow others"
  ON followers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add follower/following counts to profiles (if columns don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'followers_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN followers_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'following_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN following_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Function to update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Increment follower count for the user being followed
    UPDATE profiles 
    SET followers_count = followers_count + 1 
    WHERE id = NEW.following_id;
    
    -- Increment following count for the user who followed
    UPDATE profiles 
    SET following_count = following_count + 1 
    WHERE id = NEW.user_id;
    
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    -- Decrement follower count for the user being unfollowed
    UPDATE profiles 
    SET followers_count = GREATEST(0, followers_count - 1) 
    WHERE id = OLD.following_id;
    
    -- Decrement following count for the user who unfollowed
    UPDATE profiles 
    SET following_count = GREATEST(0, following_count - 1) 
    WHERE id = OLD.user_id;
    
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for follower count updates
DROP TRIGGER IF EXISTS trigger_update_follower_counts ON followers;
CREATE TRIGGER trigger_update_follower_counts
  AFTER INSERT OR DELETE ON followers
  FOR EACH ROW
  EXECUTE FUNCTION update_follower_counts();

-- Initialize follower counts for existing profiles
UPDATE profiles
SET 
  followers_count = (
    SELECT COUNT(*) 
    FROM followers 
    WHERE following_id = profiles.id
  ),
  following_count = (
    SELECT COUNT(*) 
    FROM followers 
    WHERE user_id = profiles.id
  );
