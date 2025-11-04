"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [userType, setUserType] = useState<"listener" | "creator">("listener");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const { signUp } = useAuth();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const result = await signUp(email, password, username, userType);

      // Check if user was auto-confirmed (email confirmation disabled)
      // In this case, user.email_confirmed_at will be set
      if (result?.session) {
        // User is auto-confirmed and logged in, redirect to home
        router.push("/");
        router.refresh();
      } else {
        // Email confirmation required, show success message
        setSuccess(true);
        setLoading(false);
        // Auto-redirect to login after 5 seconds
        setTimeout(() => {
          router.push("/login");
        }, 5000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-surface p-8 rounded-2xl shadow-xl border border-surface-light">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="text-5xl font-display font-bold text-accent">
              Hearo
            </div>
          </div>
          <h1 className="text-3xl font-bold text-text-light mb-2">
            Join Hearo
          </h1>
          <p className="text-text-light/70">
            Create your account to get started
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-text-light">
              Check your email!
            </h2>
            <p className="text-text-light/70">
              We've sent a confirmation link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-text-light/60">
              Click the link in the email to verify your account, then come back
              to log in.
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                className="inline-block px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition"
              >
                Go to Login
              </Link>
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={handleSignUp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-text-light/90 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-surface-light rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition bg-background text-text-light placeholder-text-light/40"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light/90 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-surface-light rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition bg-background text-text-light placeholder-text-light/40"
                  required
                  minLength={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light/90 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-surface-light rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition bg-background text-text-light placeholder-text-light/40"
                  required
                  minLength={6}
                />
                <p className="text-xs text-text-light/60 mt-1">
                  At least 6 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light/90 mb-2">
                  I want to...
                </label>
                <select
                  value={userType}
                  onChange={(e) => setUserType(e.target.value as any)}
                  className="w-full px-4 py-3 border border-surface-light rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition bg-background text-text-light"
                >
                  <option value="listener">Listen to audiobooks 🎧</option>
                  <option value="creator">Create audiobooks 🎙️</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent text-white py-3 rounded-lg font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl"
              >
                {loading ? "Creating account..." : "Sign Up"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-text-light/70">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-accent hover:text-accent/80 font-medium"
                >
                  Log in
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
