import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "بهرام رستمی — معمار مسیر رشد حرفه‌ای";

export default async function Image() {
  return renderOgImage({
    eyebrow: "آکادمی · کمپین‌نویسی",
    title: "از مخاطب تا کمپین، تا یک امپراتوری شخصی.",
  });
}
