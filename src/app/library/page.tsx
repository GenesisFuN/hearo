"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { usePlayer } from "../../contexts/PlayerContext";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import AddToPlaylist from "../../components/AddToPlaylist";
import ContinueListeningCard from "../../components/ContinueListeningCard";
import PlayButton from "../../components/PlayButton";
import BookProgressBar from "../../components/BookProgressBar";
import SkeletonCard from "../../components/SkeletonCard";
import EmptyState from "../../components/EmptyState";
import LoadingState from "../../components/LoadingState";
import ListeningStats from "../../components/ListeningStats";

interface Book {
  id: string;
  title: string;
  description?: string;
  genre?: string;
  coverImage?: string;
  audioPath: string;
  duration: number;
  publishedAt: string;
  views: number;
  likes: number;
  rating: number;
  ratingsCount: number;
  comments: number;
  author?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ContinueListeningBook {
  id: string;
  title: string;
  artist: string;
  coverImage: string | null;
  audioPath?: string;
  progress: number;
  currentTime: number;
  duration: number;
  creatorUsername: string;
}

type Tab = "saved-books" | "following" | "playlists" | "stats";

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("saved-books");
  const [savedBooks, setSavedBooks] = useState<Book[]>([]);
  const [followingBooks, setFollowingBooks] = useState<Book[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [continueListening, setContinueListening] = useState<
    ContinueListeningBook[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();
  const { playTrack } = usePlayer();

  useEffect(() => {
    if (user) {
      loadLibraryData();
    }
  }, [user]);

  const loadLibraryData = async () => {
    setLoading(true);
    try {
      // Add 10 second timeout for all library data loading
      await Promise.race([
        Promise.all([
          fetchSavedBooks(),
          fetchFollowingBooks(),
          fetchPlaylists(),
          fetchContinueListening(),
        ]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Loading timeout")), 10000)
        ),
      ]);
    } catch (error) {
      console.error("Error loading library data:", error);
      // Continue anyway - empty states will show
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedBooks = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) return;

      const response = await fetch("/api/library", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSavedBooks(data.books || []);
      }
    } catch (error) {
      console.error("Failed to fetch saved books:", error);
    }
  };

  const fetchFollowingBooks = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) return;

