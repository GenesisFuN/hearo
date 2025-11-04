"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load saved preference or default to light
    const savedTheme = localStorage.getItem("hearo-theme") as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }
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

    // Save preference
    localStorage.setItem("hearo-theme", theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
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
