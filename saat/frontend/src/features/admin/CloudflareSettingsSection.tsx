import { useEffect, useState } from 'react'
import { Cloud, Loader2, RefreshCw, Shield, Zap } from 'lucide-react'
import {
  applyCloudflareEdge,
  fetchCloudflareSettings,
  purgeCloudflareCache,
  setCloudflareDevelopmentMode,
  testCloudflareConnection,
  updateCloudflareSettings,
  type CloudflareView,
} from '@/services/cloudflare'
import { cn } from '@/lib/cn'

const fieldClass = cn(
  'glass-inset w-full rounded-[14px] border border-white/55 px-3 py-3 text-[14px] font-semibold text-text',
  'outline-none focus:border-[#3390EC]/35 dark:border-white/10',
)

export function CloudflareSettingsSection() {
  const [view, setView] = useState<CloudflareView | null>(null)
  const [zoneId, setZoneId] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [purging, setPurging] = useState(false)
  const [applying, setApplying] = useState(false)
  const [devModeBusy, setDevModeBusy] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchCloudflareSettings()
      .then((data) => {
        if (cancelled) return
        setView(data)
        setZoneId(data.cloudflare_zone_id ?? '')
      })
      .catch(() => {
        if (!cancelled) setStatus('بارگذاری تنظیمات Cloudflare ناموفق بود.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const onSave = async () => {
    setSaving(true)
    setStatus('')
    try {
      const updated = await updateCloudflareSettings({
        cloudflare_zone_id: zoneId.trim(),
        cloudflare_api_token_input: tokenInput.trim(),
      })
      setView(updated)
      setTokenInput('')
      setStatus('تنظیمات Cloudflare ذخیره شد.')
    } catch {
      setStatus('ذخیره تنظیمات Cloudflare ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  const onTest = async () => {
    setTesting(true)
    setStatus('')
    try {
      const result = await testCloudflareConnection()
      setStatus(result.message)
    } catch {
      setStatus('تست اتصال Cloudflare ناموفق بود.')
    } finally {
      setTesting(false)
    }
  }

  const onPurge = async () => {
    setPurging(true)
    setStatus('')
    try {
      const result = await purgeCloudflareCache()
      setStatus(result.message)
    } catch {
      setStatus('پاک‌سازی کش Cloudflare ناموفق بود.')
    } finally {
      setPurging(false)
    }
  }

  const onApplyEdge = async () => {
    setApplying(true)
    setStatus('')
    try {
      const result = await applyCloudflareEdge()
      const steps = result.steps?.map((s) => `${s.ok ? '✓' : '✗'} ${s.detail}`).join(' — ') ?? ''
      setStatus(`${result.message}${steps ? ` (${steps})` : ''}`)
      const refreshed = await fetchCloudflareSettings()
      setView(refreshed)
    } catch {
      setStatus('اعمال قوانین کش Cloudflare ناموفق بود.')
    } finally {
      setApplying(false)
    }
  }

  const onToggleDevMode = async (enabled: boolean) => {
    setDevModeBusy(true)
    setStatus('')
    try {
      const result = await setCloudflareDevelopmentMode(enabled)
      setStatus(result.message)
      const refreshed = await fetchCloudflareSettings()
      setView(refreshed)
    } catch {
      setStatus('تغییر Development Mode ناموفق بود.')
    } finally {
      setDevModeBusy(false)
    }
  }

  if (loading) {
    return (
      <section className="space-y-3">
        <h2 className="flex items-center gap-1.5 px-1 text-[12px] font-bold text-text-soft">
          <Cloud size={13} />
          Cloudflare CDN
        </h2>
        <div className="glass-card rounded-[20px] border border-white/55 p-6 text-center text-sm font-semibold text-text-soft dark:border-white/10">
          در حال بارگذاری…
        </div>
      </section>
    )
  }

  const configured = view?.cloudflare_configured ?? false
  const devMode = view?.cloudflare_dev_mode === true

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-1.5 px-1 text-[12px] font-bold text-text-soft">
        <Cloud size={13} />
        Cloudflare CDN
      </h2>
      <p className="px-1 text-[11px] font-semibold leading-5 text-text-muted">
        برای رفع کش قدیمی API، ناظرها و عکس پروفایل — Zone ID و API Token را وارد کنید. Token باید دسترسی{' '}
        <span className="font-bold">Zone Settings Edit</span>، <span className="font-bold">Cache Purge</span> و{' '}
        <span className="font-bold">Cache Rules Edit</span> داشته باشد.
      </p>

      <div className="glass-card space-y-3 rounded-[20px] border border-white/55 p-4 dark:border-white/10">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-bold text-text">وضعیت اتصال</span>
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[11px] font-extrabold',
              configured ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
            )}
          >
            {configured ? 'پیکربندی شده' : 'نیاز به تنظیم'}
          </span>
        </div>

        <label className="block">
          <span className="mb-1 block text-[13px] font-bold text-text">Zone ID</span>
          <input
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            placeholder="مثال: a1b2c3d4e5f6..."
            className={cn(fieldClass, 'ltr-nums text-left')}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[13px] font-bold text-text">API Token</span>
          {view?.has_cloudflare_api_token && !tokenInput && view.cloudflare_api_token_preview && (
            <span className="mb-2 block text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              ذخیره‌شده: {view.cloudflare_api_token_preview}
            </span>
          )}
          <input
            type="password"
            autoComplete="new-password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder={view?.has_cloudflare_api_token ? 'توکن جدید (اختیاری)' : 'API Token از داشبورد Cloudflare'}
            className={cn(fieldClass, 'ltr-nums text-left')}
          />
        </label>

        <button
          type="button"
          disabled={saving}
          onClick={() => void onSave()}
          className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-[#3390EC]/25 bg-[#3390EC]/10 py-3 text-sm font-extrabold text-[#3390EC] dark:border-[#8774E1]/25 dark:bg-[#8774E1]/10 dark:text-[#8774E1]"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
          {saving ? 'در حال ذخیره…' : 'ذخیره اعتبارنامه Cloudflare'}
        </button>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={testing || !configured}
            onClick={() => void onTest()}
            className="flex items-center justify-center gap-2 rounded-[16px] border border-border/60 bg-surface-soft py-2.5 text-[13px] font-bold text-text disabled:opacity-50"
          >
            {testing ? <Loader2 size={15} className="animate-spin" /> : <Cloud size={15} />}
            تست اتصال
          </button>
          <button
            type="button"
            disabled={purging || !configured}
            onClick={() => void onPurge()}
            className="flex items-center justify-center gap-2 rounded-[16px] border border-amber-500/30 bg-amber-500/10 py-2.5 text-[13px] font-bold text-amber-800 dark:text-amber-300 disabled:opacity-50"
          >
            {purging ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            پاک‌سازی کش
          </button>
        </div>

        <button
          type="button"
          disabled={applying || !configured}
          onClick={() => void onApplyEdge()}
          className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-primary-600 py-3 text-sm font-extrabold text-white disabled:opacity-50"
        >
          {applying ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
          اعمال قوانین کش + پاک‌سازی کامل
        </button>

        <div className="flex items-center justify-between gap-3 rounded-[14px] border border-white/40 bg-white/20 p-3 dark:border-white/10 dark:bg-white/5">
          <div>
            <p className="text-[13px] font-bold text-text">Development Mode</p>
            <p className="text-[11px] font-semibold text-text-soft">
              {devMode ? 'روشن — کش لبه ۳ ساعت غیرفعال است' : 'خاموش — برای دیباگ موقت روشن کنید'}
            </p>
          </div>
          <button
            type="button"
            disabled={devModeBusy || !configured}
            onClick={() => void onToggleDevMode(!devMode)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-[12px] font-extrabold',
              devMode ? 'bg-amber-500 text-white' : 'bg-surface-soft text-text',
            )}
          >
            {devModeBusy ? '…' : devMode ? 'خاموش' : 'روشن'}
          </button>
        </div>

        {status && (
          <p className="rounded-[12px] bg-surface-soft px-3 py-2 text-[12px] font-semibold leading-5 text-text-soft">
            {status}
          </p>
        )}
      </div>
    </section>
  )
}
