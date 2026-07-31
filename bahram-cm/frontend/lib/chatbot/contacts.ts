import { siteConfig } from '@/config/site';
import {
  DEFAULT_CHATBOT_CONTACTS,
  type ChatbotContactChannelKey,
  type ChatbotContacts,
  type ChatbotPublicContacts,
} from './types';

/** Defaults — prefer live siteConfig, fall back to stored defaults. */
export function defaultChatbotContacts(): ChatbotContacts {
  return {
    whatsapp: {
      enabled: DEFAULT_CHATBOT_CONTACTS.whatsapp.enabled,
      id: siteConfig.contact.whatsappRaw || DEFAULT_CHATBOT_CONTACTS.whatsapp.id,
      label: siteConfig.contact.whatsapp || DEFAULT_CHATBOT_CONTACTS.whatsapp.label,
    },
    telegram: {
      enabled: DEFAULT_CHATBOT_CONTACTS.telegram.enabled,
      id: siteConfig.social.telegramHandle.replace(/^@/, '') || DEFAULT_CHATBOT_CONTACTS.telegram.id,
      label: siteConfig.social.telegramHandle || DEFAULT_CHATBOT_CONTACTS.telegram.label,
    },
    rubika: {
      enabled: DEFAULT_CHATBOT_CONTACTS.rubika.enabled,
      id: siteConfig.social.rubikaHandle.replace(/^@/, '') || DEFAULT_CHATBOT_CONTACTS.rubika.id,
      label: siteConfig.social.rubikaHandle || DEFAULT_CHATBOT_CONTACTS.rubika.label,
    },
    instagram: {
      enabled: DEFAULT_CHATBOT_CONTACTS.instagram.enabled,
      id: siteConfig.social.instagramHandle.replace(/^@/, '') || DEFAULT_CHATBOT_CONTACTS.instagram.id,
      label: siteConfig.social.instagramHandle || DEFAULT_CHATBOT_CONTACTS.instagram.label,
    },
    phone: {
      enabled: DEFAULT_CHATBOT_CONTACTS.phone.enabled,
      id: siteConfig.contact.phoneRaw || DEFAULT_CHATBOT_CONTACTS.phone.id,
      label: siteConfig.contact.phone || DEFAULT_CHATBOT_CONTACTS.phone.label,
    },
  };
}

function stripHandle(value: string): string {
  return value.trim().replace(/^@/, '');
}

/** Digits only for wa.me (keeps leading country code). */
export function normalizeWhatsappId(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

export function normalizePhoneTel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/[^\d]/g, '')}`;
  }
  return trimmed.replace(/[^\d+]/g, '');
}

export function resolveContactHref(key: ChatbotContactChannelKey, id: string): string {
  const value = id.trim();
  if (!value) return '#';

  if (key === 'whatsapp') {
    const digits = normalizeWhatsappId(value);
    return digits ? `https://wa.me/${digits}` : '#';
  }

  if (key === 'phone') {
    const tel = normalizePhoneTel(value);
    return tel ? `tel:${tel}` : '#';
  }

  if (/^https?:\/\//i.test(value)) return value;

  const handle = stripHandle(value);
  if (!handle) return '#';

  if (key === 'telegram') return `https://t.me/${handle}`;
  if (key === 'rubika') return `https://rubika.ir/${handle}`;
  if (key === 'instagram') return `https://www.instagram.com/${handle}/`;

  return '#';
}

export function resolveContactLabel(key: ChatbotContactChannelKey, id: string, label?: string): string {
  const custom = label?.trim();
  if (custom) return custom;

  if (key === 'whatsapp' || key === 'phone') return id.trim() || '—';

  const handle = stripHandle(id);
  if (!handle) return '—';
  if (key === 'instagram' || key === 'telegram' || key === 'rubika') return `@${handle}`;
  return handle;
}

export type SiteSocialChannelKey = 'instagram' | 'telegram' | 'rubika';

export type SiteSocialLink = {
  key: SiteSocialChannelKey;
  label: string;
  value: string;
  href: string;
  external: true;
};

const SITE_SOCIAL_META: Record<SiteSocialChannelKey, { title: string }> = {
  instagram: { title: 'اینستاگرام' },
  telegram: { title: 'تلگرام' },
  rubika: { title: 'روبیکا' },
};

