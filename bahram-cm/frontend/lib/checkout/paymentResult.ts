import 'server-only';

function publicApiBase(): string {
  const backend = (process.env.BACKEND_PROXY_URL ?? 'http://127.0.0.1:8010').replace(/\/+$/, '');
  return `${backend}/api`;
}

export type PaymentResultStatus = 'success' | 'failed' | 'cancelled';

export type VerifiedPaymentResult = {
  status: PaymentResultStatus;
  order_number: string | null;
  product_slug: string | null;
};

export async function getVerifiedPaymentResult(
  receiptToken: string,
): Promise<VerifiedPaymentResult | null> {
  const url = new URL(`${publicApiBase()}/orders/payment-result`);
  url.searchParams.set('token', receiptToken);

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) return null;

  const json = (await res.json().catch(() => ({}))) as { data?: VerifiedPaymentResult };
  const data = json.data;
  if (!data?.status) return null;

  return data;
}
