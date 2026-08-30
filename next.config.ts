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
        ],
      },
    ];
  },
};

export default nextConfig;
