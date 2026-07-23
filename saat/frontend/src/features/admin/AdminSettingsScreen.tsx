import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Radio, Server, ShieldCheck } from 'lucide-react'
import { CatalogSettingsSection } from '@/features/admin/CatalogSettingsSection'
import { BackupSettingsSection } from '@/features/admin/BackupSettingsSection'
import { CloudflareSettingsSection } from '@/features/admin/CloudflareSettingsSection'
import { BahramBridgeSettingsSection } from '@/features/admin/BahramBridgeSettingsSection'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { useStore } from '@/store/useStore'
import { fetchAppSettings, updateAppSettings, type AppSettings } from '@/services/admin'
import {
  ADMIN_KNOWN_SETTING_KEYS,
  ADMIN_OPERATIONAL_KEYS,
  ADMIN_QA_KEYS,
  ADMIN_SMS_PANEL_KEYS,
  ADMIN_SMS_TEMPLATE_GROUPS,
  ADMIN_TELEPHONY_KEYS,
  getAdminSettingMeta,
  mapRuntimeAppSettings,
  prepareAdminSettingsForSave,
} from '@/lib/appSettings'
import { apiErrorMessage } from '@/lib/apiErrors'
import { testMelipayamakConnection, testVoipConnection } from '@/services/admin'
import { cn } from '@/lib/cn'

const fieldClass = cn(
  'glass-inset w-full rounded-[14px] border border-white/55 px-3 py-3 text-[14px] font-semibold text-text',
  'outline-none focus:border-[#3390EC]/35 dark:border-white/10',
)

