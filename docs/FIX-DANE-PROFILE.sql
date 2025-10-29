-- Fix orphaned user profile for dane@deeply-digital.com
-- Run this in Supabase SQL Editor NOW

-- Create the missing profile
INSERT INTO profiles (id, username, display_name, user_type, subscription_tier)
VALUES (
  '9e722111-5259-4912-971f-d14d7c6bd99c',
  'dane',
  'Dane',
  'creator',
  'free'
);

-- Verify it worked
SELECT id, username, user_type, subscription_tier, created_at 
FROM profiles 
WHERE id = '9e722111-5259-4912-971f-d14d7c6bd99c';
