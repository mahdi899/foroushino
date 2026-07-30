'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { Badge } from '../../ui';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import {
  syncTelegramBotsAction,
  updateTelegramBotAction,
  updateTelegramBotProfileAction,
} from '../actions';
import type { TelegramBotProfileView, TelegramBotView, TelegramInfrastructureView } from '@/lib/admin/telegram.types';
import { TelegramBridgeSettingsSection } from './TelegramBridgeSettingsSection';

export function TelegramSettingsClient({
  bots,
  profiles: initialProfiles,
  infrastructure,
  infrastructureError,
  workerSample,
}: {
  bots: TelegramBotView[];
  profiles: Record<number, TelegramBotProfileView>;
  infrastructure: TelegramInfrastructureView | null;
  infrastructureError?: string | null;
  workerSample: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, TelegramBotProfileView>>(initialProfiles);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; url?: string }>) => {
    startTransition(async () => {
      const res = await fn();
      setMsg(res.ok ? (res.url ? `وب‌هوک: ${res.url}` : 'انجام شد.') : res.error ?? 'خطا');
      if (res.ok) router.refresh();
    });
  };

  const saveProfile = (botId: number) => {
    const draft = drafts[botId];
    if (!draft) return;
    run(() =>
      updateTelegramBotProfileAction(botId, {
        name: draft.name ?? undefined,
        description: draft.description ?? undefined,
        short_description: draft.short_description ?? undefined,
      }),
    );
  };

  return (
    <div className="admin-telegram-subpage__stack">
      <TelegramBridgeSettingsSection
        initial={infrastructure}
        workerSample={workerSample}
        loadError={infrastructureError}
      />

      <AdminContentPanel title="پرداخت زرین‌پال (مشترک با سایت)">
        <p className="text-small text-text-muted leading-relaxed">
          مرچنت‌کد و حالت sandbox/live برای خرید داخل بات همان تنظیمات تجارت است. سفارش‌های بات مثل خرید سایت در پنل تجارت ثبت می‌شوند.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/admin/commerce/payment-settings" className="btn btn-primary text-small">
            تنظیمات پرداخت
          </Link>
          <Link href="/admin/commerce/products" className="btn btn-secondary text-small">
            محصولات تلگرام
          </Link>
        </div>
      </AdminContentPanel>

      <AdminContentPanel title="کارت‌به‌کارت تلگرام">
        <p className="text-small text-text-muted leading-relaxed">
          برای سمینار، دوره و کانال مرجع: کاربر فیش می‌فرستد، در گروه واریز دو ادمین تأیید می‌کنند، سپس سفارش تکمیل می‌شود. مهلت ارسال فیش ۱۰ دقیقه است.
          تنظیمات هر ربات را در کارت همان ربات پایین صفحه ویرایش کنید.
        </p>
      </AdminContentPanel>

      <AdminContentPanel
        title="ربات‌های ثبت‌شده"
        action={
          <button type="button" disabled={pending} className="btn btn-secondary text-small" onClick={() => run(syncTelegramBotsAction)}>
            همگام‌سازی ربات‌ها
          </button>
        }
      >
        {bots.length === 0 ? (
          <p className="py-6 text-center text-small text-text-muted">رباتی ثبت نشده. «همگام‌سازی ربات‌ها» را بزنید، سپس توکن BotFather را در همین صفحه ذخیره کنید.</p>
        ) : (
          <div className="space-y-4">
            {bots.map((bot) => {
              const draft = drafts[bot.id] ?? {
                name: bot.display_name,
                description: null,
                short_description: null,
                username: bot.username,
              };
              return (
                <div key={bot.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-text">{bot.display_name}</p>
                      <p className="text-caption text-text-muted" dir="ltr">{bot.key} · @{bot.username ?? '—'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={bot.is_active ? 'success' : 'default'}>{bot.is_active ? 'فعال' : 'غیرفعال'}</Badge>
                      <Badge tone={bot.token_present ? 'accent' : 'danger'}>{bot.token_present ? 'توکن' : 'بدون توکن'}</Badge>
                      <Badge tone={bot.api_reachable ? 'success' : 'warning'}>{bot.api_reachable ? 'API' : 'API قطع'}</Badge>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-border pt-3">
                    <BotTokenRow bot={bot} onSaved={() => router.refresh()} />
                  </div>

                  <div className="mt-3">
                    <BotChatIdsRow bot={bot} onSaved={() => router.refresh()} />
                  </div>

                  <div className="mt-3">
                    <BotCardToCardRow bot={bot} onSaved={() => router.refresh()} />
                  </div>

                  <div className="mt-4 rounded-lg border border-border/70 bg-surface-muted/30 p-3">
                    <p className="mb-3 text-small font-semibold text-text">پروفایل بات در تلگرام</p>
                    <p className="mb-3 text-caption text-text-muted">
                      برای تعویض عکس پروفایل از صفحه اختصاصی استفاده کنید:{' '}
                      <Link href="/admin/telegram/bot-profile" className="text-primary underline-offset-2 hover:underline">
                        پروفایل بات
                      </Link>
                    </p>
                    <div className="grid gap-3">
                      <label className="block">
                        <span className="text-caption text-text-muted">نام نمایشی</span>
                        <input
                          className="field-input mt-1 w-full"
                          value={draft.name ?? ''}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [bot.id]: { ...draft, name: e.target.value } }))}
                          maxLength={64}
                        />
                      </label>
                      <label className="block">
                        <span className="text-caption text-text-muted">توضیح کوتاه (زیر نام در پروفایل)</span>
                        <input
                          className="field-input mt-1 w-full"
                          value={draft.short_description ?? ''}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [bot.id]: { ...draft, short_description: e.target.value } }))}
                          maxLength={120}
                        />
                      </label>
                      <label className="block">
                        <span className="text-caption text-text-muted">توضیحات کامل</span>
                        <textarea
                          className="field-input mt-1 min-h-24 w-full"
                          value={draft.description ?? ''}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [bot.id]: { ...draft, description: e.target.value } }))}
                          maxLength={512}
                        />
                      </label>
                    </div>
                    <button type="button" disabled={pending} className="btn btn-primary mt-3 text-caption px-3 py-1.5" onClick={() => saveProfile(bot.id)}>
                      ذخیره پروفایل تلگرام
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      className="btn btn-secondary text-caption px-3 py-1.5"
                      onClick={() => run(() => updateTelegramBotAction(bot.id, { is_active: !bot.is_active }))}
                    >
                      {bot.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {msg ? <p className="mt-4 text-small text-text-muted">{msg}</p> : null}
      </AdminContentPanel>
    </div>
  );
}

