'use client';

import type { LucideIcon } from 'lucide-react';
import {
  ImageIcon,
  MessageCircle,
  Newspaper,
  Phone,
  Search,
  Shield,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const SETTINGS_CATEGORY_NAV = [
  { id: 'contact', label: 'تماس', icon: Phone },
  { id: 'content', label: 'محتوا', icon: Newspaper },
  { id: 'gallery', label: 'گالری', icon: ImageIcon },
  { id: 'sms', label: 'پیامک و پیام‌ها', icon: MessageCircle },
  { id: 'seo', label: 'سئو و تحلیل', icon: Search },
  { id: 'security', label: 'امنیت', icon: Shield },
  { id: 'infrastructure', label: 'کش و زیرساخت', icon: Zap },
] as const;

export type SettingsCategoryId = (typeof SETTINGS_CATEGORY_NAV)[number]['id'];

/** Legacy section anchors used across the admin panel. */
const LEGACY_SECTION_TO_CATEGORY: Record<string, SettingsCategoryId> = {
  'site-contact': 'contact',
  'blog-categories': 'content',
  'image-optimizer': 'gallery',
  'sms-spotplayer-credentials': 'sms',
  'sms-routing': 'sms',
  'academy-links': 'sms',
  'google-tracking': 'seo',
  captcha: 'security',
  'cache-integrations': 'infrastructure',
  'database-backup': 'infrastructure',
};

export function resolveSettingsScrollTarget(hash: string): string | null {
  if (!hash) return null;
  if (SETTINGS_CATEGORY_NAV.some((c) => c.id === hash)) return hash;
  if (hash in LEGACY_SECTION_TO_CATEGORY) return hash;
  return null;
}

export function SiteSettingsNav() {
  return (
    <nav
      aria-label="دسته‌بندی تنظیمات سایت"
      className="-mx-1 mb-6 rounded-xl border border-border bg-surface px-2 py-2"
    >
      <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {SETTINGS_CATEGORY_NAV.map((category) => {
          const Icon = category.icon;
          return (
            <li key={category.id} className="min-w-0">
              <a
                href={`#${category.id}`}
                className="inline-flex max-w-full items-center gap-2 rounded-lg px-3.5 py-2 text-small font-medium text-text-muted transition hover:bg-surface-soft hover:text-primary"
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                <span className="truncate">{category.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SettingsCategory({
  id,
  icon: Icon,
  title,
  desc,
  children,
}: {
  id: SettingsCategoryId;
  icon: LucideIcon;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 space-y-4">
      <div className="flex items-start gap-3 border-b border-border pb-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-soft text-accent">
          <Icon className="h-5 w-5" strokeWidth={1.6} />
        </span>
        <div className="min-w-0">
          <h2 className="text-h3 font-bold text-primary-dark">{title}</h2>
          <p className="mt-0.5 text-caption leading-6 text-text-muted">{desc}</p>
        </div>
      </div>
      <div className={cn('space-y-4')}>{children}</div>
    </section>
  );
}
