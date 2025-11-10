"use client";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-surface to-background">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center py-32 px-6">
        {/* Main Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-6"
        >
          <h1 className="font-display text-5xl md:text-7xl font-bold mb-4 text-white">
            Turn Any Story Into an{" "}
            <span className="text-accent bg-gradient-to-r from-accent to-accent/70 bg-clip-text text-transparent">
              Audiobook
            </span>
          </h1>
          <p className="text-text-light/80 text-xl md:text-2xl max-w-3xl mx-auto">
            AI-powered narration for creators. Unlimited audiobooks for
            listeners.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12 mt-16"
        >
          <div className="bg-surface/50 backdrop-blur-sm rounded-2xl p-6 border border-accent/10 hover:border-accent/30 transition-all">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-accent/20 flex items-center justify-center">
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
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">AI Narration</h3>
            <p className="text-text-light/70">
              Professional voice cloning technology transforms your text into
              natural-sounding audiobooks
            </p>
          </div>

          <div className="bg-surface/50 backdrop-blur-sm rounded-2xl p-6 border border-accent/10 hover:border-accent/30 transition-all">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-accent/20 flex items-center justify-center">
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
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Community Library
            </h3>
            <p className="text-text-light/70">
              Discover thousands of audiobooks created by indie authors and
              storytellers
            </p>
          </div>

          <div className="bg-surface/50 backdrop-blur-sm rounded-2xl p-6 border border-accent/10 hover:border-accent/30 transition-all">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-accent/20 flex items-center justify-center">
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Lightning Fast
            </h3>
            <p className="text-text-light/70">
              No subscriptions, no paywalls. Create and listen during our beta
            </p>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 mt-8"
        >
          <Link href="/discover">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 rounded-full bg-accent text-white font-display text-lg shadow-lg shadow-accent/30 hover:shadow-accent/50 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
              Start Listening
            </motion.button>
          </Link>

          <Link href="/studio">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 rounded-full bg-surface border-2 border-accent text-accent font-display text-lg hover:bg-accent/10 transition-all flex items-center gap-2"
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
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Create Audiobook
            </motion.button>
          </Link>
        </motion.div>

        {/* Beta Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-12 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30 text-accent text-sm font-medium"
        >
          <span className="animate-pulse">●</span>
          Beta - Free for all users
        </motion.div>
      </section>

      {/* Stats Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="py-16 px-6"
      >
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-accent mb-2">24</div>
            <div className="text-text-light/70">Genres Available</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-accent mb-2">~2hrs</div>
            <div className="text-text-light/70">Processing Time</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-accent mb-2">100%</div>
            <div className="text-text-light/70">Free During Beta</div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
