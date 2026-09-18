import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "bypass-tunnel-reminder", value: "true" },
        ],
      },
    ];
  },
};

export default nextConfig;
