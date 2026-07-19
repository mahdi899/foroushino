'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '../../ui';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import {
  removeTelegramBotProfilePhotoAction,
  updateTelegramBotProfileAction,
  updateTelegramBotProfilePhotoAction,
} from '../actions';
import type { TelegramBotProfileView, TelegramBotView } from '@/lib/admin/telegram.types';

export function TelegramBotProfileClient({
  bots,
  profiles: initialProfiles,
}: {
  bots: TelegramBotView[];
  profiles: Record<number, TelegramBotProfileView>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);
  const [drafts, setDrafts] = useState<Record<number, TelegramBotProfileView>>(initialProfiles);
  const [previews, setPreviews] = useState<Record<number, string | null>>({});
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    setDrafts(initialProfiles);
  }, [initialProfiles]);

  const botsSorted = [...bots].sort((a, b) => Number(b.token_present) - Number(a.token_present));

  const save = (botId: number) => {
    const bot = botsSorted.find((item) => item.id === botId);
    if (bot && !bot.token_present) {
      setMsg({
        text: `توکن ربات ${bot.key} تنظیم نشده. از تنظیمات ربات → بخش «توکن ربات»، توکن BotFather را وارد و ذخیره کنید.`,
        tone: 'error',
      });
      return;
    }
    const draft = drafts[botId];
    if (!draft) return;
    startTransition(async () => {
      const res = await updateTelegramBotProfileAction(botId, {
        name: draft.name ?? undefined,
        description: draft.description ?? undefined,
        short_description: draft.short_description ?? undefined,
      });
      setMsg(res.ok ? { text: 'پروفایل بات در تلگرام ذخیره شد.', tone: 'success' } : { text: res.error ?? 'خطا', tone: 'error' });
      if (res.ok) router.refresh();
    });
  };

  const uploadPhoto = (botId: number, file: File | null) => {
    if (!file) return;
    const bot = botsSorted.find((item) => item.id === botId);
    if (bot && !bot.token_present) {
      setMsg({
        text: `توکن ربات ${bot.key} تنظیم نشده. از تنظیمات ربات → بخش «توکن ربات»، توکن BotFather را وارد و ذخیره کنید.`,
        tone: 'error',
      });
      return;
    }
    const body = new FormData();
    body.append('photo', file);
    setPreviews((prev) => ({ ...prev, [botId]: URL.createObjectURL(file) }));
    startTransition(async () => {
      const res = await updateTelegramBotProfilePhotoAction(botId, body);
      if (res.ok) {
        setMsg({ text: 'عکس پروفایل بات در تلگرام به‌روز شد.', tone: 'success' });
        setPreviews((prev) => ({ ...prev, [botId]: null }));
        router.refresh();
      } else {
        setMsg({ text: res.error ?? 'آپلود عکس ناموفق بود.', tone: 'error' });
        setPreviews((prev) => ({ ...prev, [botId]: null }));
      }
    });
  };

  const removePhoto = (botId: number) => {
    startTransition(async () => {
      const res = await removeTelegramBotProfilePhotoAction(botId);
      setMsg(res.ok ? { text: 'عکس پروفایل بات حذف شد.', tone: 'success' } : { text: res.error ?? 'خطا', tone: 'error' });
      if (res.ok) {
        setPreviews((prev) => ({ ...prev, [botId]: null }));
        router.refresh();
      }
    });
  };

  if (bots.length === 0) {
    return (
      <AdminContentPanel title="پروفایل بات">
        <p className="py-6 text-center text-small text-text-muted">ابتدا از تنظیمات ربات، ربات را همگام‌سازی کنید.</p>
      </AdminContentPanel>
    );
  }

  return (
    <div className="admin-telegram-subpage__stack">
      <AdminContentPanel title="ویرایش پروفایل ربات تلگرام">
        <p className="mb-4 text-small text-text-muted leading-relaxed">
          نام، توضیح کوتاه و توضیحات با دکمه ذخیره اعمال می‌شوند. عکس پروفایل بلافاصله بعد از انتخاب فایل آپلود می‌شود (جدا از دکمه ذخیره متن).
        </p>
        {msg ? (
          <p className={`mb-3 text-small ${msg.tone === 'error' ? 'text-error' : 'text-text-muted'}`}>{msg.text}</p>
        ) : null}

        <div className="space-y-4">
          {botsSorted.map((bot) => {
            const canEdit = bot.token_present;
            const draft = drafts[bot.id] ?? {
              name: bot.display_name,
              description: null,
              short_description: null,
              username: bot.username,
              has_profile_photo: false,
              profile_photo_data_url: null,
            };
            const photoSrc = previews[bot.id] || draft.profile_photo_data_url || null;

            return (
              <div key={bot.id} className={`rounded-xl border p-4 ${canEdit ? 'border-border' : 'border-warning/40 bg-warning/5'}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-text">{bot.display_name}</p>
                    <p className="text-caption text-text-muted" dir="ltr">
                      {bot.key} · @{bot.username ?? '—'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={bot.token_present ? 'accent' : 'danger'}>
                      {bot.token_present ? 'توکن' : 'بدون توکن'}
                    </Badge>
                    <Badge tone={bot.is_active ? 'success' : 'default'}>{bot.is_active ? 'فعال' : 'غیرفعال'}</Badge>
                  </div>
                </div>

                {!canEdit ? (
                  <p className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-small text-text-muted leading-relaxed">
                    توکن این ربات هنوز در پنل ذخیره نشده. به{' '}
                    <strong className="text-text">تنظیمات ربات</strong> بروید، در بخش «توکن ربات» مقدار BotFather را وارد کنید و «ذخیره توکن» را بزنید.
                    نیازی به قرار دادن توکن در فایل <code dir="ltr" className="text-caption">.env</code> نیست.
                  </p>
                ) : null}

                <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-border/70 bg-surface-muted/30 p-3">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface">
                    {photoSrc ? (
                      <img src={photoSrc} alt={`عکس پروفایل ${bot.display_name}`} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-caption text-text-muted">بدون عکس</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-small font-semibold text-text">عکس پروفایل</p>
                    <p className="text-caption text-text-muted">
                      JPG، PNG یا WebP تا ۵ مگابایت. تصویر به مربع ۶۴۰×۶۴۰ تبدیل و سپس به تلگرام ارسال می‌شود.
                    </p>
                    <input
                      ref={(el) => {
                        fileRefs.current[bot.id] = el;
                      }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      disabled={!canEdit || pending}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        e.target.value = '';
                        uploadPhoto(bot.id, file);
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pending || !canEdit}
                        className="btn btn-secondary text-caption px-3 py-1.5"
                        onClick={() => fileRefs.current[bot.id]?.click()}
                      >
                        انتخاب / تعویض عکس
                      </button>
                      {draft.has_profile_photo || photoSrc ? (
                        <button
                          type="button"
                          disabled={pending || !canEdit}
                          className="btn btn-secondary text-caption px-3 py-1.5"
                          onClick={() => removePhoto(bot.id)}
                        >
                          حذف عکس
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  <label className="block">
                    <span className="text-caption text-text-muted">نام نمایشی بات</span>
                    <input
                      className="field-input mt-1 w-full"
                      value={draft.name ?? ''}
                      maxLength={64}
                      disabled={!canEdit}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [bot.id]: { ...draft, name: e.target.value } }))}
                    />
                  </label>
                  <label className="block">
                    <span className="text-caption text-text-muted">توضیح کوتاه (زیر نام)</span>
                    <input
                      className="field-input mt-1 w-full"
                      value={draft.short_description ?? ''}
                      maxLength={120}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [bot.id]: { ...draft, short_description: e.target.value } }))
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="text-caption text-text-muted">توضیحات کامل پروفایل</span>
                    <textarea
                      className="field-input mt-1 min-h-28 w-full"
                      value={draft.description ?? ''}
                      maxLength={512}
                      disabled={!canEdit}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [bot.id]: { ...draft, description: e.target.value } }))}
                    />
                  </label>
                </div>

                <button type="button" disabled={pending || !canEdit} className="btn btn-primary mt-4" onClick={() => save(bot.id)}>
                  ذخیره متن پروفایل در تلگرام
                </button>
              </div>
            );
          })}
        </div>
      </AdminContentPanel>
    </div>
  );
}
