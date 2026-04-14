import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // three.js ships untranspiled ESM — required by @react-three/fiber
  transpilePackages: ["three"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.tildacdn.com",
      },
    ],
  },
};

export default nextConfig;
