import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/pixelforge.html',
      },
    ];
  },
};

export default nextConfig;
