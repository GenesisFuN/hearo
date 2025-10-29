"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePlayer } from "../contexts/PlayerContext";
import SaveBookButton from "./SaveBookButton";
import PlayButton from "./PlayButton";
import { GENRE_EMOJIS } from "../lib/genres";
import { createClient } from "@supabase/supabase-js";
import { getUserFriendlyMessage, logError } from "@/lib/errorHandling";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RecommendedBook {
  id: string;
  title: string;
  description?: string;
  genre: string;
  coverImage?: string;
  audioPath: string;
  durationSeconds?: number;
  views: number;
  rating?: number;
  ratingsCount?: number;
  publishedAt: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  recommendationScore: number;
  recommendationReason: string;
}

export default function RecommendedBooks() {
  const [recommendations, setRecommendations] = useState<RecommendedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { playTrack } = usePlayer();

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      console.log("🔍 Fetching recommendations...");

      // Get the auth session token
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        console.log("❌ No auth token found");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/recommendations?limit=8", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("📡 Response status:", response.status);

      if (response.status === 401) {
        // User not logged in - don't show recommendations
        console.log("❌ User not authenticated");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        logError(
          new Error(errorData.error || "API request failed"),
          "RecommendedBooks"
        );
        throw new Error(
          errorData.userMessage ||
            errorData.error ||
            "Failed to load recommendations"
        );
      }

      const data = await response.json();
      console.log("✅ Recommendations data:", data);
      setRecommendations(data.recommendations || []);
    } catch (err: any) {
      console.error("❌ Recommendations error:", err);
      const friendlyMessage = getUserFriendlyMessage(err);
      setError(friendlyMessage);
      logError(err, "RecommendedBooks - fetch");
    } finally {
      setLoading(false);
    }
  };

  const playBook = (book: RecommendedBook) => {
    playTrack({
      id: book.id,
      title: book.title,
      artist: book.author.name,
      src: book.audioPath,
      cover: book.coverImage || "",
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Debug logging
  console.log("📊 RecommendedBooks state:", {
    loading,
    error,
    recommendationsCount: recommendations.length,
  });

  // Don't show anything if loading, error, or no recommendations
  if (loading || error || recommendations.length === 0) {
    console.log("❌ Not showing recommendations:", {
      loading,
      error,
      hasRecommendations: recommendations.length > 0,
    });
    return null;
  }

  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-text-light">
          ✨ Recommended for You
        </h2>
        <span className="text-sm text-text-light/60 bg-accent/20 px-3 py-1 rounded-full">
          Based on your listening
        </span>
      </div>

      <div className="relative group">
        {/* Left Arrow */}
        <button
          onClick={() => {
            const container = document.getElementById("recommended-scroll");
            if (container) {
              container.scrollBy({ left: -200, behavior: "smooth" });
            }
          }}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 -ml-4"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => {
            const container = document.getElementById("recommended-scroll");
            if (container) {
              container.scrollBy({ left: 200, behavior: "smooth" });
            }
          }}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 -mr-4"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>

        <div
          id="recommended-scroll"
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-2"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {recommendations.map((book) => (
            <div
              key={book.id}
              className="flex-none w-[200px] bg-surface rounded-lg overflow-hidden hover:bg-surface-light transition group/card"
            >
              <Link href={`/public/book/${book.id}`}>
                {/* Cover Image */}
                <div className="relative aspect-[2/3] bg-surface-light">
                  {book.coverImage ? (
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      📚
                    </div>
                  )}

                  {/* Play overlay */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      playBook(book);
                    }}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition flex items-center justify-center"
                  >
                    <svg
                      className="w-12 h-12 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </button>

                  {/* Recommendation reason badge */}
                  <div className="absolute top-2 left-2 right-2">
                    <div className="bg-accent text-background text-xs px-2 py-1 rounded-full font-medium truncate">
                      {book.recommendationReason}
                    </div>
                  </div>
                </div>

                {/* Book Info */}
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover/card:text-accent transition-colors leading-tight">
                    {book.title}
                  </h3>

                  <div className="flex flex-col gap-1 text-xs text-text-light/70 mb-2">
                    <div className="flex items-center gap-1">
                      <span>{GENRE_EMOJIS[book.genre] || "📖"}</span>
                      <span className="truncate">{book.genre}</span>
                    </div>

                    {book.durationSeconds && (
                      <span>⏱️ {formatDuration(book.durationSeconds)}</span>
                    )}

                    <span>👀 {book.views} views</span>

                    {book.rating && book.rating > 0 && (
                      <span>⭐ {book.rating.toFixed(1)}</span>
                    )}
                  </div>

                  <PlayButton
                    bookId={book.id}
                    onClick={(e) => {
                      e.preventDefault();
                      playBook(book);
                    }}
                    size="sm"
                  />
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
