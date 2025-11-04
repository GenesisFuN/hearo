-- Add theme preference to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark'));

-- Update existing profiles to have light theme as default
UPDATE profiles 
SET theme_preference = 'light' 
WHERE theme_preference IS NULL;
