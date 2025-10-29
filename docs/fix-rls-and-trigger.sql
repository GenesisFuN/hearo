-- Complete fix for profile creation with RLS policies
-- Run this in Supabase SQL Editor

-- Step 1: Check current RLS policies on profiles table
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 2: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Step 3: Create enhanced trigger function with SECURITY DEFINER
-- This bypasses RLS policies for the trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER -- This is critical - runs with owner privileges, bypasses RLS
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
  
  -- Insert the profile (will bypass RLS because of SECURITY DEFINER)
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    user_type,
    subscription_tier
  )
  VALUES (
    NEW.id,
    v_username,
    v_display_name,
    v_user_type,
    'free'::subscription_tier
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details
    RAISE WARNING 'Error creating profile for user %: % (SQLSTATE: %)', 
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 5: Ensure RLS policies allow profile insertion
-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;

-- Create new INSERT policy that allows users to create their own profile
CREATE POLICY "Enable profile creation for authenticated users"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Step 6: Verify everything is set up correctly
SELECT 'Trigger created:' as status;
SELECT 
  trigger_name, 
  event_object_table, 
  action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

SELECT 'RLS Policies:' as status;
SELECT 
  policyname, 
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 7: Check for orphaned users
SELECT 'Orphaned users (users without profiles):' as status;
SELECT 
  u.id, 
  u.email, 
  u.created_at,
  u.raw_user_meta_data->>'username' as metadata_username,
  u.raw_user_meta_data->>'user_type' as metadata_user_type
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;
