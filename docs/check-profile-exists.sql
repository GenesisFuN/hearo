-- Check if your user profile exists
-- Run this in Supabase SQL Editor

-- Step 1: Check auth.users table (should have your user)
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 2: Check profiles table (might be missing your profile)
SELECT id, username, user_type, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 3: Find orphaned users (users without profiles)
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as user_created,
  p.id as profile_id,
  p.username
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;

-- Step 4: If you find an orphaned user, create their profile manually
-- REPLACE 'USER_ID_HERE' with the actual user ID from Step 3
/*
INSERT INTO profiles (id, username, display_name, user_type, subscription_tier)
VALUES (
  'USER_ID_HERE',
  'username', -- Or get from auth.users.email
  'Display Name',
  'creator',
  'free'
);
*/
