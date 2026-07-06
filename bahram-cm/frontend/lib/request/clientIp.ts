export function resolveClientIpOrUnknown(getHeader: (name: string) => string | null): string {
  return (
    getHeader('x-client-ip')
    ?? getHeader('x-forwarded-for')?.split(',')[0]?.trim()
    ?? getHeader('x-real-ip')
    ?? 'unknown'
  );
}

export function isLoopbackIp(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip === 'unknown';
}
