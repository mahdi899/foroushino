import Link from "next/link";
import { site } from "@/content/site";
import { SITE_MEDIA } from "@/config/media";
import { DirectMediaImg } from "@/components/ui/DirectMediaImg";

type FooterTrustBadgesProps = {
  layout: "desktop" | "mobile";
};

function TrustBadgesRow() {
  return (
    <>
      {site.footer.trustBadges.map((badge) => {
        const src = SITE_MEDIA[`trust-${badge.id}`]?.src;
        return (
          <Link
            key={badge.id}
            href="/namad"
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
          </Link>
        );
      })}
    </>
  );
}

export function FooterTrustBadges({ layout }: FooterTrustBadgesProps) {
  if (layout === "mobile") {
    return (
      <div
        className="footer-trust-badges footer-trust-badges--compact mt-6 flex justify-center border-t border-bone/10 pt-5 md:hidden"
        aria-label="نشان‌های اعتماد"
      >
        <TrustBadgesRow />
      </div>
    );
  }

  return (
    <div
      className="footer-trust-badges mt-8 hidden border-t border-bone/10 pt-8 md:flex"
      aria-label="نشان‌های اعتماد"
    >
      <TrustBadgesRow />
    </div>
  );
}
