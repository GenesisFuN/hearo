"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import BookProgressBar from "@/components/BookProgressBar";

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    name: string | null;
  };
}

interface PlaylistItem {
  id: string;
  playlistId: string;
  workId: string;
  position: number;
  addedAt: string;
  work: {
    id: string;
    title: string;
    description: string | null;
    audioPath: string;
    coverImage: string | null;
    genre: string | null;
    views: number;
    author?: {
      id: string;
      username: string;
      name: string | null;
    };
  };
}

export default function PlaylistPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { playTrack } = usePlayer();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    if (params.id && user) {
      fetchPlaylist();
    }
  }, [params.id, user]);

  const fetchPlaylist = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        console.error("No auth token available");
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/playlists/${params.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlaylist(data.playlist);
        setItems(data.items || []);
        setEditName(data.playlist.name);
        setEditDescription(data.playlist.description || "");

        // Check if current user is the owner
        if (user?.id === data.playlist.userId) {
          setIsOwner(true);
        }
      } else if (response.status === 404) {
        router.push("/library");
      }
    } catch (error) {
      console.error("Failed to fetch playlist:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePlaylist = async () => {
    if (!editName.trim()) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const response = await fetch(`/api/playlists/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          isPublic: playlist?.isPublic || false,
        }),
      });

      if (response.ok) {
        await fetchPlaylist();
        setEditMode(false);
      }
    } catch (error) {
      console.error("Failed to update playlist:", error);
    }
  };

  const deletePlaylist = async () => {
    if (!confirm("Are you sure you want to delete this playlist?")) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const response = await fetch(`/api/playlists/${params.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        router.push("/library");
      }
    } catch (error) {
      console.error("Failed to delete playlist:", error);
    }
  };

  const removeFromPlaylist = async (itemId: string) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const response = await fetch(
        `/api/playlists/items?playlistItemId=${itemId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setItems(items.filter((item) => item.id !== itemId));
      }
    } catch (error) {
      console.error("Failed to remove from playlist:", error);
    }
  };

  const playBook = (item: PlaylistItem) => {
    playTrack({
      id: item.work.id,
      title: item.work.title,
      artist: item.work.author?.name || "Unknown",
      src: item.work.audioPath,
      cover: item.work.coverImage || "",
    });
  };

  const playAll = () => {
    if (items.length === 0) return;
    playBook(items[0]);
  };

  // Show loading while auth is initializing
  if (!user && loading) {
    return (
      <div className="min-h-screen px-8 py-24 bg-background text-text-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-light/70">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    router.push("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen px-8 py-24 bg-background text-text-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-light/70">Loading playlist...</p>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen px-8 py-24 bg-background text-text-light flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold mb-2">Playlist Not Found</h2>
          <p className="text-text-light/70 mb-6">
            This playlist doesn't exist or you don't have access to it
          </p>
          <Link
            href="/library"
            className="bg-accent text-background px-6 py-3 rounded-lg font-medium hover:bg-accent/90 transition inline-block"
          >
            Back to Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-8 py-24 bg-background text-text-light">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/library"
            className="text-accent hover:underline mb-4 inline-block"
          >
            ← Back to Library
          </Link>

          {editMode ? (
            <div className="space-y-4">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={255}
                className="w-full text-4xl font-bold bg-surface border border-surface rounded-lg px-4 py-2 focus:outline-none focus:border-accent"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description"
                rows={2}
                className="w-full bg-surface border border-surface rounded-lg px-4 py-2 focus:outline-none focus:border-accent resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={updatePlaylist}
                  disabled={!editName.trim()}
                  className="px-6 py-2 bg-accent hover:bg-accent/90 text-background rounded-lg font-medium transition disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setEditName(playlist.name);
                    setEditDescription(playlist.description || "");
                  }}
                  className="px-6 py-2 bg-surface hover:bg-surface/80 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold text-accent mb-2">
                    {playlist.name}
                  </h1>
                  {playlist.description && (
                    <p className="text-text-light/80 mb-2">
                      {playlist.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-text-light/70">
                    <span>
                      {items.length} {items.length === 1 ? "book" : "books"}
                    </span>
                    {playlist.user && (
                      <Link
                        href={`/profile/${playlist.user.username}`}
                        className="text-accent hover:underline"
                      >
                        by {playlist.user.name || playlist.user.username}
                      </Link>
                    )}
                  </div>
                </div>
                {isOwner && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditMode(true)}
                      className="px-4 py-2 bg-surface hover:bg-surface/80 rounded-lg font-medium transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={deletePlaylist}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-medium transition"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              {items.length > 0 && (
                <button
                  onClick={playAll}
                  className="bg-accent hover:bg-accent/90 text-background px-6 py-3 rounded-lg font-medium transition flex items-center gap-2"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play All
                </button>
              )}
            </div>
          )}
        </div>

        {/* Books List */}
        {items.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-lg">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold mb-2">No Books in Playlist</h2>
            <p className="text-text-light/70 mb-6">
              Add books to this playlist from their detail pages
            </p>
            <Link
              href="/discover"
              className="bg-accent text-background px-6 py-3 rounded-lg font-medium hover:bg-accent/90 transition inline-block"
            >
              Discover Books
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="bg-surface rounded-lg p-4 flex items-center gap-4 hover:bg-surface/80 transition"
              >
                {/* Position Number */}
                <div className="text-text-light/50 font-medium w-8 text-center">
                  {index + 1}
                </div>

                {/* Cover Image */}
                <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-accent/5 rounded flex items-center justify-center text-2xl flex-shrink-0">
                  {item.work.coverImage ? (
                    <img
                      src={item.work.coverImage}
                      alt={item.work.title}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    "🎧"
                  )}
                </div>

                {/* Book Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{item.work.title}</h3>
                  {item.work.author && (
                    <Link
                      href={`/profile/${item.work.author.username}`}
                      className="text-sm text-purple-400 hover:underline"
                    >
                      {item.work.author.name || item.work.author.username}
                    </Link>
                  )}
                </div>

                {/* Genre */}
                {item.work.genre && (
                  <span className="hidden sm:block text-sm text-text-light/70 bg-accent/20 text-accent px-3 py-1 rounded">
                    {item.work.genre}
                  </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => playBook(item)}
                    className="p-2 hover:bg-background rounded-lg transition"
                    title="Play"
                  >
                    <svg
                      className="w-5 h-5 fill-current text-accent"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => removeFromPlaylist(item.id)}
                      className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                      title="Remove from playlist"
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
