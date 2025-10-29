-- Create saved_books table for users to save/favorite audiobooks
-- Run this in Supabase SQL Editor

-- Create the saved_books table
CREATE TABLE IF NOT EXISTS saved_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate saves (one user can only save a book once)
  UNIQUE(user_id, work_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_books_user_id ON saved_books(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_books_work_id ON saved_books(work_id);
CREATE INDEX IF NOT EXISTS idx_saved_books_created_at ON saved_books(created_at DESC);

-- Enable Row Level Security
ALTER TABLE saved_books ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy 1: Users can view their own saved books
CREATE POLICY "Users can view their own saved books"
ON saved_books
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Users can save books (insert)
CREATE POLICY "Users can save books"
ON saved_books
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can unsave their own books (delete)
CREATE POLICY "Users can unsave their own books"
ON saved_books
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add helpful comment
COMMENT ON TABLE saved_books IS 'Stores user saved/favorited audiobooks for their Library';
