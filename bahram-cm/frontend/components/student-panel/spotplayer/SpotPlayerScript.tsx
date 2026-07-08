'use client';

import Script from 'next/script';

export function SpotPlayerScript() {
  return <Script src="https://app.spotplayer.ir/assets/js/app-api.js" strategy="afterInteractive" />;
}
