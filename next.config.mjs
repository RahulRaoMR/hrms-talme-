import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: ["192.168.100.197"],
  turbopack: {
    root: path.resolve(),
  },
};

export default nextConfig;
