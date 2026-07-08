import 'server-only';

function publicApiBase(): string {
  const backend = (process.env.BACKEND_PROXY_URL ?? 'http://127.0.0.1:8010').replace(/\/+$/, '');
  return `${backend}/api`;
}

export type OrderCompleteProfile = {
  order_number: string;
  customer_phone_masked: string | null;
  customer_email: string | null;
  product_slug: string | null;
};

export async function getOrderCompleteProfile(
  completionToken: string,
): Promise<OrderCompleteProfile | null> {
  const url = new URL(`${publicApiBase()}/orders/complete-profile`);
  url.searchParams.set('token', completionToken);

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) return null;

  const json = (await res.json().catch(() => ({}))) as { data?: OrderCompleteProfile };
  return json.data ?? null;
}
