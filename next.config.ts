import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next 15 still runs deprecated `next lint` during `next build`.
  // Lint with `npm run lint` (ESLint CLI). Drop this key on Next 16.
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["@supabase/supabase-js"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: "tools=*",
          },
          // WebMCP is only exposed to origin-isolated documents. Without this
          // the document lands in a site-keyed agent cluster and the browser
          // never puts `modelContext` on it.
          {
            key: "Origin-Agent-Cluster",
            value: "?1",
          },
          // Chrome 149–156 origin trial. Without this token, production Chrome
          // visitors only get native WebMCP if they flipped the testing flag.
          ...(process.env.WEBMCP_ORIGIN_TRIAL_TOKEN
            ? [
                {
                  key: "Origin-Trial",
                  value: process.env.WEBMCP_ORIGIN_TRIAL_TOKEN,
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
