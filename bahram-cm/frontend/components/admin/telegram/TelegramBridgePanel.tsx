'use client';

import { Copy, Loader2, Save, Webhook } from 'lucide-react';
import type { TelegramInfrastructureView } from '@/lib/admin/telegram.types';
import { useTelegramBridgeDraft } from './useTelegramBridgeDraft';

function CodeFileBlock({
  title,
  filename,
  source,
  hint,
}: {
  title: string;
  filename: string;
  source: string;
  hint: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-muted/20">
      <div className="flex items-center justify-between gap-2 border-b border-border px-2.5 py-2">
        <p className="text-caption font-medium text-text">
          {title} — <span dir="ltr" className="font-mono text-[11px]">{filename}</span>
        </p>
        <button
          type="button"
          className="btn btn-secondary px-2 py-1 text-caption"
          onClick={() => void navigator.clipboard.writeText(source)}
        >
          <Copy className="h-3 w-3" />
          کپی
        </button>
      </div>
      <pre className="max-h-80 overflow-auto p-2.5 font-mono text-[10px] leading-relaxed text-text" dir="ltr">
        <code>{source}</code>
      </pre>
      <p className="border-t border-border px-2.5 py-2 text-caption text-text-muted">{hint}</p>
    </div>
  );
}

function ModePicker({
  mode,
  onChange,
}: {
  mode: 'direct' | 'worker';
  onChange: (mode: 'direct' | 'worker') => void;
}) {
  const options = [
    { id: 'direct' as const, title: 'مستقیم', desc: 'تلگرام → سرور' },
    { id: 'worker' as const, title: 'پروکسی', desc: 'فقط یکی: Worker کلادفلر یا هاست' },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="نحوه اتصال">
      {options.map((option) => {
        const active = mode === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={`rounded-lg border px-2.5 py-2 text-start transition-colors ${
              active
                ? 'border-accent bg-accent-soft text-primary-dark'
                : 'border-border bg-surface text-text hover:border-accent/40'
            }`}
          >
            <span className="block text-caption font-semibold">{option.title}</span>
            <span className="mt-0.5 block admin-text-meta text-text-muted">{option.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

export type TelegramBridgePanelProps = {
  initial: TelegramInfrastructureView;
  workerSampleTemplate: string | null;
  compact?: boolean;
  showActions?: boolean;
  showRegisterWebhook?: boolean;
  draft?: ReturnType<typeof useTelegramBridgeDraft>;
  onStatus?: (message: string) => void;
};

export function TelegramBridgePanel({
  initial,
  workerSampleTemplate,
  compact = false,
  showActions = true,
  showRegisterWebhook = true,
  draft: externalDraft,
  onStatus,
}: TelegramBridgePanelProps) {
  const internalDraft = useTelegramBridgeDraft(initial, workerSampleTemplate);
  const draft = externalDraft ?? internalDraft;
  const {
    mode,
    setMode,
    workerUrl,
    setWorkerUrl,
    workerSource,
    pending,
    registering,
    startTransition,
    setRegistering,
    saveInfrastructure,
    registerWebhook,
  } = draft;

  const phpSource = initial.host_proxy_deploy_sample?.trim() || null;
  const htaccessSource = initial.host_proxy_htaccess_sample?.trim() || null;

  const onSave = () => {
    startTransition(async () => {
      onStatus?.('');
      const res = await saveInfrastructure();
      onStatus?.(
        res.ok
          ? 'ذخیره شد — یکی از نمونه‌ها را Deploy کنید (worker.js یا index.php)'
          : (res.error ?? 'خطا'),
      );
    });
  };

  const onRegister = () => {
    startTransition(async () => {
      setRegistering(true);
      onStatus?.('');
      const res = await registerWebhook();
      setRegistering(false);
      if (res.ok) {
        const url = 'url' in res && res.url ? `\n${res.url}` : '';
        onStatus?.(((res as { message?: string }).message ?? 'وب‌هوک ثبت شد') + url);
        return;
      }
      onStatus?.((res as { error?: string }).error ?? (res as { message?: string }).message ?? 'خطا');
    });
  };

  return (
    <div className={compact ? 'space-y-2.5' : 'space-y-3'}>
      <ModePicker mode={mode} onChange={setMode} />

      {mode === 'worker' ? (
        <>
          <label className="block">
            <span className="text-caption font-medium text-text">آدرس پروکسی (فقط یکی)</span>
            <input
              className="field-input mt-1 w-full text-small"
              dir="ltr"
              type="url"
              placeholder="https://xxx.workers.dev  یا  https://bahram.rahai.online/bahram"
              value={workerUrl}
              onChange={(e) => setWorkerUrl(e.target.value)}
            />
            <span className="mt-1 block text-caption text-text-muted">
              همزمان هر دو فعال نیست — یا Worker کلادفلر، یا هاست PHP.
            </span>
          </label>

          {workerSource ? (
            <CodeFileBlock
              title="Worker آماده Cloudflare"
              filename="worker.js"
              source={workerSource}
              hint="کل فایل را در Cloudflare Workers → Quick Edit بچسبانید و Deploy کنید. توکن ربات روی Worker نیست — فقط PROXY_SHARED_TOKEN."
            />
          ) : null}

          {phpSource ? (
            <CodeFileBlock
              title="پروکسی آماده هاست PHP"
              filename="index.php"
              source={phpSource}
              hint="نیازمند PHP 8.3 یا 8.4. روی هاست (مثلاً /bahram) به‌عنوان index.php آپلود کنید. توکن ربات روی هاست نیست — فقط PROXY_SHARED_TOKEN."
            />
          ) : null}

          {htaccessSource ? (
            <CodeFileBlock
              title="ری‌رایت Apache"
              filename=".htaccess"
              source={htaccessSource}
              hint="کنار index.php بگذارید. اگر پوشه غیر از /bahram است، RewriteBase را عوض کنید."
            />
          ) : null}
        </>
      ) : (
        <p className="text-caption text-text-muted">تلگرام مستقیم به سرور شما وصل می‌شود.</p>
      )}

      {showActions ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void onSave()} disabled={pending} className="btn btn-secondary px-2 py-1 admin-text-meta">
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            ذخیره
          </button>
          {showRegisterWebhook ? (
            <button
              type="button"
              onClick={() => void onRegister()}
              disabled={pending || registering}
              className="btn btn-primary px-2 py-1 admin-text-meta"
            >
              {registering ? <Loader2 className="h-3 w-3 animate-spin" /> : <Webhook className="h-3 w-3" />}
              ثبت وب‌هوک
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
