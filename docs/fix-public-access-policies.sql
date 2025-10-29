-- Allow anyone (authenticated or anonymous) to view public works
DROP POLICY IF EXISTS "Public works are viewable by everyone" ON works;
CREATE POLICY "Public works are viewable by everyone"
ON works FOR SELECT
TO public
USING (is_public = true);

-- Allow anyone to view audio files for public works
DROP POLICY IF EXISTS "Public audio files are viewable by everyone" ON audio_files;
CREATE POLICY "Public audio files are viewable by everyone"
ON audio_files FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM works
    WHERE works.id = audio_files.work_id
    AND works.is_public = true
  )
);

-- Verify policies were created
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN (''works'', ''audio_files'')
AND policyname LIKE ''%Public%'';
