"use client";

import { useEffect, useState } from "react";

const ENAMAD_ID = "7021219";
const ENAMAD_CODE = "iJwNC35mKYjZEuZ1zJ3Caldlg8ZFW7gb";
const ENAMAD_TRUST_URL = `https://trustseal.enamad.ir/?id=${ENAMAD_ID}&Code=${ENAMAD_CODE}`;
const ENAMAD_LOGO_URL = `https://trustseal.enamad.ir/logo.aspx?id=${ENAMAD_ID}&Code=${ENAMAD_CODE}`;

type EnamadBadgeProps = {
  className?: string;
  surfaceClassName?: string;
  innerClassName?: string;
  imgClassName?: string;
};

/**
 * نماد اعتماد الکترونیکی (eNamad) — بارگذاری تنبل (lazy) و به‌تعویق‌افتاده تا بعد از
 * لود کامل صفحه، تا هیچ اختلالی در سرعت و رندر اولیه سایت ایجاد نشود.
 */
export function EnamadBadge({
  className,
  surfaceClassName,
  innerClassName,
  imgClassName,
}: EnamadBadgeProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (document.readyState === "complete") {
      const id = window.requestIdleCallback
        ? window.requestIdleCallback(() => setShouldRender(true))
        : window.setTimeout(() => setShouldRender(true), 1);
      return () => {
        if (window.cancelIdleCallback) window.cancelIdleCallback(id as number);
        else window.clearTimeout(id as number);
      };
    }

    const handleLoad = () => {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => setShouldRender(true));
      } else {
        window.setTimeout(() => setShouldRender(true), 1);
      }
    };

    window.addEventListener("load", handleLoad, { once: true });
    return () => window.removeEventListener("load", handleLoad);
  }, []);

  if (!shouldRender) return null;

  return (
    <a
      referrerPolicy="origin"
      target="_blank"
      rel="noreferrer"
      href={ENAMAD_TRUST_URL}
      className={className}
      title="نماد اعتماد الکترونیکی"
    >
      <span className={surfaceClassName}>
        <span className={innerClassName}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            referrerPolicy="origin"
            src={ENAMAD_LOGO_URL}
            alt="نماد اعتماد الکترونیکی"
            loading="lazy"
            decoding="async"
            className={imgClassName}
          />
        </span>
      </span>
    </a>
  );
}
