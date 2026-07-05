import { getInsightBySlug } from "@/lib/content";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "یادداشت — آکادمی بهرام رستمی";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getInsightBySlug(slug);
  return renderOgImage({
    eyebrow: post?.kicker ?? "یادداشت",
    title: post?.title ?? "بلاگ",
  });
}
