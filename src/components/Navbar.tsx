"use client";

import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { user, profile, signOut, hasSubscription } = useAuth();

  return (
    <nav className="flex justify-between items-center px-8 py-4 bg-surface/90 text-text-light backdrop-blur-md shadow-md sticky top-0 z-50">
      {/* Logo */}
      <Link
        href="/"
        className="text-2xl font-bold tracking-tight text-accent hover:text-accent/80 transition"
      >
        Hearo
      </Link>

      {/* Navigation Links */}
      <div className="flex items-center gap-6 text-sm font-medium">
        <Link
          href="/discover"
          className="hover:text-accent transition relative group"
        >
          <span className="relative">
            Discover
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-highlight group-hover:w-full transition-all duration-300"></span>
          </span>
        </Link>
        <Link
          href="/public/books"
          className="hover:text-accent transition relative group"
        >
          <span className="relative">
            Community
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-highlight group-hover:w-full transition-all duration-300"></span>
          </span>
        </Link>

        {user && (
          <>
            <Link
              href="/library"
              className="hover:text-accent transition relative group"
            >
              <span className="relative">
                Library
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-highlight group-hover:w-full transition-all duration-300"></span>
              </span>
            </Link>
            <Link
              href="/studio"
              className="hover:text-accent transition flex items-center gap-1 relative group"
            >
              <span className="relative">
                Studio
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-highlight group-hover:w-full transition-all duration-300"></span>
              </span>
              {hasSubscription && (
                <span className="text-xs bg-accent text-background px-2 py-0.5 rounded-full">
                  {profile?.subscription_tier === "premium"
                    ? "PREMIUM"
                    : "CREATOR"}
                </span>
              )}
            </Link>
            <Link
              href="/settings"
              className="hover:text-accent transition relative group"
            >
              <span className="relative">
                Settings
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-highlight group-hover:w-full transition-all duration-300"></span>
              </span>
            </Link>
          </>
        )}

        {/* Auth Section */}
        <div className="flex items-center gap-3 ml-4 border-l border-surface pl-4">
          {user ? (
            <div className="flex items-center gap-3">
              {profile?.username ? (
                <Link
                  href={`/profile/${profile.username}`}
                  className="text-text-light/70 hover:text-accent text-sm transition"
                >
                  {profile.username}
                </Link>
              ) : (
                <span className="text-text-light/70 text-sm">{user.email}</span>
              )}
              <button
                onClick={signOut}
                className="text-text-light/70 hover:text-accent text-sm transition"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-accent hover:bg-accent/80 text-background px-4 py-2 rounded-lg font-medium transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
