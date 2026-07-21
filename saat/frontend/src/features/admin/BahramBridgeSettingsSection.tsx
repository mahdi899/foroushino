import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { Copy, Link2, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { apiErrorMessage } from '@/lib/apiErrors'
import { getAdminSettingMeta } from '@/lib/appSettings'
import {
  createIntegrationToken,
  fetchIntegrationTokens,
  revokeIntegrationToken,
  type IntegrationTokenRow,
} from '@/services/admin'
import { useStore } from '@/store/useStore'

const fieldClass = cn(
  'glass-inset w-full rounded-[14px] border border-white/55 px-3 py-3 text-[14px] font-semibold text-text',
  'outline-none focus:border-[#3390EC]/35 dark:border-white/10',
)

const PRODUCTION_APPLICATIONS_URL = 'https://sat.center/api/v1/integrations/inbound/applications'
const PRODUCTION_PING_URL = 'https://sat.center/api/v1/integrations/inbound/ping'

type Props = {
  settings: Record<string, string | number | boolean | null>
  setSettings: Dispatch<SetStateAction<Record<string, string | number | boolean | null> | null>>
}

export function BahramBridgeSettingsSection({ settings, setSettings }: Props) {
  const pushToast = useStore((s) => s.pushToast)
  const [tokens, setTokens] = useState<IntegrationTokenRow[]>([])
  const [applicationsUrl, setApplicationsUrl] = useState(PRODUCTION_APPLICATIONS_URL)
  const [pingUrl, setPingUrl] = useState(PRODUCTION_PING_URL)
  const [tokenName, setTokenName] = useState('Bahram production')
  const [createdPlain, setCreatedPlain] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchIntegrationTokens()
      .then((data) => {
        if (cancelled) return
        setTokens(data.tokens)
        if (data.inbound_applications_url) setApplicationsUrl(data.inbound_applications_url)
        if (data.inbound_ping_url) setPingUrl(data.inbound_ping_url)
      })
      .catch(() => {
        if (!cancelled) pushToast('بارگذاری توکن‌های اتصال بهرام ناموفق بود.', 'error')
      })
    return () => {
      cancelled = true
    }
  }, [pushToast])

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      pushToast('کپی شد.', 'success')
    } catch {
      pushToast('کپی ناموفق بود.', 'error')
    }
  }

  const onCreateToken = async () => {
    setBusy(true)
    setCreatedPlain(null)
    try {
      const result = await createIntegrationToken(tokenName.trim() || 'Bahram production')
      setCreatedPlain(result.token.plain_text)
      setTokens((prev) => [
        {
          id: result.token.id,
          name: result.token.name,
          abilities: ['inbound:applications'],
          created_by_name: null,
          last_used_at: null,
          revoked_at: null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])
      if (result.inbound_applications_url) setApplicationsUrl(result.inbound_applications_url)
      if (result.inbound_ping_url) setPingUrl(result.inbound_ping_url)
      pushToast('توکن ساخته شد — فقط یک‌بار نمایش داده می‌شود.', 'success')
    } catch (error) {
      pushToast(apiErrorMessage(error, 'ایجاد توکن ناموفق بود.'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const onRevoke = async (id: number) => {
    try {
      await revokeIntegrationToken(id)
      setTokens((rows) =>
        rows.map((row) => (row.id === id ? { ...row, revoked_at: new Date().toISOString() } : row)),
      )
      pushToast('توکن لغو شد.', 'success')
    } catch (error) {
      pushToast(apiErrorMessage(error, 'لغو توکن ناموفق بود.'), 'error')
    }
  }

  const renderBridgeField = (key: 'bahram_callback_url' | 'bahram_callback_token') => {
    const meta = getAdminSettingMeta(key)
    const configured =
      key === 'bahram_callback_token' && settings.bahram_callback_token_configured === true
    const value = settings[key]

    return (
      <label key={key} className="block space-y-1.5">
        <span className="px-1 text-[12px] font-bold text-text">{meta.label}</span>
        {meta.hint ? <p className="px-1 text-[11px] font-semibold text-text-muted">{meta.hint}</p> : null}
        <input
          type={meta.type === 'password' ? 'password' : 'url'}
          dir="ltr"
          className={cn(fieldClass, 'ltr-nums text-left')}
          placeholder={
            configured ? 'ذخیره‌شده — برای تغییر مقدار جدید وارد کنید' : meta.placeholder
          }
          value={value == null ? '' : String(value)}
          onChange={(e) =>
            setSettings((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))
          }
        />
      </label>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-1.5 px-1 text-[12px] font-bold text-text-soft">
        <Link2 size={13} />
        اتصال بهرام (rostami.app)
      </h2>
      <p className="px-1 text-[11px] font-semibold leading-5 text-text-muted">
        درخواست‌های پذیرفته‌شده از بهرام به آدرس زیر می‌آیند. وضعیت لیدها از طریق کال‌بک به دامنهٔ بهرام برمی‌گردد.
        هر دو طرف با Bearer + HMAC + Proxy-Origin محافظت می‌شوند.
      </p>

      <div className="glass-card space-y-3 rounded-[20px] border border-white/55 p-4 dark:border-white/10">
        <div>
          <span className="px-1 text-[12px] font-bold text-text">آدرس دریافت درخواست (برای پنل بهرام)</span>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="block flex-1 overflow-x-auto rounded-[12px] bg-black/5 px-3 py-2 text-[11px] dark:bg-white/5" dir="ltr">
              {applicationsUrl || PRODUCTION_APPLICATIONS_URL}
            </code>
            <button type="button" onClick={() => void copy(applicationsUrl || PRODUCTION_APPLICATIONS_URL)} className="text-primary">
              <Copy size={16} />
            </button>
          </div>
        </div>
        <div>
          <span className="px-1 text-[12px] font-bold text-text">آدرس تست اتصال</span>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="block flex-1 overflow-x-auto rounded-[12px] bg-black/5 px-3 py-2 text-[11px] dark:bg-white/5" dir="ltr">
              {pingUrl || PRODUCTION_PING_URL}
            </code>
            <button type="button" onClick={() => void copy(pingUrl || PRODUCTION_PING_URL)} className="text-primary">
              <Copy size={16} />
            </button>
          </div>
        </div>

        {renderBridgeField('bahram_callback_url')}
        {renderBridgeField('bahram_callback_token')}

        <div className="space-y-2 border-t border-border/50 pt-3">
          <span className="px-1 text-[12px] font-bold text-text">توکن ورودی برای بهرام</span>
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[160px] flex-1">
              <span className="mb-1 block px-1 text-[11px] font-semibold text-text-muted">نام</span>
              <input className={fieldClass} value={tokenName} onChange={(e) => setTokenName(e.target.value)} />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onCreateToken()}
              className="inline-flex items-center gap-1 rounded-[14px] border border-primary/25 bg-primary/10 px-3 py-3 text-sm font-extrabold text-primary"
            >
              <Plus size={16} />
              ایجاد توکن
            </button>
          </div>
          {createdPlain ? (
            <div className="rounded-[14px] border border-primary/30 bg-primary/10 p-3 text-[12px]">
              <p className="font-bold text-primary">توکن جدید (فقط همین‌اکنون) — در پنل بهرام ذخیره کنید:</p>
              <code className="mt-2 block break-all" dir="ltr">
                {createdPlain}
              </code>
              <button type="button" className="mt-2 font-bold text-primary underline" onClick={() => void copy(createdPlain)}>
                کپی توکن
              </button>
            </div>
          ) : null}
          <ul className="space-y-2">
            {tokens.map((token) => (
              <li
                key={token.id}
                className="flex items-center justify-between gap-2 rounded-[14px] bg-black/5 px-3 py-2 text-[12px] dark:bg-white/5"
              >
                <div>
                  <span className="font-bold">{token.name}</span>
                  <span className="mr-2 text-text-muted">
                    {token.revoked_at ? '· لغوشده' : token.last_used_at ? '· استفاده‌شده' : '· فعال'}
                  </span>
                </div>
                {!token.revoked_at ? (
                  <button type="button" onClick={() => void onRevoke(token.id)} className="text-danger">
                    <Trash2 size={15} />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