function BotTokenRow({ bot, onSaved }: { bot: TelegramBotView; onSaved: () => void }) {
  const [token, setToken] = useState('');
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState('');

  const save = () => {
    startTransition(async () => {
      setStatus('');
      const res = await updateTelegramBotAction(bot.id, { bot_token_input: token.trim() || undefined });
      setStatus(res.ok ? 'ذخیره شد' : res.error ?? 'خطا');
      if (res.ok) {
        setToken('');
        onSaved();
      }
    });
  };

  return (
    <div>
      <p className="text-caption text-text-muted">توکن ربات (رمزنگاری‌شده در دیتابیس — نیازی به .env نیست)</p>
      <div className="mt-1 flex flex-wrap gap-2">
        <input
          className="field-input min-w-[200px] flex-1 text-small"
          dir="ltr"
          type="password"
          autoComplete="new-password"
          placeholder={bot.token_present ? `ذخیره‌شده: ${bot.bot_token_preview ?? '••••'}` : 'از BotFather'}
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button type="button" disabled={pending || !token.trim()} onClick={() => void save()} className="btn btn-secondary px-2 py-1 admin-text-meta">
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          ذخیره توکن
        </button>
        {status ? <span className="self-center text-caption text-text-muted">{status}</span> : null}
      </div>
    </div>
  );
}

function BotChatIdsRow({ bot, onSaved }: { bot: TelegramBotView; onSaved: () => void }) {
  const [supportChatId, setSupportChatId] = useState(bot.support_group_chat_id ?? '');
  const [paymentReportsChatId, setPaymentReportsChatId] = useState(bot.payment_reports_chat_id ?? '');
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState('');

  useEffect(() => {
    setSupportChatId(bot.support_group_chat_id ?? '');
    setPaymentReportsChatId(bot.payment_reports_chat_id ?? '');
  }, [bot.support_group_chat_id, bot.payment_reports_chat_id]);

  const dirty =
    supportChatId.trim() !== (bot.support_group_chat_id ?? '') ||
    paymentReportsChatId.trim() !== (bot.payment_reports_chat_id ?? '');

  const save = () => {
    startTransition(async () => {
      setStatus('');
      const support = supportChatId.trim();
      const payment = paymentReportsChatId.trim();
      const res = await updateTelegramBotAction(bot.id, {
        support_group_chat_id: support || null,
        reports_chat_id: support || null,
        payment_reports_chat_id: payment || null,
      });
      setStatus(res.ok ? 'ذخیره شد' : res.error ?? 'خطا');
      if (res.ok) onSaved();
    });
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="block">
        <span className="text-caption text-text-muted">گروه گزارشات پشتیبانی (chat id)</span>
        <input
          className="field-input mt-1 w-full"
          dir="ltr"
          placeholder="-100xxxxxxxxxx"
          value={supportChatId}
          onChange={(e) => setSupportChatId(e.target.value)}
        />
        <span className="mt-1 block text-caption text-text-muted">
          پیام‌های پشتیبانی کاربران فقط در این گروه می‌آید.
        </span>
      </label>
      <label className="block">
        <span className="text-caption text-text-muted">گروه/کانال گزارشات پرداخت (chat id)</span>
        <input
          className="field-input mt-1 w-full"
          dir="ltr"
          placeholder="-100xxxxxxxxxx"
          value={paymentReportsChatId}
          onChange={(e) => setPaymentReportsChatId(e.target.value)}
        />
        <span className="mt-1 block text-caption text-text-muted">
          رسید کارت‌به‌کارت، تأیید/رد، و خریدهای موفق (سایت + ربات) فقط اینجا می‌آید.
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-2 md:col-span-2">
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={() => void save()}
          className="btn btn-primary px-3 py-1.5 text-caption"
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          ذخیره گروه‌های گزارش
        </button>
        {status ? <span className="text-caption text-text-muted">{status}</span> : null}
      </div>
    </div>
  );
}

