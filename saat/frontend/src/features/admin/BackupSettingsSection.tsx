import { useEffect, useRef, useState } from 'react'
import { Database, Download, HardDrive, Loader2, Play, Save, Upload } from 'lucide-react'
import {
  backupViewToForm,
  exportDatabaseBackup,
  exportStorageBackup,
  fetchBackupSettings,
  formatBackupSize,
  importDatabaseBackup,
  runBackupNow,
  runWeeklyBackupNow,
  uploadDownloadHostBackup,
  updateBackupSettings,
  weekdayLabel,
  type BackupForm,
  type BackupView,
} from '@/lib/backup'
import { cn } from '@/lib/cn'

const fieldClass = cn(
  'glass-inset w-full rounded-[14px] border border-white/55 px-3 py-3 text-[14px] font-semibold text-text',
  'outline-none focus:border-[#3390EC]/35 dark:border-white/10',
)

export function BackupSettingsSection() {
  const [view, setView] = useState<BackupView | null>(null)
  const [form, setForm] = useState<BackupForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [runningWeekly, setRunningWeekly] = useState(false)
  const [exportingDb, setExportingDb] = useState(false)
  const [exportingStorage, setExportingStorage] = useState(false)
  const [uploadingOffsite, setUploadingOffsite] = useState(false)
  const [importing, setImporting] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState('')
  const [status, setStatus] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    fetchBackupSettings()
      .then((data) => {
        if (!cancelled) {
          setView(data)
          setForm(backupViewToForm(data))
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('بارگذاری تنظیمات بکاپ ناموفق بود.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const patch = (partial: Partial<BackupForm>) => {
    setForm((prev) => (prev ? { ...prev, ...partial } : prev))
  }

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const onSave = async () => {
    if (!form) return
    setSaving(true)
    setStatus('')
    try {
      const updated = await updateBackupSettings({
        is_auto_enabled: form.isAutoEnabled,
        is_weekly_auto_enabled: form.isWeeklyAutoEnabled,
        schedule_time: form.scheduleTime,
        weekly_schedule_weekday: form.weeklyScheduleWeekday,
        retention_count: form.retentionCount,
      })
      setView(updated)
      setForm(backupViewToForm(updated))
      setStatus('تنظیمات بکاپ ذخیره شد.')
    } catch {
      setStatus('ذخیره تنظیمات بکاپ ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  const onRunNow = async () => {
    if (!form) return
    setRunning(true)
    setStatus('')
    try {
      await updateBackupSettings({
        is_auto_enabled: form.isAutoEnabled,
        is_weekly_auto_enabled: form.isWeeklyAutoEnabled,
        schedule_time: form.scheduleTime,
        weekly_schedule_weekday: form.weeklyScheduleWeekday,
        retention_count: form.retentionCount,
      })
      const result = await runBackupNow()
      const refreshed = await fetchBackupSettings()
      setView(refreshed)
      setForm(backupViewToForm(refreshed))
      setStatus(result.message)
    } catch {
      setStatus('اجرای بکاپ ناموفق بود.')
    } finally {
      setRunning(false)
    }
  }

  const onExportDb = async () => {
    setExportingDb(true)
    setStatus('')
    const res = await exportDatabaseBackup()
    setExportingDb(false)
    if (!res.ok) {
      setStatus(res.error)
      return
    }
    triggerDownload(res.blob, res.filename)
    setStatus('فایل بکاپ دیتابیس دانلود شد.')
  }

  const onExportStorage = async () => {
    setExportingStorage(true)
    setStatus('')
    const res = await exportStorageBackup()
    setExportingStorage(false)
    if (!res.ok) {
      setStatus(res.error)
      return
    }
    triggerDownload(res.blob, res.filename)
    setStatus('فایل بکاپ storage دانلود شد.')
  }

  const onUploadOffsite = async () => {
    setUploadingOffsite(true)
    setStatus('')
    try {
      const result = await uploadDownloadHostBackup()
      const refreshed = await fetchBackupSettings()
      setView(refreshed)
      setForm(backupViewToForm(refreshed))
      setStatus(result.message)
    } catch {
      setStatus('آپلود بکاپ به هاست دانلود ناموفق بود.')
    } finally {
      setUploadingOffsite(false)
    }
  }

  const onImport = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setStatus('فایل بکاپ را انتخاب کنید.')
      return
    }
    if (confirmRestore !== 'RESTORE') {
      setStatus('برای بازیابی، عبارت RESTORE را دقیقاً وارد کنید.')
      return
    }

    setImporting(true)
    setStatus('')
    const res = await importDatabaseBackup(file, confirmRestore)
    setImporting(false)
    setStatus(res.message)
    if (res.ok) {
      setConfirmRestore('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const onRunWeekly = async () => {
    setRunningWeekly(true)
    setStatus('')
    try {
      const result = await runWeeklyBackupNow()
      const refreshed = await fetchBackupSettings()
      setView(refreshed)
      setForm(backupViewToForm(refreshed))
      setStatus(result.message)
    } catch {
      setStatus('بکاپ کامل هفتگی ناموفق بود.')
    } finally {
      setRunningWeekly(false)
    }
  }

  if (loading) {
    return (
      <section className="space-y-3">
        <h2 className="flex items-center gap-1.5 px-1 text-[12px] font-bold text-text-soft">
          <Database size={13} />
          بکاپ و بازیابی
        </h2>
        <p className="px-1 text-[12px] font-semibold text-text-muted">در حال بارگذاری…</p>
      </section>
    )
  }

  if (!form || !view) return null

  const lastAt = view.last_backup_at ? new Date(view.last_backup_at).toLocaleString('fa-IR') : '—'

  const lastWeeklyAt = view.last_weekly_backup_at
    ? new Date(view.last_weekly_backup_at).toLocaleString('fa-IR')
    : '—'

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-1.5 px-1 text-[12px] font-bold text-text-soft">
        <Database size={13} />
        بکاپ و بازیابی
      </h2>
      <p className="px-1 text-[11px] font-semibold leading-5 text-text-muted">
        سیاست پیش‌فرض: بکاپ روزانه دیتابیس ({view.daily_retention_days ?? 30} روز) + بکاپ کامل هفتگی
        (دیتابیس + فایل‌ها، {view.weekly_retention_days ?? 90} روز). بیلد و دیپلوی دیتابیس را پاک
        نمی‌کند — فقط migrationهای جدید اجرا می‌شوند.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-[16px] border border-emerald-500/25 bg-emerald-500/5 p-3">
          <p className="text-[13px] font-bold text-text">روزانه — دیتابیس</p>
          <p className="mt-1 text-[11px] font-semibold text-text-muted">
            نگهداری {view.daily_retention_days ?? 30} روز · آخرین: {lastAt}
          </p>
        </div>
        <div className="rounded-[16px] border border-[#3390EC]/25 bg-[#3390EC]/5 p-3">
          <p className="text-[13px] font-bold text-text">هفتگی — فول بکاپ</p>
          <p className="mt-1 text-[11px] font-semibold text-text-muted">
            نگهداری {view.weekly_retention_days ?? 90} روز · آخرین: {lastWeeklyAt}
          </p>
        </div>
      </div>

      <div className="glass-card space-y-3 rounded-[20px] border border-white/55 p-4 dark:border-white/10">
        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-bold',
              view.mysqldump_available
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
            )}
          >
            {view.mysqldump_available ? 'mysqldump آماده' : 'mysqldump یافت نشد'}
          </span>
          <span className="rounded-full bg-white/30 px-2.5 py-1 text-[11px] font-bold text-text-soft dark:bg-white/10">
            DB: <span dir="ltr">{view.database_name}</span>
          </span>
        </div>

        <label className="flex items-center justify-between rounded-[14px] border border-white/40 bg-white/25 p-3 dark:border-white/10 dark:bg-white/5">
          <span className="text-[14px] font-bold text-text">بکاپ خودکار روزانه (DB)</span>
          <input
            type="checkbox"
            checked={form.isAutoEnabled}
            onChange={(e) => patch({ isAutoEnabled: e.target.checked })}
            className="h-5 w-5 accent-primary-600"
          />
        </label>

        <label className="flex items-center justify-between rounded-[14px] border border-white/40 bg-white/25 p-3 dark:border-white/10 dark:bg-white/5">
          <span className="text-[14px] font-bold text-text">بکاپ کامل خودکار هفتگی</span>
          <input
            type="checkbox"
            checked={form.isWeeklyAutoEnabled}
            onChange={(e) => patch({ isWeeklyAutoEnabled: e.target.checked })}
            className="h-5 w-5 accent-primary-600"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-text-soft">ساعت بکاپ روزانه</span>
            <input
              type="time"
              dir="ltr"
              value={form.scheduleTime}
              onChange={(e) => patch({ scheduleTime: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-text-soft">روز بکاپ هفتگی</span>
            <select
              value={form.weeklyScheduleWeekday}
              onChange={(e) => patch({ weeklyScheduleWeekday: Number(e.target.value) })}
              className={fieldClass}
            >
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>
                  {weekdayLabel(d)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-[14px] border border-white/40 bg-white/20 px-3 py-2 text-[12px] font-semibold text-text-muted dark:border-white/10 dark:bg-white/5">
          <p>آخرین بکاپ: {lastAt}</p>
          {view.last_backup_size_bytes ? (
            <p className="mt-1">حجم: {formatBackupSize(view.last_backup_size_bytes)}</p>
          ) : null}
          {view.last_backup_message ? <p className="mt-1">{view.last_backup_message}</p> : null}
        </div>

        <div className="rounded-[14px] border border-white/40 bg-white/20 px-3 py-2 text-[12px] font-semibold text-text-muted dark:border-white/10 dark:bg-white/5">
          <p className="font-bold text-text">هاست دانلود (هفتگی — ۳ ماه)</p>
          <p className="mt-1">
            مسیر: <span dir="ltr">backups/saat/&lt;random&gt;/</span>
            {!view.download_host_configured ? ' — BACKUP_FTP_HOST تنظیم نشده' : ''}
          </p>
          {view.last_offsite_backup_at ? (
            <p className="mt-1">آخرین آپلود: {new Date(view.last_offsite_backup_at).toLocaleString('fa-IR')}</p>
          ) : null}
          {view.last_offsite_links?.database?.url ? (
            <p className="mt-1 break-all" dir="ltr">
              DB: {view.last_offsite_links.database.url}
            </p>
          ) : null}
          {view.last_offsite_links?.files?.url ? (
            <p className="mt-1 break-all" dir="ltr">
              Files: {view.last_offsite_links.files.url}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void onSave()}
            className="inline-flex items-center gap-1.5 rounded-[14px] border border-white/55 bg-white/30 px-3 py-2 text-[13px] font-bold text-text dark:border-white/10 dark:bg-white/5"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            ذخیره
          </button>
          <button
            type="button"
            disabled={runningWeekly}
            onClick={() => void onRunWeekly()}
            className="inline-flex items-center gap-1.5 rounded-[14px] bg-[#3390EC] px-3 py-2 text-[13px] font-bold text-white"
          >
            {runningWeekly ? <Loader2 size={14} className="animate-spin" /> : <HardDrive size={14} />}
            فول بکاپ الان
          </button>
          <button
            type="button"
            disabled={running}
            onClick={() => void onRunNow()}
            className="inline-flex items-center gap-1.5 rounded-[14px] bg-primary-600 px-3 py-2 text-[13px] font-bold text-white"
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            بکاپ DB الان
          </button>
          <button
            type="button"
            disabled={exportingDb}
            onClick={() => void onExportDb()}
            className="inline-flex items-center gap-1.5 rounded-[14px] border border-white/55 bg-white/30 px-3 py-2 text-[13px] font-bold text-text dark:border-white/10 dark:bg-white/5"
          >
            {exportingDb ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            دانلود DB
          </button>
          <button
            type="button"
            disabled={exportingStorage || !view.storage_app_exists}
            onClick={() => void onExportStorage()}
            className="inline-flex items-center gap-1.5 rounded-[14px] border border-white/55 bg-white/30 px-3 py-2 text-[13px] font-bold text-text dark:border-white/10 dark:bg-white/5"
          >
            {exportingStorage ? <Loader2 size={14} className="animate-spin" /> : <HardDrive size={14} />}
            دانلود فایل‌ها
          </button>
          <button
            type="button"
            disabled={uploadingOffsite || !view.download_host_configured}
            onClick={() => void onUploadOffsite()}
            className="inline-flex items-center gap-1.5 rounded-[14px] border border-white/55 bg-white/30 px-3 py-2 text-[13px] font-bold text-text dark:border-white/10 dark:bg-white/5"
          >
            {uploadingOffsite ? <Loader2 size={14} className="animate-spin" /> : <HardDrive size={14} />}
            آپلود هفتگی به هاست
          </button>
        </div>

        <div className="rounded-[16px] border border-red-400/30 bg-red-500/5 p-3">
          <p className="text-[13px] font-bold text-red-600 dark:text-red-400">بازیابی دیتابیس</p>
          <p className="mt-1 text-[11px] font-semibold leading-5 text-text-muted">
            فایل <span dir="ltr">.sql</span> یا <span dir="ltr">.sql.gz</span> — داده فعلی بازنویسی می‌شود.
          </p>
          <div className="mt-3 grid gap-2">
            <input ref={fileInputRef} type="file" accept=".sql,.gz,.sql.gz" className={fieldClass} />
            <input
              dir="ltr"
              placeholder="RESTORE"
              value={confirmRestore}
              onChange={(e) => setConfirmRestore(e.target.value)}
              className={fieldClass}
            />
          </div>
          <button
            type="button"
            disabled={importing}
            onClick={() => void onImport()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-[14px] border border-red-400/40 px-3 py-2 text-[13px] font-bold text-red-600 dark:text-red-400"
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            ایمپورت و بازیابی
          </button>
        </div>

        {status ? <p className="text-[12px] font-semibold text-text-muted">{status}</p> : null}
      </div>
    </section>
  )
}
