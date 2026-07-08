import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CDN_STATIC_IMMUTABLE } from "./lib/cache/cdnHeaders";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const disableImageOptimization = process.env.NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION === "1";

/** Allow next/image to fetch media from Laravel (proxied /storage and external CDN). */
function backendImagePattern() {
  const origins = [
    process.env.NEXT_PUBLIC_CDN_ORIGIN,
    process.env.BACKEND_PROXY_URL,
    process.env.NEXT_PUBLIC_MEDIA_URL,
    process.env.NEXT_PUBLIC_ASSET_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
  ].filter((value): value is string => Boolean(value?.trim()));

  const seen = new Set<string>();
  const patterns: Array<{
    protocol: "http" | "https";
    hostname: string;
    port: string;
    pathname: string;
  }> = [];

  for (const raw of origins) {
    try {
      const url = new URL(raw);
      const key = `${url.protocol}//${url.host}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const base = {
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        port: url.port || "",
      };

      patterns.push({ ...base, pathname: "/storage/**" });
      patterns.push({ ...base, pathname: "/cdn/**" });
    } catch {
      /* skip invalid origin */
    }
  }

  return patterns;
}

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/academy/app", destination: "/saat", permanent: true },
      { source: "/blog", destination: "/insights", permanent: true },
      { source: "/blog/:slug", destination: "/insights/:slug", permanent: true },
      { source: "/admin/media", destination: "/admin/gallery", permanent: false },
      { source: "/admin/faq", destination: "/admin/commerce/faqs", permanent: false },
      { source: "/admin/testimonials", destination: "/admin/commerce/testimonials", permanent: false },
    ];
  },
  async headers() {
    if (process.env.NODE_ENV !== "production") {
      return [];
    }

    const immutable = [
      { key: "Cache-Control", value: CDN_STATIC_IMMUTABLE },
      { key: "CDN-Cache-Control", value: CDN_STATIC_IMMUTABLE },
    ];
    return [
      { source: "/_next/static/:path*", headers: immutable },
      { source: "/fonts/:path*", headers: immutable },
      { source: "/icons/:path*", headers: immutable },
    ];
  },
  transpilePackages: ["next-mdx-remote"],
  images: {
    unoptimized: disableImageOptimization,
    loader: "custom",
    loaderFile: "./lib/imageLoader.ts",
    formats: disableImageOptimization ? undefined : ["image/avif", "image/webp"],
    qualities: [90, 75],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    localPatterns: [
      { pathname: "/storage/**" },
      { pathname: "/media/**" },
    ],
    remotePatterns: backendImagePattern(),
  },
  experimental: {
    serverActions: {
      // Default 1MB is too small for article HTML saves and media uploads.
      bodySizeLimit: '10mb',
    },
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "lottie-react",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extension-link",
      "@tiptap/extension-image",
      "@tiptap/extension-placeholder",
      "@tiptap/extension-underline",
      "@tiptap/extension-text-align",
      "@tiptap/extension-text-style",
      "@tiptap/extension-color",
      "@tiptap/extension-highlight",
      "@tiptap/extension-subscript",
      "@tiptap/extension-superscript",
      "@tiptap/extension-table",
      "@tiptap/extension-table-row",
      "@tiptap/extension-table-cell",
      "@tiptap/extension-table-header",
    ],
  },
  turbopack: {
    root: rootDir,
  },
};

export default config;
