"use client";

import { useState } from "react";
import { AVATAR_PRESETS, AVATAR_CATEGORIES } from "@/lib/avatars";

interface AvatarSelectorProps {
  currentAvatar: string;
  onSelect: (avatarId: string) => void;
}

export default function AvatarSelector({
  currentAvatar,
  onSelect,
}: AvatarSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [hoveredAvatar, setHoveredAvatar] = useState<string | null>(null);

  const filteredAvatars =
    selectedCategory === "all"
      ? AVATAR_PRESETS
      : AVATAR_PRESETS.filter((a) => a.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-light mb-2">
          Choose Your Avatar
        </h2>
        <p className="text-text-light/60">
          Select a character to represent you
        </p>
      </div>

      {/* Category Filter - Character Select Style */}
      <div className="flex flex-wrap gap-2 justify-center">
        {AVATAR_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              selectedCategory === category.id
                ? "bg-accent text-background scale-105 shadow-lg shadow-accent/30"
                : "bg-surface text-text-light/70 hover:bg-surface-light hover:scale-102"
            }`}
          >
            <span className="mr-2">{category.icon}</span>
            {category.name}
          </button>
        ))}
      </div>

      {/* Avatar Grid - Character Select Grid */}
      <div className="relative">
        {/* Grid Background Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent rounded-2xl pointer-events-none" />

        <div className="relative grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 p-6 bg-surface/50 rounded-2xl border border-surface-light max-h-[400px] overflow-y-auto custom-scrollbar">
          {filteredAvatars.map((avatar) => {
            const isSelected = currentAvatar === avatar.id;
            const isHovered = hoveredAvatar === avatar.id;

            return (
              <button
                key={avatar.id}
                type="button"
                onClick={() => onSelect(avatar.id)}
                onMouseEnter={() => setHoveredAvatar(avatar.id)}
                onMouseLeave={() => setHoveredAvatar(null)}
                className={`
                  relative aspect-square rounded-xl p-3 transition-all duration-200
                  ${
                    isSelected
                      ? "bg-gradient-to-br from-accent to-accent/80 shadow-lg shadow-accent/50 scale-110 z-10"
                      : isHovered
                        ? "bg-surface-light scale-105 shadow-md"
                        : "bg-surface hover:bg-surface-light"
                  }
                  border-2 ${
                    isSelected
                      ? "border-accent-light"
                      : "border-transparent hover:border-accent/30"
                  }
                `}
                title={avatar.name}
              >
                {/* Character Display */}
                <div className="w-full h-full flex items-center justify-center">
                  <span
                    className={`text-3xl sm:text-4xl transition-transform ${
                      isSelected || isHovered ? "scale-110" : ""
                    }`}
                  >
                    {avatar.emoji}
                  </span>
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent-light rounded-full border-2 border-background flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                )}

                {/* Hover Name Tooltip */}
                {isHovered && !isSelected && (
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-background px-2 py-1 rounded text-xs text-text-light whitespace-nowrap shadow-lg z-20 pointer-events-none">
                    {avatar.name}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Avatar Preview */}
      <div className="flex items-center justify-center gap-4 p-4 bg-surface rounded-xl border border-surface-light">
        <div className="text-6xl">
          {AVATAR_PRESETS.find((a) => a.id === currentAvatar)?.emoji || "👤"}
        </div>
        <div>
          <div className="text-sm text-text-light/60">Selected Avatar</div>
          <div className="text-lg font-bold text-text-light">
            {AVATAR_PRESETS.find((a) => a.id === currentAvatar)?.name ||
              "Default"}
          </div>
        </div>
      </div>
    </div>
  );
}
