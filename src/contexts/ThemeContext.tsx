"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const isManualToggle = useRef(false);

  useEffect(() => {
    setMounted(true);
    // Load saved preference or default to light
    const savedTheme = localStorage.getItem("hearo-theme") as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }

    // Listen for theme changes (when user signs in and theme is loaded from profile)
    const handleThemeChange = (event: Event) => {
      // Ignore event if user is manually toggling
      if (isManualToggle.current) return;
      
      const customEvent = event as CustomEvent<Theme>;
      const newTheme = customEvent.detail;
      if (newTheme) {
        setTheme(newTheme);
      }
    };

    window.addEventListener("themeChange", handleThemeChange);
    return () => window.removeEventListener("themeChange", handleThemeChange);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Apply Mocha theme colors based on light/dark mode
    const root = document.documentElement;

    if (theme === "light") {
      // Light Mocha Theme
      root.style.setProperty("--color-background", "hsl(35, 35%, 92%)"); // Warm light cream
      root.style.setProperty("--color-surface", "hsl(35, 30%, 85%)"); // Slightly darker cream
      root.style.setProperty("--color-surface-light", "hsl(35, 25%, 78%)"); // Even lighter
      root.style.setProperty("--color-accent", "hsl(25, 50%, 45%)"); // Rich mocha/chocolate
      root.style.setProperty("--color-text", "hsl(30, 25%, 20%)"); // Dark brown text
      root.style.setProperty("--color-text-light", "hsl(30, 25%, 20%)"); // Dark brown text
      root.style.setProperty("--color-highlight", "hsl(345, 65%, 75%)"); // More vibrant soft pink
      root.classList.remove("dark");
    } else {
      // Dark Mocha Theme
      root.style.setProperty("--color-background", "hsl(30, 15%, 12%)"); // Deep chocolate brown
      root.style.setProperty("--color-surface", "hsl(30, 12%, 18%)"); // Lighter brown
      root.style.setProperty("--color-surface-light", "hsl(30, 10%, 24%)"); // Even lighter
      root.style.setProperty("--color-accent", "hsl(40, 55%, 70%)"); // Warm cream/gold
      root.style.setProperty("--color-text", "hsl(35, 25%, 88%)"); // Warm off-white
      root.style.setProperty("--color-text-light", "hsl(35, 25%, 88%)"); // Warm off-white
      root.style.setProperty("--color-highlight", "hsl(270, 70%, 65%)"); // Vibrant purple
      root.classList.add("dark");
    }

    // Save preference to localStorage
    localStorage.setItem("hearo-theme", theme);

    // Save preference to database if user is logged in
    const saveThemeToDatabase = async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ theme_preference: theme })
          .eq("id", user.id);
      }
    };

    saveThemeToDatabase();
  }, [theme, mounted]);

  const toggleTheme = () => {
    isManualToggle.current = true;
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    // Reset manual toggle flag after theme has been applied
    setTimeout(() => {
      isManualToggle.current = false;
    }, 500);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
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
