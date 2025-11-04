"use client";

import { useState, useEffect } from "react";
import { usePlayer } from "../contexts/PlayerContext";
import { useAuth } from "../contexts/AuthContext";
import GenreSelectionDialog from "./GenreSelectionDialog";
import BookEngagement from "./BookEngagement";
import EditBookModal from "./EditBookModal";
import { supabase } from "../lib/supabase";

interface Book {
  id: string;
  title: string;
  filename: string;
  status: "draft" | "processing" | "published" | "failed";
  progress: number;
  type: "text" | "audio";
  uploadDate: string;
  fileSize: number;
  audioPath?: string;
  textPath?: string;
  processingMessage?: string;
  likes?: number;
  comments?: number;
  averageRating?: number;
  ratingsCount?: number;
  views?: number;
  coverImage?: string;
}

export default function BookLibrary() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "text" | "audio" | "processing" | "complete"
  >("all");
  const [genreDialogOpen, setGenreDialogOpen] = useState(false);
  const [bookToPublish, setBookToPublish] = useState<Book | null>(null);
  const [publishedBooks, setPublishedBooks] = useState<Set<string>>(new Set());
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const { setCurrentTrack, currentTrack, playTrack, isPlaying } = usePlayer();
  const { user, loading: authLoading } = useAuth();

  // Debug: Test the player context
  const testPlayer = () => {
    console.log("Testing player with sample track...");
    playTrack({
      id: "test-track",
      title: "Test Audio",
      artist: "Test Artist",
      src: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
      duration: 0,
      cover: "/placeholder-cover.jpg",
    });
  };

  useEffect(() => {
    fetchBooks();
    fetchPublishedBooks();

    // Poll every 10 seconds
    const interval = setInterval(() => {
      fetchBooks();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchPublishedBooks = async () => {
    try {
      // Add 5 second timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("/api/public/books", {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const published = new Set<string>(
          data.books.map((book: any) => book.originalId)
        );
        setPublishedBooks(published);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Failed to fetch published books:", error);
      }
      // Set empty set on timeout or error
      setPublishedBooks(new Set());
    }
  };

  const fetchBooks = async () => {
    try {
      console.log("Fetching books from /api/books...");

      // Get the session token for authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.error("Not authenticated");
        setLoading(false);
        return;
      }

      // Add 5 second timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("/api/books", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      console.log("Books response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Books data received:", data);
        setBooks(data.books || []);
      } else {
        console.error(
          "Failed to fetch books:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Failed to fetch books:", error);
      }
      // Set empty array on timeout or error
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = books.filter((book) => {
    if (filter === "all") return true;
    if (filter === "text" || filter === "audio") return book.type === filter;
    if (filter === "processing") return book.status === "processing";
    if (filter === "complete") return book.status === "published";
    return true;
  });

  const playAudio = async (book: Book) => {
    console.log(
      "Play button clicked for book:",
      book.title,
      "Audio path:",
      book.audioPath
    );

    if (book.audioPath && book.status === "published") {
      const track = {
        id: book.id,
        title: book.title,
        artist: "AI Narrated",
        src: book.audioPath,
        duration: 0, // Will be calculated when loaded
        cover: "/placeholder-cover.jpg", // Default cover for AI narrated books
      };

      console.log("Playing track:", track);

      // Track view
      try {
        await fetch(`/api/books/${book.id}/view`, { method: "POST" });
      } catch (error) {
        console.error("Failed to track view:", error);
        // Don't block playback if view tracking fails
      }

      playTrack(track); // Use playTrack instead of setCurrentTrack to auto-start playback
    } else {
      console.log("Cannot play book - missing audio path or not complete:", {
        audioPath: book.audioPath,
        status: book.status,
      });
    }
  };

  const downloadAudio = (book: Book) => {
    if (book.audioPath && book.status === "published") {
      const link = document.createElement("a");
      link.href = book.audioPath;
      link.download = `${book.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const deleteBook = async (book: Book) => {
    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete "${book.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      console.log("Deleting book:", book.id);

      // Get the session token for authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert("You must be signed in to delete books.");
        return;
      }

      const response = await fetch("/api/books/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          bookId: book.id,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Delete successful:", result.message);

        // Remove the book from the local state
        setBooks((prevBooks) => prevBooks.filter((b) => b.id !== book.id));

        // Show success message
        alert(`"${book.title}" has been deleted successfully.`);
      } else {
        const error = await response.json();
        console.error("Delete failed:", error);
        alert(`Failed to delete "${book.title}": ${error.error}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert(`Failed to delete "${book.title}". Please try again.`);
    }
  };

  const publishBook = async (book: Book) => {
    if (!user) {
      alert(
        "Please sign in to publish books. You need an account to share your audiobooks publicly."
      );
      return;
    }

    setBookToPublish(book);
    setGenreDialogOpen(true);
  };

  const retryProcessing = async (book: Book) => {
    try {
      console.log("Retrying processing for book:", book.id);

      const response = await fetch("/api/upload/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookId: book.id,
          textPath: book.textPath,
          retry: true,
        }),
      });

      if (response.ok) {
        // Refresh the books list to show updated status
        fetchBooks();
        console.log("Retry processing initiated for:", book.title);
      } else {
        const error = await response.json();
        console.error("Retry failed:", error);
        alert(`Failed to retry processing for "${book.title}": ${error.error}`);
      }
    } catch (error) {
      console.error("Retry error:", error);
      alert(
        `Failed to retry processing for "${book.title}". Please try again.`
      );
    }
  };

  const confirmPublish = async (genre: string) => {
    if (!bookToPublish) return;

    try {
      console.log("Publishing book:", bookToPublish.id, "Genre:", genre);

      // Get current session for authentication
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Session error:", sessionError);
        alert("Authentication error: Please sign in again to publish books");
        return;
      }

      if (!session?.access_token) {
        alert("Please sign in to publish books");
        return;
      }

      const response = await fetch("/api/books/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          bookId: bookToPublish.id,
          title: bookToPublish.title,
          audioPath: bookToPublish.audioPath,
          genre: genre,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Publish successful:", result.message);

        // Add to local published books set
        setPublishedBooks((prev) => new Set(prev).add(bookToPublish.id));

        // Copy share URL to clipboard
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(result.shareUrl);
          alert(
            `"${bookToPublish.title}" has been published!\n\nShare URL copied to clipboard:\n${result.shareUrl}`
          );
        } else {
          // Fallback for browsers without clipboard API
          prompt(
            `"${bookToPublish.title}" has been published! Copy this share URL:`,
            result.shareUrl
          );
        }
      } else {
        let errorMessage = "Unknown error occurred";
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || "Publishing failed";
          console.error("Publish failed:", error);
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          console.error(
            "Response status:",
            response.status,
            response.statusText
          );
        }

        if (response.status === 401) {
          alert(`Authentication required: Please sign in to publish books.`);
        } else {
          alert(`Failed to publish "${bookToPublish.title}": ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error("Publish error:", error);
      alert(`Failed to publish "${bookToPublish.title}". Please try again.`);
    }

    // Reset state
    setBookToPublish(null);
  };

  const openEditModal = (book: Book) => {
    setBookToEdit(book);
    setEditModalOpen(true);
  };

  const handleBookUpdate = (updates: {
    title?: string;
    coverImage?: string;
  }) => {
    if (!bookToEdit) return;

    // Update the book in local state
    setBooks((prevBooks) =>
      prevBooks.map((b) =>
        b.id === bookToEdit.id
          ? {
              ...b,
              title: updates.title || b.title,
              coverImage: updates.coverImage || b.coverImage,
            }
          : b
      )
    );

    // Close modal and reset
    setEditModalOpen(false);
    setBookToEdit(null);
  };

  const unpublishBook = async (book: Book) => {
    if (!user) {
      alert("Please sign in to unpublish books.");
      return;
    }

    // Confirm unpublishing
    const confirmed = window.confirm(
      `Remove "${book.title}" from public view? This will make it private again.`
    );

    if (!confirmed) return;

    try {
      console.log("Unpublishing book:", book.id);

      // Get current session for authentication
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Session error:", sessionError);
        alert("Authentication error: Please sign in again to unpublish books");
        return;
      }

      if (!session?.access_token) {
        alert("Please sign in to unpublish books");
        return;
      }

      const response = await fetch("/api/books/unpublish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          bookId: book.id,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Unpublish successful:", result.message);

        // Remove from local published books set
        setPublishedBooks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(book.id);
          return newSet;
        });

        alert(`"${book.title}" has been removed from public view.`);
      } else {
        let errorMessage = "Unknown error occurred";
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || "Unpublishing failed";
          console.error("Unpublish failed:", error);
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          console.error(
            "Response status:",
            response.status,
            response.statusText
          );
        }

        if (response.status === 401) {
          alert(`Authentication required: Please sign in to unpublish books.`);
        } else {
          alert(`Failed to unpublish "${book.title}": ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error("Unpublish error:", error);
      alert(`Failed to unpublish "${book.title}". Please try again.`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return (
          <svg
            className="w-6 h-6 text-green-400"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        );
      case "processing":
        return (
          <svg
            className="w-6 h-6 text-yellow-400 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              opacity="0.25"
            />
            <path
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );
      case "uploading":
        return (
          <svg
            className="w-6 h-6 text-blue-400"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
          </svg>
        );
      case "error":
        return (
          <svg
            className="w-6 h-6 text-red-400"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        );
      default:
        return (
          <svg
            className="w-6 h-6 text-text-light/70"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
          </svg>
        );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete":
        return "text-green-400";
      case "processing":
        return "text-yellow-400";
      case "uploading":
        return "text-blue-400";
      case "error":
        return "text-red-400";
      default:
        return "text-text-light/70";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-text-light/70">Loading your books...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-light">My Books</h2>
          <p className="text-text-light/70">
            {books.length} {books.length === 1 ? "book" : "books"} uploaded
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {["all", "text", "audio", "processing", "complete"].map(
            (filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType as any)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  filter === filterType
                    ? "bg-accent text-background"
                    : "bg-surface/50 text-text-light/70 hover:text-text-light"
                }`}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </button>
            )
          )}
        </div>
      </div>

      {/* Debug Section */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <h3 className="text-sm font-bold text-yellow-400 mb-2">Debug Info</h3>
        <div className="text-xs text-text-light/70 space-y-1">
          <div>
            Authentication:{" "}
            {authLoading
              ? "Loading..."
              : user
                ? `Signed in as ${user.email}`
                : "Not signed in"}
          </div>
          <div>Current Track: {currentTrack ? currentTrack.title : "None"}</div>
          <div>Books Count: {books.length}</div>
          <div>
            Complete Books:{" "}
            {
              books.filter((b) => b.status === "published" && b.audioPath)
                .length
            }
          </div>
          <div>Published Books: {publishedBooks.size}</div>
          {books
            .filter((b) => b.status === "published" && b.audioPath)
            .slice(0, 1)
            .map((book) => (
              <div key={book.id} className="border-t border-yellow-500/20 pt-2">
                <div>Sample Audio Path: {book.audioPath}</div>
                <a
                  href={book.audioPath}
                  target="_blank"
                  className="text-yellow-400 underline"
                >
                  Test Direct Link
                </a>
              </div>
            ))}
          <div className="flex gap-2 pt-2">
            <button
              onClick={testPlayer}
              className="bg-yellow-500 text-black px-2 py-1 rounded text-xs hover:bg-yellow-400"
            >
              Test Player
            </button>
          </div>
        </div>
      </div>

      {/* Books Grid */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-surface/50 rounded-full flex items-center justify-center mx-auto mb-4">
            📚
          </div>
          <h3 className="text-lg font-medium text-text-light mb-2">
            {filter === "all"
              ? "No books uploaded yet"
              : `No ${filter} books found`}
          </h3>
          <p className="text-text-light/70">
            {filter === "all"
              ? "Upload your first text file to get started with AI narration"
              : `Try changing the filter to see other books`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              data-book-id={book.id}
              className="bg-surface/30 rounded-lg p-6 border border-surface hover:border-accent/50 transition"
            >
              <div className="flex items-start justify-between">
                {/* Book Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {/* Cover Image */}
                    {book.coverImage ? (
                      <img
                        src={book.coverImage}
                        alt={`${book.title} cover`}
                        className="w-16 h-16 object-cover rounded-lg border border-surface flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-surface/50 rounded-lg border border-surface flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">
                          {getStatusIcon(book.status)}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-text-light">
                        {book.title}
                      </h3>
                      <p className="text-sm text-text-light/70">
                        {book.filename}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-text-light/70 mb-3">
                    <span className="capitalize">{book.type} file</span>
                    <span>{formatFileSize(book.fileSize)}</span>
                    <span>{formatDate(book.uploadDate)}</span>
                  </div>

                  {/* Status and Progress */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-medium ${getStatusColor(book.status)}`}
                    >
                      {book.status.charAt(0).toUpperCase() +
                        book.status.slice(1)}
                    </span>

                    {book.status === "processing" && (
                      <>
                        <div className="flex-1 max-w-xs">
                          <div className="bg-background rounded-full h-2">
                            <div
                              className="bg-accent h-2 rounded-full transition-all duration-500"
                              style={{ width: `${book.progress}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm text-text-light/70">
                          {Math.round(book.progress)}%
                        </span>
                      </>
                    )}
                  </div>

                  {book.processingMessage && (
                    <div
                      className={`mt-2 p-3 rounded-lg text-sm ${
                        book.status === "failed"
                          ? "bg-red-500/10 border border-red-500/20 text-red-400"
                          : "text-text-light/70 italic"
                      }`}
                    >
                      {book.status === "failed" && (
                        <div className="flex items-start gap-2">
                          <svg
                            className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                          <div>
                            <div className="font-medium mb-1">
                              Processing Failed
                            </div>
                            <div>{book.processingMessage}</div>
                          </div>
                        </div>
                      )}
                      {book.status !== "failed" && book.processingMessage}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  {book.status === "published" && book.audioPath && (
                    <>
                      {/* Engagement Stats */}
                      <div className="mr-2">
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

                      <button
                        onClick={() => {
                          console.log("Play button clicked for:", book.title);
                          playAudio(book);
                        }}
                        className="play-button bg-accent hover:bg-accent/90 text-background px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl border border-transparent hover:border-highlight/50"
                        title={`Play "${book.title}"`}
                      >
                        <svg
                          className="w-4 h-4 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        {currentTrack?.id === book.id && isPlaying
                          ? "Playing..."
                          : "Play"}
                      </button>
                      <button
                        onClick={() => downloadAudio(book)}
                        className="bg-surface hover:bg-surface/80 text-text-light px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 hover:scale-105 border border-transparent hover:border-highlight/50"
                        title="Download audio file"
                      >
                        <svg
                          className="w-4 h-4 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                        </svg>
                        Download
                      </button>
                      <button
                        onClick={() => openEditModal(book)}
                        className="bg-surface hover:bg-surface/80 text-text-light px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 hover:scale-105 border border-transparent hover:border-highlight/50"
                        title="Edit book details"
                      >
                        <svg
                          className="w-4 h-4 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                        Edit
                      </button>
                      {publishedBooks.has(book.id) ? (
                        <button
                          onClick={() => unpublishBook(book)}
                          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 hover:scale-105"
                          title="Remove from public view"
                        >
                          <svg
                            className="w-4 h-4 fill-current"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z" />
                          </svg>
                          Unshare
                        </button>
                      ) : (
                        <button
                          onClick={() => publishBook(book)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 hover:scale-105"
                          title="Publish publicly"
                        >
                          <svg
                            className="w-4 h-4 fill-current"
                            viewBox="0 0 24 24"
                          >
                            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
                          </svg>
                          Share
                        </button>
                      )}
                      <button
                        onClick={() => deleteBook(book)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 hover:scale-105"
                        title="Delete this book"
                      >
                        <svg
                          className="w-4 h-4 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                        Delete
                      </button>
                    </>
                  )}

                  {book.status === "processing" && (
                    <div className="flex items-center gap-3">
                      <div className="text-accent animate-pulse">
                        Processing...
                      </div>
                      <button
                        onClick={() => deleteBook(book)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-all duration-200"
                        title="Cancel and delete"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {book.status === "failed" && (
                    <div className="flex flex-col gap-2">
                      <div className="text-red-400 text-sm max-w-md">
                        {book.processingMessage || "Processing failed"}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => retryProcessing(book)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm font-medium transition-all duration-200"
                          title="Retry audio generation"
                        >
                          Retry Processing
                        </button>
                        <button
                          onClick={() => deleteBook(book)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-all duration-200"
                          title="Delete failed upload"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <GenreSelectionDialog
        isOpen={genreDialogOpen}
        onClose={() => {
          setGenreDialogOpen(false);
          setBookToPublish(null);
        }}
        onConfirm={confirmPublish}
        bookTitle={bookToPublish?.title || ""}
      />

      {bookToEdit && (
        <EditBookModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setBookToEdit(null);
          }}
          book={bookToEdit}
          onUpdate={handleBookUpdate}
        />
      )}
    </div>
  );
}
