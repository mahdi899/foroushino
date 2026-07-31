'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, UploadCloud } from 'lucide-react';
import { Badge } from '../../ui';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import {
  pushTelegramHostSyncAction,
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
        showRegisterWebhook={false}
      />

      <AdminContentPanel
        title="همگام‌سازی با هاست خارج"
        action={
          <button
            type="button"
            disabled={pending}
            className="btn btn-primary text-small"
            onClick={() =>
              run(async () => {
                const res = await pushTelegramHostSyncAction({ scope: 'full', limit: 120 });
                return {
                  ok: res.ok,
                  error: res.error,
                  url: res.ok ? res.message : undefined,
                };
              })
            }
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            پوش دستی (bootstrap + catalog + اکانت‌ها)
          </button>
        }
      >
        <p className="text-small text-text-muted leading-relaxed">
          تنظیمات ربات (فعال/غیرفعال، فلگ‌ها، پیام‌ها) از ایران به هاست خارج پوش می‌شود.
          بعد از تغییر مهم یا عیب‌یابی ثبت‌نام، «پوش دستی» را بزنید.
        </p>
      </AdminContentPanel>

      <AdminContentPanel title="کارت‌به‌کارت تلگرام">
        <p className="text-small text-text-muted leading-relaxed">
          برای سمینار، دوره و کانال مرجع: کاربر فیش می‌فرستد، در گروه واریز دو ادمین تأیید می‌کنند، سپس سفارش تکمیل می‌شود.
          مهلت ارسال فیش ۱۵ دقیقه است؛ بعد از ارسال فیش تا تأیید ادمین ظرفیت رزرو می‌ماند (حداکثر ۳ روز).
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
                    <BotIranMobileRow bot={bot} onSaved={() => router.refresh()} />
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

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      className={bot.is_active ? 'btn btn-secondary text-caption px-3 py-1.5' : 'btn btn-primary text-caption px-3 py-1.5'}
                      onClick={() => run(() => updateTelegramBotAction(bot.id, { is_active: !bot.is_active }))}
                    >
                      {bot.is_active ? 'خاموش کردن برای کاربران' : 'روشن کردن برای کاربران'}
                    </button>
                    <span className="text-caption text-text-muted">
                      ادمین‌های بات (از{' '}
                      <Link href="/admin/telegram/users" className="text-primary underline-offset-2 hover:underline">
                        کاربران
                      </Link>
                      ) حتی وقتی ربات خاموش است می‌توانند تست و تنظیم کنند.
                    </span>
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

function BotIranMobileRow({ bot, onSaved }: { bot: TelegramBotView; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(Boolean(bot.iran_mobile_only ?? true));
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState('');

  useEffect(() => {
    setEnabled(Boolean(bot.iran_mobile_only ?? true));
  }, [bot.iran_mobile_only]);

  const dirty = enabled !== Boolean(bot.iran_mobile_only ?? true);

  const save = () => {
    startTransition(async () => {
      setStatus('');
      const res = await updateTelegramBotAction(bot.id, { iran_mobile_only: enabled });
      setStatus(res.ok ? 'ذخیره شد' : res.error ?? 'خطا');
      if (res.ok) onSaved();
    });
  };

  return (
    <div className="rounded-lg border border-border/70 bg-surface-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-small font-semibold text-text">تأیید فقط شماره‌های ایران</p>
          <p className="mt-1 text-caption text-text-muted">
            وقتی روشن است فقط موبایل ایران (09…) در ثبت‌نام بات پذیرفته می‌شود.
          </p>
        </div>
        <label className="flex items-center gap-2 text-caption text-text">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          فعال
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
          ذخیره محدودیت موبایل
        </button>
        {status ? <span className="text-caption text-text-muted">{status}</span> : null}
      </div>
    </div>
  );
}

function BotCardToCardRow({ bot, onSaved }: { bot: TelegramBotView; onSaved: () => void }) {
  const cfg = bot.card_to_card ?? {};
  const [enabled, setEnabled] = useState(Boolean(bot.card_to_card_enabled));
  const [overrideText, setOverrideText] = useState(cfg.override_text ?? '');
  const [cardNumber, setCardNumber] = useState(cfg.card_number ?? '');
  const [cardHolder, setCardHolder] = useState(cfg.card_holder ?? '');
  const [bankName, setBankName] = useState(cfg.bank_name ?? '');
  const [notes, setNotes] = useState(cfg.notes ?? '');
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState('');

  const draftHasDetails = Boolean(
    overrideText.trim() || cardNumber.trim() || cardHolder.trim() || bankName.trim(),
  );
  const savedHasDetails = Boolean(bot.card_to_card_has_details);
  const savedReady = Boolean(bot.card_to_card_ready);

  useEffect(() => {
    const next = bot.card_to_card ?? {};
    setEnabled(Boolean(bot.card_to_card_enabled));
    setOverrideText(next.override_text ?? '');
    setCardNumber(next.card_number ?? '');
    setCardHolder(next.card_holder ?? '');
    setBankName(next.bank_name ?? '');
    setNotes(next.notes ?? '');
  }, [bot.card_to_card_enabled, bot.card_to_card, bot.card_to_card_has_details, bot.card_to_card_ready]);

  const dirty =
    enabled !== Boolean(bot.card_to_card_enabled) ||
    overrideText.trim() !== (cfg.override_text ?? '') ||
    cardNumber.trim() !== (cfg.card_number ?? '') ||
    cardHolder.trim() !== (cfg.card_holder ?? '') ||
    bankName.trim() !== (cfg.bank_name ?? '') ||
    notes.trim() !== (cfg.notes ?? '');

  const hasOverride = Boolean((cfg.override_text ?? '').trim());
  const hasStructured = Boolean(
    (cfg.card_number ?? '').trim() || (cfg.card_holder ?? '').trim() || (cfg.bank_name ?? '').trim(),
  );

  const save = () => {
    if (enabled && !draftHasDetails) {
      setStatus('برای فعال‌کردن کارت‌به‌کارت، متن راهنما یا شماره کارت را وارد کنید.');
      return;
    }

    startTransition(async () => {
      setStatus('');
      const res = await updateTelegramBotAction(bot.id, {
        card_to_card_enabled: enabled,
        card_to_card: {
          card_number: cardNumber.trim() || null,
          card_holder: cardHolder.trim() || null,
          bank_name: bankName.trim() || null,
          notes: notes.trim() || null,
          override_text: overrideText.trim() || null,
        },
      });
      setStatus(res.ok ? 'ذخیره شد. اگر ربات روی هاست خارج است، «پوش دستی» را هم بزنید.' : res.error ?? 'خطا');
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
      {enabled && !savedHasDetails && !draftHasDetails ? (
        <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-caption text-amber-800 dark:text-amber-300">
          فلگ روشن است ولی اطلاعات کارت ثبت نشده — به همین دلیل دکمه «کارت به کارت» در ربات دیده نمی‌شود.
          متن راهنما یا شماره کارت را پر کنید و «ذخیره کارت‌به‌کارت» را بزنید.
        </p>
      ) : null}
      {enabled && savedHasDetails && !savedReady ? (
        <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-caption text-amber-800 dark:text-amber-300">
          اطلاعات کارت ذخیره شده؛ برای نمایش در ربات، تیک فعال‌سازی را روشن و دوباره ذخیره کنید.
        </p>
      ) : null}
      {savedReady ? (
        <p className="mb-3 text-caption text-emerald-700 dark:text-emerald-400">
          آماده نمایش در ربات است. بعد از هر تغییر، «پوش دستی به هاست خارج» را در بالای همین صفحه بزنید.
        </p>
      ) : null}
      {!bot.payment_reports_chat_id ? (
        <p className="mb-3 text-caption text-amber-700 dark:text-amber-400">
          گروه گزارشات پرداخت هنوز تنظیم نشده — بدون آن فیش‌ها به ادمین نمی‌رسد.
        </p>
      ) : null}
      {hasOverride && !hasStructured ? (
        <p className="mb-3 text-caption text-primary">
          متن کارت‌به‌کارت از پنل ادمین ربات (تلگرام) ثبت شده — در باکس زیر قابل ویرایش است.
        </p>
      ) : null}
      <div className="grid gap-3">
        <label className="block">
          <span className="text-caption text-text-muted">
            متن راهنمای کارت‌به‌کارت (همان «متن کارت به کارت» در پنل ربات)
          </span>
          <textarea
            className="field-input mt-1 min-h-28 w-full"
            value={overrideText}
            onChange={(e) => setOverrideText(e.target.value)}
            maxLength={1000}
            placeholder="شماره کارت، نام صاحب حساب، بانک و توضیحات — اگر پر باشد همین متن به کاربر نشان داده می‌شود."
          />
          <span className="mt-1 block text-caption text-text-muted">
            اگر این باکس پر باشد، به‌جای فیلدهای جدا پایین به کاربر نمایش داده می‌شود.
          </span>
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-caption text-text-muted">شماره کارت (فیلد جدا — اختیاری)</span>
            <input
              className="field-input mt-1 w-full"
              dir="ltr"
              placeholder="6037991234567890"
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
