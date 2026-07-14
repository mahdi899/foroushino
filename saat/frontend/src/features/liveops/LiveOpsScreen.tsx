import { useEffect, useState } from 'react'
import { Activity, PhoneCall, Users } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { DataGate } from '@/components/pwa/DataGate'
import { fetchLiveOpsDashboard } from '@/services/reports'
import { toFa } from '@/lib/format'

export function LiveOpsScreen() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchLiveOpsDashboard>> | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchLiveOpsDashboard()
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const kpis = data?.kpis

  return (
    <Page>
      <ScreenHeader sticky title="عملیات زنده" subtitle="مرکز فرمان مدیریتی" icon={Activity} iconTone="primary" />
      <DataGate mode="placeholder">
        <div className="space-y-3 px-4 pb-24 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <KpiCard icon={PhoneCall} label="تماس امروز" value={toFa(kpis?.calls_today ?? 0)} />
            <KpiCard icon={Users} label="نرخ تماس" value={`${toFa(kpis?.contact_rate ?? 0)}٪`} />
            <KpiCard icon={Activity} label="AHT" value={`${toFa(kpis?.aht_sec ?? 0)}ث`} />
            <KpiCard icon={PhoneCall} label="فروش امروز" value={toFa(kpis?.sales_today ?? 0)} />
          </div>
          <div className="glass-card rounded-2xl border border-white/55 p-4 dark:border-white/10">
            <p className="text-[12px] font-bold text-text-soft">صف و پیگیری</p>
            <p className="mt-2 text-[14px] font-extrabold text-text">
              {toFa(data?.queued_leads ?? 0)} لید در صف — {toFa(data?.overdue_followups ?? 0)} پیگیری معوق
            </p>
          </div>
        </div>
      </DataGate>
    </Page>
  )
}

function KpiCard({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="glass-card rounded-2xl border border-white/55 p-4 dark:border-white/10">
      <Icon size={16} className="text-primary-600" />
      <p className="mt-2 text-[11px] font-bold text-text-soft">{label}</p>
      <p className="text-[18px] font-black text-text">{value}</p>
    </div>
  )
}
