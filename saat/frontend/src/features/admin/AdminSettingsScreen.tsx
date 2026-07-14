import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Server } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { useStore } from '@/store/useStore'
import { fetchAppSettings, updateAppSettings, type AppSettings } from '@/services/admin'
import { DataGate } from '@/components/pwa/DataGate'

export function AdminSettingsScreen() {
  const navigate = useNavigate()
  const hasPermission = useStore((s) => s.hasPermission)
  const pushToast = useStore((s) => s.pushToast)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saving, setSaving] = useState(false)

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
      const updated = await updateAppSettings(settings)
      setSettings(updated)
      pushToast('تنظیمات ذخیره شد.', 'success')
    } catch {
      pushToast('ذخیره تنظیمات ناموفق بود.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page withNav={false}>
      <ScreenHeader sticky showBack title="تنظیمات سیستم" icon={Server} iconTone="primary" />

      <DataGate mode="placeholder">
        <div className="space-y-4 px-4 pb-24 pt-2">
          {settings &&
            Object.entries(settings).map(([key, value]) => (
              <label key={key} className="glass-card block rounded-2xl border border-white/55 p-4 dark:border-white/10">
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
