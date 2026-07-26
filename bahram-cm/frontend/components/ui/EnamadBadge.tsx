"use client";

import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { ENAMAD_CODE, ENAMAD_LOGO_URL, ENAMAD_TRUST_URL } from "@/lib/enamad";

type EnamadBadgeProps = {
  className?: string;
};

/**
 * کد رسمی enamad — بعد از لود صفحه تصویر لود می‌شود؛ جای خالی ثابت می‌ماند تا لایه‌بندی فوتر نشکند.
 */
export function EnamadBadge({ className }: EnamadBadgeProps) {
  const [showLogo, setShowLogo] = useState(false);

  useEffect(() => {
    const reveal = () => setShowLogo(true);

    if (document.readyState === "complete") {
      const handle =
        typeof window.requestIdleCallback === "function"
          ? window.requestIdleCallback(reveal)
          : window.setTimeout(reveal, 0);
      return () => {
        if (typeof window.cancelIdleCallback === "function") {
          window.cancelIdleCallback(handle as number);
        } else {
          window.clearTimeout(handle as number);
        }
      };
    }

    window.addEventListener("load", reveal, { once: true });
    return () => window.removeEventListener("load", reveal);
  }, []);

  return (
    <a
      referrerPolicy="origin"
      target="_blank"
      rel="noreferrer"
      href={ENAMAD_TRUST_URL}
      className={className ? `footer-trust-badge--enamad ${className}` : "footer-trust-badge--enamad"}
      title="نماد اعتماد الکترونیکی"
      aria-label="نماد اعتماد الکترونیکی"
    >
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          referrerPolicy="origin"
          src={ENAMAD_LOGO_URL}
          alt=""
          width={125}
          height={136}
          loading="lazy"
          decoding="async"
          {...({ code: ENAMAD_CODE } as ImgHTMLAttributes<HTMLImageElement>)}
          style={{ cursor: "pointer" }}
        />
      ) : (
        <span className="footer-trust-badge--enamad__placeholder" aria-hidden />
      )}
    </a>
  );
}
