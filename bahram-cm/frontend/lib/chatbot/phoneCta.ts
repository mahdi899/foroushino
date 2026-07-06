import type { ChatbotCta } from './types';

export const REGISTER_PHONE_CTA: ChatbotCta = {
  label: 'ثبت تماس',
  href: '#register-phone',
  type: 'register_phone',
};

export function withRegisterPhoneCta(
  ctas: ChatbotCta[] | undefined,
  options: { include: boolean },
): ChatbotCta[] {
  const base = ctas ?? [];
  if (!options.include) return base;
  if (base.some((c) => c.type === 'register_phone')) return base;
  return [...base, REGISTER_PHONE_CTA];
}
