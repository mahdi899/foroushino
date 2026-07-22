'use client';

import dynamic from 'next/dynamic';

const ReferralCapture = dynamic(
  () => import('@/components/commerce/ReferralCapture').then((m) => ({ default: m.ReferralCapture })),
  { ssr: false },
);

const DiscountCapture = dynamic(
  () => import('@/components/commerce/DiscountCapture').then((m) => ({ default: m.DiscountCapture })),
  { ssr: false },
);

const SitePwaRegistrar = dynamic(
  () => import('@/components/pwa/SitePwaRegistrar').then((m) => ({ default: m.SitePwaRegistrar })),
  { ssr: false },
);

const BahramUpdateBanner = dynamic(
  () => import('@/components/pwa/BahramUpdateBanner').then((m) => ({ default: m.BahramUpdateBanner })),
  { ssr: false },
);

/** Non-critical shell widgets — deferred to shrink the homepage critical path. */
export function SiteShellDeferred() {
  return (
    <>
      <ReferralCapture />
      <DiscountCapture />
      <SitePwaRegistrar />
      <BahramUpdateBanner variant="site" />
    </>
  );
}
