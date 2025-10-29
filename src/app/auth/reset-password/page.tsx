"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [validToken, setValidToken] = useState(false);

  useEffect(() => {
    // Check if we have a valid session from the email link
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setValidToken(true);
      } else {
        setMessage({
          type: "error",
          text: "Invalid or expired reset link. Please request a new one.",
        });
      }
    };

    checkSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidToken(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    if (password.length < 6) {
      setMessage({
        type: "error",
        text: "Password must be at least 6 characters long.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({
        type: "error",
        text: "Passwords do not match.",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setMessage({
        type: "success",
        text: "Password updated successfully! Redirecting to login...",
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Failed to update password. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!validToken && !message) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-text-light/70">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-accent mb-2">
            Hearo
          </h1>
          <p className="text-text-light/70">Set New Password</p>
        </div>

        {/* Reset Form Card */}
        <div className="bg-surface/50 rounded-xl p-8 border border-surface-light">
          {validToken ? (
            <>
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🔐</div>
                <h2 className="text-2xl font-bold text-text-light mb-2">
                  Create New Password
                </h2>
                <p className="text-text-light/60 text-sm">
                  Enter your new password below.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password Input */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-text-light mb-2"
                  >
                    New Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-surface border border-surface hover:border-accent/50 focus:border-accent rounded-lg px-4 py-3 text-text-light outline-none transition"
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-text-light/50 mt-1">
                    Minimum 6 characters
                  </p>
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-text-light mb-2"
                  >
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-surface border border-surface hover:border-accent/50 focus:border-accent rounded-lg px-4 py-3 text-text-light outline-none transition"
                    placeholder="••••••••"
                  />
                </div>

                {/* Message Display */}
                {message && (
                  <div
                    className={`p-4 rounded-lg text-sm ${
                      message.type === "success"
                        ? "bg-green-500/10 border border-green-500/30 text-green-400"
                        : "bg-red-500/10 border border-red-500/30 text-red-400"
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-background font-medium py-3 rounded-lg transition"
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">❌</div>
              <h2 className="text-xl font-bold text-text-light mb-2">
                Invalid Reset Link
              </h2>
              <p className="text-text-light/60 text-sm mb-6">
                {message?.text ||
                  "This password reset link is invalid or has expired."}
              </p>
              <Link
                href="/auth/forgot-password"
                className="bg-accent hover:bg-accent/90 text-background font-medium py-2 px-6 rounded-lg transition inline-block"
              >
                Request New Link
              </Link>
            </div>
          )}
        </div>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-accent hover:text-accent/80 text-sm font-medium transition"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
