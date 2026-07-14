import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Server, Radio } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { useStore } from '@/store/useStore'
import { fetchAppSettings, updateAppSettings, type AppSettings } from '@/services/admin'
import { ADMIN_SETTING_LABELS, mapRuntimeAppSettings } from '@/lib/appSettings'
import { DataGate } from '@/components/pwa/DataGate'
import { testVoipConnection } from '@/services/offlineQueue'

const OPERATIONAL_KEYS = [
  'min_call_duration_sec',
  'call_lock_minutes',
  'lead_pool_auto_return_hours',
  'payout_minimum_amount',
] as const

const TELEPHONY_KEYS = [
  'native_call_enabled',
  'voip_enabled',
  'default_call_method',
  'voip_provider',
  'voip_fallback_to_native',
] as const

const ALL_PRIORITY_KEYS = [...OPERATIONAL_KEYS, ...TELEPHONY_KEYS] as const

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
      for (const key of OPERATIONAL_KEYS) {
        const raw = normalized[key]
        if (raw === '' || raw == null) continue
        normalized[key] = Number(raw)
      }
      for (const key of ['native_call_enabled', 'voip_enabled', 'voip_fallback_to_native'] as const) {
        normalized[key] = normalized[key] === true || normalized[key] === 'true' || normalized[key] === 1
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
    ? Object.entries(settings).filter(([key]) => !ALL_PRIORITY_KEYS.includes(key as (typeof ALL_PRIORITY_KEYS)[number]))
    : []

  const renderField = (key: (typeof ALL_PRIORITY_KEYS)[number]) => {
    if (!settings) return null
    const meta = ADMIN_SETTING_LABELS[key]
    const value = settings[key]

    if (meta?.type === 'boolean') {
      const checked = value === true || value === 'true' || value === 1
      return (
        <label
          key={key}
          className="glass-card flex items-center justify-between rounded-2xl border border-white/55 p-4 dark:border-white/10"
        >
          <div>
            <span className="block text-[14px] font-bold text-text">{meta.label}</span>
            {meta.hint && <span className="mt-1 block text-[11px] font-semibold text-text-soft">{meta.hint}</span>}
          </div>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setSettings((prev) => (prev ? { ...prev, [key]: e.target.checked } : prev))}
            className="h-5 w-5 accent-primary-600"
          />
        </label>
      )
    }

    if (meta?.type === 'select' && meta.options) {
      return (
        <label key={key} className="glass-card block rounded-2xl border border-white/55 p-4 dark:border-white/10">
          <span className="mb-2 block text-[14px] font-bold text-text">{meta.label}</span>
          <select
            value={String(value ?? meta.options[0]?.value)}
            onChange={(e) => setSettings((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))}
            className="w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-[14px] font-semibold text-text"
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
      <label key={key} className="glass-card block rounded-2xl border border-white/55 p-4 dark:border-white/10">
        <span className="mb-1 block text-[14px] font-bold text-text">{meta?.label ?? key}</span>
        {meta?.hint && <span className="mb-2 block text-[11px] font-semibold text-text-soft">{meta.hint}</span>}
        <input
          type={meta?.type === 'number' ? 'number' : 'text'}
          min={key === 'min_call_duration_sec' ? 0 : undefined}
          value={value == null ? '' : String(value)}
          onChange={(e) => setSettings((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))}
          className="w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-[14px] font-semibold text-text"
        />
      </label>
    )
  }

  return (
    <Page withNav={false}>
      <ScreenHeader sticky showBack title="تنظیمات سیستم" icon={Server} iconTone="primary" />

      <DataGate mode="placeholder">
        <div className="space-y-4 px-4 pb-24 pt-2">
          {settings && (
            <>
              <section className="space-y-3">
                <h2 className="px-1 text-[12px] font-bold text-text-soft">تنظیمات تماس</h2>
                {TELEPHONY_KEYS.map(renderField)}
                <button
                  type="button"
                  disabled={testingVoip}
                  onClick={() => void onTestVoip()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary-500/30 bg-primary-50 py-3 text-sm font-extrabold text-primary-700 dark:bg-primary-500/10 dark:text-primary-200"
                >
                  <Radio size={16} />
                  {testingVoip ? 'در حال تست…' : 'تست اتصال VoIP'}
                </button>
              </section>

              <section className="space-y-3">
                <h2 className="px-1 text-[12px] font-bold text-text-soft">تنظیمات عملیاتی</h2>
                {OPERATIONAL_KEYS.map(renderField)}
              </section>

              {otherEntries.length > 0 && (
                <section className="space-y-3">
                  <h2 className="px-1 text-[12px] font-bold text-text-soft">سایر تنظیمات</h2>
                  {otherEntries.map(([key, value]) => (
                    <label
                      key={key}
                      className="glass-card block rounded-2xl border border-white/55 p-4 dark:border-white/10"
                    >
                      <span className="mb-2 block text-[12px] font-bold text-text-soft">{key}</span>
                      <input
                        type="text"
                        value={value == null ? '' : String(value)}
                        onChange={(e) =>
                          setSettings((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))
                        }
                        className="w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-[14px] font-semibold text-text"
                      />
                    </label>
                  ))}
                </section>
              )}
            </>
          )}

          <button
            type="button"
            disabled={!settings || saving}
            onClick={onSave}
            className="w-full rounded-2xl bg-primary-600 py-3.5 text-sm font-extrabold text-white disabled:opacity-50"
          >
            {saving ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}
          </button>
        </div>
      </DataGate>
    </Page>
  )
}
