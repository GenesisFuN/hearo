"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const isCreator = profile.user_type === "creator";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {profile.display_name || profile.username}!
              </h1>
              <p className="text-gray-600">
                {isCreator ? "🎙️ Creator Dashboard" : "🎧 Listener Dashboard"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Account Type
            </h3>
            <p className="text-2xl font-bold text-gray-900 capitalize">
              {profile.user_type}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Subscription Tier
            </h3>
            <p className="text-2xl font-bold text-purple-600 capitalize">
              {profile.subscription_tier || "free"}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Member Since
            </h3>
            <p className="text-2xl font-bold text-gray-900">
              {new Date(profile.created_at).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Quick Actions
          </h2>

          {isCreator ? (
            // Creator Actions
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                href="/studio"
                className="flex items-center gap-4 p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition group"
              >
                <div className="text-4xl">🎙️</div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-purple-600">
                    Upload New Book
                  </h3>
                  <p className="text-sm text-gray-600">
                    Create your next audiobook
                  </p>
                </div>
              </Link>

              <Link
                href="/library"
                className="flex items-center gap-4 p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition group"
              >
                <div className="text-4xl">📚</div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-purple-600">
                    My Works
                  </h3>
                  <p className="text-sm text-gray-600">
                    Manage your audiobooks
                  </p>
                </div>
              </Link>

              <Link
                href="/profile"
                className="flex items-center gap-4 p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition group"
              >
                <div className="text-4xl">⚙️</div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-purple-600">
                    Settings
                  </h3>
                  <p className="text-sm text-gray-600">Manage your account</p>
                </div>
              </Link>
            </div>
          ) : (
            // Listener Actions
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                href="/discover"
                className="flex items-center gap-4 p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition group"
              >
                <div className="text-4xl">🔍</div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-purple-600">
                    Discover Books
                  </h3>
                  <p className="text-sm text-gray-600">Find your next listen</p>
                </div>
              </Link>

              <Link
                href="/library"
                className="flex items-center gap-4 p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition group"
              >
                <div className="text-4xl">📚</div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-purple-600">
                    My Library
                  </h3>
                  <p className="text-sm text-gray-600">Your saved audiobooks</p>
                </div>
              </Link>

              <Link
                href="/profile"
                className="flex items-center gap-4 p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition group"
              >
                <div className="text-4xl">⚙️</div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-purple-600">
                    Settings
                  </h3>
                  <p className="text-sm text-gray-600">Manage your account</p>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Coming Soon */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            More Features Coming Soon!
          </h3>
          <p className="text-gray-600">
            {isCreator
              ? "Analytics, earnings tracking, and advanced voice customization."
              : "Personalized recommendations, reading history, and playlists."}
          </p>
        </div>
      </div>
    </div>
  );
}
