const ZARINPAL_HOSTS = new Set(['sandbox.zarinpal.com', 'www.zarinpal.com']);

export function isZarinpalGatewayUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ZARINPAL_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function isCheckoutRedirectUrl(url: string): boolean {
  if (isZarinpalGatewayUrl(url)) return true;

  try {
    const parsed = new URL(url);
    return (
      parsed.pathname === '/payment/result' ||
      parsed.pathname === '/payment/complete' ||
      parsed.pathname.endsWith('/payment/result') ||
      parsed.pathname.endsWith('/payment/complete')
    );
  } catch {
    return false;
  }
}

export const INVALID_PAYMENT_GATEWAY_URL_MESSAGE =
  'آدرس درگاه پرداخت معتبر نیست. تنظیمات زرین‌پال را بررسی کنید.';
