import Script from "next/script";
import { analyticsConfig } from "@/lib/analytics";

/**
 * Loads the configured analytics provider(s). Renders nothing unless an env var
 * is set, so local/dev builds ship zero analytics JS. Plausible is the default;
 * GA4 loads only when a measurement ID is provided.
 */
export function Analytics() {
  const { plausibleDomain, plausibleSrc, gaMeasurementId } = analyticsConfig;

  return (
    <>
      {plausibleDomain ? (
        <Script
          defer
          data-domain={plausibleDomain}
          src={plausibleSrc}
          strategy="afterInteractive"
        />
      ) : null}

      {gaMeasurementId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaMeasurementId}', { anonymize_ip: true });`}
          </Script>
        </>
      ) : null}
    </>
  );
}
