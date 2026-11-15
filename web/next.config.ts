import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  // The folder above holds the old app and its own lockfile.
  outputFileTracingRoot: import.meta.dirname,
  async headers() {
    return [
      {
        // Pío's pictures and the capture module rarely change: keep them a
        // day and refresh in the background, instead of asking on every visit.
        source: "/(pio/.*|capture-worklet.js)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=2592000",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "microphone=(self), camera=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
          },
        ],
      },
    ];
  },
};
export default config;
