import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** Allow next/image to optimize media served by the Laravel backend (featured images, etc). */
function backendImagePattern() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000");
    return [
      {
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        port: url.port || "",
        pathname: "/storage/**",
      },
    ];
  } catch {
    return [];
  }
}

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/academy/app", destination: "/saat", permanent: true },
    ];
  },
  /** Required for next-mdx-remote under Turbopack (Next.js 16 dev). */
  transpilePackages: ["next-mdx-remote"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: backendImagePattern(),
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  turbopack: {
    root: rootDir,
  },
};

export default config;
