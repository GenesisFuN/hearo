-- EMERGENCY FIX FOR PRODUCTION PROFILE ISSUES
-- Run this in Supabase SQL Editor immediately

-- Step 1: Check for users without profiles
SELECT 
  u.id, 
  u.email, 
  u.created_at,
  u.raw_user_meta_data,
  p.id as profile_id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Step 2: Create profiles for any users that don't have them
INSERT INTO public.profiles (id, username, display_name, user_type)
SELECT 
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'username',
    split_part(u.email, '@', 1)
  ) as username,
  COALESCE(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'username',
    split_part(u.email, '@', 1)
  ) as display_name,
  COALESCE(
    (u.raw_user_meta_data->>'user_type')::user_type,
    'listener'::user_type
  ) as user_type
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 3: Fix RLS policies to allow profile creation during signup
DROP POLICY IF EXISTS "Users can insert own profile during signup" ON profiles;

CREATE POLICY "Users can insert own profile during signup"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Step 4: Ensure trigger exists and works
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER -- Run with elevated permissions
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_user_type user_type;
BEGIN
  -- Get username from metadata or email
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  -- Get display name
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  -- Get user type (listener or creator)
  v_user_type := COALESCE(
    (NEW.raw_user_meta_data->>'user_type')::user_type,
    'listener'::user_type
  );
  
  -- Insert the profile (bypasses RLS because of SECURITY DEFINER)
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    user_type,
    created_at
  ) VALUES (
    NEW.id,
    v_username,
    v_display_name,
    v_user_type,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Step 5: Verify the fix worked
SELECT 
  COUNT(*) as total_users,
  COUNT(p.id) as users_with_profiles,
  COUNT(*) - COUNT(p.id) as users_without_profiles
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;
