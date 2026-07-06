import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Phone,
  Target,
  Flame,
  AlertTriangle,
  Users,
  TrendingUp,
  ArrowLeft,
  BadgeDollarSign,
  TriangleAlert,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { AppHeader } from './AppHeader'
import { StatTile } from '@/components/domain/StatTile'
import { InsightCard } from '@/components/domain/InsightCard'
import { LeaderboardRow } from '@/components/domain/LeaderboardRow'
import {
  computeManagerInsights,
  computeSourcePerf,
  computeTeamRows,
  overdueFollowupsList,
  pendingConfirmationSales,
  weakAgents,
} from '@/lib/reportUtils'
import { roleLabels } from '@/data/labels'
import { toFa } from '@/lib/format'

export function ManagementHome() {
  const navigate = useNavigate()
  const role = useStore((s) => s.role)
  const agents = useStore((s) => s.agents)
  const teams = useStore((s) => s.teams)
  const leads = useStore((s) => s.leads)
  const followups = useStore((s) => s.followups)
  const sales = useStore((s) => s.sales)

  const teamAgents = agents.filter((a) => a.role === 'agent')
  const totalCalls = teamAgents.reduce((sum, a) => sum + a.callsToday, 0)
  const totalSuccess = teamAgents.reduce((sum, a) => sum + a.successfulToday, 0)
  const avgConversion = Math.round(
    teamAgents.reduce((sum, a) => sum + a.conversionRate, 0) / (teamAgents.length || 1),
  )
  const hotLeads = leads.filter((l) => l.temperature === 'hot').length

  const teamRows = useMemo(() => computeTeamRows(agents, teams), [agents, teams])
  const sourcePerf = useMemo(() => computeSourcePerf(leads), [leads])
  const weak = useMemo(() => weakAgents(agents), [agents])
  const overdue = useMemo(() => overdueFollowupsList(followups), [followups])
  const pendingSales = useMemo(() => pendingConfirmationSales(sales), [sales])

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

  const heroByRole: Record<string, { title: string; sub: string }> = {
    leader: { title: 'تیم آلفا امروز', sub: 'عملکرد اعضای تیمت را دنبال کن' },
    supervisor: { title: 'نگاه چند تیمی', sub: 'کیفیت و pipeline تیم‌ها' },
    manager: { title: 'نمای کلان فروش', sub: 'عملکرد کل سازمان' },
  }
  const hero = heroByRole[role] ?? heroByRole.leader

  const topAgents = [...teamAgents].sort((a, b) => b.callsToday - a.callsToday).slice(0, 3)

  return (
    <Page>
      <AppHeader />

      <div className="space-y-5 px-4 pt-2">
        <div
          className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary-600 to-primary-800 p-5 text-white shadow-float"
        >
          <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold">
              {roleLabels[role]}
            </span>
            <h2 className="mt-3 text-[24px] font-black leading-tight">{hero.title}</h2>
            <p className="mt-1 text-[13px] font-bold text-white/80">{hero.sub}</p>
            <div className="mt-4 flex items-center gap-4">
              <div>
                <p className="text-2xl font-black tabular-nums">{toFa(totalCalls)}</p>
                <p className="text-[11px] font-bold text-white/70">تماس امروز</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div>
                <p className="text-2xl font-black tabular-nums">{toFa(avgConversion)}٪</p>
                <p className="text-[11px] font-bold text-white/70">نرخ تبدیل</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div>
                <p className="text-2xl font-black tabular-nums">{toFa(totalSuccess)}</p>
                <p className="text-[11px] font-bold text-white/70">موفق</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <StatTile variant="compact" icon={<Phone size={18} />} value={totalCalls} label="تماس‌ها" />
          <StatTile variant="compact" icon={<Target size={18} />} value={`${toFa(avgConversion)}٪`} label="تبدیل" tone="secondary" />
          <StatTile variant="compact" icon={<Flame size={18} />} value={hotLeads} label="لید داغ" tone="accent" />
          <StatTile variant="compact" icon={<AlertTriangle size={18} />} value={overdue.length} label="عقب‌افتاده" tone="warning" />
        </div>

        {pendingSales.length > 0 && (
          <button
            onClick={() => navigate('/sales')}
            className="flex w-full items-center gap-3 rounded-2xl bg-warning-50 p-4 text-right"
          >
            <BadgeDollarSign size={20} className="shrink-0 text-warning-600" />
            <span className="flex-1 text-[13px] font-extrabold text-warning-700">
              {toFa(pendingSales.length)} فروش منتظر تایید توست
            </span>
            <ArrowLeft size={16} className="shrink-0 text-warning-400" />
          </button>
        )}

        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-extrabold text-neutral-900">
            <TrendingUp size={16} className="text-primary-500" />
            هشدارها و بینش‌ها
          </h2>
          <div className="space-y-2.5">
            {insights.map((ins) => (
              <InsightCard key={ins.id} tone={ins.tone} title={ins.title} body={ins.body} />
            ))}
          </div>
        </section>

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

        {role === 'manager' ? (
          <section>
            <h2 className="mb-3 text-[15px] font-extrabold text-neutral-900">روند تیم‌ها</h2>
            <div className="space-y-2">
              {teamRows.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-2xl bg-surface p-3.5 shadow-card border border-border/60">
                  <span className="text-[13px] font-extrabold text-neutral-900">{t.name}</span>
                  <span className="text-[13px] font-extrabold text-primary-700 tabular-nums">{toFa(t.conversion)}٪</span>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold text-neutral-900">
                <Users size={16} className="text-secondary-500" />
                برترین اعضای تیم
              </h2>
            </div>
            <div className="space-y-2">
              {topAgents.map((a, i) => (
                <LeaderboardRow key={a.id} agent={a} rank={i + 1} metric={a.callsToday} />
              ))}
            </div>
          </section>
        )}

        <button
          onClick={() => navigate('/reports')}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary-50 py-3.5 text-sm font-extrabold text-primary-700"
        >
          گزارش کامل
          <ArrowLeft size={16} />
        </button>
      </div>
    </Page>
  )
}
