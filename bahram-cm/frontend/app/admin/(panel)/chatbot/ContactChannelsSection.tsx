'use client';

import type { ChatbotContactChannelKey, ChatbotContacts } from '@/lib/chatbot/types';

const CHANNELS: Array<{
  key: ChatbotContactChannelKey;
  title: string;
  idHint: string;
  labelHint: string;
  idPlaceholder: string;
  labelPlaceholder: string;
}> = [
  {
    key: 'whatsapp',
    title: 'واتساپ',
    idHint: 'شماره بین‌المللی بدون + برای wa.me (مثال: 98912…)',
    labelHint: 'متن نمایشی زیر عنوان',
    idPlaceholder: '989120000000',
    labelPlaceholder: '۰۹۱۲…',
  },
  {
    key: 'telegram',
    title: 'تلگرام',
    idHint: 'آیدی بدون @ یا لینک کامل',
    labelHint: 'متن نمایشی (مثلاً @rostami_cm)',
    idPlaceholder: 'rostami_cm',
    labelPlaceholder: '@rostami_cm',
  },
  {
    key: 'rubika',
    title: 'روبیکا',
    idHint: 'آیدی یا لینک کامل',
    labelHint: 'متن نمایشی',
    idPlaceholder: 'live_rostami',
    labelPlaceholder: '@live_rostami',
  },
  {
    key: 'instagram',
    title: 'اینستاگرام',
    idHint: 'یوزرنیم بدون @ یا لینک کامل',
    labelHint: 'متن نمایشی',
    idPlaceholder: 'live_rostami',
    labelPlaceholder: '@live_rostami',
  },
  {
    key: 'phone',
    title: 'تماس تلفنی',
    idHint: 'شماره برای tel: (مثال: +9821…)',
    labelHint: 'شماره نمایشی فارسی',
    idPlaceholder: '+982100000000',
    labelPlaceholder: '۰۲۱-…',
  },
];

interface ContactChannelsSectionProps {
  contacts: ChatbotContacts;
  onChange: (contacts: ChatbotContacts) => void;
}

export function ContactChannelsSection({ contacts, onChange }: ContactChannelsSectionProps) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-h3 text-primary-dark">راه‌های تماس سایت</h2>
        <p className="mt-1 text-caption text-text-muted">
          آیدی/لینک اینستاگرام، تلگرام و روبیکا اینجا تنظیم می‌شود و در فوتر، صفحه تماس، و تب تماس
          چت‌بات استفاده می‌شود. واتساپ و تلفن هم برای ویجت چت‌بات است.
        </p>
      </div>

      <div className="grid gap-3">
        {CHANNELS.map((channel) => {
          const row = contacts[channel.key];
          return (
            <div key={channel.key} className="rounded-lg border border-border p-4">
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span className="text-small font-medium text-primary-dark">{channel.title}</span>
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) =>
                    onChange({
                      ...contacts,
                      [channel.key]: { ...row, enabled: e.target.checked },
                    })
                  }
                  className="h-5 w-5 accent-accent"
                />
              </label>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="field-label">آیدی / لینک</label>
                  <input
                    className="field-input mt-1"
                    dir="ltr"
                    value={row.id}
                    placeholder={channel.idPlaceholder}
                    disabled={!row.enabled}
                    onChange={(e) =>
                      onChange({
                        ...contacts,
                        [channel.key]: { ...row, id: e.target.value },
                      })
                    }
                  />
                  <p className="mt-1 text-caption text-text-muted">{channel.idHint}</p>
                </div>
                <div>
                  <label className="field-label">برچسب نمایشی</label>
                  <input
                    className="field-input mt-1"
                    value={row.label}
                    placeholder={channel.labelPlaceholder}
                    disabled={!row.enabled}
                    onChange={(e) =>
                      onChange({
                        ...contacts,
                        [channel.key]: { ...row, label: e.target.value },
                      })
                    }
                  />
                  <p className="mt-1 text-caption text-text-muted">{channel.labelHint}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
