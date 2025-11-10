"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("hearo-theme") as Theme | null;
      return saved || "light";
    }
    return "light";
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = async () => {
    const currentThemeFromDOM = document.documentElement.classList.contains(
      "dark"
    )
      ? "dark"
      : "light";
    const newTheme: Theme = currentThemeFromDOM === "dark" ? "light" : "dark";

    // Update localStorage
    localStorage.setItem("hearo-theme", newTheme);

    // Update DOM immediately
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Update state
    setTheme(newTheme);

    // Save to database if user is logged in (async, doesn't block)
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("profiles")
          .update({ theme_preference: newTheme })
          .eq("id", user.id);
      }
    } catch (error) {
      console.error("Failed to save theme to database:", error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
