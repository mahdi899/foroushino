import { CDN_DELIVERY_ORIGIN } from '@/lib/mediaUrl';

/** Early connection to the image CDN — cuts TLS + DNS latency on first photo. */
export function MediaPreconnect() {
  const origin = CDN_DELIVERY_ORIGIN;
  if (!origin || origin.includes('localhost:3000')) return null;

  return (
    <>
      <link rel="preconnect" href={origin} crossOrigin="anonymous" />
      <link rel="dns-prefetch" href={origin} />
    </>
  );
}
