'use client';

import Link from 'next/link';
import { Loader2, PlayCircle, Send, Smartphone } from 'lucide-react';
import { Badge } from '../ui';
import type {
  SmsSpotplayerCredentialsForm,
  SmsSpotplayerCredentialsView,
} from '@/lib/admin/smsSpotplayerCredentials.types';

type Props = {
  form: SmsSpotplayerCredentialsForm;
  view: SmsSpotplayerCredentialsView | null;
  testing: 'melipayamak' | 'kavenegar' | 'spotplayer' | null;
  onChange: (form: SmsSpotplayerCredentialsForm) => void;
  onTest: (target: 'melipayamak' | 'kavenegar' | 'spotplayer') => void;
};

export function SmsSpotplayerCredentialsSettingsSection({
  form,
  view,
  testing,
  onChange,
  onTest,
}: Props) {
  const melipayamak = view?.providers.find((p) => p.slug === 'melipayamak');
  const kavenegar = view?.providers.find((p) => p.slug === 'kavenegar');
  const spotplayerOk = view?.spotplayer_configured ?? false;

  function patch(partial: Partial<SmsSpotplayerCredentialsForm>) {
    onChange({ ...form, ...partial });
  }

  return (
    <div id="sms-spotplayer-credentials" className="space-y-6">
      <p className="text-small text-text-muted">
        کلیدهای API ملی‌پیامک، کاوه‌نگار و SpotPlayer. مسیردهی پنل‌ها در{' '}
        <a href="#sms-routing" className="text-primary hover:underline">
          بخش پایین
        </a>
        . رویدادها و ارسال در{' '}
        <Link href="/admin/academy/sms" className="text-primary hover:underline">
          مرکز پیامک
        </Link>
        .
      </p>

      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Send className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={1.6} />
            <div>
              <h2 className="text-h3 text-primary-dark">ملی‌پیامک</h2>
              <p className="mt-1 text-small text-text-muted">نام کاربری و رمز عبور پنل ملی‌پیامک.</p>
            </div>
          </div>
          <Badge tone={melipayamak?.configured ? 'success' : 'warning'}>
            {melipayamak?.configured ? 'تنظیم‌شده' : 'نیاز به تنظیم'}
          </Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label>
            <span className="field-label">نام کاربری</span>
            <input
              className="field-input"
              dir="ltr"
              autoComplete="off"
              placeholder="username"
              value={form.melipayamakUsername}
              onChange={(e) => patch({ melipayamakUsername: e.target.value })}
            />
          </label>
          <label>
            <span className="field-label">رمز عبور</span>
            <input
              className="field-input"
              dir="ltr"
              type="password"
              autoComplete="new-password"
              placeholder={view?.has_melipayamak_password ? 'برای تغییر، رمز جدید وارد کنید' : 'password'}
              value={form.melipayamakPasswordInput}
              onChange={(e) => patch({ melipayamakPasswordInput: e.target.value })}
            />
            {view?.has_melipayamak_password && !form.melipayamakPasswordInput && (
              <p className="mt-1 text-caption text-success">رمز عبور ذخیره شده است.</p>
            )}
          </label>
          <label>
            <span className="field-label">شماره فرستنده</span>
            <input
              className="field-input"
              dir="ltr"
              value={form.melipayamakSenderNumber}
              onChange={(e) => patch({ melipayamakSenderNumber: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 self-end pb-2">
            <input
              type="checkbox"
              checked={form.melipayamakActive}
              onChange={(e) => patch({ melipayamakActive: e.target.checked })}
            />
            <span className="text-small">پنل فعال</span>
          </label>
        </div>

        <div className="mt-4">
          <button
            type="button"
            disabled={testing !== null}
            onClick={() => onTest('melipayamak')}
            className="btn btn-secondary text-small"
          >
            {testing === 'melipayamak' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            تست ملی‌پیامک
          </button>
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Send className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={1.6} />
            <div>
              <h2 className="text-h3 text-primary-dark">کاوه‌نگار</h2>
              <p className="mt-1 text-small text-text-muted">کلید API پنل کاوه‌نگار.</p>
            </div>
          </div>
          <Badge tone={kavenegar?.configured ? 'success' : 'warning'}>
            {kavenegar?.configured ? 'تنظیم‌شده' : 'نیاز به تنظیم'}
          </Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label>
            <span className="field-label">API Key</span>
            <input
              className="field-input"
              dir="ltr"
              type="password"
              autoComplete="new-password"
              placeholder={kavenegar?.has_credentials ? `ذخیره‌شده: ${kavenegar.credential_hint ?? '••••'}` : 'کلید API'}
              value={form.kavenegarApiKeyInput}
              onChange={(e) => patch({ kavenegarApiKeyInput: e.target.value })}
            />
          </label>
          <label>
            <span className="field-label">شماره فرستنده</span>
            <input
              className="field-input"
              dir="ltr"
              value={form.kavenegarSenderNumber}
              onChange={(e) => patch({ kavenegarSenderNumber: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.kavenegarActive}
              onChange={(e) => patch({ kavenegarActive: e.target.checked })}
            />
            <span className="text-small">پنل فعال</span>
          </label>
        </div>

        <div className="mt-4">
          <button
            type="button"
            disabled={testing !== null}
            onClick={() => onTest('kavenegar')}
            className="btn btn-secondary text-small"
          >
            {testing === 'kavenegar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            تست کاوه‌نگار
          </button>
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={1.6} />
            <div>
              <h2 className="text-h3 text-primary-dark">SpotPlayer</h2>
              <p className="mt-1 text-small text-text-muted">
                کلید API و تنظیمات صدور لایسنس دوره‌ها.
              </p>
            </div>
          </div>
          <Badge tone={spotplayerOk ? 'success' : 'warning'}>{spotplayerOk ? 'فعال' : 'تنظیم نشده'}</Badge>
        </div>

        <label>
          <span className="field-label">API Key</span>
          <input
            className="field-input"
            dir="ltr"
            type="password"
            autoComplete="new-password"
            placeholder={view?.has_spotplayer_api_key ? 'برای تغییر، کلید جدید وارد کنید' : 'کلید API SpotPlayer'}
            value={form.spotplayerApiKeyInput}
            onChange={(e) => patch({ spotplayerApiKeyInput: e.target.value })}
          />
          {view?.spotplayer_api_key_preview && !form.spotplayerApiKeyInput && (
            <p className="mt-1 text-caption text-success" dir="ltr">
              ذخیره‌شده: {view.spotplayer_api_key_preview}
            </p>
          )}
        </label>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label>
            <span className="field-label">Base URL</span>
            <input
              className="field-input"
              dir="ltr"
              placeholder="https://panel.spotplayer.ir"
              value={form.spotplayerBaseUrl}
              onChange={(e) => patch({ spotplayerBaseUrl: e.target.value })}
            />
          </label>
          <label>
            <span className="field-label">مدت پیش‌فرض لایسنس (روز)</span>
            <input
              className="field-input"
              type="number"
              min={0}
              value={form.spotplayerDefaultLicenseDuration}
              onChange={(e) => patch({ spotplayerDefaultLicenseDuration: e.target.value })}
            />
          </label>
        </div>

        <label className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.spotplayerActive}
            onChange={(e) => patch({ spotplayerActive: e.target.checked })}
          />
          <span className="text-small">فعال بودن SpotPlayer</span>
        </label>

        <div className="mt-4">
          <button
            type="button"
            disabled={testing !== null}
            onClick={() => onTest('spotplayer')}
            className="btn btn-secondary text-small"
          >
            {testing === 'spotplayer' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            تست SpotPlayer
          </button>
        </div>
      </div>
    </div>
  );
}
