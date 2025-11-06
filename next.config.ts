import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Basic configuration for file uploads
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during production builds
    ignoreBuildErrors: true,
  },
  // Explicitly expose server-side env variables
  env: {
    MODERATION_API_KEY: process.env.MODERATION_API_KEY,
  },
};

export default nextConfig;
