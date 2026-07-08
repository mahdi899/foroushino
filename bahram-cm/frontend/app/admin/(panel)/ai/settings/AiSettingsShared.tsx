'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  CheckCircle2,
  ImageIcon,
  Loader2,
  MessageSquare,
  Save,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const AI_SECTION_NAV = [
  { id: 'ai', label: 'متن و مقاله', icon: Bot },
  { id: 'ai-image', label: 'تولید تصویر', icon: ImageIcon },
  { id: 'ai-chatbot', label: 'چت‌بات', icon: MessageSquare },
] as const;

export function AiOverviewCards({
  items,
}: {
  items: { label: string; value: string; ok: boolean; icon: LucideIcon }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.label}
            href={`#${AI_SECTION_NAV.find((s) => s.label === item.label)?.id ?? 'ai'}`}
            className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition hover:border-accent/40 hover:shadow-soft"
          >
            <span
              className={cn(
                'grid h-10 w-10 shrink-0 place-items-center rounded-lg transition',
                item.ok ? 'bg-success/10 text-success' : 'bg-surface-soft text-text-muted group-hover:bg-accent-soft',
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.6} />
            </span>
            <div className="min-w-0">
              <p className="text-caption text-text-muted">{item.label}</p>
              <p className={cn('truncate text-small font-semibold', item.ok ? 'text-success' : 'text-text')}>
                {item.value}
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}

export function AiSettingsNav() {
  return (
    <nav
      aria-label="بخش‌های تنظیمات AI"
      className="sticky top-0 z-20 -mx-1 mb-8 overflow-x-auto rounded-xl border border-border bg-surface/95 px-2 py-2 backdrop-blur-md"
    >
      <ul className="flex min-w-max items-center gap-1">
        {AI_SECTION_NAV.map((section) => {
          const Icon = section.icon;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-small font-medium text-text-muted transition hover:bg-surface-soft hover:text-primary"
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AiSection({
  id,
  icon: Icon,
  iconTone = 'ai',
  title,
  subtitle,
  badge,
  sidebar,
  children,
}: {
  id: string;
  icon: LucideIcon;
  iconTone?: 'ai' | 'image' | 'chat' | 'consult';
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}) {
  const iconClass =
    iconTone === 'image'
      ? 'bg-gradient-to-br from-accent to-primary text-white'
      : iconTone === 'chat'
        ? 'bg-gradient-to-br from-primary to-primary-dark text-white'
        : iconTone === 'consult'
          ? 'bg-gradient-to-br from-accent to-success text-white'
          : 'bg-gradient-ai text-white';

  return (
    <section id={id} className="scroll-mt-28">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_252px]">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-gradient-to-l from-primary-soft/25 via-surface to-surface px-5 py-4 sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl shadow-soft', iconClass)}>
                <Icon className="h-5 w-5" strokeWidth={1.6} />
              </span>
              <div className="min-w-0">
                <h2 className="text-h3 font-bold text-primary-dark">{title}</h2>
                <p className="mt-0.5 text-caption leading-6 text-text-muted">{subtitle}</p>
              </div>
            </div>
            {badge}
          </div>
          <div className="p-5 sm:p-6">{children}</div>
        </div>

        {sidebar && <aside className="space-y-3 lg:sticky lg:top-16 lg:self-start">{sidebar}</aside>}
      </div>
    </section>
  );
}

export function AiSidebarCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-surface p-4', className)}>
      <p className="mb-2.5 text-small font-semibold text-primary-dark">{title}</p>
      {children}
    </div>
  );
}

export function AiFieldBlock({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-caption leading-5 text-text-muted">{hint}</p>}
    </div>
  );
}

export function AiToggleRow({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1 transition">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
      />
      <span>
        <span className="block text-small font-semibold text-text">{label}</span>
        {description && <span className="mt-0.5 block text-caption leading-5 text-text-muted">{description}</span>}
      </span>
    </label>
  );
}

export function AiStatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-caption font-medium',
        ok ? 'bg-success/10 text-success' : 'bg-surface-soft text-text-muted',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', ok ? 'bg-success' : 'bg-text-muted/50')} />
      {label}
    </span>
  );
}

export function AiActionBar({
  onTest,
  onSave,
  testLabel = 'تست اتصال',
  saveLabel = 'ذخیره',
  testStatus,
  saveStatus,
  testIcon: TestIcon = Zap,
  hint,
  saveMessage,
  testMessage,
  onShowDetails,
}: {
  onTest?: () => void;
  onSave: () => void;
  testLabel?: string;
  saveLabel?: string;
  testStatus?: 'idle' | 'loading' | 'ok' | 'error';
  saveStatus: 'idle' | 'loading' | 'saved' | 'error';
  testIcon?: LucideIcon;
  hint?: string;
  saveMessage?: string;
  testMessage?: string;
  onShowDetails?: () => void;
}) {
  const busy = saveStatus === 'loading' || testStatus === 'loading';

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-2">
        {onTest && (
          <button type="button" onClick={onTest} disabled={busy} className="btn btn-secondary px-4 py-2 text-small">
            {testStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestIcon className="h-4 w-4" />}
            {testLabel}
          </button>
        )}
        <button type="button" onClick={onSave} disabled={busy} className="btn btn-primary px-4 py-2 text-small">
          {saveStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saveStatus === 'saved' ? 'ذخیره شد' : saveLabel}
        </button>
      </div>
      {hint && <p className="mt-2.5 text-caption leading-5 text-text-muted">{hint}</p>}
      {saveMessage && (
        <p className={cn('mt-2 text-caption', saveStatus === 'error' ? 'text-error' : saveStatus === 'saved' ? 'text-success' : 'text-text-muted')}>
          {saveMessage}
        </p>
      )}
      {testMessage && (
        <p className={cn('mt-2 text-caption', testStatus === 'ok' ? 'text-success' : 'text-error')}>
          {testMessage}{' '}
          {testStatus === 'error' && onShowDetails && (
            <button type="button" onClick={onShowDetails} className="text-accent underline hover:text-primary">
              مشاهده جزئیات
            </button>
          )}
        </p>
      )}
    </div>
  );
}

export function AiSidebarHint({ children }: { children: React.ReactNode }) {
  return (
    <ul className="space-y-2 text-caption leading-6 text-text-muted">
      {children}
    </ul>
  );
}

export function AiSidebarHintItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
      <span>{children}</span>
    </li>
  );
}
