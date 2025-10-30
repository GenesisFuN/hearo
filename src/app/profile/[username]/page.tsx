"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePlayer } from "../../../contexts/PlayerContext";
import { useAuth } from "../../../contexts/AuthContext";
import { supabase } from "../../../lib/supabase";
import BookProgressBar from "../../../components/BookProgressBar";
import Avatar from "@/components/Avatar";

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
}

interface ProfileData {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  userType: string;
  joinedAt: string;
  stats: {
    booksCount: number;
    totalViews: number;
    totalLikes: number;
    averageRating: number;
    followers: number;
  };
}

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const { playTrack } = usePlayer();
  const { user, profile: currentUserProfile } = useAuth();

  // Check if viewing own profile
  const isOwnProfile = currentUserProfile?.username === username;

  useEffect(() => {
    fetchProfile();
  }, [username]);

  // Check follow status after profile is loaded
  useEffect(() => {
    if (user && profile?.id && !isOwnProfile) {
      checkFollowStatus();
    } else if (!user || isOwnProfile) {
      // Reset follow status if not logged in or viewing own profile
      setIsFollowing(false);
    }
  }, [profile?.id, user?.id, isOwnProfile]);

  const checkFollowStatus = async () => {
    if (!user || !profile) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) return;

      const response = await fetch(`/api/follow?followingId=${profile.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.isFollowing);
      }
    } catch (error) {
      console.error("Failed to check follow status:", error);
    }
  };

  const handleFollowToggle = async () => {
    if (!user || !profile || followLoading) return;

    setFollowLoading(true);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        alert("Please log in to follow users");
        return;
      }

      const response = await fetch("/api/follow", {
        method: isFollowing ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          followingId: profile.id,
        }),
      });

      if (response.ok) {
        setIsFollowing(!isFollowing);
        // Update follower count in profile
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                stats: {
                  ...prev.stats,
                  followers: prev.stats.followers + (isFollowing ? -1 : 1),
                },
              }
            : null
        );
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update follow status");
      }
    } catch (error) {
      console.error("Failed to toggle follow:", error);
      alert("Failed to update follow status");
    } finally {
      setFollowLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/profile/${username}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setBooks(data.books || []);
      } else if (response.status === 404) {
        setProfile(null);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const playBook = (book: Book) => {
    playTrack({
      id: book.id,
      title: book.title,
      artist: profile?.displayName || "Unknown",
      src: book.audioPath,
      cover: book.coverImage || "",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen px-8 py-24 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-light">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen px-8 py-24 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👤</div>
          <h1 className="text-3xl font-bold mb-2">User Not Found</h1>
          <p className="text-text-light/70 mb-6">
            The profile you're looking for doesn't exist.
          </p>
          <Link
            href="/discover"
            className="bg-accent text-background px-6 py-3 rounded-lg font-medium hover:bg-accent/90 transition inline-block"
          >
            Back to Discover
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-8 py-24 bg-background text-text-light">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="bg-surface rounded-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <Avatar avatarId={profile.avatar} size="xl" />
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-1">
                    {profile.displayName}
                  </h1>
                  <p className="text-text-light/60">@{profile.username}</p>
                </div>
                {isOwnProfile ? (
                  <Link
                    href="/settings/profile"
                    className="bg-accent hover:bg-accent/90 text-background px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit Profile
                  </Link>
                ) : user ? (
                  <button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`${
                      isFollowing
                        ? "bg-surface hover:bg-surface/80 text-text-light"
                        : "bg-accent hover:bg-accent/90 text-background"
                    } px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50`}
                  >
                    {followLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        {isFollowing ? "Unfollowing..." : "Following..."}
                      </>
                    ) : isFollowing ? (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Following
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
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
                        Follow
                      </>
                    )}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="bg-accent hover:bg-accent/90 text-background px-4 py-2 rounded-lg font-medium transition"
                  >
                    Login to Follow
                  </Link>
                )}
              </div>

              {profile.bio && (
                <p className="text-text-light/80 mb-4">{profile.bio}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-text-light/70">
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Joined {formatDate(profile.joinedAt)}
                </span>
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                  {profile.userType === "creator" ? "Creator" : "Listener"}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8 pt-8 border-t border-surface-light">
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {profile.stats.booksCount}
              </div>
              <div className="text-sm text-text-light/60">Books</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {profile.stats.totalViews.toLocaleString()}
              </div>
              <div className="text-sm text-text-light/60">Total Views</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {profile.stats.totalLikes.toLocaleString()}
              </div>
              <div className="text-sm text-text-light/60">Total Likes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {profile.stats.averageRating
                  ? profile.stats.averageRating.toFixed(1)
                  : "0.0"}
                ⭐
              </div>
              <div className="text-sm text-text-light/60">Avg Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {profile.stats.followers}
              </div>
              <div className="text-sm text-text-light/60">Followers</div>
            </div>
          </div>
        </div>

        {/* Books Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">
            📚 Audiobooks ({books.length})
          </h2>

          {books.length === 0 ? (
            <div className="text-center py-12 bg-surface rounded-lg">
              <div className="text-5xl mb-4">📖</div>
              <h3 className="text-xl font-bold mb-2">No Books Yet</h3>
              <p className="text-text-light/70">
                This creator hasn't published any audiobooks yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {books.map((book) => (
                <div
                  key={book.id}
                  className="bg-surface rounded-lg p-4 hover:bg-surface-light transition cursor-pointer group"
                >
                  {/* Use 2:3 aspect ratio for book covers */}
                  <div className="w-full aspect-[2/3] bg-gradient-to-br from-accent/20 to-accent/5 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden shadow-lg">
                    {book.coverImage ? (
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        className="w-12 h-12 text-accent/40"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                      </svg>
                    )}
                    {/* Progress Bar */}
                    <BookProgressBar
                      bookId={book.id}
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
                  {book.description && (
                    <p className="text-sm text-text-light/60 mb-2 line-clamp-2">
                      {book.description}
                    </p>
                  )}
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
                      ⭐ {book.rating ? book.rating.toFixed(1) : "0.0"}
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
        </div>
      </div>
    </div>
  );
}
