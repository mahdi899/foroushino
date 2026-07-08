export async function waitForSpotPlayer(timeoutMs = 15000): Promise<void> {
  if (typeof window === 'undefined') return;

  const startedAt = Date.now();

  while (!window.SpotPlayer) {
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error('اسکریپت SpotPlayer بارگذاری نشد. لطفاً صفحه را دوباره بارگذاری کنید.');
    }

    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
}
