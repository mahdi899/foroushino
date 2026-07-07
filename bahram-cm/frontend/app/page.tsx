import type { Metadata } from "next";
import { getPublicPerfConfig } from "@/lib/cache/public";
import { buildMetadata } from "@/lib/seo";
import { HomeBelowFoldSections } from "@/components/home/HomeBelowFoldSections";
import bahramImageLoader from "@/lib/imageLoader";
import { primarySiteImageSrc } from "@/lib/mediaUrl";
import { sitePhotos } from "@/lib/site-photo-paths";

export const metadata: Metadata = buildMetadata({
  title: "مسیر رشد حرفه‌ای",
  description: "مسیر کمپین‌نویسی و سات — سیستم فروش تلفنی بهرام رستمی.",
  path: "/",
});

function heroPreloadHref(): string {
  const src = primarySiteImageSrc(sitePhotos.portraitFounder);
  return bahramImageLoader({ src, width: 448, quality: 80 });
}

export default async function HomePage() {
  const perf = await getPublicPerfConfig();

  return (
    <>
      <link rel="preload" as="image" href={heroPreloadHref()} fetchPriority="high" />
      <HomeBelowFoldSections deferBelowFold={perf.defer_below_fold !== false} />
    </>
  );
}
