/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  darkMode: "class", // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        background: "#171718ff",
        surface: "#1d1e1fff",
        "surface-light": "#2a2b2cff",
        accent: "#d4a574", // Warm amber/gold
        "text-light": "#ffffffff",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Sora", "sans-serif"],
      },
    },
  },
};
