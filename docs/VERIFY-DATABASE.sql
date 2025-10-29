-- ============================================================
-- Verify Database Setup
-- Run this to check if all tables were created successfully
-- ============================================================

-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Count of each table (should all be 0 for new setup)
SELECT 
  'profiles' as table_name, COUNT(*) as row_count FROM profiles
UNION ALL
SELECT 'works', COUNT(*) FROM works
UNION ALL
SELECT 'uploads', COUNT(*) FROM uploads
UNION ALL
SELECT 'audio_files', COUNT(*) FROM audio_files
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'subscription_tiers', COUNT(*) FROM subscription_tiers
UNION ALL
SELECT 'voice_samples', COUNT(*) FROM voice_samples
UNION ALL
SELECT 'favorites', COUNT(*) FROM favorites
UNION ALL
SELECT 'play_history', COUNT(*) FROM play_history
UNION ALL
SELECT 'comments', COUNT(*) FROM comments;

-- Check triggers exist
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true
ORDER BY tablename;
