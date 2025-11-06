"use client";

import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";

interface SubscriptionGateProps {
  children: React.ReactNode;
  feature: string;
  requiredTier?: "creator" | "pro";
}

export default function SubscriptionGate({
  children,
  feature,
  requiredTier = "creator",
}: SubscriptionGateProps) {
  const { user, profile, hasSubscription } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // TEMPORARY: Disable subscription paywall for beta testing
  const DISABLE_PAYWALL = true;

  if (!user) {
    return <AuthPrompt />;
  }

  if (
    !DISABLE_PAYWALL &&
    (!hasSubscription ||
      (requiredTier === "pro" && profile?.subscription_tier !== "pro"))
  ) {
    return (
      <div className="min-h-screen px-8 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-surface/50 rounded-lg p-8">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="text-accent text-2xl">🔒</div>
            </div>

            <h1 className="text-3xl font-display font-bold text-accent mb-4">
              {feature} Access Required
            </h1>

            <p className="text-text-light/80 text-lg mb-8">
              Upgrade to{" "}
              {requiredTier === "pro" ? "Hearo Pro" : "Hearo Creator"} to access{" "}
              {feature.toLowerCase()} and grow your audience.
            </p>

            {/* Subscription Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div
                className={`border rounded-lg p-6 ${
                  requiredTier === "creator"
                    ? "border-accent bg-accent/5"
                    : "border-surface"
                }`}
              >
                <h3 className="text-xl font-bold text-text-light mb-2">
                  Hearo Creator
                </h3>
                <div className="text-3xl font-bold text-accent mb-4">
                  $19/month
                </div>
                <ul className="space-y-2 text-left">
                  <li className="flex items-center gap-2 text-text-light/80">
                    <span className="text-accent">✓</span>
                    Upload & publish audiobooks
                  </li>
                  <li className="flex items-center gap-2 text-text-light/80">
                    <span className="text-accent">✓</span>
                    AI narration (50 hours/month)
                  </li>
                  <li className="flex items-center gap-2 text-text-light/80">
                    <span className="text-accent">✓</span>
                    Basic analytics
                  </li>
                  <li className="flex items-center gap-2 text-text-light/80">
                    <span className="text-accent">✓</span>
                    Accept donations
                  </li>
                </ul>
                {requiredTier === "creator" && (
                  <button className="w-full mt-6 bg-accent hover:bg-accent/80 text-background py-3 px-6 rounded-lg font-medium transition">
                    Upgrade to Creator
                  </button>
                )}
              </div>

              <div
                className={`border rounded-lg p-6 ${
                  requiredTier === "pro"
                    ? "border-purple-500 bg-purple-500/5"
                    : "border-surface"
                }`}
              >
                <h3 className="text-xl font-bold text-text-light mb-2">
                  Hearo Pro
                </h3>
                <div className="text-3xl font-bold text-purple-400 mb-4">
                  $49/month
                </div>
                <ul className="space-y-2 text-left">
                  <li className="flex items-center gap-2 text-text-light/80">
                    <span className="text-purple-400">✓</span>
                    Everything in Creator
                  </li>
                  <li className="flex items-center gap-2 text-text-light/80">
                    <span className="text-purple-400">✓</span>
                    Unlimited AI narration
                  </li>
                  <li className="flex items-center gap-2 text-text-light/80">
                    <span className="text-purple-400">✓</span>
                    Advanced analytics
                  </li>
                  <li className="flex items-center gap-2 text-text-light/80">
                    <span className="text-purple-400">✓</span>
                    Subscriber tiers & management
                  </li>
                  <li className="flex items-center gap-2 text-text-light/80">
                    <span className="text-purple-400">✓</span>
                    Priority support
                  </li>
                </ul>
                <button className="w-full mt-6 bg-purple-500 hover:bg-purple-500/80 text-white py-3 px-6 rounded-lg font-medium transition">
                  Upgrade to Pro
                </button>
              </div>
            </div>

            <p className="text-text-light/60 text-sm">
              All plans include a 14-day free trial. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AuthPrompt() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const { signUp, signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isSignUp) {
        await signUp(email, password, username, "listener");
        setSuccess("Account created! Check your email to verify your account.");
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      console.error("Auth error:", err);

      // Handle specific Supabase errors
      if (
        err.message?.includes("rate limit") ||
        err.message?.includes("53 seconds")
      ) {
        setError(
          "Too many signup attempts. Please wait 1 minute before trying again."
        );
        setCooldown(60);
        // Start countdown
        const timer = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (err.message?.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.");
      } else if (
        err.message?.includes("User already registered") ||
        err.message?.includes("already been registered")
      ) {
        setError(
          "Account already exists with this email. Please sign in instead."
        );
        // Automatically switch to sign in mode
        setTimeout(() => {
          setIsSignUp(false);
          setError("");
        }, 3000);
      } else if (err.message?.includes("Email not confirmed")) {
        setError(
          "Please check your email and click the confirmation link before signing in."
        );
      } else {
        setError(
          err.message || "An unexpected error occurred. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-8 py-24 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="bg-surface/50 rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-bold text-accent mb-2">
              Welcome to Hearo
            </h1>
            <p className="text-text-light/70">
              {isSignUp ? "Create your account" : "Sign in to continue"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm text-text-light/70 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-background border border-surface rounded-lg px-4 py-3 text-text-light"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-text-light/70 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-surface rounded-lg px-4 py-3 text-text-light"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-text-light/70 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-surface rounded-lg px-4 py-3 text-text-light"
                required
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">
                {error}
              </div>
            )}
            {success && (
              <div className="text-green-400 text-sm bg-green-400/10 p-3 rounded-lg">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className="w-full bg-accent hover:bg-accent/80 text-background py-3 px-6 rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading
                ? "Creating Account..."
                : cooldown > 0
                  ? `Wait ${cooldown}s`
                  : isSignUp
                    ? "Create Account"
                    : "Sign In"}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-accent hover:text-accent/80 text-sm"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Need an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
