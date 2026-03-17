import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Next.js to run on any host (needed for Railway / custom domains)
  // The port comes from Railway's $PORT env var automatically
  serverExternalPackages: ["mongoose", "bcryptjs"],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },

  // Security + custom-domain headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",    value: "nosniff"          },
          { key: "X-Frame-Options",            value: "DENY"             },
          { key: "X-XSS-Protection",           value: "1; mode=block"   },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
