import { resolveCountryCode } from '@/lib/geo/country';
import { headers } from 'next/headers';

export async function GET() {
  const h = await headers();
  const country = resolveCountryCode((name) => h.get(name));

  return Response.json(
    { country },
    {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    },
  );
}
