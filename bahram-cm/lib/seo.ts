import type { Metadata } from "next";

export const SITE = {
  name: "بهرام رستمی",
  brand: "Bahram Rostami",
  ecosystem: "آکادمی",
  course: "کمپین‌نویسی",
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://bahramrostami.com",
  locale: "fa_IR",
  twitter: "@bahramrostami",
} as const;

export const defaultMetadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "بهرام رستمی — معمار مسیر رشد حرفه‌ای",
    template: "%s | بهرام رستمی",
  },
  description:
    "کمپین‌نویسی تا آکادمی؛ مسیر رشد حرفه‌ای با بهرام رستمی.",
  keywords: [
    "بهرام رستمی",
    "کمپین‌نویسی",
    "آکادمی",
    "کسب و کار محتوا",
    "رشد حرفه‌ای",
    "آکادمی خصوصی",
    "مسیر رشد",
  ],
  authors: [{ name: "بهرام رستمی", url: SITE.url }],
  creator: "بهرام رستمی",
  publisher: "آکادمی",
  alternates: {
    canonical: "/",
    languages: { "fa-IR": "/" },
  },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: "بهرام رستمی — معمار مسیر رشد حرفه‌ای",
    description:
      "از مخاطب تا کمپین تا امپراتوری شخصی — مسیر رشد حرفه‌ای.",
    images: [
      {
        url: "/media/og-default.svg",
        width: 1200,
        height: 630,
        alt: "بهرام رستمی",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.twitter,
    creator: SITE.twitter,
    title: "بهرام رستمی — معمار مسیر رشد حرفه‌ای",
    description: "از مخاطب تا کمپین تا امپراتوری شخصی.",
    images: ["/media/og-default.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
  },
};

const DEFAULT_KEYWORDS = [
  "بهرام رستمی",
  "کمپین‌نویسی",
  "آکادمی",
  "کسب و کار محتوا",
  "رشد حرفه‌ای",
];

export type BuildMetadataInput = {
  title: string;
  description: string;
  /** Route path beginning with `/` — used for canonical + OG url. */
  path: string;
  /** Optional explicit OG/Twitter image. If omitted, the route's
   *  `opengraph-image` (or the site default) is used. */
  image?: string;
  keywords?: string[];
  type?: "website" | "article" | "profile";
  /** Set true to keep a route out of the index (e.g. transient/companion). */
  noIndex?: boolean;
};

function absolute(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `${SITE.url}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/**
 * Per-page metadata builder. Guarantees a correct canonical, OpenGraph, and
 * Twitter card for every route — replacing the old behaviour where every page
 * inherited the homepage canonical (`/`).
 */
export function buildMetadata({
  title,
  description,
  path,
  image,
  keywords,
  type = "website",
  noIndex,
}: BuildMetadataInput): Metadata {
  const canonical = path === "/" ? "/" : path.replace(/\/$/, "");
  const ogTitle = `${title} | ${SITE.name}`;
  const images = image
    ? [{ url: absolute(image), width: 1200, height: 630, alt: title }]
    : undefined;

  return {
    title,
    description,
    keywords: keywords ? [...DEFAULT_KEYWORDS, ...keywords] : DEFAULT_KEYWORDS,
    alternates: {
      canonical,
      languages: { "fa-IR": canonical },
    },
    openGraph: {
      type,
      locale: SITE.locale,
      url: absolute(canonical),
      siteName: SITE.name,
      title: ogTitle,
      description,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      creator: SITE.twitter,
      title: ogTitle,
      description,
      ...(image ? { images: [absolute(image)] } : {}),
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
