-- Create RLS policies for audio_files table
-- Run this in Supabase SQL Editor

-- Enable RLS (if not already enabled)
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can insert their own audio files
CREATE POLICY "Users can insert their own audio files"
ON audio_files
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 2: Users can view their own audio files
CREATE POLICY "Users can view their own audio files"
ON audio_files
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 3: Users can update their own audio files
CREATE POLICY "Users can update their own audio files"
ON audio_files
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own audio files
CREATE POLICY "Users can delete their own audio files"
ON audio_files
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'audio_files';
