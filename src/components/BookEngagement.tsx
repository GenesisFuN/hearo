"use client";

import { useState, useEffect } from "react";
import { Heart, MessageCircle, Star, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { trackLike } from "@/lib/analytics";

interface BookEngagementProps {
  bookId: string;
  initialLikes?: number;
  initialComments?: number;
  initialRating?: number;
  initialRatingsCount?: number;
  initialViews?: number;
  showComments?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function BookEngagement({
  bookId,
  initialLikes = 0,
  initialComments = 0,
  initialRating = 0,
  initialRatingsCount = 0,
  initialViews = 0,
  showComments = false,
  size = "md",
}: BookEngagementProps) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [commentsCount, setCommentsCount] = useState(initialComments);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [averageRating, setAverageRating] = useState(initialRating);
  const [ratingsCount, setRatingsCount] = useState(initialRatingsCount);
  const [views, setViews] = useState(initialViews);
  const [hoverRating, setHoverRating] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Size classes
  const sizeClasses = {
    sm: {
      text: "text-xs",
      icon: "w-3 h-3",
      gap: "gap-1",
    },
    md: {
      text: "text-sm",
      icon: "w-4 h-4",
      gap: "gap-1.5",
    },
    lg: {
      text: "text-base",
      icon: "w-5 h-5",
      gap: "gap-2",
    },
  };

  const classes = sizeClasses[size];

  useEffect(() => {
    checkAuth();
    fetchEngagementStatus();
  }, [bookId]);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const fetchEngagementStatus = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const token = session.access_token;

      // Fetch like status
      const likeRes = await fetch(`/api/books/${bookId}/like`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (likeRes.ok) {
        const likeData = await likeRes.json();
        setLiked(likeData.liked);
        setLikesCount(likeData.likesCount);
      }

      // Fetch rating status
      const ratingRes = await fetch(`/api/books/${bookId}/rate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ratingRes.ok) {
        const ratingData = await ratingRes.json();
        setUserRating(ratingData.userRating);
        setAverageRating(ratingData.averageRating);
        setRatingsCount(ratingData.ratingsCount);
      }
    } catch (error) {
      console.error("Failed to fetch engagement status:", error);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      alert("Please sign in to like books");
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/books/${bookId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLiked(data.liked);
        setLikesCount((prev) => (data.liked ? prev + 1 : prev - 1));

        // Track like event (only when adding a like, not removing)
        if (data.liked) {
          trackLike(bookId);
        }
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const handleRate = async (rating: number) => {
    if (!isAuthenticated) {
      alert("Please sign in to rate books");
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/books/${bookId}/rate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserRating(rating);
        setAverageRating(data.averageRating);
        setRatingsCount(data.ratingsCount);
      }
    } catch (error) {
      console.error("Failed to rate book:", error);
    }
  };

  return (
    <div
      className={`flex items-center ${classes.gap} ${classes.text} text-gray-400`}
    >
      {/* Like Button */}
      <button
        onClick={handleLike}
        className={`flex items-center ${classes.gap} hover:text-red-400 transition ${
          liked ? "text-red-500" : ""
        }`}
        title={liked ? "Unlike" : "Like"}
      >
        <Heart className={`${classes.icon} ${liked ? "fill-red-500" : ""}`} />
        <span>{likesCount}</span>
      </button>

      {/* Comments Count */}
      {showComments && (
        <div className={`flex items-center ${classes.gap}`} title="Comments">
          <MessageCircle className={classes.icon} />
          <span>{commentsCount}</span>
        </div>
      )}

      {/* Star Rating */}
      <div className={`flex items-center ${classes.gap}`}>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleRate(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition hover:scale-110"
              disabled={!isAuthenticated}
              title={
                isAuthenticated
                  ? `Rate ${star} star${star > 1 ? "s" : ""}`
                  : "Sign in to rate"
              }
            >
              <Star
                className={`${classes.icon} ${
                  star <= (hoverRating || userRating || 0)
                    ? "fill-yellow-500 text-yellow-500"
                    : star <= Math.round(averageRating)
                      ? "fill-yellow-500/30 text-yellow-500/30"
                      : ""
                }`}
              />
            </button>
          ))}
        </div>
        <span className="ml-1">
          {averageRating > 0 ? averageRating.toFixed(1) : "—"}
          {ratingsCount > 0 && ` (${ratingsCount})`}
        </span>
      </div>

      {/* Views */}
      <div className={`flex items-center ${classes.gap}`} title="Views">
        <Eye className={classes.icon} />
        <span>{views}</span>
      </div>
    </div>
  );
}
