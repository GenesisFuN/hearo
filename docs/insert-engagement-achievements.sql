-- Insert engagement achievements only (safe to run multiple times)
-- This uses ON CONFLICT to skip if they already exist

INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, is_secret, reward_type)
VALUES 
  ('First Impression', 'Leave your first like on a book', '👍', 'engagement', 'likes', 1, FALSE, 'badge'),
  ('Supportive Listener', 'Like 10 different books', '💝', 'engagement', 'likes', 10, FALSE, 'badge'),
  ('Super Fan', 'Like 50 different books', '⭐', 'engagement', 'likes', 50, FALSE, 'badge'),
  ('Voice of the Community', 'Leave your first comment on a book', '💬', 'engagement', 'comments', 1, FALSE, 'badge'),
  ('Conversation Starter', 'Leave 10 comments on books', '🗣️', 'engagement', 'comments', 10, FALSE, 'badge'),
  ('Book Critic', 'Leave 50 comments on books', '📝', 'engagement', 'comments', 50, FALSE, 'badge')
ON CONFLICT (name) DO NOTHING;

-- Verify they were inserted
SELECT name, category, requirement_type, requirement_value 
FROM achievements 
WHERE category = 'engagement'
ORDER BY requirement_type, requirement_value;
