"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../contexts/AuthContext";
import { supabase } from "../../../lib/supabase";
import AvatarSelector from "@/components/AvatarSelector";
import { getAvatarEmoji } from "@/lib/avatars";

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
}

export default function EditProfilePage() {
  const router = useRouter();
  const { user, profile: userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarId, setAvatarId] = useState("cat"); // Default avatar

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (userProfile) {
      setDisplayName(userProfile.display_name || "");
      setBio(userProfile.bio || "");
      setAvatarId(userProfile.avatar_url || "cat"); // avatar_url now stores avatar ID
      setLoading(false);
    }
  }, [user, userProfile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      if (!user) {
        router.push("/login");
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          avatar_url: avatarId, // Store avatar ID instead of URL
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      setSuccessMessage("Profile updated successfully!");

      // Redirect to profile page after a brief delay
      setTimeout(() => {
        router.push(`/profile/${userProfile?.username}`);
      }, 1500);
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      setError(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-text-light flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-text-light/70">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background text-text-light flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2">Profile Not Found</h1>
          <p className="text-text-light/70 mb-4">
            Unable to load your profile.
          </p>
          <Link
            href="/"
            className="bg-accent text-background px-6 py-2 rounded-lg font-medium hover:bg-accent/90 transition inline-block"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-light">
      {/* Header */}
      <header className="border-b border-surface">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href={`/profile/${userProfile.username}`}
            className="flex items-center gap-2 hover:opacity-80 transition"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Profile
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚙️</div>
            <div>
              <h1 className="font-bold">Edit Profile</h1>
              <p className="text-sm text-text-light/70">
                @{userProfile.username}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Avatar Selector - Character Select Style */}
          <div className="bg-surface/30 rounded-xl p-6">
            <AvatarSelector
              currentAvatar={avatarId}
              onSelect={(id) => setAvatarId(id)}
            />
          </div>

          {/* Display Name */}
          <div className="bg-surface/30 rounded-xl p-6">
            <label
              htmlFor="displayName"
              className="block text-sm font-medium mb-2"
            >
              Display Name
              <span className="text-text-light/50 ml-2">
                (required, max 100 characters)
              </span>
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
              required
              className="w-full bg-surface border border-surface hover:border-accent/50 focus:border-accent rounded-lg px-4 py-3 text-text-light outline-none transition"
              placeholder="Your display name"
            />
            <p className="text-sm text-text-light/50 mt-2">
              {displayName.length}/100 characters
            </p>
          </div>

          {/* Bio */}
          <div className="bg-surface/30 rounded-xl p-6">
            <label htmlFor="bio" className="block text-sm font-medium mb-2">
              Bio
              <span className="text-text-light/50 ml-2">
                (optional, max 500 characters)
              </span>
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={4}
              className="w-full bg-surface border border-surface hover:border-accent/50 focus:border-accent rounded-lg px-4 py-3 text-text-light outline-none transition resize-none"
              placeholder="Tell us about yourself..."
            />
            <p className="text-sm text-text-light/50 mt-2">
              {bio.length}/500 characters
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
              {error}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400">
              {successMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-background font-medium py-3 rounded-lg transition"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <Link
              href={`/profile/${userProfile.username}`}
              className="flex-1 bg-surface hover:bg-surface/80 text-text-light font-medium py-3 rounded-lg transition text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
