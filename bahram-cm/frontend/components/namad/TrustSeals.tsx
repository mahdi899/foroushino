"use client";

import { useEffect, type ImgHTMLAttributes } from "react";
import { ENAMAD_CODE, ENAMAD_LOGO_URL, ENAMAD_TRUST_URL } from "@/lib/enamad";

/**
 * اسکریپت‌های رسمی نماد اعتماد — بدون دستکاری اسنیپت‌ها.
 * ساماندهی بعد از دریافت کد اضافه می‌شود.
 */
export function TrustSeals() {
  useEffect(() => {
    const host = document.getElementById("zarinpal");
    if (!host || host.querySelector("script[data-zarinpal-trust]")) return;

    const script = document.createElement("script");
    script.src = "https://www.zarinpal.com/webservice/TrustCode";
    script.type = "text/javascript";
    script.dataset.zarinpalTrust = "1";
    host.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return (
    <div className="namad-trust-box mx-auto flex max-w-xl flex-wrap items-center justify-center gap-6 rounded-2xl border border-bone/15 bg-bone/5 px-6 py-8 sm:gap-10 sm:px-10">
      <style>{`#zarinpal{margin:auto} #zarinpal img {width: 80px;}`}</style>

      <div id="zarinpal" className="flex min-h-[80px] min-w-[80px] items-center justify-center" />

      <a
        referrerPolicy="origin"
        target="_blank"
        rel="noreferrer noopener"
        href={ENAMAD_TRUST_URL}
        className="flex min-h-[80px] min-w-[80px] items-center justify-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          referrerPolicy="origin"
          src={ENAMAD_LOGO_URL}
          alt="نماد اعتماد الکترونیکی"
          style={{ cursor: "pointer", width: 80, height: "auto" }}
          {...({ code: ENAMAD_CODE } as ImgHTMLAttributes<HTMLImageElement>)}
        />
      </a>
    </div>
  );
}
