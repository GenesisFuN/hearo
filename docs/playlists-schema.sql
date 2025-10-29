-- Create playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create playlist_items table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS playlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate items in same playlist
  UNIQUE(playlist_id, work_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON playlists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_id ON playlist_items(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_work_id ON playlist_items(work_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_position ON playlist_items(playlist_id, position);

-- Enable Row Level Security
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own playlists" ON playlists;
DROP POLICY IF EXISTS "Anyone can view public playlists" ON playlists;
DROP POLICY IF EXISTS "Users can create own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can update own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can delete own playlists" ON playlists;

DROP POLICY IF EXISTS "Users can view playlist items from accessible playlists" ON playlist_items;
DROP POLICY IF EXISTS "Users can add items to own playlists" ON playlist_items;
DROP POLICY IF EXISTS "Users can remove items from own playlists" ON playlist_items;

-- RLS Policies for playlists

-- Users can view their own playlists
CREATE POLICY "Users can view own playlists"
  ON playlists
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Anyone can view public playlists
CREATE POLICY "Anyone can view public playlists"
  ON playlists
  FOR SELECT
  TO public
  USING (is_public = true);

-- Users can create their own playlists
CREATE POLICY "Users can create own playlists"
  ON playlists
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own playlists
CREATE POLICY "Users can update own playlists"
  ON playlists
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own playlists
CREATE POLICY "Users can delete own playlists"
  ON playlists
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for playlist_items

-- Users can view playlist items from playlists they can access
CREATE POLICY "Users can view playlist items from accessible playlists"
  ON playlist_items
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_items.playlist_id
      AND (playlists.is_public = true OR playlists.user_id = auth.uid())
    )
  );

-- Users can add items to their own playlists
CREATE POLICY "Users can add items to own playlists"
  ON playlist_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_items.playlist_id
      AND playlists.user_id = auth.uid()
    )
  );

-- Users can remove items from their own playlists
CREATE POLICY "Users can remove items from own playlists"
  ON playlist_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_items.playlist_id
      AND playlists.user_id = auth.uid()
    )
  );

-- Function to update playlist updated_at timestamp
CREATE OR REPLACE FUNCTION update_playlist_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE playlists 
  SET updated_at = NOW() 
  WHERE id = NEW.playlist_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update playlist timestamp when items are added/removed
DROP TRIGGER IF EXISTS trigger_update_playlist_timestamp ON playlist_items;
CREATE TRIGGER trigger_update_playlist_timestamp
  AFTER INSERT OR DELETE ON playlist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_playlist_timestamp();

-- Function to auto-increment position for new playlist items
CREATE OR REPLACE FUNCTION set_playlist_item_position()
RETURNS TRIGGER AS $$
BEGIN
  -- If position is not set (0), set it to max + 1
  IF NEW.position = 0 THEN
    NEW.position := COALESCE(
      (SELECT MAX(position) + 1 FROM playlist_items WHERE playlist_id = NEW.playlist_id),
      1
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set position
DROP TRIGGER IF EXISTS trigger_set_playlist_item_position ON playlist_items;
CREATE TRIGGER trigger_set_playlist_item_position
  BEFORE INSERT ON playlist_items
  FOR EACH ROW
  EXECUTE FUNCTION set_playlist_item_position();
