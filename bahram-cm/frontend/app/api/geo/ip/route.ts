import { isLoopbackIp, resolveClientIpOrUnknown } from '@/lib/request/clientIp';
import { headers } from 'next/headers';

export async function GET() {
  const h = await headers();
  const ip = resolveClientIpOrUnknown((name) => h.get(name));
  const safe = ip && !isLoopbackIp(ip) ? ip : null;

  return Response.json(
    { ip: safe },
    {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    },
  );
}
