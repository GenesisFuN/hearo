"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Don't show banner if email is verified or user dismissed it
  if (!user || user.email_confirmed_at || dismissed) {
    return null;
  }

  const handleResendEmail = async () => {
    setSending(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email!,
      });

      if (error) throw error;

      setMessage("Verification email sent! Check your inbox.");
    } catch (error: any) {
      setMessage(error.message || "Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/30">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📧</span>
            <div>
              <p className="text-sm font-medium text-yellow-200">
                Please verify your email address
              </p>
              <p className="text-xs text-yellow-200/70">
                Check your inbox for a verification link. Can't find it?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {message && <p className="text-xs text-yellow-200/90">{message}</p>}
            <button
              onClick={handleResendEmail}
              disabled={sending}
              className="text-sm bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
            >
              {sending ? "Sending..." : "Resend Email"}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-yellow-200/70 hover:text-yellow-200 text-sm"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
