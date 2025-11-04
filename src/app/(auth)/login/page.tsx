"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { signIn } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn(email, password);
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to log in");
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
            Welcome Back
          </h1>
          <p className="text-text-light/70">Log in to your Hearo account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-light/90 mb-2">
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-surface-light rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition text-text-light placeholder-text-light/40"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-text-light/90">
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-accent hover:text-accent/80 font-medium transition"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-surface-light rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition text-text-light placeholder-text-light/40"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/90 text-background py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-text-light/70">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="text-accent hover:text-accent/80 font-medium transition"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
