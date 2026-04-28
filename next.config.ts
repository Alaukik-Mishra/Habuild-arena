import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // --- ADD THIS SECTION ---
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'habuild-arena-q69fisr1o-shlok-mishras-projects.vercel.app',
          },
        ],
        destination: 'https://habuild-arena.vercel.app/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;