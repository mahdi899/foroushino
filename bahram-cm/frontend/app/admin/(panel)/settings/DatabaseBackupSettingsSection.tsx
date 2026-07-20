'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Database, Download, HardDrive, Loader2, Play, Save, Send, Upload } from 'lucide-react';
import { Badge } from '../ui';
import {
  exportDatabaseBackupAction,
  exportMediaBackupAction,
  importDatabaseBackupAction,
  loadDatabaseBackupSettings,
  runDatabaseBackupAction,
  saveDatabaseBackupSettingsAction,
  testDatabaseBackupTelegramAction,
  uploadDownloadHostBackupAction,
} from '@/lib/admin/databaseBackup';
import {
  databaseBackupViewToForm,
  formatBackupSize,
  type DatabaseBackupForm,
  type DatabaseBackupView,
} from '@/lib/admin/databaseBackup.types';

type Props = {
  form: DatabaseBackupForm;
  view: DatabaseBackupView | null;
  onChange: (form: DatabaseBackupForm) => void;
  onViewChange: (view: DatabaseBackupView | null) => void;
};

export function DatabaseBackupSettingsSection({ form, view, onChange, onViewChange }: Props) {
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingMedia, setExportingMedia] = useState(false);
  const [uploadingOffsite, setUploadingOffsite] = useState(false);
  const [importing, setImporting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState('');
  const [status, setStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patch = (partial: Partial<DatabaseBackupForm>) => onChange({ ...form, ...partial });

  async function onSave() {
    setSaving(true);
    setStatus('');
    const res = await saveDatabaseBackupSettingsAction(form);
    setSaving(false);
    if (res.ok && res.data) {
      onViewChange(res.data);
      onChange(databaseBackupViewToForm(res.data));
      setStatus('ذخیره شد.');
    } else {
      setStatus(res.error ?? 'خطا');
    }
  }

  async function onRunNow() {
    setRunning(true);
    setStatus('');
    const saveRes = await saveDatabaseBackupSettingsAction(form);
    if (!saveRes.ok) {
      setRunning(false);
      setStatus(saveRes.error ?? 'ذخیره تنظیمات قبل از بکاپ ناموفق بود.');
      return;
    }
    if (saveRes.data) {
      onViewChange(saveRes.data);
    }
    const res = await runDatabaseBackupAction(form.sendToTelegram);
    setRunning(false);
    if (res.data) onViewChange(res.data);
    setStatus(res.message);
  }

  async function onExport() {
    setExporting(true);
    setStatus('');
    const res = await exportDatabaseBackupAction();
    setExporting(false);
    if (!res.ok) {
      setStatus(res.error);
      return;
    }
    const blob = new Blob([res.blob], { type: 'application/gzip' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = res.filename;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('فایل بکاپ دیتابیس دانلود شد.');
  }

  async function onExportMedia() {
    setExportingMedia(true);
    setStatus('');
    const res = await exportMediaBackupAction();
    setExportingMedia(false);
    if (!res.ok) {
      setStatus(res.error);
      return;
    }
    const blob = new Blob([res.blob], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = res.filename;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('فایل بکاپ media دانلود شد.');
  }

  async function onUploadOffsite() {
    setUploadingOffsite(true);
    setStatus('');
    const res = await uploadDownloadHostBackupAction();
    setUploadingOffsite(false);
    setStatus(res.message);
    if (res.ok) {
      const refreshed = await loadDatabaseBackupSettings();
      if (refreshed) onViewChange(refreshed);
    }
  }

  async function onImport() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setStatus('فایل بکاپ را انتخاب کنید.');
      return;
    }
    if (confirmRestore !== 'RESTORE') {
      setStatus('برای بازیابی، عبارت RESTORE را دقیقاً وارد کنید.');
      return;
    }

    setImporting(true);
    setStatus('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('confirm', confirmRestore);
    const res = await importDatabaseBackupAction(formData);
    setImporting(false);
    setStatus(res.message);
    if (res.ok) {
      setConfirmRestore('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function onTestTelegram() {
    setTesting(true);
    setStatus('');
    const res = await testDatabaseBackupTelegramAction();
    setTesting(false);
    setStatus(res.message);
  }

  const lastAt = view?.last_backup_at ? new Date(view.last_backup_at).toLocaleString('fa-IR') : '—';

  return (
    <div id="database-backup" className="card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Database className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={1.6} />
          <div>
            <h3 className="text-h3 text-primary-dark">بکاپ و بازیابی</h3>
            <p className="mt-1 text-caption text-text-muted">
              دانلود دیتابیس و فایل‌های media سایت، بکاپ خودکار روزانه، ارسال DB به تلگرام ادمین، و بازیابی دستی.
              ربات و chat_id از{' '}
              <Link href="#sms-routing" className="text-primary hover:underline">
                تنظیمات تلگرام
              </Link>{' '}
              خوانده می‌شود.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge tone={view?.mysqldump_available ? 'success' : 'warning'}>
            {view?.mysqldump_available ? 'mysqldump آماده' : 'mysqldump یافت نشد'}
          </Badge>
          <Badge tone={view?.telegram_configured ? 'success' : 'warning'}>
            {view?.telegram_configured ? `تلگرام (${view.telegram_chat_count} چت)` : 'تلگرام ناقص'}
          </Badge>
          {view?.site_media_available ? (
            <Badge tone="success">media آماده</Badge>
          ) : (
            <Badge tone="warning">media یافت نشد</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="inline-flex items-center gap-2 text-caption sm:col-span-2">
          <input
            type="checkbox"
            checked={form.isAutoEnabled}
            onChange={(e) => patch({ isAutoEnabled: e.target.checked })}
          />
          بکاپ خودکار روزانه فعال
        </label>
        <label>
          <span className="field-label text-caption">ساعت اجرا</span>
          <input
            className="field-input text-small"
            dir="ltr"
            type="time"
            value={form.scheduleTime}
            onChange={(e) => patch({ scheduleTime: e.target.value })}
          />
        </label>
        <label>
          <span className="field-label text-caption">نگهداری محلی (فایل)</span>
          <input
            className="field-input text-small"
            dir="ltr"
            inputMode="numeric"
            min={1}
            max={30}
            value={form.retentionCount}
            onChange={(e) => patch({ retentionCount: Number(e.target.value) || 30 })}
          />
        </label>
      </div>

      <label className="mt-3 inline-flex items-center gap-2 text-caption">
        <input
          type="checkbox"
          checked={form.sendToTelegram}
          onChange={(e) => patch({ sendToTelegram: e.target.checked })}
        />
        ارسال فایل بکاپ به تلگرام ادمین
      </label>

      <div className="mt-4 rounded-md border border-border bg-surface-soft px-3 py-2 text-caption text-text-muted">
        <p>
          دیتابیس: <span dir="ltr">{view?.database_name ?? '—'}</span>
        </p>
        <p className="mt-1">
          آخرین بکاپ: {lastAt}
          {view?.last_backup_size_bytes ? ` — ${formatBackupSize(view.last_backup_size_bytes)}` : ''}
        </p>
        {view?.last_backup_message ? <p className="mt-1">{view.last_backup_message}</p> : null}
      </div>

      <div className="mt-4 rounded-md border border-border bg-surface-soft px-3 py-2 text-caption text-text-muted">
        <p className="font-semibold text-primary-dark">هاست دانلود (هفتگی — ۳ ماه)</p>
        <p className="mt-1">
          مسیر: <span dir="ltr">backups/bahram/&lt;random&gt;/</span>
          {view?.download_host_configured ? '' : ' — FTP پیکربندی نشده'}
        </p>
        {view?.last_offsite_backup_at ? (
          <p className="mt-1">آخرین آپلود: {new Date(view.last_offsite_backup_at).toLocaleString('fa-IR')}</p>
        ) : null}
        {view?.last_offsite_links?.database?.url ? (
          <p className="mt-1 break-all">
            DB:{' '}
            <a href={view.last_offsite_links.database.url} className="text-primary hover:underline" dir="ltr">
              {view.last_offsite_links.database.url}
            </a>
          </p>
        ) : null}
        {view?.last_offsite_links?.files?.url ? (
          <p className="mt-1 break-all">
            Files:{' '}
            <a href={view.last_offsite_links.files.url} className="text-primary hover:underline" dir="ltr">
              {view.last_offsite_links.files.url}
            </a>
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => void onSave()} disabled={saving} className="btn btn-secondary px-3 py-1.5 text-caption">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          ذخیره تنظیمات
        </button>
        <button type="button" onClick={() => void onRunNow()} disabled={running} className="btn btn-primary px-3 py-1.5 text-caption">
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          بکاپ الان
        </button>
        <button type="button" onClick={() => void onExport()} disabled={exporting} className="btn btn-secondary px-3 py-1.5 text-caption">
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          دانلود DB
        </button>
        <button
          type="button"
          onClick={() => void onExportMedia()}
          disabled={exportingMedia || !view?.site_media_available}
          className="btn btn-secondary px-3 py-1.5 text-caption"
        >
          {exportingMedia ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HardDrive className="h-3.5 w-3.5" />}
          دانلود media
        </button>
        <button
          type="button"
          onClick={() => void onUploadOffsite()}
          disabled={uploadingOffsite || !view?.download_host_configured}
          className="btn btn-secondary px-3 py-1.5 text-caption"
        >
          {uploadingOffsite ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HardDrive className="h-3.5 w-3.5" />}
          آپلود هفتگی به هاست
        </button>
        <button type="button" onClick={() => void onTestTelegram()} disabled={testing} className="btn btn-secondary px-3 py-1.5 text-caption">
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          تست تلگرام
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-danger/30 bg-danger/5 p-4">
        <h4 className="text-small font-bold text-danger">بازیابی (Import)</h4>
        <p className="mt-1 text-caption text-text-muted">
          فایل <span dir="ltr">.sql</span> یا <span dir="ltr">.sql.gz</span> را آپلود کنید. این عملیات داده‌های فعلی را بازنویسی می‌کند.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input ref={fileInputRef} type="file" accept=".sql,.gz,.sql.gz" className="field-input text-small" />
          <input
            className="field-input text-small"
            dir="ltr"
            placeholder="RESTORE"
            value={confirmRestore}
            onChange={(e) => setConfirmRestore(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => void onImport()}
          disabled={importing}
          className="btn btn-secondary mt-3 px-3 py-1.5 text-caption text-danger"
        >
          {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          ایمپورت و بازیابی
        </button>
      </div>

      {status ? <p className="mt-3 text-caption text-text-muted">{status}</p> : null}
    </div>
  );
}
