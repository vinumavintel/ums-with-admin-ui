import type { NextConfig } from 'next';

// Silence Turbopack workspace root inference warning by explicitly setting root.
// This ensures env resolution + file watching behave relative to this app only.
const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Future: place shared config (images, redirects, rewrites) here.
};

export default nextConfig;
