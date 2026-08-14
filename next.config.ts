import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Pixel 5 e2e: the bottom-tab bar sits under the default indicator.
  devIndicators: false,
};

export default nextConfig;
