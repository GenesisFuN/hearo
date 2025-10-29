"use client";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center text-center py-24 px-8 bg-surface">
      {/* Heading */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="font-display text-4xl md:text-6xl font-semibold mb-6 text-white"
      >
        Welcome to <span className="text-accent">Hearo</span>
      </motion.h2>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-text-light max-w-xl mb-8"
      >
        Discover, listen, and create audio experiences that move the world.
      </motion.p>

      {/* CTA Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="px-8 py-3 rounded-full bg-accent text-white font-display text-lg shadow-lg shadow-accent/30 hover:shadow-accent/50 transition-all"
      >
        Start Listening
      </motion.button>

      {/* Placeholder for Creator Studio */}
      <div className="mt-20 text-text-light/60 italic">
        Creator Studio & Featured Sections Coming Soon
      </div>
    </section>
  );
}
