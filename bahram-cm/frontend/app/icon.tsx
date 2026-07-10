import { renderSiteFavicon } from '@/lib/site-favicon';

export const runtime = 'nodejs';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default async function Icon() {
  return renderSiteFavicon(32);
}
