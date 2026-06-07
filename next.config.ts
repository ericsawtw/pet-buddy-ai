import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允許區網內其他裝置(如手機)連進 dev server
  allowedDevOrigins: ["192.168.1.173", "192.168.1.147"],
};

export default nextConfig;
