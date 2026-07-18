'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, HardDrive, Loader2 } from 'lucide-react';
import type {
  MediaFtpConnectionPayload,
  MediaFtpConnectionView,
  MediaFtpProtocol,
} from '@/lib/admin/mediaFtp.types';

const DEFAULT_PORT: Record<MediaFtpProtocol, number> = { ftp: 21, sftp: 22 };

function extractError(json: unknown, fallback: string): string {
  if (!json || typeof json !== 'object') return fallback;
  const body = json as {
    error?: { message_fa?: string };
    message?: string;
  };
  return body.error?.message_fa ?? body.message ?? fallback;
}

function applyConnection(view: MediaFtpConnectionView) {
  return {
    enabled: view.enabled,
    protocol: view.protocol,
    host: view.host,
    port: view.port,
    username: view.username,
    root: view.root || '/',
    passive: view.passive,
    ssl: view.ssl,
    timeout: view.timeout,
  };
}

export function MediaFtpSettings() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [enabled, setEnabled] = useState(false);
  const [protocol, setProtocol] = useState<MediaFtpProtocol>('ftp');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(21);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordSet, setPasswordSet] = useState(false);
  const [passwordPreview, setPasswordPreview] = useState<string | null>(null);
  const [root, setRoot] = useState('/');
  const [passive, setPassive] = useState(true);
  const [ssl, setSsl] = useState(false);
  const [timeout, setTimeout_] = useState(60);
  const [privateKey, setPrivateKey] = useState('');
  const [privateKeySet, setPrivateKeySet] = useState(false);
  const [diskName, setDiskName] = useState('');

  const loadConnection = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/admin/media-ftp/connection', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(extractError(json, 'بارگذاری تنظیمات هاست دانلود ناموفق بود.'));
        return;
      }

      const connection = (json.data?.connection ?? json.connection) as MediaFtpConnectionView | undefined;
      if (!connection) {
        setLoadError('پاسخ سرور نامعتبر است.');
        return;
      }

      const form = applyConnection(connection);
      setEnabled(form.enabled);
      setProtocol(form.protocol);
      setHost(form.host);
      setPort(form.port);
      setUsername(form.username);
      setRoot(form.root);
      setPassive(form.passive);
      setSsl(form.ssl);
      setTimeout_(form.timeout);
      setPassword('');
      setPasswordSet(connection.password_set);
      setPasswordPreview(connection.password_preview);
      setPrivateKey('');
      setPrivateKeySet(connection.private_key_set);
      setDiskName(connection.disk_name);
    } catch {
      setLoadError('ارتباط با سرور برقرار نشد.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConnection();
  }, [loadConnection]);

  function onProtocolChange(next: MediaFtpProtocol) {
    setProtocol(next);
    setPort((current) => (current === DEFAULT_PORT.ftp || current === DEFAULT_PORT.sftp ? DEFAULT_PORT[next] : current));
  }

  function buildPayload(): MediaFtpConnectionPayload {
    const payload: MediaFtpConnectionPayload = {
      enabled,
      protocol,
      host: host.trim(),
      port,
      username: username.trim(),
      root: root.trim() || '/',
      passive,
      ssl,
      timeout,
    };

    if (password) payload.password = password;
    if (protocol === 'sftp' && privateKey) payload.private_key = privateKey;

    return payload;
  }

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/media-ftp/connection', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(extractError(json, 'ذخیره تنظیمات ناموفق بود.'));
        return;
      }

      const connection = (json.data?.connection ?? json.connection) as MediaFtpConnectionView | undefined;
      if (connection) {
        const form = applyConnection(connection);
        setEnabled(form.enabled);
        setProtocol(form.protocol);
        setHost(form.host);
        setPort(form.port);
        setUsername(form.username);
        setRoot(form.root);
        setPassive(form.passive);
        setSsl(form.ssl);
        setTimeout_(form.timeout);
        setPasswordSet(connection.password_set);
        setPasswordPreview(connection.password_preview);
        setPrivateKeySet(connection.private_key_set);
        setDiskName(connection.disk_name);
      }

      setPassword('');
      setPrivateKey('');
      setMessage('تنظیمات هاست دانلود ذخیره شد.');
    } catch {
      setError('ارتباط با سرور برقرار نشد.');
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/media-ftp/test', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((json as { error?: string }).error ?? extractError(json, 'اتصال برقرار نشد.'));
        return;
      }

      const result = json as { ok?: boolean; message?: string };
      if (result.ok === false) {
        setError(result.message ?? 'اتصال برقرار نشد.');
        return;
      }

      setMessage(result.message ?? 'اتصال به هاست دانلود برقرار است.');
    } catch {
      setError('ارتباط با سرور برقرار نشد.');
    } finally {
      setTesting(false);
    }
  }

  const busy = saving || testing;

  return (
    <section className="card mb-6 overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-5 text-right"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HardDrive className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 className="text-h3 text-primary-dark">هاست دانلود (FTP / SFTP)</h2>
            <p className="mt-1 text-small text-muted">
              اتصال به هاست دانلود برای انتقال فایل‌های رسانه — شامل مسیر پایه (Path) روی سرور
              {diskName ? ` · دیسک فعال: ${diskName}` : ''}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>

      {open ? (
        <div className="border-t border-border px-5 pb-5 pt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-small text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              در حال بارگذاری تنظیمات…
            </div>
          ) : loadError ? (
            <div className="space-y-3">
              <p className="text-small text-error">{loadError}</p>
              <button type="button" className="btn-secondary" onClick={() => void loadConnection()}>
                تلاش مجدد
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-small">
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                استفاده از هاست دانلود برای کتابخانه رسانه فعال باشد
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-small">
                  <span className="mb-1 block text-muted">پروتکل</span>
                  <select
                    className="field-input w-full"
                    value={protocol}
                    onChange={(e) => onProtocolChange(e.target.value as MediaFtpProtocol)}
                  >
                    <option value="ftp">FTP</option>
                    <option value="sftp">SFTP</option>
                  </select>
                </label>

                <label className="block text-small">
                  <span className="mb-1 block text-muted">پورت</span>
                  <input
                    className="field-input w-full"
                    dir="ltr"
                    type="number"
                    min={1}
                    max={65535}
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value) || DEFAULT_PORT[protocol])}
                  />
                </label>
              </div>

              <label className="block text-small">
                <span className="mb-1 block text-muted">هاست</span>
                <input
                  className="field-input w-full"
                  dir="ltr"
                  placeholder="ftp.example.com"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                />
              </label>

              <label className="block text-small">
                <span className="mb-1 block text-muted">نام کاربری</span>
                <input
                  className="field-input w-full"
                  dir="ltr"
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>

              <label className="block text-small">
                <span className="mb-1 block text-muted">رمز عبور</span>
                <input
                  className="field-input w-full"
                  dir="ltr"
                  type="password"
                  autoComplete="new-password"
                  placeholder={passwordSet ? `ذخیره‌شده: ${passwordPreview ?? '••••••'}` : 'رمز عبور FTP/SFTP'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              <label className="block text-small">
                <span className="mb-1 block text-muted">مسیر پایه (Path / Root)</span>
                <input
                  className="field-input w-full"
                  dir="ltr"
                  placeholder="/public_html/media"
                  value={root}
                  onChange={(e) => setRoot(e.target.value)}
                />
                <span className="mt-1 block text-caption text-muted">
                  مسیر شروع روی هاست دانلود — فایل‌های رسانه نسبت به این مسیر ذخیره می‌شوند (مثال: / یا /public_html)
                </span>
              </label>

              {protocol === 'ftp' ? (
                <div className="flex flex-wrap gap-4 text-small">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={passive} onChange={(e) => setPassive(e.target.checked)} />
                    حالت Passive
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={ssl} onChange={(e) => setSsl(e.target.checked)} />
                    FTPS (SSL)
                  </label>
                </div>
              ) : (
                <label className="block text-small">
                  <span className="mb-1 block text-muted">کلید خصوصی SFTP (اختیاری)</span>
                  <textarea
                    className="field-input min-h-[88px] w-full font-mono text-caption"
                    dir="ltr"
                    placeholder={
                      privateKeySet
                        ? 'کلید خصوصی قبلاً ذخیره شده — برای تغییر، کلید جدید را اینجا بچسبانید'
                        : '-----BEGIN OPENSSH PRIVATE KEY-----'
                    }
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                  />
                </label>
              )}

              <label className="block text-small sm:max-w-xs">
                <span className="mb-1 block text-muted">تایم‌اوت (ثانیه)</span>
                <input
                  className="field-input w-full"
                  dir="ltr"
                  type="number"
                  min={5}
                  max={300}
                  value={timeout}
                  onChange={(e) => setTimeout_(Number(e.target.value) || 60)}
                />
              </label>

              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" className="btn-primary" disabled={busy} onClick={() => void save()}>
                  {saving ? (
                    <>
                      <Loader2 className="me-1 inline h-4 w-4 animate-spin" />
                      در حال ذخیره…
                    </>
                  ) : (
                    'ذخیره تنظیمات'
                  )}
                </button>
                <button type="button" className="btn-secondary" disabled={busy} onClick={() => void testConnection()}>
                  {testing ? 'در حال تست…' : 'تست اتصال'}
                </button>
              </div>

              {message ? <p className="text-small text-success">{message}</p> : null}
              {error ? <p className="text-small text-error">{error}</p> : null}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
