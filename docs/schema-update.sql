-- Schema updates for books table
-- Run this in Supabase SQL Editor to add missing columns

-- Add missing columns to books table
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Update status check constraint to include 'failed'
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_status_check;
ALTER TABLE books ADD CONSTRAINT books_status_check 
    CHECK (status IN ('uploading', 'processing', 'complete', 'failed', 'error'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_author_id ON books(author_id);

-- Ensure storage bucket exists and has proper policies
-- This should be run in the Supabase dashboard SQL editor