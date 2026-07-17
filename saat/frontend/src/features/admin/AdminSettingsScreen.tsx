import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Radio, Server, ShieldCheck } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { useStore } from '@/store/useStore'
import { fetchAppSettings, updateAppSettings, type AppSettings } from '@/services/admin'
import {
  ADMIN_KNOWN_SETTING_KEYS,
  ADMIN_OPERATIONAL_KEYS,
  ADMIN_QA_KEYS,
  ADMIN_SMS_TEMPLATE_GROUPS,
  ADMIN_TELEPHONY_KEYS,
  getAdminSettingMeta,
  mapRuntimeAppSettings,
} from '@/lib/appSettings'
import { DataGate } from '@/components/pwa/DataGate'
import { testVoipConnection } from '@/services/offlineQueue'
import { cn } from '@/lib/cn'

const BOOLEAN_KEYS = [
  'native_call_enabled',
  'voip_enabled',
  'voip_fallback_to_native',
  'power_dial_default',
] as const

const NUMBER_KEYS = [
  ...ADMIN_OPERATIONAL_KEYS,
  ...ADMIN_QA_KEYS.filter((key) => key !== 'power_dial_default'),
  'meli_pattern_course',
  'meli_pattern_channel',
  'meli_pattern_register',
  'meli_pattern_payment',
  'meli_pattern_custom',
] as const

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
      const normalized: AppSettings = { ...settings }

      for (const key of BOOLEAN_KEYS) {
        if (key in normalized) {
          normalized[key] =
            normalized[key] === true || normalized[key] === 'true' || normalized[key] === 1
        }
      }

      for (const key of NUMBER_KEYS) {
        const raw = normalized[key]
        if (raw === '' || raw == null) continue
        normalized[key] = Number(raw)
      }

      const updated = await updateAppSettings(normalized)
      setSettings(updated)
      setAppSettings(mapRuntimeAppSettings(updated as Record<string, unknown>))
      pushToast('تنظیمات ذخیره شد.', 'success')
    } catch {
      pushToast('ذخیره تنظیمات ناموفق بود.', 'error')
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

    return (
      <label key={key} className={wrapClass}>
        <span className="mb-1 block text-[14px] font-bold text-text">{meta.label}</span>
        {meta.hint && <span className="mb-2 block text-[11px] font-semibold leading-5 text-text-soft">{meta.hint}</span>}
        <input
          type={meta.type === 'number' ? 'number' : meta.type === 'url' ? 'url' : 'text'}
          min={key === 'min_call_duration_sec' || key.startsWith('meli_pattern') ? 0 : undefined}
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

      <DataGate mode="placeholder">
        <div className="space-y-5 px-4 pb-24 pt-2">
          {settings && (
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
                  پیامک ملی‌پرداز
                </h2>
                <p className="px-1 text-[11px] font-semibold leading-5 text-text-muted">
                  برای هر نوع پیامک، کد پترن پنل ملی‌پرداز و در صورت نیاز لینک مقصد را وارد کنید. مقدار ۰ یعنی آن
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
      </DataGate>
    </Page>
  )
}
