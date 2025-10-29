-- Complete fix for profile creation issues
-- Run this in Supabase SQL Editor

-- Step 1: Check for orphaned auth users (users without profiles)
SELECT 
  u.id, 
  u.email, 
  u.created_at,
  p.id as profile_id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Step 2: Clean up any orphaned users (CAREFUL - this deletes users)
-- Uncomment if you want to delete test users without profiles
-- DELETE FROM auth.users 
-- WHERE id NOT IN (SELECT id FROM public.profiles);

-- Step 3: Drop and recreate the trigger with better error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
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
  
  -- Insert the profile
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    user_type
  )
  VALUES (
    NEW.id,
    v_username,
    v_display_name,
    v_user_type
  )
  ON CONFLICT (id) DO NOTHING;  -- Prevent duplicate errors
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't prevent user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 4: Verify the trigger was created
SELECT 
  trigger_name, 
  event_object_table, 
  action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