function BotCardToCardRow({ bot, onSaved }: { bot: TelegramBotView; onSaved: () => void }) {
  const cfg = bot.card_to_card ?? {};
  const [enabled, setEnabled] = useState(Boolean(bot.card_to_card_enabled));
  const [cardNumber, setCardNumber] = useState(cfg.card_number ?? '');
  const [cardHolder, setCardHolder] = useState(cfg.card_holder ?? '');
  const [bankName, setBankName] = useState(cfg.bank_name ?? '');
  const [notes, setNotes] = useState(cfg.notes ?? '');
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState('');

  useEffect(() => {
    const next = bot.card_to_card ?? {};
    setEnabled(Boolean(bot.card_to_card_enabled));
    setCardNumber(next.card_number ?? '');
    setCardHolder(next.card_holder ?? '');
    setBankName(next.bank_name ?? '');
    setNotes(next.notes ?? '');
  }, [bot.card_to_card_enabled, bot.card_to_card]);

  const dirty =
    enabled !== Boolean(bot.card_to_card_enabled) ||
    cardNumber.trim() !== (cfg.card_number ?? '') ||
    cardHolder.trim() !== (cfg.card_holder ?? '') ||
    bankName.trim() !== (cfg.bank_name ?? '') ||
    notes.trim() !== (cfg.notes ?? '');

  const save = () => {
    startTransition(async () => {
      setStatus('');
      const res = await updateTelegramBotAction(bot.id, {
        card_to_card_enabled: enabled,
        card_to_card: {
          card_number: cardNumber.trim() || null,
          card_holder: cardHolder.trim() || null,
          bank_name: bankName.trim() || null,
          notes: notes.trim() || null,
        },
      });
      setStatus(res.ok ? 'ذخیره شد' : res.error ?? 'خطا');
      if (res.ok) onSaved();
    });
  };

  return (
    <div className="rounded-lg border border-border/70 bg-surface-muted/20 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-small font-semibold text-text">کارت‌به‌کارت</p>
        <label className="flex items-center gap-2 text-caption text-text">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          فعال برای خرید بات (سمینار / دوره / کانال مرجع)
        </label>
      </div>
      {!bot.payment_reports_chat_id ? (
        <p className="mb-3 text-caption text-amber-700 dark:text-amber-400">
          گروه گزارشات پرداخت هنوز تنظیم نشده — بدون آن فیش‌ها به ادمین نمی‌رسد.
        </p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-caption text-text-muted">شماره کارت</span>
          <input
            className="field-input mt-1 w-full"
            dir="ltr"
            placeholder="6037-...."
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            maxLength={64}
          />
        </label>
        <label className="block">
          <span className="text-caption text-text-muted">نام صاحب کارت</span>
          <input
            className="field-input mt-1 w-full"
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value)}
            maxLength={64}
          />
        </label>
        <label className="block">
          <span className="text-caption text-text-muted">نام بانک (اختیاری)</span>
          <input
            className="field-input mt-1 w-full"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            maxLength={64}
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-caption text-text-muted">توضیحات اضافه / شبا / نکات (اختیاری)</span>
          <textarea
            className="field-input mt-1 min-h-20 w-full"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={() => void save()}
          className="btn btn-primary px-3 py-1.5 text-caption"
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          ذخیره کارت‌به‌کارت
        </button>
        {status ? <span className="text-caption text-text-muted">{status}</span> : null}
      </div>
    </div>
  );
}
