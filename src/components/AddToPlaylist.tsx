"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface Playlist {
  id: string;
  name: string;
  itemCount: number;
}

interface AddToPlaylistProps {
  bookId: string;
  bookTitle: string;
  className?: string;
  compact?: boolean;
  onPlaylistUpdated?: () => void;
}

export default function AddToPlaylist({
  bookId,
  bookTitle,
  className = "",
  compact = false,
  onPlaylistUpdated,
}: AddToPlaylistProps) {
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedToPlaylists, setAddedToPlaylists] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (showDropdown && user) {
      fetchPlaylists();
    }
  }, [showDropdown, user]);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        console.error("No auth token available");
        return;
      }

      const response = await fetch("/api/playlists", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlaylists(data.playlists || []);
        // Check which playlists already contain this book
        await checkExistingPlaylists(data.playlists, token);
      }
    } catch (error) {
      console.error("Failed to fetch playlists:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingPlaylists = async (
    playlistList: Playlist[],
    token: string
  ) => {
    const added = new Set<string>();

    for (const playlist of playlistList) {
      try {
        const response = await fetch(`/api/playlists/${playlist.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const hasBook = data.items?.some(
            (item: any) => item.workId === bookId
          );
          if (hasBook) {
            added.add(playlist.id);
          }
        }
      } catch (error) {
        console.error("Failed to check playlist:", error);
      }
    }

    setAddedToPlaylists(added);
  };

  const addToPlaylist = async (playlistId: string) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        console.error("No auth token available");
        return;
      }

      const response = await fetch("/api/playlists/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          playlistId,
          workId: bookId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Successfully added to playlist:", data);
        setAddedToPlaylists((prev) => new Set(prev).add(playlistId));
        // Trigger refresh if callback provided
        if (onPlaylistUpdated) {
          onPlaylistUpdated();
        }
      } else if (response.status === 409) {
        // Already in playlist
        console.log("Book already in playlist");
        setAddedToPlaylists((prev) => new Set(prev).add(playlistId));
      } else {
        const errorData = await response.json();
        console.error("Failed to add to playlist:", response.status, errorData);
      }
    } catch (error) {
      console.error("Failed to add to playlist:", error);
    }
  };

  const removeFromPlaylist = async (playlistId: string) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        console.error("No auth token available");
        return;
      }

      // First, get the playlist to find the item ID
      const playlistResponse = await fetch(`/api/playlists/${playlistId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (playlistResponse.ok) {
        const data = await playlistResponse.json();
        const item = data.items?.find((item: any) => item.workId === bookId);

        if (item) {
          const response = await fetch(
            `/api/playlists/items?playlistItemId=${item.id}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            setAddedToPlaylists((prev) => {
              const next = new Set(prev);
              next.delete(playlistId);
              return next;
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to remove from playlist:", error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`bg-surface hover:bg-surface/80 text-text-light ${
          compact ? "px-3 py-2 rounded-lg" : "px-6 py-3 rounded-lg"
        } font-medium transition-all duration-200 flex items-center gap-2 hover:scale-105 ${className}`}
        title="Add to Playlist"
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
        {!compact && "Add to Playlist"}
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full mt-2 right-0 bg-surface border border-surface rounded-lg shadow-xl z-20 min-w-[280px] max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-text-light/70">
                <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full mx-auto mb-2"></div>
                Loading playlists...
              </div>
            ) : playlists.length === 0 ? (
              <div className="p-4 text-center text-text-light/70">
                <p className="mb-2">No playlists yet</p>
                <a
                  href="/library?tab=playlists"
                  className="text-accent hover:underline text-sm"
                  onClick={() => setShowDropdown(false)}
                >
                  Create your first playlist
                </a>
              </div>
            ) : (
              <div className="py-2">
                <div className="px-4 py-2 text-sm text-text-light/70 border-b border-surface">
                  Add "{bookTitle}" to:
                </div>
                {playlists.map((playlist) => {
                  const isAdded = addedToPlaylists.has(playlist.id);
                  return (
                    <button
                      key={playlist.id}
                      onClick={() =>
                        isAdded
                          ? removeFromPlaylist(playlist.id)
                          : addToPlaylist(playlist.id)
                      }
                      className="w-full px-4 py-3 text-left hover:bg-background/50 transition flex items-center justify-between group"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-text-light">
                          {playlist.name}
                        </div>
                        <div className="text-xs text-text-light/60">
                          {playlist.itemCount}{" "}
                          {playlist.itemCount === 1 ? "book" : "books"}
                        </div>
                      </div>
                      {isAdded ? (
                        <svg
                          className="w-5 h-5 text-accent flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 text-text-light/40 group-hover:text-accent transition flex-shrink-0"
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
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
