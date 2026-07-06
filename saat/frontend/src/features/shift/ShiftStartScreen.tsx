import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PhoneCall, Target, Users, Sparkles, ChevronLeft, Check } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { availabilityIcon } from '@/components/domain/icons'
import { getSuggestion } from '@/lib/leadUtils'
import { availabilityLabels, roleLabels, suggestReasonLabels } from '@/data/labels'
import { toFa, formatJalaliDate } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'
import type { Availability } from '@/types'

const STATUS_OPTIONS: Availability[] = ['available', 'on_break', 'doing_follow_up', 'offline']

export function ShiftStartScreen() {
  const navigate = useNavigate()
  const agent = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))
  const leads = useStore((s) => s.leads)
  const followups = useStore((s) => s.followups)
  const startShift = useStore((s) => s.startShift)
  const setAvailability = useStore((s) => s.setAvailability)
  const pushToast = useStore((s) => s.pushToast)

  const [phase, setPhase] = useState<'summary' | 'status'>('summary')
  const [chosen, setChosen] = useState<Availability>('available')

  const myLeads = useMemo(
    () => leads.filter((l) => l.assignedAgentId === agent?.id && l.stage !== 'won' && l.stage !== 'lost'),
    [leads, agent?.id],
  )
  const suggestion = useMemo(() => getSuggestion(leads, followups), [leads, followups])

  if (!agent) return null

  const goalPct = agent.callGoal ? Math.round((agent.callsToday / agent.callGoal) * 100) : 0

  const confirmStart = () => {
    haptic('success')
    startShift()
    setAvailability(chosen)
    pushToast('شیفت شروع شد، روز خوبی داشته باشی')
    navigate('/home', { replace: true })
  }

  return (
    <div className="flex h-full min-h-full flex-col px-5 pt-[calc(20px+var(--safe-top))] pb-[calc(20px+var(--safe-bottom))]">
      <AnimatePresence mode="wait">
        {phase === 'summary' ? (
          <motion.div
            key="summary"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
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
                <p className="text-[11px] font-bold text-neutral-400">لید فعال من</p>
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

            <div className="flex-1" />

            <Button full size="lg" className="mt-6" icon={<ChevronLeft size={18} />} onClick={() => setPhase('status')}>
              شروع شیفت کاری
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="status"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <h1 className="text-[19px] font-black text-neutral-900">وضعیتت رو انتخاب کن</h1>
            <p className="mt-1.5 text-[13px] font-bold text-neutral-400">
              این وضعیت به لیدر و سوپروایزر تیم نمایش داده می‌شود.
            </p>

            <div className="mt-6 space-y-2.5">
              {STATUS_OPTIONS.map((status) => {
                const Icon = availabilityIcon[status]
                const active = chosen === status
                return (
                  <button
                    key={status}
                    onClick={() => {
                      haptic('selection')
                      setChosen(status)
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-right transition-colors',
                      active ? 'border-primary-400 bg-primary-50' : 'border-border/60 bg-surface',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                        active ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-500',
                      )}
                    >
                      <Icon size={19} strokeWidth={2.25} />
                    </span>
                    <span className="flex-1 text-[14px] font-extrabold text-neutral-900">
                      {availabilityLabels[status]}
                    </span>
                    {active && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-white">
                        <Check size={13} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex-1" />

            <Button full size="lg" icon={<PhoneCall size={18} />} onClick={confirmStart}>
              تایید و ورود به سات
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
