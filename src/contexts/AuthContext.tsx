"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "../lib/supabase";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    username: string,
    userType?: "listener" | "creator"
  ) => Promise<{ user: User | null; session: any | null }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasSubscription: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const hasSubscription = !!(
    profile?.subscription_tier !== "free" &&
    profile?.subscription_expires &&
    new Date(profile.subscription_expires) > new Date()
  );

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
      } else {
        setProfile(data);
        
        // Apply user's theme preference if available (always override current theme)
        const userTheme = data?.theme_preference || "light";
        localStorage.setItem("hearo-theme", userTheme);
        
        // Trigger theme update with custom event (use setTimeout to ensure ThemeContext is ready)
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("themeChange", { detail: userTheme }));
        }, 0);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    username: string,
    userType: "listener" | "creator" = "listener"
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
          display_name: username,
          user_type: userType,
        },
      },
    });

    if (error) throw error;

    // Wait a moment for trigger to fire
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if profile was created, if not create manually
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        // Trigger didn't work, create profile manually
        const { error: insertError } = await supabase.from("profiles").insert({
          id: data.user.id,
          username: username,
          display_name: username,
          user_type: userType,
        });

        if (insertError) {
          console.error("Error creating profile:", insertError);
          throw new Error(
            `Database error: ${insertError.message || insertError.code || "Failed to create user profile"}`
          );
        }
      }
    }

    // Return the signup result so caller can check if auto-confirmed
    return data;
  };

  const signIn = async (email: string, password: string) => {
    console.log("Attempting sign in for:", email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("Sign in result:", { data, error });

    if (error) {
      console.error("Sign in error:", error);
      throw error;
    }

    console.log("Sign in successful, user:", data.user?.id);
  };

  const signOut = async () => {
    try {
      // Clear local state first
      setUser(null);
      setProfile(null);

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error);
      }

      // Force clear all browser storage (including theme)
      localStorage.clear();
      sessionStorage.clear();

      // Reset to default light theme after sign out
      localStorage.setItem("hearo-theme", "light");
      window.dispatchEvent(new CustomEvent("themeChange", { detail: "light" }));

      // Force redirect to login
      window.location.href = "/login";
    } catch (error) {
      console.error("Sign out failed:", error);
      // Force redirect anyway
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        hasSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