      const response = await fetch("/api/feed/following", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFollowingBooks(data.books || []);
      }
    } catch (error) {
      console.error("Failed to fetch following books:", error);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const response = await fetch("/api/playlists", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlaylists(data.playlists || []);
      }
    } catch (error) {
      console.error("Failed to fetch playlists:", error);
    }
  };

  const fetchContinueListening = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const response = await fetch("/api/continue-listening", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Continue Listening data:", data);
        console.log("Continue Listening books:", data.books);
        setContinueListening(data.books || []);
      } else {
        console.error("Continue Listening fetch failed:", response.status);
      }
    } catch (error) {
      console.error("Failed to fetch continue listening:", error);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newPlaylistName,
          description: newPlaylistDescription,
          isPublic: false,
        }),
      });

      if (response.ok) {
        setNewPlaylistName("");
        setNewPlaylistDescription("");
        setShowCreatePlaylist(false);
        await fetchPlaylists();
      }
    } catch (error) {
      console.error("Failed to create playlist:", error);
    }
  };

  const playBook = (book: Book) => {
    playTrack({
      id: book.id,
      title: book.title,
      artist: book.author?.name || "Unknown",
      src: book.audioPath,
      cover: book.coverImage || "",
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen px-8 py-24 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-3xl font-bold mb-2">Library</h1>
          <p className="text-text-light/70 mb-6">
            Please log in to access your library
          </p>
          <Link
            href="/login"
            className="bg-accent text-background px-6 py-3 rounded-lg font-medium hover:bg-accent/90 transition inline-block"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-8 py-24 bg-background text-text-light">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-accent mb-4">Your Library</h1>
          <p className="text-text-light/80 max-w-md mx-auto">
            Your saved audiobooks, content from creators you follow, and
            playlists.
          </p>
        </div>

        {/* Continue Listening Section */}
        {!loading && continueListening.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-text-light">
                Continue Listening
              </h2>
              <p className="text-sm text-text-light/60">
                Pick up where you left off
              </p>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-hide">
              {continueListening.map((book) => (
                <ContinueListeningCard
                  key={book.id}
                  {...book}
                  onPlay={() => {
                    playTrack({
                      id: book.id,
                      title: book.title,
                      artist: book.artist,
                      src: book.audioPath || `/api/public/audio/${book.id}`,
                      cover: book.coverImage || "",
                      startTime: book.currentTime, // Auto-resume from saved position
                    });
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-surface">
          <button
            onClick={() => setActiveTab("saved-books")}
            className={`px-6 py-3 font-medium transition border-b-2 ${
              activeTab === "saved-books"
                ? "border-accent text-accent"
                : "border-transparent text-text-light/70 hover:text-text-light"
            }`}
          >
            ❤️ Saved Books ({savedBooks.length})
          </button>
          <button
            onClick={() => setActiveTab("following")}
            className={`px-6 py-3 font-medium transition border-b-2 ${
              activeTab === "following"
                ? "border-accent text-accent"
                : "border-transparent text-text-light/70 hover:text-text-light"
            }`}
          >
            👥 Following ({followingBooks.length})
          </button>
          <button
            onClick={() => setActiveTab("playlists")}
            className={`px-6 py-3 font-medium transition border-b-2 ${
              activeTab === "playlists"
                ? "border-accent text-accent"
                : "border-transparent text-text-light/70 hover:text-text-light"
            }`}
          >
            🎵 Playlists ({playlists.length})
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-6 py-3 font-medium transition border-b-2 ${
              activeTab === "stats"
                ? "border-accent text-accent"
                : "border-transparent text-text-light/70 hover:text-text-light"
            }`}
          >
            📊 Stats
          </button>
        </div>

        {loading && activeTab !== "stats" ? (
          <div className="space-y-8">
            <LoadingState message="Loading your library..." />

            {/* Skeleton Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Saved Books Tab */}
            {activeTab === "saved-books" && (
              <div>
                {savedBooks.length === 0 ? (
                  <EmptyState
                    icon={
                      <svg
                        className="w-8 h-8"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    }
                    title="No Saved Books Yet"
                    description="Save audiobooks you love to access them quickly from your library"
                    action={{
                      label: "Discover Books",
                      onClick: () => (window.location.href = "/discover"),
                    }}
                  />
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {savedBooks.map((book: Book) => (
                      <div
                        key={book.id}
                        className="bg-surface rounded-lg p-4 hover:bg-surface/80 transition"
                      >
                        {/* Use 2:3 aspect ratio for book covers */}
                        <div className="w-full aspect-[2/3] bg-gradient-to-br from-accent/20 to-accent/5 rounded-lg flex items-center justify-center text-6xl mb-4 overflow-hidden shadow-lg relative">
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
                            bookId={book.id}
                            className="absolute bottom-0 left-0 right-0"
                          />
                        </div>
                        <h3 className="font-semibold text-lg mb-1 line-clamp-1">
                          {book.title}
                        </h3>
                        {book.author && (
                          <p className="text-sm text-text-light/70 mb-2">
                            by {book.author.name}
                          </p>
                        )}
                        {book.description && (
                          <p className="text-sm text-text-light/70 line-clamp-2 mb-3">
                            {book.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-sm text-text-light/70 mb-3">
                          {book.genre && (
                            <span className="bg-accent/20 text-accent px-2 py-1 rounded">
                              {book.genre}
                            </span>
                          )}
                          <span>👀 {book.views}</span>
                        </div>
                        <div className="flex gap-2">
                          <PlayButton
                            bookId={book.id}
                            onClick={() => playBook(book)}
                            size="md"
                          />
                          <div className="relative">
                            <AddToPlaylist
                              bookId={book.id}
                              bookTitle={book.title}
                              onPlaylistUpdated={fetchPlaylists}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Following Tab */}
            {activeTab === "following" && (
              <div>
                {followingBooks.length === 0 ? (
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
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    }
                    title="No Books from Followed Creators"
                    description="Follow creators to see their audiobooks here"
                    action={{
                      label: "Discover Creators",
                      onClick: () => (window.location.href = "/discover"),
                    }}
                  />
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {followingBooks.map((book) => (
                      <div
                        key={book.id}
                        className="bg-surface rounded-lg p-4 hover:bg-surface/80 transition"
                      >
                        {/* Use 2:3 aspect ratio for book covers */}
                        <div className="w-full aspect-[2/3] bg-gradient-to-br from-accent/20 to-accent/5 rounded-lg flex items-center justify-center text-6xl mb-4 overflow-hidden shadow-lg relative">
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
                            bookId={book.id}
                            className="absolute bottom-0 left-0 right-0"
                          />
                        </div>
                        <h3 className="font-semibold text-lg mb-1 line-clamp-1">
                          {book.title}
                        </h3>
                        {book.author && (
                          <Link
                            href={`/profile/${book.author.username}`}
                            className="text-sm text-purple-400 hover:underline mb-2 block"
                          >
                            by {book.author.name}
                          </Link>
                        )}
                        {book.description && (
                          <p className="text-sm text-text-light/70 line-clamp-2 mb-3">
                            {book.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-sm text-text-light/70 mb-3">
                          {book.genre && (
                            <span className="bg-accent/20 text-accent px-2 py-1 rounded">
                              {book.genre}
                            </span>
                          )}
                          <span>👀 {book.views}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => playBook(book)}
                            className="flex-1 bg-accent hover:bg-accent/90 text-background py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"
                          >
                            <svg
                              className="w-5 h-5 fill-current"
                              viewBox="0 0 24 24"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            Play
                          </button>
                          <div className="relative">
                            <AddToPlaylist
                              bookId={book.id}
                              bookTitle={book.title}
                              onPlaylistUpdated={fetchPlaylists}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Playlists Tab */}
            {activeTab === "playlists" && (
              <div>
                {/* Create Playlist Button */}
                <div className="mb-6 flex justify-end">
                  <button
                    onClick={() => setShowCreatePlaylist(true)}
                    className="bg-accent text-background px-6 py-3 rounded-lg font-medium hover:bg-accent/90 transition flex items-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Create Playlist
                  </button>
                </div>

                {/* Create Playlist Modal */}
                {showCreatePlaylist && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface rounded-lg p-6 max-w-md w-full">
                      <h2 className="text-2xl font-bold mb-4">
                        Create New Playlist
                      </h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Name *
                          </label>
                          <input
                            type="text"
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            placeholder="My Awesome Playlist"
                            maxLength={255}
                            className="w-full px-4 py-2 bg-background border border-surface rounded-lg focus:outline-none focus:border-accent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Description
                          </label>
                          <textarea
                            value={newPlaylistDescription}
                            onChange={(e) =>
                              setNewPlaylistDescription(e.target.value)
                            }
                            placeholder="What's this playlist about?"
                            rows={3}
                            className="w-full px-4 py-2 bg-background border border-surface rounded-lg focus:outline-none focus:border-accent resize-none"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={() => {
                            setShowCreatePlaylist(false);
                            setNewPlaylistName("");
                            setNewPlaylistDescription("");
                          }}
                          className="flex-1 px-4 py-2 bg-surface hover:bg-surface/80 rounded-lg font-medium transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={createPlaylist}
                          disabled={!newPlaylistName.trim()}
                          className="flex-1 px-4 py-2 bg-accent hover:bg-accent/90 text-background rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Playlists Grid */}
                {playlists.length === 0 ? (
                  <EmptyState
                    icon={
                      <svg
                        className="w-8 h-8"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    }
                    title="No Playlists Yet"
                    description="Create playlists to organize your favorite audiobooks"
                    action={{
                      label: "Create Playlist",
                      onClick: () => setShowCreatePlaylist(true),
                    }}
                  />
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {playlists.map((playlist) => (
                      <Link
                        key={playlist.id}
                        href={`/playlist/${playlist.id}`}
                        className="bg-surface rounded-lg p-6 hover:bg-surface/80 transition"
                      >
                        <div className="aspect-square bg-gradient-to-br from-purple-500/20 to-accent/5 rounded-lg flex items-center justify-center text-6xl mb-4">
                          🎵
                        </div>
                        <h3 className="font-semibold text-lg mb-1 line-clamp-1">
                          {playlist.name}
                        </h3>
                        {playlist.description && (
                          <p className="text-sm text-text-light/70 line-clamp-2 mb-3">
                            {playlist.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-sm text-text-light/70">
                          <span>
                            {playlist.itemCount}{" "}
                            {playlist.itemCount === 1 ? "book" : "books"}
                          </span>
                          <span className="text-xs">
                            {new Date(playlist.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === "stats" && <ListeningStats />}
          </>
        )}
      </div>
    </div>
  );
}