/** Contact page + footer socials — same IDs as /admin/chatbot channels. */
export function siteSocialLinksFromContacts(
  contacts: ChatbotPublicContacts | null | undefined,
): SiteSocialLink[] {
  const keys: SiteSocialChannelKey[] = ['instagram', 'telegram', 'rubika'];
  const defaults = toPublicContacts(defaultChatbotContacts());
  const source = contacts ?? defaults;

  return keys
    .filter((key) => source[key]?.enabled !== false)
    .map((key) => {
      const row = source[key] ?? defaults[key];
      const rawLabel = resolveContactLabel(key, row.id, row.label);
      const value =
        rawLabel.startsWith('@') || /^https?:\/\//i.test(rawLabel) ? rawLabel : `@${rawLabel}`;
      return {
        key,
        label: SITE_SOCIAL_META[key].title,
        value,
        href: row.href || resolveContactHref(key, row.id),
        external: true as const,
      };
    })
    .filter((row) => Boolean(row.href && row.href !== '#'));
}

export function mergeChatbotContacts(
  raw: Partial<ChatbotContacts> | null | undefined,
  legacy?: { cta_whatsapp?: boolean; cta_phone?: boolean },
): ChatbotContacts {
  const defaults = defaultChatbotContacts();
  const keys: ChatbotContactChannelKey[] = ['whatsapp', 'telegram', 'rubika', 'instagram', 'phone'];
  const out: ChatbotContacts = {
    whatsapp: { ...defaults.whatsapp },
    telegram: { ...defaults.telegram },
    rubika: { ...defaults.rubika },
    instagram: { ...defaults.instagram },
    phone: { ...defaults.phone },
  };

  for (const key of keys) {
    const row = raw?.[key];
    if (!row || typeof row !== 'object') continue;
    const id = typeof row.id === 'string' ? row.id.trim() : '';
    const label = typeof row.label === 'string' ? row.label.trim() : '';
    out[key] = {
      enabled: typeof row.enabled === 'boolean' ? row.enabled : defaults[key].enabled,
      id: id || defaults[key].id,
      label: label || defaults[key].label,
    };
  }

  // Backward compat: older configs only had cta_whatsapp / cta_phone flags.
  if (raw?.whatsapp?.enabled === undefined && typeof legacy?.cta_whatsapp === 'boolean') {
    out.whatsapp.enabled = legacy.cta_whatsapp;
  }
  if (raw?.phone?.enabled === undefined && typeof legacy?.cta_phone === 'boolean') {
    out.phone.enabled = legacy.cta_phone;
  }

  return out;
}

export function toPublicContacts(contacts: ChatbotContacts): ChatbotPublicContacts {
  const keys: ChatbotContactChannelKey[] = ['whatsapp', 'telegram', 'rubika', 'instagram', 'phone'];
  const out = {} as ChatbotPublicContacts;

  for (const key of keys) {
    const channel = contacts[key];
    out[key] = {
      enabled: channel.enabled,
      id: channel.id,
      label: resolveContactLabel(key, channel.id, channel.label),
      href: resolveContactHref(key, channel.id),
    };
  }

  return out;
}

export function normalizeContactsForSave(contacts: ChatbotContacts): ChatbotContacts {
  return {
    whatsapp: {
      enabled: contacts.whatsapp.enabled,
      id: normalizeWhatsappId(contacts.whatsapp.id) || contacts.whatsapp.id.trim(),
      label: contacts.whatsapp.label.trim(),
    },
    telegram: {
      enabled: contacts.telegram.enabled,
      id: contacts.telegram.id.trim().replace(/^@/, ''),
      label: contacts.telegram.label.trim(),
    },
    rubika: {
      enabled: contacts.rubika.enabled,
      id: contacts.rubika.id.trim().replace(/^@/, ''),
      label: contacts.rubika.label.trim(),
    },
    instagram: {
      enabled: contacts.instagram.enabled,
      id: contacts.instagram.id.trim().replace(/^@/, ''),
      label: contacts.instagram.label.trim(),
    },
    phone: {
      enabled: contacts.phone.enabled,
      id: normalizePhoneTel(contacts.phone.id) || contacts.phone.id.trim(),
      label: contacts.phone.label.trim(),
    },
  };
}
