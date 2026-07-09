import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

/** Read + cache the Persian display fonts used for OG cards (nodejs runtime). */
const loadFonts = cache(async () => {
  const dir = path.join(process.cwd(), "public", "fonts");
  const [bold, medium] = await Promise.all([
    fs.readFile(path.join(dir, "IRANSansXFaNum", "IRANSansXFaNum-Bold.woff")),
    fs.readFile(path.join(dir, "IRANSansXFaNum", "IRANSansXFaNum-Medium.woff")),
  ]);
  return { bold, medium };
});

/**
 * Shared OpenGraph card renderer. Produces a brand-consistent 1200×630 image
 * with an eyebrow, title and footer — used by route-level `opengraph-image`
 * handlers for the homepage and per-slug content pages.
 */
export async function renderOgImage({
  title,
  eyebrow,
  footer = "bahramrostami.com",
}: {
  title: string;
  eyebrow?: string;
  footer?: string;
}): Promise<ImageResponse> {
  const { bold, medium } = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "radial-gradient(120% 120% at 85% 0%, #003b40 0%, #0d1517 55%, #050a0b 100%)",
          fontFamily: "IRANSansXFaNum",
          direction: "rtl",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: "#008c96",
              boxShadow: "0 0 28px 4px rgba(0,140,150,0.42)",
            }}
          />
          {eyebrow ? (
            <div style={{ fontSize: 30, color: "#ffb000", fontWeight: 500 }}>{eyebrow}</div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 68,
            lineHeight: 1.25,
            fontWeight: 700,
            color: "#eafbfb",
            maxWidth: 980,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(234,251,251,0.12)",
            paddingTop: 28,
          }}
        >
          <div style={{ fontSize: 30, color: "#95b4b8", fontWeight: 500 }}>بهرام رستمی</div>
          <div style={{ fontSize: 28, color: "#ffb000", fontWeight: 500 }}>{footer}</div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "IRANSansXFaNum", data: bold, weight: 700, style: "normal" },
        { name: "IRANSansXFaNum", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
