"use client";

import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { site } from "@/content/site";
import { SITE_MEDIA } from "@/config/media";
import { DirectMediaImg } from "@/components/ui/DirectMediaImg";
import { ENAMAD_CODE, ENAMAD_LOGO_URL, ENAMAD_TRUST_URL } from "@/lib/enamad";

/** بعد از لود کامل صفحه + این تأخیر، بلوک نشان‌های اعتماد رندر می‌شود. */
const TRUST_BADGES_DELAY_MS = 500;

function useTrustBadgesReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;

    const schedule = () => {
      timeoutId = window.setTimeout(() => setReady(true), TRUST_BADGES_DELAY_MS);
    };

    if (document.readyState === "complete") {
      schedule();
    } else {
      window.addEventListener("load", schedule, { once: true });
    }

    return () => {
      window.removeEventListener("load", schedule);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  return ready;
}

/** کد رسمی enamad — بدون دستکاری (همان snippet پنل). */
function EnamadOfficialEmbed() {
  return (
    <a referrerPolicy="origin" target="_blank" href={ENAMAD_TRUST_URL}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        referrerPolicy="origin"
        src={ENAMAD_LOGO_URL}
        alt=""
        style={{ cursor: "pointer" }}
        {...({ code: ENAMAD_CODE } as ImgHTMLAttributes<HTMLImageElement>)}
      />
    </a>
  );
}

type FooterTrustBadgesProps = {
  layout: "desktop" | "mobile";
};

export function FooterTrustBadges({ layout }: FooterTrustBadgesProps) {
  const ready = useTrustBadgesReady();
  if (!ready) return null;

  if (layout === "mobile") {
    return (
      <div className="mt-6 flex justify-center md:hidden">
        <EnamadOfficialEmbed />
      </div>
    );
  }

  return (
    <div
      className="footer-trust-badges mt-8 hidden border-t border-bone/10 pt-8 md:flex"
      aria-label="نشان‌های اعتماد"
    >
      {site.footer.trustBadges.map((badge) => {
        if (badge.id === "enamad") {
          return <EnamadOfficialEmbed key={badge.id} />;
        }

        const src = SITE_MEDIA[`trust-${badge.id}`]?.src;
        return (
          <a
            key={badge.id}
            href={badge.href}
            target="_blank"
            rel="noreferrer noopener"
            className="footer-trust-badge group"
            title={badge.alt}
          >
            {src ? (
              <span className="footer-trust-badge__surface">
                <span className="footer-trust-badge__inner">
                  <DirectMediaImg src={src} alt={badge.alt} className="footer-trust-badge__img" />
                </span>
              </span>
            ) : (
              <span className="footer-trust-badge__surface text-xs text-mist">{badge.alt}</span>
            )}
          </a>
        );
      })}
    </div>
  );
}
