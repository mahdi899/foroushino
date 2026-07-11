export const MOBILE_ONLY_IDENTITY_MESSAGE =
  'تأیید هویت فقط از طریق گوشی موبایل امکان‌پذیر است. لطفاً پنل کاربری را روی گوشی خود باز کنید.';

export function isPhoneClient(userAgent?: string): boolean {
  const ua = (userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '')).trim();
  if (!ua) return false;

  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
    return false;
  }

  if (/windows nt|macintosh|cros|linux x86_64|x11/i.test(ua) && !/mobile|iphone|ipod|android.*mobile|iemobile|opera mini|webos/i.test(ua)) {
    return false;
  }

  return /mobile|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini|webos/i.test(ua);
}
