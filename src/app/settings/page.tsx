"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen px-8 py-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-accent mb-4">
            Settings
          </h1>
          <p className="text-text-light/80 text-lg">
            Customize your Hearo experience
          </p>
        </div>

        {/* Theme Settings */}
        <div className="space-y-6">
          {/* Light/Dark Mode */}
          <section className="bg-surface/50 rounded-lg p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-text-light mb-2">
                  Appearance
                </h2>
                <p className="text-text-light/60">
                  Switch between light and dark Mocha theme
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 px-6 py-3 bg-accent/20 hover:bg-accent/30 rounded-lg transition border-2 border-highlight/30 hover:border-highlight"
              >
                {theme === "dark" ? (
                  <>
                    <Moon className="w-6 h-6 text-accent" />
                    <span className="text-accent font-medium text-lg">
                      Dark Mode
                    </span>
                  </>
                ) : (
                  <>
                    <Sun className="w-6 h-6 text-accent" />
                    <span className="text-accent font-medium text-lg">
                      Light Mode
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Theme Preview */}
            <div className="mt-8 p-6 bg-background/50 rounded-lg border border-surface">
              <h3 className="text-xl font-bold text-text-light mb-3">
                Preview
              </h3>
              <p className="text-text-light/70 mb-4">
                This is how your text will look with the current theme. The
                Mocha palette features warm{" "}
                {theme === "dark"
                  ? "chocolate browns with cream accents"
                  : "cream backgrounds with rich mocha accents"}
                .
              </p>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-accent text-background rounded-lg font-medium hover:opacity-80 transition border border-transparent hover:border-highlight/50">
                  Accent Button
                </button>
                <button className="px-4 py-2 bg-surface text-text-light rounded-lg font-medium hover:bg-surface/80 transition border border-transparent hover:border-highlight/50">
                  Surface Button
                </button>
              </div>
            </div>

            {/* Color Swatches */}
            <div className="mt-6 grid grid-cols-4 gap-4">
              <div>
                <div
                  className="w-full h-20 rounded-lg border-2 border-surface"
                  style={{ backgroundColor: "var(--color-background)" }}
                ></div>
                <p className="text-xs text-text-light/60 mt-2 text-center">
                  Background
                </p>
              </div>
              <div>
                <div
                  className="w-full h-20 rounded-lg border-2 border-surface"
                  style={{ backgroundColor: "var(--color-surface)" }}
                ></div>
                <p className="text-xs text-text-light/60 mt-2 text-center">
                  Surface
                </p>
              </div>
              <div>
                <div
                  className="w-full h-20 rounded-lg border-2 border-surface"
                  style={{ backgroundColor: "var(--color-accent)" }}
                ></div>
                <p className="text-xs text-text-light/60 mt-2 text-center">
                  Accent
                </p>
              </div>
              <div>
                <div
                  className="w-full h-20 rounded-lg border-2 border-surface"
                  style={{ backgroundColor: "var(--color-text)" }}
                ></div>
                <p className="text-xs text-text-light/60 mt-2 text-center">
                  Text
                </p>
              </div>
            </div>
          </section>

          {/* Additional Settings (Placeholder) */}
          <section className="bg-surface/50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-text-light mb-4">
              Coming Soon
            </h2>
            <div className="space-y-3 text-text-light/60">
              <div className="flex items-center gap-3 p-3 bg-background/30 rounded-lg">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>Notification preferences</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background/30 rounded-lg">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>Audio quality settings</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background/30 rounded-lg">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>Language preferences</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background/30 rounded-lg">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>Privacy settings</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
