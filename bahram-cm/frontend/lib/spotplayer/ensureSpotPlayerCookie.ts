const COOKIE_NAME = 'X';

export async function ensureSpotPlayerCookie(syncUrl: string): Promise<void> {
  const response = await fetch(syncUrl, {
    credentials: 'same-origin',
    cache: 'no-store',
  });

  if (!response.ok && response.status !== 204) {
    throw new Error('همگام‌سازی کوکی SpotPlayer ناموفق بود.');
  }

  await new Promise((resolve) => window.setTimeout(resolve, 0));

  const hasCookie = document.cookie
    .split(';')
    .some((part) => part.trim().startsWith(`${COOKIE_NAME}=`));

  if (!hasCookie) {
    throw new Error('کوکی SpotPlayer تنظیم نشد. صفحه را یک‌بار رفرش کنید و دوباره تلاش کنید.');
  }
}
