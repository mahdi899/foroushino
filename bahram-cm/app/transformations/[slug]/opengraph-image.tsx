import { getTransformationBySlug } from "@/lib/content";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "قبل و بعد دانشجو — آکادمی بهرام رستمی";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getTransformationBySlug(slug);
  return renderOgImage({
    eyebrow: item ? `${item.name} · ${item.role}` : "قبل و بعد",
    title: item?.summary ?? "قبل و بعد دانشجوها",
  });
}
