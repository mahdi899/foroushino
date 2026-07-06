import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneCall, Target, Users, LogOut, Timer, PhoneOutgoing } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { availabilityIcon } from '@/components/domain/icons'
import { AvailabilitySheet } from '@/components/domain/AvailabilitySwitcher'
import { getSuggestion } from '@/lib/leadUtils'
import { availabilityLabels, suggestReasonLabels } from '@/data/labels'
import { toFa, formatHms } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

export function WorkStatusScreen() {
  const navigate = useNavigate()
  const agent = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))
  const availability = useStore((s) => s.availability)
  const workSession = useStore((s) => s.workSession)
  const leads = useStore((s) => s.leads)
  const followups = useStore((s) => s.followups)
  const endShift = useStore((s) => s.endShift)
  const pushToast = useStore((s) => s.pushToast)

  const [statusOpen, setStatusOpen] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const elapsedSec = workSession?.startedAt
    ? Math.max(0, Math.floor((now - new Date(workSession.startedAt).getTime()) / 1000))
    : 0

  const myLeads = useMemo(
    () => leads.filter((l) => l.assignedAgentId === agent?.id && l.stage !== 'won' && l.stage !== 'lost'),
    [leads, agent?.id],
  )
  const suggestion = useMemo(() => getSuggestion(leads, followups), [leads, followups])

  if (!agent) return null

  const Icon = availabilityIcon[availability]
  const goalPct = agent.callGoal ? Math.round((agent.callsToday / agent.callGoal) * 100) : 0

  return (
    <Page withNav={false}>
      <TopBar title="وضعیت کاری من" />

      <div className="space-y-4 px-4">
        <div className="rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-400 p-5 text-white shadow-float">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStatusOpen(true)}
              className="flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-[12px] font-extrabold backdrop-blur-sm"
            >
              <Icon size={14} />
              {availabilityLabels[availability]}
            </button>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/70">
              <Timer size={13} />
              {workSession?.startedAt ? 'در شیفت' : 'خارج از شیفت'}
            </div>
          </div>

          {workSession?.startedAt ? (
            <div className="mt-5 text-center">
              <p className="text-[11px] font-bold text-white/60">مدت شیفت امروز</p>
              <p className="mt-1 ltr-nums text-[34px] font-black tabular-nums leading-none">
                {formatHms(elapsedSec)}
              </p>
            </div>
          ) : (
            <div className="mt-5 text-center">
              <p className="text-[13px] font-bold text-white/70">هنوز شیفت را شروع نکرده‌ای</p>
              <Button
                size="sm"
                variant="soft"
                className="mt-3 !bg-white/15 !text-white"
                onClick={() => navigate('/shift-start')}
              >
                شروع شیفت
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/60 bg-surface p-4">
            <Target size={18} className="text-primary-500" />
            <p className="mt-2 text-[20px] font-black tabular-nums text-neutral-900">
              {toFa(agent.callsToday)} / {toFa(agent.callGoal)}
            </p>
            <p className="text-[11px] font-bold text-neutral-400">هدف تماس امروز</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-primary-500 transition-[width] duration-500"
                style={{ width: `${Math.min(100, goalPct)}%` }}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface p-4">
            <Users size={18} className="text-secondary-500" />
            <p className="mt-2 text-[20px] font-black tabular-nums text-neutral-900">{toFa(myLeads.length)}</p>
            <p className="text-[11px] font-bold text-neutral-400">لید فعال تخصیص‌یافته</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface p-4">
            <PhoneOutgoing size={18} className="text-success-500" />
            <p className="mt-2 text-[20px] font-black tabular-nums text-neutral-900">
              {formatHms(workSession?.totalCallSeconds ?? 0)}
            </p>
            <p className="text-[11px] font-bold text-neutral-400">زمان مکالمه امروز</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface p-4">
            <Timer size={18} className="text-warning-500" />
            <p className="mt-2 text-[20px] font-black tabular-nums text-neutral-900">
              {toFa(agent.successfulToday)}
            </p>
            <p className="text-[11px] font-bold text-neutral-400">تماس موفق امروز</p>
          </div>
        </div>

        {suggestion && (
          <button
            onClick={() => navigate(`/leads/${suggestion.lead.id}`)}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface p-4 text-right',
            )}
          >
            <Avatar
              id={suggestion.lead.id}
              first={suggestion.lead.firstName}
              last={suggestion.lead.lastName}
              src={suggestion.lead.avatar}
              size={44}
            />
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-[11px] font-extrabold text-primary-600">تماس بعدی پیشنهادی</p>
              <p className="truncate text-[14px] font-extrabold text-neutral-900">
                {suggestion.lead.firstName} {suggestion.lead.lastName}
              </p>
              <p className="truncate text-[11px] font-bold text-neutral-400">
                {suggestReasonLabels[suggestion.reason]}
              </p>
            </div>
            <PhoneCall size={18} className="shrink-0 text-primary-500" />
          </button>
        )}

        {workSession?.startedAt && (
          <Button
            full
            size="lg"
            variant="danger"
            icon={<LogOut size={18} />}
            onClick={() => {
              haptic('warning')
              endShift()
              pushToast('شیفت پایان یافت')
              navigate('/profile', { replace: true })
            }}
          >
            پایان شیفت کاری
          </Button>
        )}
      </div>

      <AvailabilitySheet open={statusOpen} onClose={() => setStatusOpen(false)} />
    </Page>
  )
}
