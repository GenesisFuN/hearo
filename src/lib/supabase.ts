import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

// Database Types
export interface Book {
  id: string;
  title: string;
  description?: string;
  author_id: string;
  status: "draft" | "processing" | "published" | "failed";
  text_file_url?: string;
  audio_file_url?: string;
  cover_image_url?: string;
  duration?: number;
  chapters?: number;
  ai_settings?: {
    voiceStyle: string;
    readingSpeed: string;
    addMusic: boolean;
    chapterBreaks: boolean;
  };
  created_at: string;
  updated_at: string;
  published: boolean;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  user_type: "listener" | "creator";
  bio?: string;
  avatar_url?: string;
  subscription_tier: "free" | "basic" | "premium" | "creator";
  subscription_expires?: string;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  author_id: string;
  tier: "free" | "premium" | "vip";
  amount: number;
  status: "active" | "cancelled" | "expired";
  created_at: string;
  expires_at: string;
}
