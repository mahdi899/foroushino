import type { Metadata } from "next";
import Script from "next/script";
import { fontVariables } from "@/lib/fonts";
import { defaultMetadata } from "@/lib/seo";
import {
  courseJsonLd,
  organizationJsonLd,
  personJsonLd,
  websiteJsonLd,
} from "@/lib/jsonld";
import { Analytics } from "@/components/analytics/Analytics";
import { GrainOverlay } from "@/components/motion/GrainOverlay";
import { SiteNav } from "@/components/nav/SiteNav";
import { SiteFooter } from "@/components/nav/SiteFooter";
import { ThemeScript } from "@/components/theme/ThemeScript";
import "@/styles/globals.css";

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const ld = [personJsonLd(), organizationJsonLd(), courseJsonLd(), websiteJsonLd()];

  return (
    <html lang="fa" dir="rtl" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${fontVariables} antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-pill focus:bg-emerald focus:px-4 focus:py-2 focus:text-ink"
        >
          پرش به محتوای اصلی
        </a>
        <GrainOverlay />
        <SiteNav />
        <div className="relative z-[2] min-w-0 max-w-full pt-14 md:pt-16">{children}</div>
        <SiteFooter />
        <Script id="jsonld-site" type="application/ld+json">
          {JSON.stringify(ld)}
        </Script>
        <Analytics />
      </body>
    </html>
  );
}
