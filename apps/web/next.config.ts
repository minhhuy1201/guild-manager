import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The Discord announcement pushes one or two base64 webp images through a server action; the
    // 1MB default cuts a two-match day off before it ever reaches the API.
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
