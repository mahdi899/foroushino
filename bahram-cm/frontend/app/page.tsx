import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { HomeBelowFoldSections } from "@/components/home/HomeBelowFoldSections";
import { ensureStaticPageCache } from "@/lib/cache/staticPage";
import { getPublicPerfConfig } from "@/lib/cache/public";

export const metadata: Metadata = buildMetadata({
  title: "مسیر رشد حرفه‌ای",
  description: "مسیر کمپین‌نویسی و سات — سیستم فروش تلفنی بهرام رستمی.",
  path: "/",
});

export default async function HomePage() {
  const [, perf] = await Promise.all([ensureStaticPageCache(), getPublicPerfConfig()]);
  const deferBelowFold = perf.defer_below_fold !== false;

  return <HomeBelowFoldSections deferBelowFold={deferBelowFold} />;
}
