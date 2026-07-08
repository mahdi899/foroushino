import type { Metadata } from "next";
import { getPublicPerfConfig } from "@/lib/cache/public";
import { buildMetadata } from "@/lib/seo";
import { HomeBelowFoldSections } from "@/components/home/HomeBelowFoldSections";
import bahramImageLoader from "@/lib/imageLoader";
import { sitePhotos } from "@/lib/site-photo-paths";

export const metadata: Metadata = buildMetadata({
  title: "مسیر رشد حرفه‌ای",
  description: "مسیر کمپین‌نویسی و سات — سیستم فروش تلفنی بهرام رستمی.",
  path: "/",
});

export default async function HomePage() {
  const perf = await getPublicPerfConfig();

  return (
    <>
      <link rel="preload" as="image" href={bahramImageLoader({ src: sitePhotos.heroBackgroundMobile, width: 768, quality: 80 })} media="(max-width: 1023px)" fetchPriority="high" />
      <link rel="preload" as="image" href={bahramImageLoader({ src: sitePhotos.heroBackground, width: 1920, quality: 80 })} media="(min-width: 1024px)" fetchPriority="high" />
      <HomeBelowFoldSections deferBelowFold={perf.defer_below_fold !== false} />
    </>
  );
}
