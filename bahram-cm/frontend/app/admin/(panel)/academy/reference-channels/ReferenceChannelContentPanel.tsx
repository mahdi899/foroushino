'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { CoverImageField } from '@/app/admin/(panel)/content/CoverImageField';
import { updateReferenceChannel } from '../actions';
import {
  resetTelegramBotMessageAction,
  saveTelegramBotMessageAction,
} from '@/app/admin/(panel)/telegram/actions';
import type { AdminReferenceChannelDetail } from '@/lib/admin/academyTypes';
import type { TelegramBotMessageView } from '@/lib/admin/telegram.types';

const BOT_MESSAGE_KEYS = [
  'reference_channel_description',
  'reference_channel_buy_btn',
  'reference_channel_need_identity',
  'reference_channel_after_payment',
] as const;

type BotKey = (typeof BOT_MESSAGE_KEYS)[number];

function pickMessages(items: TelegramBotMessageView[]): {
  bodies: Partial<Record<BotKey, string>>;
  meta: Partial<Record<BotKey, TelegramBotMessageView>>;
} {
  const bodies: Partial<Record<BotKey, string>> = {};
  const meta: Partial<Record<BotKey, TelegramBotMessageView>> = {};
  for (const key of BOT_MESSAGE_KEYS) {
    const row = items.find((i) => i.key === key);
    if (row) {
      bodies[key] = row.body;
      meta[key] = row;
    }
  }
  return { bodies, meta };
}

/**
 * بنر + متن‌های اصلی کانال مرجع برای نمایش در ربات / سایت.
 * پیام‌های ربات از Server Component پاس داده می‌شوند (نه import از lib/admin/telegram).
 */
export function ReferenceChannelContentPanel({
  channel,
  initialMessages,
}: {
  channel: AdminReferenceChannelDetail;
  initialMessages: TelegramBotMessageView[];
}) {
  const router = useRouter();
  const initial = useMemo(() => pickMessages(initialMessages), [initialMessages]);
  const [coverImage, setCoverImage] = useState(channel.cover_image ?? '');
  const [description, setDescription] = useState(channel.description ?? '');
  const [botBodies, setBotBodies] = useState(initial.bodies);
  const [botMeta, setBotMeta] = useState(initial.meta);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setCoverImage(channel.cover_image ?? '');
    setDescription(channel.description ?? '');
  }, [channel.cover_image, channel.description]);

  useEffect(() => {
    setBotBodies(initial.bodies);
    setBotMeta(initial.meta);
  }, [initial]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    setMessage('');

    const channelRes = await updateReferenceChannel(channel.id, {
      description: description || null,
      cover_image: coverImage || null,
    });
    if (!channelRes.ok) {
      setPending(false);
      setError(channelRes.error ?? 'ذخیره کانال ناموفق بود.');
      return;
    }

    for (const key of BOT_MESSAGE_KEYS) {
      const body = botBodies[key];
      if (body === undefined) continue;
      const res = await saveTelegramBotMessageAction(key, body, 'production');
      if (!res.ok) {
        setPending(false);
        setError(res.error ?? `ذخیره «${key}» ناموفق بود.`);
        return;
      }
    }

    setPending(false);
    setMessage('بنر و متن‌ها ذخیره شد و برای ربات همگام می‌شود.');
    router.refresh();
  }

  async function resetBotKey(key: BotKey) {
    setPending(true);
    setError('');
    const res = await resetTelegramBotMessageAction(key, 'production');
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? 'بازگردانی ناموفق بود.');
      return;
    }
    setMessage('به متن پیش‌فرض برگشت.');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6">
      <div>
        <h2 className="text-h3 text-primary-dark">برگه نمایش — بنر و متن‌ها</h2>
        <p className="mt-1 text-small text-text-muted">
          عکس کاور و متن‌هایی که در منوی «کانال مرجع» ربات (و صفحه فروش) دیده می‌شود.
          بعد از ذخیره، به هاست ربات همگام می‌شود.
        </p>
      </div>

      <CoverImageField
        label="بنر / کاور ربات"
        value={coverImage}
        onChange={setCoverImage}
        alt={`${channel.title} — کاور`}
      />

      <label>
        <span className="field-label">توضیح کوتاه محصول</span>
        <textarea
          className="field-input min-h-24"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="اگر متن اختصاصی ربات خالی باشد، از این توضیح استفاده می‌شود."
        />
      </label>

      <div className="space-y-4 border-t border-border/70 pt-5">
        <h3 className="text-sm font-semibold text-text">متن‌های ربات تلگرام</h3>
        {BOT_MESSAGE_KEYS.map((key) => {
          const meta = botMeta[key];
          return (
            <label key={key} className="block">
              <span className="field-label flex items-center justify-between gap-2">
                <span>{meta?.label ?? key}</span>
                {meta?.is_custom ? (
                  <button
                    type="button"
                    className="text-caption text-primary hover:underline"
                    disabled={pending}
                    onClick={() => void resetBotKey(key)}
                  >
                    بازگشت به پیش‌فرض
                  </button>
                ) : null}
              </span>
              <textarea
                className="field-input min-h-28"
                value={botBodies[key] ?? ''}
                onChange={(e) => setBotBodies((prev) => ({ ...prev, [key]: e.target.value }))}
              />
              <span className="mt-1 block text-caption text-text-muted">کلید: {key}</span>
            </label>
          );
        })}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
        ذخیره برگه نمایش
      </button>
    </form>
  );
}
