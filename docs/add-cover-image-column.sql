-- Add cover_image column to works table
ALTER TABLE works ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_works_cover_image ON works(cover_image) WHERE cover_image IS NOT NULL;

-- Add comment
COMMENT ON COLUMN works.cover_image IS 'Public URL of the book cover image stored in Supabase Storage';