export function AdminSettingsScreen() {
  const navigate = useNavigate()
  const hasPermission = useStore((s) => s.hasPermission)
  const setAppSettings = useStore((s) => s.setAppSettings)
  const pushToast = useStore((s) => s.pushToast)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [testingVoip, setTestingVoip] = useState(false)
  const [testingSms, setTestingSms] = useState(false)

  useEffect(() => {
    if (!hasPermission('admin.settings')) {
      navigate('/profile', { replace: true })
      return
    }

    let cancelled = false
    fetchAppSettings()
      .then((data) => {
        if (!cancelled) setSettings(data)
      })
      .catch(() => {
        if (!cancelled) pushToast('بارگذاری تنظیمات ناموفق بود.', 'error')
      })

    return () => {
      cancelled = true
    }
  }, [hasPermission, navigate, pushToast])

  if (!hasPermission('admin.settings')) return null

  const onSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const payload = prepareAdminSettingsForSave(settings)
      const updated = await updateAppSettings(payload)
      setSettings({ ...updated, melipayamak_password: '', bahram_callback_token: '' })
      setAppSettings(mapRuntimeAppSettings(updated as Record<string, unknown>))
      pushToast('تنظیمات ذخیره شد.', 'success')
    } catch (error) {
      pushToast(apiErrorMessage(error, 'ذخیره تنظیمات ناموفق بود.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const onTestVoip = async () => {
    setTestingVoip(true)
    try {
      const result = await testVoipConnection()
      pushToast(result.message, result.ok ? 'success' : 'error')
    } catch {
      pushToast('تست اتصال VoIP ناموفق بود.', 'error')
    } finally {
      setTestingVoip(false)
    }
  }

  const onTestMelipayamak = async () => {
    if (!settings) return
    setTestingSms(true)
    try {
      const result = await testMelipayamakConnection({
        username: String(settings.melipayamak_username ?? ''),
        password: settings.melipayamak_password ? String(settings.melipayamak_password) : undefined,
        rest_url: String(settings.melipayamak_rest_url ?? ''),
      })
      const credit =
        typeof result.credit === 'number'
          ? ` موجودی: ${result.credit.toLocaleString('fa-IR')} ریال`
          : ''
      pushToast(`${result.message}${credit}`, result.ok ? 'success' : 'error')
    } catch {
      pushToast('تست اتصال ملی‌پیامک ناموفق بود.', 'error')
    } finally {
      setTestingSms(false)
    }
  }

  const otherEntries = settings
    ? Object.entries(settings).filter(([key]) => !ADMIN_KNOWN_SETTING_KEYS.has(key))
    : []

  const renderField = (key: string, nested = false) => {
    if (!settings) return null
    const meta = getAdminSettingMeta(key)
    const value = settings[key]
    const wrapClass = nested
      ? 'block'
      : 'glass-card block rounded-[20px] border border-white/55 p-4 dark:border-white/10'

    if (meta.type === 'boolean') {
      const checked = value === true || value === 'true' || value === 1
      return (
        <label
          key={key}
          className={cn(
            nested
              ? 'flex items-center justify-between rounded-[14px] border border-white/40 bg-white/25 p-3 dark:border-white/10 dark:bg-white/5'
              : 'glass-card flex items-center justify-between rounded-[20px] border border-white/55 p-4 dark:border-white/10',
          )}
        >
          <div className="min-w-0 pr-3">
            <span className="block text-[14px] font-bold text-text">{meta.label}</span>
            {meta.hint && <span className="mt-1 block text-[11px] font-semibold leading-5 text-text-soft">{meta.hint}</span>}
          </div>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setSettings((prev) => (prev ? { ...prev, [key]: e.target.checked } : prev))}
            className="h-5 w-5 shrink-0 accent-primary-600"
          />
        </label>
      )
    }

    if (meta.type === 'select' && meta.options) {
      return (
        <label key={key} className={wrapClass}>
          <span className="mb-1 block text-[14px] font-bold text-text">{meta.label}</span>
          {meta.hint && <span className="mb-2 block text-[11px] font-semibold leading-5 text-text-soft">{meta.hint}</span>}
          <select
            value={String(value ?? meta.options[0]?.value)}
            onChange={(e) => setSettings((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))}
            className={fieldClass}
          >
            {meta.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      )
    }

    if (meta.type === 'password') {
      const configured = settings.melipayamak_password_configured === true
      return (
        <label key={key} className={wrapClass}>
          <span className="mb-1 block text-[14px] font-bold text-text">{meta.label}</span>
          {meta.hint && <span className="mb-2 block text-[11px] font-semibold leading-5 text-text-soft">{meta.hint}</span>}
          {configured && (
            <span className="mb-2 block text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              رمز ذخیره شده است — برای تغییر، رمز جدید وارد کنید.
            </span>
          )}
          <input
            type="password"
            autoComplete="new-password"
            placeholder={configured ? 'رمز جدید (اختیاری)' : meta.placeholder}
            value={value == null ? '' : String(value)}
            onChange={(e) => setSettings((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))}
            className={cn(fieldClass, 'ltr-nums text-left')}
          />
        </label>
      )
    }

    return (
      <label key={key} className={wrapClass}>
        <span className="mb-1 block text-[14px] font-bold text-text">{meta.label}</span>
        {meta.hint && <span className="mb-2 block text-[11px] font-semibold leading-5 text-text-soft">{meta.hint}</span>}
        <input
          type={meta.type === 'number' ? 'number' : meta.type === 'url' ? 'url' : 'text'}
          min={
            key === 'min_call_duration_sec' || key.startsWith('meli_pattern')
              ? 0
              : key === 'call_lock_minutes' || key === 'lead_pool_auto_return_hours'
                ? 1
                : undefined
          }
          max={key === 'qa_sample_percent' ? 100 : undefined}
          placeholder={meta.placeholder}
          value={value == null ? '' : String(value)}
          onChange={(e) => setSettings((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))}
          className={cn(fieldClass, meta.type === 'url' && 'ltr-nums text-left')}
        />
      </label>
    )
  }

  return (
    <Page withNav={false}>
      <ScreenHeader sticky showBack title="تنظیمات سیستم" icon={Server} iconTone="primary" />

      <div className="space-y-5 px-4 pb-24 pt-2">
        {!settings ? (
          <div className="mx-auto rounded-[20px] border border-border/60 bg-surface-soft px-4 py-10 text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            <p className="text-sm font-semibold text-text">در حال بارگذاری تنظیمات…</p>
          </div>
        ) : (
          <>
              <section className="space-y-3">
                <h2 className="flex items-center gap-1.5 px-1 text-[12px] font-bold text-text-soft">
                  <Radio size={13} />
                  تماس و تلفن
                </h2>
                {ADMIN_TELEPHONY_KEYS.map((key) => renderField(key))}
                <button
                  type="button"
                  disabled={testingVoip}
                  onClick={() => void onTestVoip()}
                  className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-[#3390EC]/25 bg-[#3390EC]/10 py-3 text-sm font-extrabold text-[#3390EC] dark:border-[#8774E1]/25 dark:bg-[#8774E1]/10 dark:text-[#8774E1]"
                >
                  <Radio size={16} />
                  {testingVoip ? 'در حال تست…' : 'تست اتصال VoIP'}
                </button>
              </section>

              <section className="space-y-3">
                <h2 className="flex items-center gap-1.5 px-1 text-[12px] font-bold text-text-soft">
                  <Server size={13} />
                  عملیات فروش
                </h2>
                {ADMIN_OPERATIONAL_KEYS.map((key) => renderField(key))}
              </section>

              <CatalogSettingsSection />

              <BahramBridgeSettingsSection settings={settings} setSettings={setSettings} />

              <BackupSettingsSection />

              <CloudflareSettingsSection />

              <section className="space-y-3">
                <h2 className="flex items-center gap-1.5 px-1 text-[12px] font-bold text-text-soft">
                  <ShieldCheck size={13} />
                  کیفیت و تماس پی‌درپی
                </h2>
                {ADMIN_QA_KEYS.map((key) => renderField(key))}
              </section>

              <section className="space-y-3">
                <h2 className="flex items-center gap-1.5 px-1 text-[12px] font-bold text-text-soft">
                  <MessageSquare size={13} />
                  پنل ملی‌پیامک
                </h2>
                <p className="px-1 text-[11px] font-semibold leading-5 text-text-muted">
                  نام کاربری و رمز پنل payamak-panel.com را اینجا وارد کنید. پس از ذخیره، با «تست اتصال» اعتبار پنل را
                  بررسی کنید.
                </p>
                <div className="glass-card space-y-3 rounded-[20px] border border-white/55 p-4 dark:border-white/10">
                  {ADMIN_SMS_PANEL_KEYS.map((key) => renderField(key, true))}
                  <button
                    type="button"
                    disabled={testingSms}
                    onClick={() => void onTestMelipayamak()}
                    className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-[#3390EC]/25 bg-[#3390EC]/10 py-3 text-sm font-extrabold text-[#3390EC] dark:border-[#8774E1]/25 dark:bg-[#8774E1]/10 dark:text-[#8774E1]"
                  >
                    <MessageSquare size={16} />
                    {testingSms ? 'در حال تست…' : 'تست اتصال ملی‌پیامک'}
                  </button>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="flex items-center gap-1.5 px-1 text-[12px] font-bold text-text-soft">
                  <MessageSquare size={13} />
                  قالب‌های پیامک
                </h2>
                <p className="px-1 text-[11px] font-semibold leading-5 text-text-muted">
                  برای هر نوع پیامک، کد پترن پنل ملی‌پیامک و در صورت نیاز لینک مقصد را وارد کنید. مقدار ۰ یعنی آن
                  قالب غیرفعال است.
                </p>
                {ADMIN_SMS_TEMPLATE_GROUPS.map((group) => (
                  <div
                    key={group.patternKey}
                    className="glass-card space-y-3 rounded-[20px] border border-white/55 p-4 dark:border-white/10"
                  >
                    <div>
                      <p className="text-[14px] font-bold text-text">{group.title}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-text-soft">{group.description}</p>
                    </div>
                    {renderField(group.patternKey, true)}
                    {group.linkKey ? renderField(group.linkKey, true) : null}
                  </div>
                ))}
              </section>

              {otherEntries.length > 0 && (
                <section className="space-y-3">
                  <h2 className="px-1 text-[12px] font-bold text-text-soft">سایر تنظیمات</h2>
                  {otherEntries.map(([key]) => renderField(key))}
                </section>
              )}
          </>
        )}

        <button
          type="button"
          disabled={!settings || saving}
          onClick={onSave}
          className="w-full rounded-[18px] bg-primary-600 py-3.5 text-sm font-extrabold text-white disabled:opacity-50"
        >
          {saving ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}
        </button>
      </div>
    </Page>
  )
}
