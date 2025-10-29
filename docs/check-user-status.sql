-- Check user status in auth.users
-- Run this in Supabase SQL Editor

-- Check if users are confirmed
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  updated_at,
  last_sign_in_at,
  confirmation_sent_at
FROM auth.users
WHERE email LIKE '%deeply%' OR email LIKE '%daneseacat%'
ORDER BY created_at DESC;

-- Check corresponding profiles
SELECT 
  id,
  username,
  display_name,
  user_type,
  created_at
FROM profiles
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%deeply%' OR email LIKE '%daneseacat%'
);
