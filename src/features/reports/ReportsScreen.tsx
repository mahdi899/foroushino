import { useState } from 'react'
import { Phone, Target, CheckCircle2, Flame, BarChart3 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { StatTile } from '@/components/domain/StatTile'
import { LeaderboardRow } from '@/components/domain/LeaderboardRow'
import { InsightCard } from '@/components/domain/InsightCard'
import { FunnelCard, SourceCard, TeamCard } from './widgets'
import { funnel, sourcePerf, teamRows, managerInsights } from '@/data/reports'
import { toFa } from '@/lib/format'

export function ReportsScreen() {
  const agents = useStore((s) => s.agents)
  const leads = useStore((s) => s.leads)
  const [tab, setTab] = useState('overview')

  const teamAgents = agents.filter((a) => a.role === 'agent')
  const totalCalls = teamAgents.reduce((s, a) => s + a.callsToday, 0)
  const totalSuccess = teamAgents.reduce((s, a) => s + a.successfulToday, 0)
  const avgConversion = Math.round(
    teamAgents.reduce((s, a) => s + a.conversionRate, 0) / (teamAgents.length || 1),
  )
  const hotLeads = leads.filter((l) => l.temperature === 'hot').length
  const ranked = [...teamAgents].sort((a, b) => b.callsToday - a.callsToday)

  return (
    <Page>
      <ScreenHeader
        sticky
        title="گزارش‌ها"
        subtitle="تحلیل عملکرد تیم"
        icon={BarChart3}
        iconTone="primary"
      >
        <div className="mt-3">
          <SegmentedTabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'overview', label: 'کلی' },
              { id: 'funnel', label: 'قیف فروش' },
              { id: 'team', label: 'تیم' },
              { id: 'sources', label: 'منابع' },
            ]}
          />
        </div>
      </ScreenHeader>

      <div className="space-y-5 px-4 pt-4">
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile icon={<Phone size={18} />} value={totalCalls} label="تماس امروز" />
              <StatTile icon={<CheckCircle2 size={18} />} value={totalSuccess} label="تماس موفق" tone="success" />
              <StatTile icon={<Target size={18} />} value={`${toFa(avgConversion)}٪`} label="نرخ تبدیل" tone="secondary" />
              <StatTile icon={<Flame size={18} />} value={hotLeads} label="لید داغ" tone="accent" />
            </div>
            <section>
              <h2 className="mb-3 text-[15px] font-extrabold text-neutral-900">بینش‌های مدیریتی</h2>
              <div className="space-y-2.5">
                {managerInsights.map((ins) => (
                  <InsightCard key={ins.id} tone={ins.tone} title={ins.title} body={ins.body} />
                ))}
              </div>
            </section>
          </>
        )}

        {tab === 'funnel' && (
          <>
            <FunnelCard funnel={funnel} />
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile icon={<Target size={18} />} value={`${toFa(avgConversion)}٪`} label="نرخ تبدیل کل" tone="secondary" />
              <StatTile icon={<CheckCircle2 size={18} />} value={toFa(41)} label="فروش موفق" tone="success" />
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
      </div>
    </Page>
  )
}
