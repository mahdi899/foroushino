import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, CalendarDays, Clock, PhoneCall, CheckCircle2, TrendingUp } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { AppHeader } from './AppHeader'
import { NextCallCard } from '@/components/domain/NextCallCard'
import { StatTile } from '@/components/domain/StatTile'
import { EmptyState } from '@/components/ui/States'
import { getNextLead, todaySummary } from '@/lib/leadUtils'
import { haptic } from '@/lib/telegram'

export function HomeScreen() {
  const navigate = useNavigate()
  const leads = useStore((s) => s.leads)
  const followups = useStore((s) => s.followups)
  const agent = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))
  const startCall = useStore((s) => s.startCall)

  const nextLead = getNextLead(leads)
  const summary = todaySummary(leads, followups)
  const remaining = agent ? Math.max(0, agent.callGoal - agent.callsToday) : 0

  return (
    <Page>
      <AppHeader />

      <div className="space-y-5 px-4 pt-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary-500 to-primary-700 p-5 text-white shadow-float"
        >
          <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-xl" />
          <div className="absolute -bottom-12 right-6 h-32 w-32 rounded-full bg-primary-300/30 blur-xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold">
              <Sparkles size={13} />
              آماده فروش
            </span>
            <h2 className="mt-3 text-[26px] font-black leading-tight">تماس بعدی آماده‌ست</h2>
            <p className="mt-1 text-[13px] font-bold text-white/80">
              {remaining > 0
                ? `${toFaInline(remaining)} تماس تا تکمیل هدف امروز`
                : 'هدف امروزت کامل شد، عالی بود'}
            </p>
          </div>
        </motion.div>

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

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-extrabold text-neutral-900">خلاصه امروز</h3>
            <button
              onClick={() => navigate('/performance')}
              className="flex items-center gap-1 text-xs font-bold text-primary-600"
            >
              <TrendingUp size={14} />
              عملکرد من
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <StatTile icon={<PhoneCall size={15} />} value={agent?.callsToday ?? 0} label="تماس‌ها" trend={20} />
            <StatTile icon={<CheckCircle2 size={15} />} value={agent?.successfulToday ?? 0} label="موفق" trend={12} tone="success" />
            <StatTile icon={<Clock size={15} />} value={summary.followups} label="پیگیری" trend={-8} tone="warning" />
            <StatTile icon={<CalendarDays size={15} />} value={summary.meetings} label="جلسات" trend={50} tone="secondary" />
          </div>
        </div>
      </div>
    </Page>
  )
}

function toFaInline(n: number) {
  return new Intl.NumberFormat('fa-IR').format(n)
}
