"use client";

import { useState } from "react";

export interface FilterState {
  genres: string[];
  duration: "all" | "short" | "medium" | "long";
  dateRange: "all" | "week" | "month" | "year";
  author: string;
  tags: string[];
  contentTags: string[];
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClear: () => void;
  availableGenres?: string[];
}

const DURATION_OPTIONS = [
  { value: "all", label: "Any Duration" },
  { value: "short", label: "Short (< 2 hours)", icon: "⚡" },
  { value: "medium", label: "Medium (2-5 hours)", icon: "📖" },
  { value: "long", label: "Long (5+ hours)", icon: "📚" },
];

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "week", label: "Last Week" },
  { value: "month", label: "Last Month" },
  { value: "year", label: "Last Year" },
];

const CONTENT_TAGS = [
  { value: "family-friendly", label: "Family Friendly", icon: "👨‍👩‍👧‍👦" },
  { value: "mature", label: "Mature", icon: "🔞" },
  { value: "educational", label: "Educational", icon: "🎓" },
  { value: "inspirational", label: "Inspirational", icon: "✨" },
  { value: "relaxing", label: "Relaxing", icon: "🧘" },
  { value: "suspenseful", label: "Suspenseful", icon: "😱" },
];

export default function AdvancedFilters({
  filters,
  onChange,
  onClear,
  availableGenres = [
    "Fantasy",
    "Non-fiction",
    "Mystery",
    "Horror",
    "Sci-fi",
    "Romance",
    "Others",
  ],
}: AdvancedFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleGenre = (genre: string) => {
    const newGenres = filters.genres.includes(genre)
      ? filters.genres.filter((g) => g !== genre)
      : [...filters.genres, genre];
    onChange({ ...filters, genres: newGenres });
  };

  const toggleContentTag = (tag: string) => {
    const newTags = filters.contentTags.includes(tag)
      ? filters.contentTags.filter((t) => t !== tag)
      : [...filters.contentTags, tag];
    onChange({ ...filters, contentTags: newTags });
  };

  const hasActiveFilters =
    filters.genres.length > 0 ||
    filters.duration !== "all" ||
    filters.dateRange !== "all" ||
    filters.author.trim() !== "" ||
    filters.contentTags.length > 0;

  return (
    <div className="bg-surface/50 rounded-lg border border-surface-light">
      {/* Filter Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface/30 transition"
      >
        <div className="flex items-center gap-3">
          <svg
            className="w-5 h-5 text-accent"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span className="font-medium text-text-light">Advanced Filters</span>
          {hasActiveFilters && (
            <span className="bg-accent text-background px-2 py-0.5 rounded-full text-xs font-medium">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-accent hover:text-accent/80 text-sm font-medium transition"
            >
              Clear All
            </button>
          )}
          <svg
            className={`w-5 h-5 text-text-light/70 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Filter Content */}
      {expanded && (
        <div className="p-4 border-t border-surface-light space-y-6">
          {/* Multi-Select Genres */}
          <div>
            <label className="block text-sm font-medium text-text-light/70 mb-3">
              📚 Genres (select multiple)
            </label>
            <div className="flex flex-wrap gap-2">
              {availableGenres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    filters.genres.includes(genre)
                      ? "bg-accent text-background"
                      : "bg-surface text-text-light hover:bg-surface-light"
                  }`}
                >
                  {genre}
                  {filters.genres.includes(genre) && (
                    <span className="ml-1">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Filter */}
          <div>
            <label className="block text-sm font-medium text-text-light/70 mb-3">
              ⏱️ Duration
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    onChange({
                      ...filters,
                      duration: option.value as FilterState["duration"],
                    })
                  }
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    filters.duration === option.value
                      ? "bg-accent text-background"
                      : "bg-surface text-text-light hover:bg-surface-light"
                  }`}
                >
                  {option.icon && <span className="mr-1">{option.icon}</span>}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-text-light/70 mb-3">
              📅 Published Date
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {DATE_RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    onChange({
                      ...filters,
                      dateRange: option.value as FilterState["dateRange"],
                    })
                  }
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    filters.dateRange === option.value
                      ? "bg-accent text-background"
                      : "bg-surface text-text-light hover:bg-surface-light"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Tags */}
          <div>
            <label className="block text-sm font-medium text-text-light/70 mb-3">
              🏷️ Content Type
            </label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TAGS.map((tag) => (
                <button
                  key={tag.value}
                  onClick={() => toggleContentTag(tag.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    filters.contentTags.includes(tag.value)
                      ? "bg-accent text-background"
                      : "bg-surface text-text-light hover:bg-surface-light"
                  }`}
                >
                  <span className="mr-1">{tag.icon}</span>
                  {tag.label}
                  {filters.contentTags.includes(tag.value) && (
                    <span className="ml-1">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Author Search */}
          <div>
            <label className="block text-sm font-medium text-text-light/70 mb-3">
              ✍️ Filter by Author
            </label>
            <input
              type="text"
              value={filters.author}
              onChange={(e) => onChange({ ...filters, author: e.target.value })}
              placeholder="Enter author username or name..."
              className="w-full bg-surface border border-surface-light rounded-lg px-4 py-2 text-text-light placeholder-text-light/50 focus:outline-none focus:border-accent transition"
            />
          </div>
        </div>
      )}
    </div>
  );
}
