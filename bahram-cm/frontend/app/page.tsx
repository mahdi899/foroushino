import type { Metadata } from "next";
import { getPublicPerfConfig } from "@/lib/cache/public";
import { buildMetadata } from "@/lib/seo";
import { HomeBelowFoldSections } from "@/components/home/HomeBelowFoldSections";
import { sitePhotos } from "@/lib/site-photo-paths";
import { resolveMediaUrl } from "@/lib/mediaUrl";

export const metadata: Metadata = buildMetadata({
  title: "مسیر رشد حرفه‌ای",
  description: "مسیر کمپین‌نویسی و سات — سیستم فروش تلفنی بهرام رستمی.",
  path: "/",
});

export default async function HomePage() {
  const perf = await getPublicPerfConfig();

  return (
    <>
      <link rel="preload" as="image" href={resolveMediaUrl(sitePhotos.heroBackgroundMobile)} media="(max-width: 767px)" fetchPriority="high" />
      <link rel="preload" as="image" href={resolveMediaUrl(sitePhotos.heroBackground)} media="(min-width: 768px)" fetchPriority="high" />
      <HomeBelowFoldSections deferBelowFold={perf.defer_below_fold !== false} />
    </>
  );
}
