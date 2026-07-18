import { renderSiteFavicon } from '@/lib/site-favicon';

const ALLOWED_SIZES = new Set([192, 512]);

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> },
) {
  const size = Number((await context.params).size);
  if (!ALLOWED_SIZES.has(size)) {
    return new Response('Not found', { status: 404 });
  }

  return renderSiteFavicon(size);
}
