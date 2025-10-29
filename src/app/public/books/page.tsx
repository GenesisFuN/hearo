"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BookEngagement from "../../../components/BookEngagement";
import SaveBookButton from "../../../components/SaveBookButton";
import BookProgressBar from "../../../components/BookProgressBar";
import { GENRES } from "../../../lib/genres";

interface PublicBook {
  id: string;
  originalId: string;
  title: string;
  description?: string;
  coverImage?: string;
  audioPath: string;
  genre: string;
  publishedAt: string;
  views: number;
  likes?: number;
  comments?: number;
  averageRating?: number;
  ratingsCount?: number;
  isPublic: boolean;
  author?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
}

export default function PublicBooksPage() {
  const [books, setBooks] = useState<PublicBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicBooks();
  }, []);

  const fetchPublicBooks = async () => {
    try {
      const response = await fetch("/api/public/books");

      if (response.ok) {
        const data = await response.json();
        setBooks(data.books || []);
      }
    } catch (error) {
      console.error("Failed to fetch public books:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group books by genre
  const booksByGenre = books.reduce(
    (acc, book) => {
      const genre = book.genre || "Others";
      if (!acc[genre]) {
        acc[genre] = [];
      }
      acc[genre].push(book);
      return acc;
    },
    {} as Record<string, PublicBook[]>
  );

  // Get genres in preferred order (show only genres that have books)
  const sortedGenres = GENRES.filter((genre) => booksByGenre[genre]);

  const scrollGenre = (genre: string, direction: "left" | "right") => {
    const container = document.getElementById(`genre-${genre}`);
    if (container) {
      const scrollAmount = 200; // Adjust as needed
      container.scrollBy({
        left: direction === "right" ? scrollAmount : -scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-text-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading audiobooks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-light">
      {/* Custom scrollbar styles */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Header */}
      <header className="border-b border-surface">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">📚</div>
            <div>
              <h1 className="font-bold text-xl">Hearo</h1>
              <p className="text-sm text-text-light/70">
                Discover AI Audiobooks
              </p>
            </div>
          </div>
          <a
            href="/"
            className="bg-accent hover:bg-accent/90 text-background px-6 py-2 rounded-lg font-medium transition"
          >
            Create Your Own
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Public Audiobooks</h1>
          <p className="text-text-light/70">
            Discover audiobooks created with AI narration by the Hearo community
          </p>
        </div>

        {books.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold mb-2">No Public Books Yet</h2>
            <p className="text-text-light/70 mb-6">
              Be the first to share an audiobook with the community!
            </p>
            <a
              href="/"
              className="bg-accent text-background px-6 py-3 rounded-lg font-medium hover:bg-accent/90 transition"
            >
              Create & Share Your First Book
            </a>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedGenres.map((genre) => {
              const genreBooks = booksByGenre[genre];

              return (
                <div key={genre} className="space-y-4">
                  {/* Genre Header */}
                  <div className="flex items-center gap-3 px-2">
                    <h2 className="text-2xl font-bold text-text-light">
                      {genre}
                    </h2>
                    <span className="bg-accent/20 text-accent px-3 py-1 rounded-full text-sm">
                      {genreBooks.length} book
                      {genreBooks.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Horizontal Scrolling Books */}
                  <div className="relative group">
                    {/* Left Arrow */}
                    <button
                      onClick={() => scrollGenre(genre, "left")}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 -ml-4"
                    >
                      <svg
                        className="w-6 h-6"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                      </svg>
                    </button>

                    {/* Right Arrow */}
                    <button
                      onClick={() => scrollGenre(genre, "right")}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 -mr-4"
                    >
                      <svg
                        className="w-6 h-6"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                      </svg>
                    </button>

                    <div
                      id={`genre-${genre}`}
                      className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-2"
                      style={{
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                      }}
                    >
                      {genreBooks.map((book) => (
                        <Link
                          key={book.id}
                          href={`/public/book/${book.id}`}
                          className="group flex-shrink-0 block bg-surface/30 hover:bg-surface/50 rounded-lg p-4 transition-all duration-200 hover:scale-105 w-48"
                        >
                          <div className="flex flex-col h-full">
                            {/* Book Cover */}
                            <div className="w-full aspect-square bg-gradient-to-br from-accent/20 to-accent/5 rounded-lg flex items-center justify-center text-2xl mb-3 overflow-hidden relative">
                              {/* Save button */}
                              <div className="absolute top-2 right-2 z-10">
                                <SaveBookButton
                                  bookId={book.originalId || book.id}
                                  size="sm"
                                />
                              </div>
                              {book.coverImage ? (
                                <img
                                  src={book.coverImage}
                                  alt={book.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                "🎧"
                              )}
                              {/* Progress Bar */}
                              <BookProgressBar
                                bookId={book.originalId || book.id}
                                className="absolute bottom-0 left-0 right-0"
                              />
                            </div>

                            {/* Book Info */}
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-accent transition-colors leading-tight">
                                {book.title}
                              </h3>

                              <div className="flex flex-col gap-2 text-xs text-text-light/70 mb-2">
                                {book.author && (
                                  <span className="text-purple-400">
                                    by {book.author.name}
                                  </span>
                                )}
                                <BookEngagement
                                  bookId={book.id}
                                  initialLikes={book.likes}
                                  initialComments={book.comments}
                                  initialRating={book.averageRating}
                                  initialRatingsCount={book.ratingsCount}
                                  initialViews={book.views}
                                  size="sm"
                                />
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats */}
        {books.length > 0 && (
          <div className="mt-12 text-center">
            <div className="bg-surface/30 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-2">Community Stats</h3>
              <div className="flex justify-center gap-8 text-sm text-text-light/70">
                <span>📚 {books.length} books shared</span>
                <span>
                  👀 {books.reduce((total, book) => total + book.views, 0)}{" "}
                  total views
                </span>
                <span>🤖 100% AI narrated</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
