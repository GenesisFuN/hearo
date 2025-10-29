"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePlayer } from "../../../../contexts/PlayerContext";
import BookEngagement from "../../../../components/BookEngagement";
import BookComments from "../../../../components/BookComments";
import AddToPlaylist from "../../../../components/AddToPlaylist";
import SaveBookButton from "../../../../components/SaveBookButton";
import { trackView } from "../../../../lib/analytics";
import { useBookProgress } from "../../../../hooks/useBookProgress";

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

export default function PublicBookPage() {
  const { id } = useParams();
  const [book, setBook] = useState<PublicBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const { hasProgress } = useBookProgress(id as string);

  useEffect(() => {
    if (id) {
      fetchPublicBook(id as string);
    }
  }, [id]);

  const fetchPublicBook = async (publicId: string) => {
    try {
      const response = await fetch(`/api/public/book/${publicId}`);

      if (response.ok) {
        const data = await response.json();
        setBook(data.book);

        // Track view event - use originalId for analytics
        if (data.book.originalId) {
          trackView(data.book.originalId);
        }
      } else {
        setError("Book not found or no longer available");
      }
    } catch (error) {
      setError("Failed to load book");
    } finally {
      setLoading(false);
    }
  };

  const playBook = () => {
    if (book && book.audioPath) {
      playTrack({
        id: book.id,
        title: book.title,
        artist: "AI Narrated",
        src: book.audioPath,
        duration: 0,
        cover: book.coverImage || "/placeholder-cover.jpg",
      });
    }
  };

  const downloadAudio = () => {
    if (book && book.audioPath) {
      const link = document.createElement("a");
      link.href = book.audioPath;
      link.download = `${book.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-text-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading audiobook...</p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-background text-text-light flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-2xl font-bold mb-2">Book Not Found</h1>
          <p className="text-text-light/70 mb-4">{error}</p>
          <a
            href="/"
            className="bg-accent text-background px-6 py-2 rounded-lg font-medium hover:bg-accent/90 transition"
          >
            Go to Hearo
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-light">
      {/* Header */}
      <header className="border-b border-surface">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">📚</div>
            <div>
              <h1 className="font-bold">Hearo</h1>
              <p className="text-sm text-text-light/70">
                AI Audiobook Platform
              </p>
            </div>
          </div>
          <a
            href="/"
            className="bg-surface hover:bg-surface/80 text-text-light px-4 py-2 rounded-lg font-medium transition"
          >
            Create Your Own
          </a>
        </div>
      </header>

      {/* Book Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-surface/30 rounded-xl p-8 mb-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Book Cover */}
            <div className="flex-shrink-0">
              <div className="w-64 h-96 bg-gradient-to-br from-accent/20 to-accent/5 rounded-lg flex items-center justify-center text-6xl overflow-hidden shadow-xl">
                {book.coverImage ? (
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  "🎧"
                )}
              </div>
            </div>

            {/* Book Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-text-light mb-4">
                {book.title}
              </h1>

              {/* Author Info */}
              {book.author && (
                <Link
                  href={`/profile/${book.author.username}`}
                  className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity group"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-full flex items-center justify-center overflow-hidden">
                    {book.author.avatar ? (
                      <img
                        src={book.author.avatar}
                        alt={book.author.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="text-sm">👤</div>
                    )}
                  </div>
                  <div>
                    <p className="text-purple-400 font-medium group-hover:underline">
                      by {book.author.name}
                    </p>
                    <p className="text-xs text-text-light/60">
                      @{book.author.username}
                    </p>
                  </div>
                </Link>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-text-light/70 mb-6">
                <span className="bg-accent/20 text-accent px-3 py-1 rounded-full">
                  📚 {book.genre}
                </span>
                <span>
                  📅 Published {new Date(book.publishedAt).toLocaleDateString()}
                </span>
                <span>🤖 AI Narrated</span>
              </div>

              {/* Engagement Stats */}
              <div className="mb-6">
                <BookEngagement
                  bookId={book.id}
                  initialLikes={book.likes}
                  initialComments={book.comments}
                  initialRating={book.averageRating}
                  initialRatingsCount={book.ratingsCount}
                  initialViews={book.views}
                  size="lg"
                  showComments={true}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={playBook}
                  className="bg-accent hover:bg-accent/90 text-background px-8 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 hover:scale-105"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {currentTrack?.id === book.id && isPlaying
                    ? "Playing..."
                    : hasProgress
                      ? "Resume"
                      : "Play Audiobook"}
                </button>

                <SaveBookButton
                  bookId={book.originalId}
                  size="md"
                  showLabel={true}
                />

                <AddToPlaylist
                  bookId={book.originalId}
                  bookTitle={book.title}
                />

                <button
                  onClick={downloadAudio}
                  className="bg-surface hover:bg-surface/80 text-text-light px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 hover:scale-105"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                  </svg>
                  Download
                </button>
              </div>

              <div className="bg-background/50 rounded-lg p-4">
                <h3 className="font-medium mb-2">About this audiobook</h3>
                <p className="text-text-light/70">
                  This audiobook was created using Hearo's AI narration
                  technology. Enjoy high-quality, natural-sounding narration
                  powered by advanced text-to-speech AI.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Share Section */}
        <div className="bg-surface/30 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Share this audiobook</h2>
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={window.location.href}
              readOnly
              className="flex-1 bg-background text-text-light px-4 py-2 rounded-lg border border-surface focus:border-accent outline-none"
            />
            <button
              onClick={() =>
                navigator.clipboard.writeText(window.location.href)
              }
              className="bg-accent hover:bg-accent/90 text-background px-6 py-2 rounded-lg font-medium transition"
            >
              Copy Link
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <BookComments bookId={book.id} initialCount={book.comments} />
      </main>
    </div>
  );
}
