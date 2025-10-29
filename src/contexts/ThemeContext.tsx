"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Load saved preference
    const savedTheme = localStorage.getItem("hearo-theme") as Theme;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    // Apply Mocha theme colors based on light/dark mode
    const root = document.documentElement;

    if (theme === "light") {
      // Light Mocha Theme
      root.style.setProperty("--color-background", "hsl(35, 35%, 92%)"); // Warm light cream
      root.style.setProperty("--color-surface", "hsl(35, 30%, 85%)"); // Slightly darker cream
      root.style.setProperty("--color-accent", "hsl(25, 50%, 45%)"); // Rich mocha/chocolate
      root.style.setProperty("--color-text", "hsl(30, 25%, 20%)"); // Dark brown text
      root.style.setProperty("--color-highlight", "hsl(345, 65%, 75%)"); // More vibrant soft pink
    } else {
      // Dark Mocha Theme
      root.style.setProperty("--color-background", "hsl(30, 15%, 12%)"); // Deep chocolate brown
      root.style.setProperty("--color-surface", "hsl(30, 12%, 18%)"); // Lighter brown
      root.style.setProperty("--color-accent", "hsl(40, 55%, 70%)"); // Warm cream/gold
      root.style.setProperty("--color-text", "hsl(35, 25%, 88%)"); // Warm off-white
      root.style.setProperty("--color-highlight", "hsl(270, 70%, 65%)"); // Vibrant purple
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("hearo-theme", newTheme);
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
