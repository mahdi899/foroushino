import { Bot, Radio, Send, type LucideIcon } from 'lucide-react';

export type AcademyLinkKey = 'telegram_channel' | 'rubika_channel' | 'telegram_bot';

export const ACADEMY_LINK_ORDER: AcademyLinkKey[] = [
  'telegram_channel',
  'rubika_channel',
  'telegram_bot',
];

export type AcademyLinkVariant = 'telegram' | 'rubika' | 'bot';

export interface AcademyLinkMeta {
  key: AcademyLinkKey;
  quickLabel: string;
  hint: string;
  badge: string;
  icon: LucideIcon;
  variant: AcademyLinkVariant;
  rowTone: string;
}

export const ACADEMY_LINK_META: Record<AcademyLinkKey, AcademyLinkMeta> = {
  telegram_channel: {
    key: 'telegram_channel',
    quickLabel: 'کانال تلگرام دوره',
    hint: 'لینک کانال را کپی کنید یا با «ورود مستقیم» در تلگرام باز کنید.',
    badge: 'کانال تلگرام',
    icon: Send,
    variant: 'telegram',
    rowTone: 'panel-link-row__icon--telegram',
  },
  rubika_channel: {
    key: 'rubika_channel',
    quickLabel: 'کانال روبیکا دوره',
    hint: 'لینک یا آیدی کانال روبیکا را کپی کنید یا مستقیم وارد شوید.',
    badge: 'کانال روبیکا',
    icon: Radio,
    variant: 'rubika',
    rowTone: 'panel-link-row__icon--rubika',
  },
  telegram_bot: {
    key: 'telegram_bot',
    quickLabel: 'ربات تلگرام دوره',
    hint: 'لینک ربات را کپی کنید یا با «ورود مستقیم» در تلگرام باز کنید.',
    badge: 'ربات تلگرام',
    icon: Bot,
    variant: 'bot',
    rowTone: 'panel-link-row__icon--bot',
  },
};

export function academyLinkMeta(key: string): AcademyLinkMeta | null {
  if (key in ACADEMY_LINK_META) return ACADEMY_LINK_META[key as AcademyLinkKey];
  return null;
}
