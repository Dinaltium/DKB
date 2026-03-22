import path from "path";
import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const withPWAConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
});

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // tsconfig has both `@/components/*` and `@/*`; webpack can pick `@/*` → ./components (removed).
      "@/components": path.resolve(__dirname, "src/components"),
    };
    return config;
  },
};

export default withPWAConfig(nextConfig);
