import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PhoneCall, Target, Users, Sparkles } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { getSuggestion, filterLeadsForAgent } from '@/lib/leadUtils'
import { roleLabels, suggestReasonLabels } from '@/data/labels'
import { toFa, formatJalaliDate } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import { isShiftOpen } from '@/lib/shiftUtils'
import { performStartShift } from '@/services/shiftActions'

export function ShiftStartScreen() {
  const navigate = useNavigate()
  const agent = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))
  const currentAgentId = useStore((s) => s.currentAgentId)
  const leads = useStore((s) => s.leads)
  const followups = useStore((s) => s.followups)
  const dataSyncing = useStore((s) => s.dataSyncing)
  const pushToast = useStore((s) => s.pushToast)
  const [starting, setStarting] = useState(false)

  const myLeads = useMemo(
    () =>
      filterLeadsForAgent(leads, currentAgentId).filter(
        (l) => l.assignedAgentId === agent?.id && l.stage !== 'won' && l.stage !== 'lost',
      ),
    [leads, agent?.id, currentAgentId],
  )
  const suggestion = useMemo(() => getSuggestion(leads, followups, currentAgentId), [leads, followups, currentAgentId])

  if (!agent) {
    return (
      <div className="flex h-full min-h-full flex-col items-center justify-center px-5">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <p className="mt-4 text-sm font-semibold text-neutral-500">در حال آماده‌سازی شیفت…</p>
      </div>
    )
  }

  const goalPct = agent.callGoal ? Math.round((agent.callsToday / agent.callGoal) * 100) : 0

  const confirmStart = async () => {
    if (starting) return
    setStarting(true)
    haptic('success')

    try {
      await performStartShift('available')
      pushToast('شیفت شروع شد، روز خوبی داشته باشی')
      navigate('/home', { replace: true })
    } catch {
      if (isShiftOpen(useStore.getState().workSession)) {
        pushToast('شیفت محلی شروع شد؛ همگام‌سازی با سرور بعداً انجام می‌شود', 'info')
        navigate('/home', { replace: true })
        return
      }
      pushToast('شروع شیفت ناموفق بود. اتصال را بررسی کن و دوباره تلاش کن.', 'error')
      setStarting(false)
    }
  }

  return (
    <div className="flex h-full min-h-full flex-col px-5 pt-[calc(20px+var(--safe-top))] pb-[calc(20px+var(--safe-bottom))]">
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex items-center gap-3">
          <Avatar id={agent.id} first={agent.firstName} last={agent.lastName} src={agent.avatar} size={52} ring />
          <div className="min-w-0">
            <p className="truncate text-[17px] font-black text-neutral-900">
              سلام {agent.firstName} جان 👋
            </p>
            <p className="truncate text-[12px] font-bold text-neutral-400">
              {roleLabels[agent.role]} · {formatJalaliDate(new Date(), true)}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-400 p-5 text-white shadow-float">
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-white/70">
            <Target size={14} />
            هدف امروز
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-[30px] font-black leading-none tabular-nums">{toFa(agent.callsToday)}</span>
            <span className="pb-0.5 text-sm font-bold text-white/60">از {toFa(agent.callGoal)} تماس</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-500"
              style={{ width: `${Math.min(100, goalPct)}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/60 bg-surface p-4">
            <Users size={18} className="text-primary-500" />
            <p className="mt-2 text-[20px] font-black tabular-nums text-neutral-900">{toFa(myLeads.length)}</p>
            <p className="text-[11px] font-bold text-neutral-400">مشتری فعال من</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface p-4">
            <Sparkles size={18} className="text-secondary-500" />
            <p className="mt-2 text-[20px] font-black tabular-nums text-neutral-900">{toFa(agent.streak)}</p>
            <p className="text-[11px] font-bold text-neutral-400">روز streak</p>
          </div>
        </div>

        {suggestion && (
          <div className="mt-4 rounded-2xl border border-border/60 bg-surface p-4">
            <p className="mb-2.5 flex items-center gap-1.5 text-[12px] font-extrabold text-neutral-500">
              <PhoneCall size={14} className="text-primary-500" />
              تماس بعدی پیشنهادی
            </p>
            <div className="flex items-center gap-3">
              <Avatar
                id={suggestion.lead.id}
                first={suggestion.lead.firstName}
                last={suggestion.lead.lastName}
                src={suggestion.lead.avatar}
                size={40}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-extrabold text-neutral-900">
                  {suggestion.lead.firstName} {suggestion.lead.lastName}
                </p>
                <p className="truncate text-[11px] font-bold text-primary-600">
                  {suggestReasonLabels[suggestion.reason]}
                </p>
              </div>
            </div>
          </div>
        )}

        {dataSyncing && (
          <p className="mt-4 text-center text-[12px] font-medium text-neutral-400">
            آمار امروز در پس‌زمینه به‌روز می‌شود…
          </p>
        )}

        <div className="flex-1" />

        <Button
          full
          size="lg"
          className="mt-6"
          icon={<PhoneCall size={18} />}
          disabled={starting}
          onClick={confirmStart}
        >
          {starting ? 'در حال ورود…' : 'تایید و ورود به سات'}
        </Button>
      </motion.div>
    </div>
  )
}
