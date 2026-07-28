"use client";

import { useEffect, useRef } from "react";

/** اسنیپت‌های رسمی — بدون دستکاری؛ فقط داخل باکس استایل می‌شوند. */
const TRUST_SEALS_HTML = `<style>#zarinpal{margin:auto} #zarinpal img {width: 80px;}</style>
<div id="zarinpal">
<script src="https://www.zarinpal.com/webservice/TrustCode" type="text/javascript"></script>
</div>
<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=7018924&Code=WXwKRP44oHlTXnGwsgyYeTs3OtYeCZOY'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=7018924&Code=WXwKRP44oHlTXnGwsgyYeTs3OtYeCZOY' alt='' style='cursor:pointer' code='WXwKRP44oHlTXnGwsgyYeTs3OtYeCZOY'></a>`;

/**
 * اسکریپت‌های رسمی نماد اعتماد.
 * ساماندهی بعد از دریافت کد اضافه می‌شود.
 */
export function TrustSeals() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || host.dataset.mounted === "1") return;
    host.dataset.mounted = "1";
    host.innerHTML = TRUST_SEALS_HTML;

    // اسکریپت‌های تزریق‌شده با innerHTML اجرا نمی‌شوند — همان تگ را دوباره mount می‌کنیم
    host.querySelectorAll("script").forEach((oldScript) => {
      const script = document.createElement("script");
      for (const attr of Array.from(oldScript.attributes)) {
        script.setAttribute(attr.name, attr.value);
      }
      if (oldScript.textContent) {
        script.textContent = oldScript.textContent;
      }
      oldScript.replaceWith(script);
    });
  }, []);

  return (
    <div className="namad-trust-box mx-auto max-w-xl rounded-2xl border border-bone/15 bg-bone/5 px-6 py-8 sm:px-10">
      <div
        ref={hostRef}
        className="flex flex-wrap items-center justify-center gap-6 sm:gap-10"
      />
    </div>
  );
}
