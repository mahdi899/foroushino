import { useNavigate } from 'react-router-dom'
import { Sparkles, CheckCircle2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { AppHeader } from './AppHeader'
import { NextCallCard } from '@/components/domain/NextCallCard'
import { EmptyState } from '@/components/ui/States'
import { getNextLead } from '@/lib/leadUtils'
import { toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'

export function HomeScreen() {
  const navigate = useNavigate()
  const leads = useStore((s) => s.leads)
  const agent = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))
  const startCall = useStore((s) => s.startCall)

  const nextLead = getNextLead(leads)
  const remaining = agent ? Math.max(0, agent.callGoal - agent.callsToday) : 0
  const goalPct = agent?.callGoal ? Math.round((agent.callsToday / agent.callGoal) * 100) : 0
  const goalComplete = remaining === 0 && (agent?.callGoal ?? 0) > 0

  return (
    <Page>
      <AppHeader />

      <div className="space-y-5 px-4 pt-2">
        <div
          className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary-800 via-primary-600 to-primary-400 p-5 text-white shadow-float"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-16 -top-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-10 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '18px 18px',
              }}
            />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          </div>

          <div className="relative flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold backdrop-blur-sm">
                <Sparkles size={13} className="text-emerald-200" />
                آماده فروش
              </span>

              <h2 className="mt-3 text-[22px] font-black leading-[1.25]">
                تماس بعدی{' '}
                <span className="bg-gradient-to-l from-emerald-200 to-white bg-clip-text text-transparent">
                  آماده‌ست
                </span>
              </h2>

              <div className="mt-4 max-w-[210px]">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-bold">
                  <span className="text-white/65">پیشرفت هدف امروز</span>
                  <span className="shrink-0 tabular-nums text-white/90">
                    {toFa(agent?.callsToday ?? 0)}
                    <span className="text-white/50"> / </span>
                    {toFa(agent?.callGoal ?? 0)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-emerald-200 via-white to-emerald-100 shadow-[0_0_10px_rgba(255,255,255,0.35)] transition-[width] duration-500 ease-out"
                    style={{ width: `${goalPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-[22px] border border-white/20 bg-white/10 backdrop-blur-sm">
              {goalComplete ? (
                <CheckCircle2 size={42} className="text-emerald-200" strokeWidth={2.25} />
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-[32px] font-black tabular-nums leading-none">{toFa(remaining)}</span>
                  <span className="mt-1 text-[10px] font-bold text-white/55">تماس مانده</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {nextLead ? (
          <NextCallCard
            lead={nextLead}
            onCall={() => {
              haptic('medium')
              startCall(nextLead.id)
              navigate(`/dialer/${nextLead.id}`)
            }}
            onDetails={() => navigate(`/leads/${nextLead.id}`)}
          />
        ) : (
          <EmptyState
            title="سرنخی برای تماس نمانده"
            description="همه سرنخ‌های امروزت را تماس گرفتی. کارت عالی بود."
            action={{ label: 'دیدن همه سرنخ‌ها', onClick: () => navigate('/leads') }}
          />
        )}

      </div>
    </Page>
  )
}
