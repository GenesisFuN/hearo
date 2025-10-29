-- User listening preferences and recommendation helper functions
-- These help power personalized "Recommended for You" features

-- 1. Create a view for user listening preferences
-- This aggregates playback_sessions to understand user preferences
CREATE OR REPLACE VIEW user_listening_preferences AS
SELECT 
  ps.user_id,
  w.genre,
  COUNT(DISTINCT ps.work_id) as books_listened,
  SUM(ps.actual_listening_seconds) as total_listening_time,
  AVG(ps.completion_percentage) as avg_completion_rate,
  MAX(ps.updated_at) as last_listened_at
FROM playback_sessions ps
JOIN works w ON ps.work_id = w.id
WHERE ps.actual_listening_seconds > 300 -- At least 5 minutes listened
GROUP BY ps.user_id, w.genre;

-- 2. Create function to get user's top genres
CREATE OR REPLACE FUNCTION get_user_top_genres(p_user_id UUID, p_limit INTEGER DEFAULT 3)
RETURNS TABLE (
  genre VARCHAR(50),
  listening_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ulp.genre,
    (ulp.total_listening_time * 0.7 + ulp.books_listened * 1000 * 0.3)::NUMERIC as listening_score
  FROM user_listening_preferences ulp
  WHERE ulp.user_id = p_user_id
  ORDER BY listening_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Create function to get user's favorite authors (most listened)
CREATE OR REPLACE FUNCTION get_user_favorite_authors(p_user_id UUID, p_limit INTEGER DEFAULT 3)
RETURNS TABLE (
  author_id UUID,
  author_name TEXT,
  books_listened INTEGER,
  total_time_seconds BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.creator_id as author_id,
    COALESCE(p.display_name, p.username) as author_name,
    COUNT(DISTINCT ps.work_id)::INTEGER as books_listened,
    SUM(ps.actual_listening_seconds)::BIGINT as total_time_seconds
  FROM playback_sessions ps
  JOIN works w ON ps.work_id = w.id
  JOIN profiles p ON w.creator_id = p.id
  WHERE ps.user_id = p_user_id
    AND ps.actual_listening_seconds > 300
  GROUP BY w.creator_id, p.display_name, p.username
  ORDER BY total_time_seconds DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Create function to get personalized recommendations
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  work_id UUID,
  title TEXT,
  genre VARCHAR(50),
  creator_id UUID,
  cover_image TEXT,
  duration_seconds INTEGER,
  views_count INTEGER,
  average_rating NUMERIC,
  recommendation_score NUMERIC,
  recommendation_reason TEXT
) AS $$
DECLARE
  v_top_genres TEXT[];
  v_favorite_authors UUID[];
  v_saved_book_ids UUID[];
BEGIN
  -- Get user's top 3 genres
  SELECT ARRAY_AGG(g.genre) INTO v_top_genres
  FROM get_user_top_genres(p_user_id, 3) g;
  
  -- Get user's favorite authors
  SELECT ARRAY_AGG(a.author_id) INTO v_favorite_authors
  FROM get_user_favorite_authors(p_user_id, 3) a;
  
  -- Get user's saved books to exclude them
  SELECT ARRAY_AGG(sb.work_id) INTO v_saved_book_ids
  FROM saved_books sb
  WHERE sb.user_id = p_user_id;
  
  -- Return recommendations with scoring
  RETURN QUERY
  WITH scored_works AS (
    SELECT 
      w.id as work_id,
      w.title,
      w.genre,
      w.creator_id,
      w.cover_image,
      w.duration_seconds,
      w.views_count,
      w.average_rating,
      (
        -- Genre match score (0-40 points)
        CASE WHEN w.genre = ANY(v_top_genres) THEN 40 ELSE 0 END +
        -- Favorite author bonus (0-30 points)
        CASE WHEN w.creator_id = ANY(v_favorite_authors) THEN 30 ELSE 0 END +
        -- Popularity score (0-15 points)
        LEAST(w.views_count / 100.0, 15) +
        -- Rating score (0-15 points)
        (COALESCE(w.average_rating, 0) * 3)
      )::NUMERIC as score,
      CASE 
        WHEN w.creator_id = ANY(v_favorite_authors) THEN 
          'From one of your favorite authors'
        WHEN w.genre = ANY(v_top_genres) THEN 
          'Based on your interest in ' || w.genre
        ELSE 
          'Popular in your preferred genres'
      END as reason
    FROM works w
    WHERE w.status = 'published'
      AND w.is_public = TRUE
      AND w.id != ALL(COALESCE(v_saved_book_ids, ARRAY[]::UUID[])) -- Exclude saved books
      AND NOT EXISTS ( -- Exclude already listened (more than 10% progress)
        SELECT 1 FROM playback_sessions ps 
        WHERE ps.user_id = p_user_id 
        AND ps.work_id = w.id 
        AND ps.completion_percentage > 10
      )
      AND (
        w.genre = ANY(v_top_genres) -- Match user's genres
        OR w.creator_id = ANY(v_favorite_authors) -- Or from favorite authors
      )
  )
  SELECT 
    sw.work_id,
    sw.title,
    sw.genre,
    sw.creator_id,
    sw.cover_image,
    sw.duration_seconds,
    sw.views_count,
    sw.average_rating,
    sw.score as recommendation_score,
    sw.reason as recommendation_reason
  FROM scored_works sw
  ORDER BY sw.score DESC, sw.views_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Create function to get similar books (for book detail pages)
CREATE OR REPLACE FUNCTION get_similar_books(
  p_work_id UUID,
  p_limit INTEGER DEFAULT 6
)
RETURNS TABLE (
  work_id UUID,
  title TEXT,
  genre VARCHAR(50),
  creator_id UUID,
  cover_image TEXT,
  duration_seconds INTEGER,
  similarity_score NUMERIC
) AS $$
DECLARE
  v_source_genre VARCHAR(50);
  v_source_duration INTEGER;
  v_source_author UUID;
BEGIN
  -- Get source book details
  SELECT w.genre, w.duration_seconds, w.creator_id
  INTO v_source_genre, v_source_duration, v_source_author
  FROM works w
  WHERE w.id = p_work_id;
  
  -- Return similar books
  RETURN QUERY
  SELECT 
    w.id as work_id,
    w.title,
    w.genre,
    w.creator_id,
    w.cover_image,
    w.duration_seconds,
    (
      -- Genre match (0-50 points)
      CASE WHEN w.genre = v_source_genre THEN 50 ELSE 0 END +
      -- Same author bonus (0-30 points)
      CASE WHEN w.creator_id = v_source_author THEN 30 ELSE 0 END +
      -- Duration similarity (0-20 points)
      (20 - ABS(w.duration_seconds - v_source_duration) / 1000.0)
    )::NUMERIC as similarity_score
  FROM works w
  WHERE w.id != p_work_id
    AND w.status = 'published'
    AND w.is_public = TRUE
    AND (
      w.genre = v_source_genre -- Same genre
      OR w.creator_id = v_source_author -- Same author
      OR ABS(w.duration_seconds - v_source_duration) < 3600 -- Similar duration (within 1 hour)
    )
  ORDER BY similarity_score DESC, w.views_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_playback_sessions_user_work 
  ON playback_sessions(user_id, work_id);

CREATE INDEX IF NOT EXISTS idx_playback_sessions_listening_time 
  ON playback_sessions(actual_listening_seconds) 
  WHERE actual_listening_seconds > 300;

COMMENT ON FUNCTION get_user_top_genres IS 'Returns user''s most listened genres with weighted scoring';
COMMENT ON FUNCTION get_user_favorite_authors IS 'Returns user''s most listened authors';
COMMENT ON FUNCTION get_personalized_recommendations IS 'Returns personalized book recommendations based on listening history';
COMMENT ON FUNCTION get_similar_books IS 'Returns similar books based on genre, author, and duration';
