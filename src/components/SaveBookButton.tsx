"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface SaveBookButtonProps {
  bookId: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function SaveBookButton({
  bookId,
  size = "md",
  showLabel = false,
}: SaveBookButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkIfSaved();
  }, [bookId]);

  const checkIfSaved = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setIsChecking(false);
        return;
      }

      const response = await fetch(`/api/library/is-saved/${bookId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsSaved(data.saved);
      }
    } catch (error) {
      console.error("Failed to check saved status:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const toggleSave = async () => {
    try {
      setIsLoading(true);

      console.log("SaveBookButton - Attempting to save bookId:", bookId);

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        alert("Please sign in to save books");
        return;
      }

      const endpoint = isSaved ? "/api/library/unsave" : "/api/library/save";
      const method = isSaved ? "DELETE" : "POST";

      console.log(
        "SaveBookButton - Sending to:",
        endpoint,
        "with bookId:",
        bookId
      );

      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookId }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("SaveBookButton - Success:", data);
        setIsSaved(!isSaved);
      } else {
        const error = await response.json();
        console.error("SaveBookButton - Failed to toggle save:", error);
        console.error("SaveBookButton - Response status:", response.status);
        alert(error.error || "Failed to update library");
      }
    } catch (error) {
      console.error("Failed to toggle save:", error);
      alert("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: "w-8 h-8 text-lg",
    md: "w-10 h-10 text-xl",
    lg: "w-12 h-12 text-2xl",
  };

  if (isChecking) {
    return (
      <button
        disabled
        className={`${sizeClasses[size]} rounded-full bg-surface/50 flex items-center justify-center transition opacity-50`}
      >
        <span className="text-text-light/50">•••</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleSave}
      disabled={isLoading}
      className={`${sizeClasses[size]} rounded-full ${
        isSaved
          ? "bg-accent/20 text-accent hover:bg-accent/30"
          : "bg-surface hover:bg-surface-light text-text-light/70 hover:text-text-light"
      } flex items-center justify-center transition-all ${
        isLoading ? "opacity-50 cursor-not-allowed" : "hover:scale-110"
      } ${showLabel ? "gap-2 px-4 w-auto" : ""}`}
      aria-label={isSaved ? "Remove from library" : "Save to library"}
      title={isSaved ? "Remove from library" : "Save to library"}
    >
      {isLoading ? (
        <span className="animate-spin">⏳</span>
      ) : (
        <>
          <span>{isSaved ? "❤️" : "🤍"}</span>
          {showLabel && (
            <span className="text-sm font-medium">
              {isSaved ? "Saved" : "Save"}
            </span>
          )}
        </>
      )}
    </button>
  );
}
