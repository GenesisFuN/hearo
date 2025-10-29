"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { usePlayer } from "../../contexts/PlayerContext";
import SaveBookButton from "../../components/SaveBookButton";
import PlayButton from "../../components/PlayButton";
import BookProgressBar from "../../components/BookProgressBar";
import SkeletonCard from "../../components/SkeletonCard";
import EmptyState from "../../components/EmptyState";
import AdvancedFilters, {
  type FilterState,
} from "../../components/AdvancedFilters";
import { GENRES } from "../../lib/genres";
import RecommendedBooks from "../../components/RecommendedBooks";
import { useToast } from "../../components/Toast";
import { logError } from "@/lib/errorHandling";
import { ErrorState } from "../../components/LoadingState";

interface PublicBook {
  id: string;
  originalId?: string;
  title: string;
  description?: string;
  coverImage?: string;
  audioPath: string;
  genre: string;
  publishedAt: string;
  views: number;
  likes?: number;
  rating?: number;
  ratingsCount?: number;
  comments?: number;
  durationSeconds?: number;
  tags?: string[];
  contentTags?: string[];
  isPublic?: boolean;
  author: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
}

function DiscoverPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showError } = useToast();
  const [books, setBooks] = useState<PublicBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedGenre, setSelectedGenre] = useState(
    searchParams.get("genre") || "all"
  );
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");
  const [searchResults, setSearchResults] = useState<PublicBook[]>([]);
  const [searching, setSearching] = useState(false);
  const { playTrack } = usePlayer();

  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
    genres: searchParams.get("genres")?.split(",") || [],
    duration:
      (searchParams.get("duration") as FilterState["duration"]) || "all",
    dateRange:
      (searchParams.get("dateRange") as FilterState["dateRange"]) || "all",
    author: searchParams.get("author") || "",
    tags: searchParams.get("tags")?.split(",") || [],
    contentTags: searchParams.get("contentTags")?.split(",") || [],
  });

  const genres = ["all", ...GENRES];

  useEffect(() => {
    fetchPublicBooks();
  }, []);

  useEffect(() => {
    // Debounced search with advanced filters
    const timer = setTimeout(() => {
      const hasFilters =
        searchQuery.trim() ||
        selectedGenre !== "all" ||
        advancedFilters.genres.length > 0 ||
        advancedFilters.duration !== "all" ||
        advancedFilters.dateRange !== "all" ||
        advancedFilters.author.trim() ||
        advancedFilters.contentTags.length > 0;

      if (hasFilters) {
        performSearch();
        updateURL();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedGenre, sortBy, advancedFilters]);

  const updateURL = () => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery);
    if (selectedGenre !== "all") params.set("genre", selectedGenre);
    if (sortBy !== "newest") params.set("sort", sortBy);
    if (advancedFilters.genres.length > 0)
      params.set("genres", advancedFilters.genres.join(","));
    if (advancedFilters.duration !== "all")
      params.set("duration", advancedFilters.duration);
    if (advancedFilters.dateRange !== "all")
      params.set("dateRange", advancedFilters.dateRange);
    if (advancedFilters.author.trim())
      params.set("author", advancedFilters.author);
    if (advancedFilters.contentTags.length > 0)
      params.set("contentTags", advancedFilters.contentTags.join(","));

    const newURL = params.toString()
      ? `/discover?${params.toString()}`
      : "/discover";
    router.replace(newURL, { scroll: false });
  };

  useEffect(() => {
    fetchPublicBooks();
  }, []);

  const fetchPublicBooks = async () => {
    try {
      setError(null);
      const response = await fetch("/api/public/books");
      if (!response.ok) {
        throw new Error("Failed to load books");
      }
      const data = await response.json();
      setBooks(data.books || []);
    } catch (err) {
      console.error("Failed to fetch public books:", err);
      logError(err, "Discover Page - Fetch Books");
      setError("Unable to load books. Please try again.");
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    try {
      setSearching(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("q", searchQuery);
      if (selectedGenre !== "all") params.append("genre", selectedGenre);
      params.append("sort", sortBy);

      // Add advanced filters
      if (advancedFilters.genres.length > 0) {
        params.append("genres", advancedFilters.genres.join(","));
      }
      if (advancedFilters.duration !== "all") {
        params.append("duration", advancedFilters.duration);
      }
      if (advancedFilters.dateRange !== "all") {
        params.append("dateRange", advancedFilters.dateRange);
      }
      if (advancedFilters.author.trim()) {
        params.append("author", advancedFilters.author);
      }
      if (advancedFilters.contentTags.length > 0) {
        params.append("contentTags", advancedFilters.contentTags.join(","));
      }

      const response = await fetch(`/api/search?${params}`);
      if (!response.ok) {
        throw new Error("Search failed");
      }
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error("Search failed:", err);
      logError(err, "Discover Page - Search");
      showError(err);
    } finally {
      setSearching(false);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedGenre("all");
    setSortBy("newest");
    setAdvancedFilters({
      genres: [],
      duration: "all",
      dateRange: "all",
      author: "",
      tags: [],
      contentTags: [],
    });
    setSearchResults([]);
    router.replace("/discover", { scroll: false });
  };

  // Get trending books (sorted by views, top 8)
  const trendingBooks = [...books]
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  // Get recent books (last 8 published)
  const recentBooks = [...books]
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .slice(0, 8);

  // Get trending authors (aggregate by real author data, sorted by total views)
  // Filter out books without proper author data for the trending authors section
  const booksWithAuthors = books.filter((book) => book.author?.id);

  const authorStats = booksWithAuthors.reduce(
    (acc, book) => {
      const authorKey = book.author!.id; // We know it exists due to filter
      const authorName = book.author!.name;
      const authorUsername = book.author!.username;
      const authorAvatar = book.author!.avatar;

      if (!acc[authorKey]) {
        acc[authorKey] = {
          id: book.author!.id,
          name: authorName,
          username: authorUsername,
          avatar: authorAvatar,
          totalViews: 0,
          bookCount: 0,
          latestBook: book,
        };
      }
      acc[authorKey].totalViews += book.views;
      acc[authorKey].bookCount += 1;
      if (
        new Date(book.publishedAt) >
        new Date(acc[authorKey].latestBook.publishedAt)
      ) {
        acc[authorKey].latestBook = book;
      }
      return acc;
    },
    {} as Record<
      string,
      {
        id: string;
        name: string;
        username: string;
        avatar?: string;
        totalViews: number;
        bookCount: number;
        latestBook: PublicBook;
      }
    >
  );

  const trendingAuthors = Object.values(authorStats)
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 6);

  const scrollSection = (section: string, direction: "left" | "right") => {
    const container = document.getElementById(`section-${section}`);
    if (container) {
      const scrollAmount = 200;
      container.scrollBy({
        left: direction === "right" ? scrollAmount : -scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const playBook = (book: PublicBook) => {
    playTrack({
      id: book.id,
      title: book.title,
      artist: "AI Narrated",
      src: book.audioPath,
      cover: book.coverImage || "",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen px-8 py-24 bg-background">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Search Skeleton */}
          <div className="h-12 bg-surface rounded-lg animate-pulse" />

          {/* Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen px-8 py-24 bg-background">
        <ErrorState message={error} retry={fetchPublicBooks} />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-8 py-24 bg-background text-text-light">
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

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-accent mb-6">
            Discover Audiobooks
          </h1>
          <p className="text-text-light/80 max-w-md mx-auto mb-8">
            Explore AI-narrated audiobooks created by the Hearo community.
          </p>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto">
            <div className="relative mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search audiobooks..."
                className="w-full bg-surface border border-surface-light rounded-lg px-12 py-3 text-text-light placeholder-text-light/50 focus:outline-none focus:border-accent transition"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-surface border border-surface-light rounded-lg px-4 py-1.5 text-sm text-text-light focus:outline-none focus:border-accent transition cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="popular">Most Popular</option>
                <option value="top-rated">Top Rated</option>
              </select>
            </div>

            {/* Advanced Filters - Includes genre selection */}
            <AdvancedFilters
              filters={advancedFilters}
              onChange={setAdvancedFilters}
              onClear={clearAllFilters}
              availableGenres={genres.filter((g) => g !== "all")}
            />
          </div>
        </div>

        {/* Search Results (show when searching) */}
        {(searchQuery.trim() ||
          selectedGenre !== "all" ||
          advancedFilters.genres.length > 0 ||
          advancedFilters.duration !== "all" ||
          advancedFilters.dateRange !== "all" ||
          advancedFilters.author.trim() ||
          advancedFilters.contentTags.length > 0) && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-light">
                🔍 Search Results
              </h2>
              <button
                onClick={clearAllFilters}
                className="text-accent hover:text-accent/80 text-sm font-medium transition"
              >
                Clear Search
              </button>
            </div>

            {searching ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-text-light/70">Searching...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <EmptyState
                icon={
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                }
                title="No Results Found"
                description="Try adjusting your search or filters"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {searchResults.map((book) => (
                  <div
                    key={book.id}
                    className="bg-surface rounded-lg p-4 hover:bg-surface-light transition cursor-pointer group"
                  >
                    <div className="aspect-square bg-gradient-to-br from-accent/20 to-accent/5 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                      {/* Save button - top right */}
                      <div className="absolute top-2 right-2 z-10">
                        <SaveBookButton
                          bookId={book.originalId || book.id}
                          size="sm"
                        />
                      </div>
                      <svg
                        className="w-12 h-12 text-accent/40"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                      </svg>
                      {/* Progress Bar */}
                      <BookProgressBar
                        bookId={book.originalId || book.id}
                        className="absolute bottom-0 left-0 right-0"
                      />
                      <button
                        onClick={() => playBook(book)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                      >
                        <svg
                          className="w-12 h-12 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </button>
                    </div>
                    <Link href={`/public/book/${book.id}`}>
                      <h3 className="font-bold text-text-light mb-1 group-hover:text-accent transition line-clamp-2">
                        {book.title}
                      </h3>
                    </Link>
                    <p className="text-sm text-text-light/70 mb-2">
                      by{" "}
                      <Link
                        href={`/profile/${book.author.username}`}
                        className="hover:text-accent transition"
                      >
                        {book.author.name}
                      </Link>
                    </p>
                    <div className="flex items-center gap-3 text-xs text-text-light/60">
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path
                            fillRule="evenodd"
                            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {book.views}
                      </span>
                      <span className="flex items-center gap-1">
                        ⭐ {book.rating?.toFixed(1) || "0.0"}
                      </span>
                    </div>
                    {book.genre && (
                      <span className="inline-block mt-2 px-2 py-1 bg-accent/10 text-accent text-xs rounded">
                        {book.genre}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {books.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold mb-2">No Books Available Yet</h2>
            <p className="text-text-light/70 mb-6">
              Be the first to create and share an audiobook!
            </p>
            <Link
              href="/studio"
              className="bg-accent text-background px-6 py-3 rounded-lg font-medium hover:bg-accent/90 transition"
            >
              Create Your First Book
            </Link>
          </div>
        ) : (
          <>
            {/* Recommended Books (personalized) */}
            <RecommendedBooks />

            {/* Trending Books */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-text-light mb-6">
                🔥 Trending Books
              </h2>
              {trendingBooks.length > 0 ? (
                <div className="relative group">
                  {/* Left Arrow */}
                  <button
                    onClick={() => scrollSection("trending-books", "left")}
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
                    onClick={() => scrollSection("trending-books", "right")}
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
                    id="section-trending-books"
                    className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-2"
                    style={{
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    {trendingBooks.map((book, index) => (
                      <Link
                        key={book.id}
                        href={`/public/book/${book.id}`}
                        className="group flex-shrink-0 block bg-surface/30 hover:bg-surface/50 rounded-lg p-4 transition-all duration-200 hover:scale-105 w-48 relative"
                      >
                        {/* Rank Badge */}
                        <div className="absolute -top-2 -left-2 bg-accent text-background rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold z-10">
                          #{index + 1}
                        </div>

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

                            <div className="flex flex-col gap-1 text-xs text-text-light/70 mb-2">
                              <span className="bg-accent/20 text-accent px-2 py-1 rounded-full text-xs w-fit">
                                {book.genre}
                              </span>
                              <span>👀 {book.views} views</span>
                            </div>

                            <PlayButton
                              bookId={book.originalId || book.id}
                              onClick={(e) => {
                                e.preventDefault();
                                playBook(book);
                              }}
                              size="sm"
                            />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-text-light/70">No trending books yet.</p>
              )}
            </section>

            {/* Trending Authors - Only show if we have authors with proper data */}
            {trendingAuthors.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-text-light mb-6">
                  👑 Trending Authors
                </h2>
                <div className="relative group">
                  {/* Left Arrow */}
                  <button
                    onClick={() => scrollSection("trending-authors", "left")}
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
                    onClick={() => scrollSection("trending-authors", "right")}
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
                    id="section-trending-authors"
                    className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-2"
                    style={{
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    {trendingAuthors.map((author, index) => (
                      <Link
                        href={`/profile/${author.username}`}
                        key={author.name}
                        className="group flex-shrink-0 block bg-surface/30 hover:bg-surface/50 rounded-lg p-4 transition-all duration-200 hover:scale-105 w-48 relative"
                      >
                        {/* Rank Badge */}
                        <div className="absolute -top-2 -left-2 bg-purple-500 text-background rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold z-10">
                          #{index + 1}
                        </div>

                        <div className="flex flex-col h-full">
                          {/* Author Avatar */}
                          <div className="w-full aspect-square bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-lg flex items-center justify-center text-2xl mb-3 overflow-hidden">
                            {author.avatar ? (
                              <img
                                src={author.avatar}
                                alt={author.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <div className="text-2xl">👤</div>
                            )}
                          </div>

                          {/* Author Info */}
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm mb-1 line-clamp-1 group-hover:text-purple-400 transition-colors">
                              {author.name}
                            </h3>
                            <p className="text-xs text-purple-400/70 mb-2">
                              @{author.username}
                            </p>

                            <div className="flex flex-col gap-1 text-xs text-text-light/70 mb-2">
                              <span>
                                📚 {author.bookCount} book
                                {author.bookCount !== 1 ? "s" : ""}
                              </span>
                              <span>👀 {author.totalViews} total views</span>
                              <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs w-fit">
                                {author.latestBook.genre}
                              </span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                playBook(author.latestBook);
                              }}
                              className="w-full bg-purple-500 hover:bg-purple-500/90 text-background py-1.5 rounded text-xs font-medium transition flex items-center justify-center gap-1"
                            >
                              <svg
                                className="w-3 h-3 fill-current"
                                viewBox="0 0 24 24"
                              >
                                <path d="M8 5v14l11-7z" />
                              </svg>
                              Latest Book
                            </button>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Recently Added */}
            <section>
              <h2 className="text-2xl font-bold text-text-light mb-6">
                📚 Recently Added
              </h2>
              {recentBooks.length > 0 ? (
                <div className="relative group">
                  {/* Left Arrow */}
                  <button
                    onClick={() => scrollSection("recent", "left")}
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
                    onClick={() => scrollSection("recent", "right")}
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
                    id="section-recent"
                    className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-2"
                    style={{
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    {recentBooks.map((book) => (
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

                            <div className="flex flex-col gap-1 text-xs text-text-light/70 mb-2">
                              <span className="bg-accent/20 text-accent px-2 py-1 rounded-full text-xs w-fit">
                                {book.genre}
                              </span>
                              <span>👀 {book.views} views</span>
                            </div>

                            <PlayButton
                              bookId={book.originalId || book.id}
                              onClick={(e) => {
                                e.preventDefault();
                                playBook(book);
                              }}
                              size="sm"
                            />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-text-light/70">No recent books available.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }
    >
      <DiscoverPageContent />
    </Suspense>
  );
}
