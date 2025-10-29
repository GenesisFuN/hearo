-- Allow anyone to view profiles (for author information on public books)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
ON profiles FOR SELECT
TO public
USING (true);

-- Verify
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = ''profiles'';
