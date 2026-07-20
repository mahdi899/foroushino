import { FAMILY_MEDIA_PLAYBACK_HOST } from '@/lib/family/mediaPlaybackUrl';

/** Early TLS + DNS to the family media CDN — faster first byte for voice/video/images. */
export function FamilyMediaPreconnect() {
  const origin = FAMILY_MEDIA_PLAYBACK_HOST;
  if (!origin || origin.includes('localhost')) return null;

  return (
    <>
      <link rel="preconnect" href={origin} crossOrigin="anonymous" />
      <link rel="dns-prefetch" href={origin} />
    </>
  );
}
