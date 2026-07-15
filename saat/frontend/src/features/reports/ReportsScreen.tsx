import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Target, CheckCircle2, Flame, BarChart3, TriangleAlert, ChevronLeft, BadgeDollarSign, History } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { StatTile } from '@/components/domain/StatTile'
import { LeaderboardRow } from '@/components/domain/LeaderboardRow'
import { InsightCard } from '@/components/domain/InsightCard'
import { FunnelCard, SourceCard, TeamCard } from './widgets'
import { DataGate } from '@/components/pwa/DataGate'
import { hasPermission } from '@/lib/permissions'
import { agentById } from '@/lib/teamUtils'
import { relativeDayTime, formatIsoDateJalali } from '@/lib/format'
import {
  computeFunnel,
  computeManagerInsights,
  computeSourcePerf,
  computeTeamRows,
  overdueFollowupsList,
  pendingConfirmationSales,
  weakAgents,
} from '@/lib/reportUtils'
import { formatMoney, toFa } from '@/lib/format'
import { localizeActivityTitle } from '@/lib/activityLabels'
import { apiMode } from '@/services'
import { fetchReportsBundle, type ReportsApiPayload } from '@/services/reports'

export function ReportsScreen() {
  const navigate = useNavigate()
  const permissions = useStore((s) => s.permissions)
  const agents = useStore((s) => s.agents)
  const teams = useStore((s) => s.teams)
  const leads = useStore((s) => s.leads)
  const followups = useStore((s) => s.followups)
  const sales = useStore((s) => s.sales)
  const activity = useStore((s) => s.activity)
  const teamReports = useStore((s) => s.teamReports)
  const canViewSystem = hasPermission(permissions, 'reports.view-all')
  const [tab, setTab] = useState('overview')
  const [remoteReports, setRemoteReports] = useState<ReportsApiPayload | null>(null)

  useEffect(() => {
    if (apiMode !== 'http') return
    let cancelled = false
    fetchReportsBundle()
      .then((payload) => {
        if (!cancelled) setRemoteReports(payload)
      })
      .catch(() => {
        if (!cancelled) setRemoteReports(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const tabs = useMemo(
    () =>
      canViewSystem
        ? [
            { id: 'overview', label: 'کلی' },
            { id: 'funnel', label: 'قیف فروش' },
            { id: 'team', label: 'تیم' },
            { id: 'sources', label: 'منابع' },
            { id: 'activity', label: 'فعالیت' },
          ]
        : [
            { id: 'overview', label: 'کلی' },
            { id: 'funnel', label: 'قیف فروش' },
            { id: 'team', label: 'تیم' },
            { id: 'sources', label: 'منابع' },
          ],
    [canViewSystem],
  )

  const teamAgents = agents.filter((a) => a.role === 'agent')
  const totalCalls = teamAgents.reduce((s, a) => s + a.callsToday, 0)
  const totalSuccess = teamAgents.reduce((s, a) => s + a.successfulToday, 0)
  const avgConversion = Math.round(
    teamAgents.reduce((s, a) => s + a.conversionRate, 0) / (teamAgents.length || 1),
  )
  const hotLeads = leads.filter((l) => l.temperature === 'hot').length
  const ranked = [...teamAgents].sort((a, b) => b.callsToday - a.callsToday)

  const funnel = useMemo(() => computeFunnel(leads), [leads])
  const sourcePerf = useMemo(() => computeSourcePerf(leads), [leads])
  const teamRows = useMemo(() => computeTeamRows(agents, teams), [agents, teams])
  const weak = useMemo(() => weakAgents(agents), [agents])
  const remoteWeakAgents = remoteReports?.weak_agents ?? []
  const suspiciousAgents = remoteReports?.suspicious ?? []
  const overdue = useMemo(() => overdueFollowupsList(followups), [followups])
  const pendingSales = useMemo(() => pendingConfirmationSales(sales), [sales])
  const wonCount = leads.filter((l) => l.stage === 'won').length

  const insights = useMemo(
    () =>
      computeManagerInsights({
        teamRows,
        sourcePerf,
        weak,
        overdueCount: overdue.length,
        pendingSales: pendingSales.length,
      }),
    [teamRows, sourcePerf, weak, overdue.length, pendingSales.length],
  )

  return (
    <Page>
      <ScreenHeader
        sticky
        title="گزارش‌ها"
        subtitle={canViewSystem ? 'تحلیل کل سازمان' : 'تحلیل عملکرد تیم'}
        icon={BarChart3}
        iconTone="primary"
        showBack
        onBack={() => navigate('/profile')}
      >
        <div className="mt-3">
          <SegmentedTabs value={tab} onChange={setTab} tabs={tabs} />
        </div>
      </ScreenHeader>

      <DataGate mode="placeholder">
      <div className="space-y-5 px-4 pt-4">
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile icon={<Phone size={18} />} value={totalCalls} label="تماس امروز" />
              <StatTile icon={<CheckCircle2 size={18} />} value={totalSuccess} label="تماس موفق" tone="success" />
              <StatTile icon={<Target size={18} />} value={`${toFa(avgConversion)}٪`} label="نرخ تبدیل" tone="secondary" />
              <StatTile icon={<Flame size={18} />} value={hotLeads} label="مشتری داغ" tone="accent" />
            </div>

            {pendingSales.length > 0 && (
              <button
                onClick={() => navigate('/sales')}
                className="flex w-full items-center gap-3 rounded-2xl bg-warning-50 p-4 text-right"
              >
                <BadgeDollarSign size={20} className="shrink-0 text-warning-600" />
                <span className="flex-1 text-[13px] font-extrabold text-warning-700">
                  {toFa(pendingSales.length)} فروش در صف تایید توست
                </span>
                <ChevronLeft size={16} className="shrink-0 text-warning-400" />
              </button>
            )}

            <section>
              <h2 className="mb-3 text-[15px] font-extrabold text-neutral-900">بینش‌های مدیریتی</h2>
              <div className="space-y-2.5">
                {insights.map((ins) => (
                  <InsightCard key={ins.id} tone={ins.tone} title={ins.title} body={ins.body} />
                ))}
              </div>
            </section>

            {remoteWeakAgents.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-extrabold text-neutral-900">
                  <TriangleAlert size={16} className="text-warning-500" />
                  کارشناسان ضعیف (API)
                </h2>
                <div className="space-y-2">
                  {remoteWeakAgents.map((row) => (
                    <div key={row.agent_id} className="glass-card rounded-2xl p-3 text-[13px] font-bold">
                      {row.name} — {toFa(row.calls)} تماس / {toFa(row.success_rate)}٪ موفق
                    </div>
                  ))}
                </div>
              </section>
            )}

            {weak.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-extrabold text-neutral-900">
                  <TriangleAlert size={16} className="text-warning-500" />
                  کارشناسان نیازمند بررسی
                </h2>
                <div className="space-y-2">
                  {weak.map((a, i) => (
                    <LeaderboardRow key={a.id} agent={a} rank={i + 1} metric={a.callsToday} />
                  ))}
                </div>
              </section>
            )}

            {suspiciousAgents.length > 0 && (
              <section>
                <h2 className="mb-3 text-[15px] font-extrabold text-neutral-900">الگوهای مشکوک</h2>
                <div className="space-y-2">
                  {suspiciousAgents.map((row) => (
                    <div key={`${row.agent_id}-${row.reason}`} className="glass-card rounded-2xl p-3 text-[12px] font-semibold">
                      <span className="font-extrabold">{row.name}</span> — {row.reason}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {overdue.length > 0 && (
              <button
                onClick={() => navigate('/followups')}
                className="flex w-full items-center gap-3 rounded-2xl bg-error-50 p-4 text-right"
              >
                <TriangleAlert size={20} className="shrink-0 text-error-600" />
                <span className="flex-1 text-[13px] font-extrabold text-error-700">
                  {toFa(overdue.length)} پیگیری عقب‌افتاده در کل تیم
                </span>
                <ChevronLeft size={16} className="shrink-0 text-error-400" />
              </button>
            )}
          </>
        )}

        {tab === 'funnel' && (
          <>
            <FunnelCard funnel={funnel} />
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile icon={<Target size={18} />} value={`${toFa(avgConversion)}٪`} label="نرخ تبدیل کل" tone="secondary" />
              <StatTile icon={<CheckCircle2 size={18} />} value={toFa(wonCount)} label="فروش موفق" tone="success" />
            </div>
            <div className="rounded-2xl bg-primary-50 p-4 text-[12px] font-bold leading-6 text-primary-700">
              مجموع ارزش فروش‌های تاییدشده: {formatMoney(sales.filter((s) => s.status === 'confirmed').reduce((sum, s) => sum + s.amount, 0))} تومان
            </div>
          </>
        )}

        {tab === 'team' && (
          <>
            <TeamCard teams={teamRows} />
            <section>
              <h2 className="mb-3 text-[15px] font-extrabold text-neutral-900">عملکرد کارشناسان</h2>
              <div className="space-y-2">
                {ranked.map((a, i) => (
                  <LeaderboardRow key={a.id} agent={a} rank={i + 1} metric={a.callsToday} />
                ))}
              </div>
            </section>
          </>
        )}

        {tab === 'sources' && (
          <>
            <SourceCard sources={sourcePerf} />
          </>
        )}

        {tab === 'activity' && canViewSystem && (
          <>
            <button
              onClick={() => navigate('/activity')}
              className="flex w-full items-center gap-3 rounded-2xl bg-primary-50 p-4 text-right"
            >
              <History size={20} className="shrink-0 text-primary-600" />
              <span className="flex-1 text-[13px] font-extrabold text-primary-700">
                مشاهده تاریخچه کامل فعالیت
              </span>
              <ChevronLeft size={16} className="shrink-0 text-primary-400" />
            </button>

            <section>
              <h2 className="mb-3 text-[15px] font-extrabold text-neutral-900">آخرین رویدادها</h2>
              <div className="space-y-2">
                {[...activity]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 12)
                  .map((item) => {
                    const actor = agentById(agents, item.agentId)
                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-border/60 bg-surface p-3.5 shadow-card"
                      >
                        <p className="text-[13px] font-extrabold text-neutral-900">{localizeActivityTitle(item.title)}</p>
                        <p className="mt-0.5 text-[11px] font-bold text-neutral-400">
                          {actor ? `${actor.firstName} ${actor.lastName}` : 'سیستم'}
                          {item.meta ? ` · ${item.meta}` : ''}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold text-neutral-300">
                          {relativeDayTime(item.createdAt)}
                        </p>
                      </div>
                    )
                  })}
              </div>
            </section>

            {teamReports.length > 0 && (
              <section>
                <h2 className="mb-3 text-[15px] font-extrabold text-neutral-900">گزارش‌های تیم</h2>
                <div className="space-y-2">
                  {teamReports.slice(0, 5).map((report) => (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => navigate('/team-reports')}
                      className="flex w-full items-center justify-between rounded-2xl bg-surface p-3.5 text-right shadow-card border border-border/60"
                    >
                      <span className="text-[13px] font-extrabold text-neutral-900">
                        {report.teamName} · {formatIsoDateJalali(report.reportDate)}
                      </span>
                      <ChevronLeft size={16} className="text-neutral-400" />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
      </DataGate>
    </Page>
  )
}
