-- Supabase Database Schema
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'creator', 'pro')),
    subscription_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Books table
CREATE TABLE books (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    author_id UUID REFERENCES profiles(id) NOT NULL,
    status TEXT DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'complete', 'error')),
    text_file_url TEXT,
    audio_file_url TEXT,
    cover_image_url TEXT,
    duration INTEGER, -- in seconds
    chapters INTEGER DEFAULT 1,
    ai_settings JSONB,
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table (author subscriptions)
CREATE TABLE author_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    author_id UUID REFERENCES profiles(id) NOT NULL,
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'vip')),
    amount INTEGER DEFAULT 0, -- in cents
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month')
);

-- Donations table
CREATE TABLE donations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    author_id UUID REFERENCES profiles(id) NOT NULL,
    amount INTEGER NOT NULL, -- in cents
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics table
CREATE TABLE book_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    book_id UUID REFERENCES books(id) NOT NULL,
    user_id UUID REFERENCES profiles(id),
    event_type TEXT NOT NULL CHECK (event_type IN ('play', 'pause', 'complete', 'skip')),
    timestamp_seconds INTEGER, -- position in audio when event occurred
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Books
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authors can manage their books" ON books FOR ALL USING (auth.uid() = author_id);
CREATE POLICY "Users can view published books" ON books FOR SELECT USING (published = true);

-- Author Subscriptions
ALTER TABLE author_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their subscriptions" ON author_subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Authors can view their subscribers" ON author_subscriptions FOR SELECT USING (auth.uid() = author_id);

-- Donations
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can make donations" ON donations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors can view their donations" ON donations FOR SELECT USING (auth.uid() = author_id);

-- Analytics
ALTER TABLE book_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create analytics" ON book_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors can view their analytics" ON book_analytics FOR SELECT USING (
    book_id IN (SELECT id FROM books WHERE author_id = auth.uid())
);

-- Functions

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage buckets (run these in Storage section)
-- 1. Create bucket: 'audiobooks' (public: false)
-- 2. Create bucket: 'covers' (public: true)
-- 3. Create bucket: 'manuscripts' (public: false)