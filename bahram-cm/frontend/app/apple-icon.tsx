import { renderSiteFavicon } from '@/lib/site-favicon';

export const runtime = 'nodejs';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default async function AppleIcon() {
  return renderSiteFavicon(180);
}
