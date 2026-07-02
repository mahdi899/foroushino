import { getEventBySlug } from "@/lib/content";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "رویداد — آکادمی بهرام رستمی";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  return renderOgImage({
    eyebrow: event?.status === "recording" ? "آرشیو رویداد" : "رویداد",
    title: event?.title ?? "رویدادها",
  });
}
