import type { NextConfig } from "next";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bundleAnalyzer from "@next/bundle-analyzer";
import { CDN_STATIC_IMMUTABLE } from "./lib/cache/cdnHeaders";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const disableImageOptimization = process.env.NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION === "1";

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.io https://www.googletagmanager.com https://www.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https://www.aparat.com https://aparat.com https://www.google.com https://recaptcha.google.com",
      "media-src 'self' blob: https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

/** LAN IPs for mobile/tablet testing — Next.js blocks /_next/* without these in dev. */
function localNetworkHosts(): string[] {
  const hosts = new Set<string>();
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const iface of interfaces ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        hosts.add(iface.address);
      }
    }
  }
  return [...hosts];
}

const allowedDevOrigins = [
  ...localNetworkHosts(),
  ...(process.env.ALLOWED_DEV_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? []),
];

/** Allow next/image to fetch media from Laravel (proxied /storage) and download host CDN. */
function backendImagePattern() {
  const origins = [
    "https://cdn.rostami.app",
    process.env.NEXT_PUBLIC_CDN_ORIGIN,
    process.env.BACKEND_PROXY_URL,
    process.env.NEXT_PUBLIC_MEDIA_URL,
    process.env.NEXT_PUBLIC_MEDIA_DOWNLOAD_HOST,
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
  allowedDevOrigins,
  reactStrictMode: true,
  poweredByHeader: false,
  /** Hide bottom-left "Compiling / Rendering" dev badge (nextjs-portal). Errors still show. */
  devIndicators: false,
  async redirects() {
    return [
      { source: "/academy/app", destination: "/saat", permanent: true },
      { source: "/blog", destination: "/insights", permanent: true },
      { source: "/blog/:slug", destination: "/insights/:slug", permanent: true },
      { source: "/articles", destination: "/insights", permanent: true },
      { source: "/articles/:slug", destination: "/insights/:slug", permanent: true },
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
      { source: "/:path*", headers: SECURITY_HEADERS },
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
      { pathname: "/cdn/**" },
      { pathname: "/media/**" },
    ],
    remotePatterns: backendImagePattern(),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    staleTimes: {
      // Dev: short client cache cuts repeated "Rendering" on in-app navigation.
      dynamic: process.env.NODE_ENV === 'development' ? 30 : 0,
      static: 180,
    },
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "lenis",
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

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(config);
