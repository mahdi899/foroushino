import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Phone,
  MessageCircle,
  Bell,
  CalendarDays,
  Check,
  AlertTriangle,
  Sparkles,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { FollowupPicker, buildFollowupIso } from '@/components/domain/FollowupPicker'
import { Fab } from '@/components/ui/Fab'
import { EmptyState } from '@/components/ui/States'
import { todayFollowups, overdueFollowups } from '@/lib/leadUtils'
import { followupKindLabels } from '@/data/labels'
import { formatTime, toFa, formatJalaliShort, relativeDay } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import type { Followup, FollowupKind, Lead } from '@/types'
import { cn } from '@/lib/cn'

const kindIcon: Record<FollowupKind, LucideIcon> = {
  call: Phone,
  message: MessageCircle,
  reminder: Bell,
  meeting: CalendarDays,
}
const kindTone: Record<FollowupKind, 'primary' | 'secondary' | 'accent' | 'success'> = {
  call: 'success',
  message: 'secondary',
  reminder: 'accent',
  meeting: 'primary',
}

export function FollowupsScreen() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const followups = useStore((s) => s.followups)
  const leads = useStore((s) => s.leads)
  const completeFollowup = useStore((s) => s.completeFollowup)
  const createFollowup = useStore((s) => s.createFollowup)
  const pushToast = useStore((s) => s.pushToast)

  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    if (params.get('new') === '1') {
      setCreateOpen(true)
      params.delete('new')
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  const today = useMemo(() => todayFollowups(followups), [followups])
  const overdue = useMemo(() => overdueFollowups(followups), [followups])
  const leadOf = (leadId: string) => leads.find((l) => l.id === leadId)

  const complete = (f: Followup) => {
    haptic('success')
    completeFollowup(f.id)
    pushToast('پیگیری انجام شد')
  }

  const todayDate = new Date()

  return (
    <Page>
      <div className="px-4 pt-[calc(14px+var(--safe-top))]">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="flex items-center gap-1.5 text-xl font-black text-neutral-900">
              پیگیری‌ها
              <Sparkles size={16} className="text-primary-500" />
            </h1>
            <p className="text-[11px] font-bold text-neutral-400">هیچ فرصتی را از دست نده</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
            <CalendarDays size={20} />
          </div>
        </div>

        <DateStrip date={todayDate} />
      </div>

      <div className="space-y-5 px-4 pt-4">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold text-neutral-900">برنامه امروز</h2>
            <Badge tone="primary" size="sm">
              {toFa(today.length)} پیگیری
            </Badge>
          </div>
          {today.length === 0 ? (
            <EmptyState title="پیگیری امروز نداری" description="وقت خوبیه برای تماس با سرنخ‌های جدید." />
          ) : (
            <div className="space-y-3">
              {today.map((f, i) => {
                const lead = leadOf(f.leadId)
                if (!lead) return null
                return (
                  <FollowupCard
                    key={f.id}
                    followup={f}
                    lead={lead}
                    index={i}
                    onOpen={() => navigate(`/leads/${lead.id}`)}
                    onComplete={() => complete(f)}
                    onCall={() => navigate(`/dialer/${lead.id}`)}
                  />
                )
              })}
            </div>
          )}
        </section>

        {overdue.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold text-error-600">
                <AlertTriangle size={15} />
                عقب‌افتاده
              </h2>
              <Badge tone="error" size="sm">
                {toFa(overdue.length)} پیگیری
              </Badge>
            </div>
            <div className="space-y-3">
              {overdue.map((f, i) => {
                const lead = leadOf(f.leadId)
                if (!lead) return null
                return (
                  <FollowupCard
                    key={f.id}
                    followup={f}
                    lead={lead}
                    index={i}
                    overdue
                    onOpen={() => navigate(`/leads/${lead.id}`)}
                    onComplete={() => complete(f)}
                    onCall={() => navigate(`/dialer/${lead.id}`)}
                  />
                )
              })}
            </div>
          </section>
        )}

        <div className="flex items-center gap-3 rounded-2xl bg-secondary-50 p-4">
          <Bell size={22} className="shrink-0 text-secondary-600" />
          <div className="flex-1">
            <p className="text-[13px] font-extrabold text-neutral-900">یادآوری هوشمند</p>
            <p className="text-[11px] font-bold text-neutral-500">
              {toFa(today.length)} پیگیری برای امروز داری.
            </p>
          </div>
        </div>
      </div>

      <Fab onClick={() => setCreateOpen(true)} />

      <CreateFollowupSheet
        open={createOpen}
        leads={leads}
        onClose={() => setCreateOpen(false)}
        onCreate={(input) => {
          createFollowup(input)
          setCreateOpen(false)
          pushToast('پیگیری جدید ساخته شد')
        }}
      />
    </Page>
  )
}

function DateStrip({ date }: { date: Date }) {
  const days = Array.from({ length: 5 }).map((_, i) => {
    const d = new Date(date)
    d.setDate(d.getDate() + i)
    return d
  })
  return (
    <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
      {days.map((d, i) => {
        const active = i === 0
        return (
          <div
            key={i}
            className={cn(
              'flex min-w-[64px] flex-col items-center rounded-2xl border px-3 py-2.5',
              active ? 'border-primary-600 bg-primary-600 text-white' : 'border-border bg-surface text-neutral-500',
            )}
          >
            <span className="text-[11px] font-bold opacity-80">
              {i === 0 ? 'امروز' : relativeDay(d.toISOString())}
            </span>
            <span className="text-lg font-extrabold">{toFa(formatJalaliShort(d).split(' ')[0])}</span>
            <span className="text-[10px] font-bold opacity-80">{formatJalaliShort(d).split(' ')[1]}</span>
          </div>
        )
      })}
    </div>
  )
}

function FollowupCard({
  followup,
  lead,
  index,
  overdue,
  onOpen,
  onComplete,
  onCall,
}: {
  followup: Followup
  lead: Lead
  index: number
  overdue?: boolean
  onOpen: () => void
  onComplete: () => void
  onCall: () => void
}) {
  const Icon = kindIcon[followup.kind]
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-stretch gap-3"
    >
      <div className="flex w-12 shrink-0 flex-col items-center">
        <span className={cn('text-[11px] font-extrabold tabular-nums', overdue ? 'text-error-500' : 'text-neutral-500')}>
          {formatTime(new Date(followup.dueAt))}
        </span>
        <button
          onClick={onCall}
          className={cn(
            'mt-1.5 flex h-9 w-9 items-center justify-center rounded-full',
            overdue ? 'bg-error-50 text-error-500' : 'bg-primary-50 text-primary-600',
          )}
        >
          <Icon size={16} />
        </button>
      </div>

      <button
        onClick={onOpen}
        className="flex flex-1 items-center gap-3 rounded-2xl bg-surface p-3 text-right shadow-card border border-border/60"
      >
        <Avatar id={lead.id} first={lead.firstName} last={lead.lastName} src={lead.avatar} size={42} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-extrabold text-neutral-900">
            {lead.firstName} {lead.lastName}
          </p>
          <p className="truncate text-[11px] font-bold text-neutral-400">{followup.title}</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Badge tone={kindTone[followup.kind]} size="sm">
              {followupKindLabels[followup.kind]}
            </Badge>
            {(overdue || followup.priority === 3) && (
              <Badge tone={overdue ? 'error' : 'hot'} size="sm">
                {overdue ? 'عقب‌افتاده' : 'اولویت بالا'}
              </Badge>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onComplete()
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-50 text-success-600"
        >
          <Check size={18} />
        </button>
      </button>
    </motion.div>
  )
}

function CreateFollowupSheet({
  open,
  leads,
  onClose,
  onCreate,
}: {
  open: boolean
  leads: Lead[]
  onClose: () => void
  onCreate: (input: {
    leadId: string
    kind: FollowupKind
    title: string
    dueAt: string
    priority: 1 | 2 | 3
  }) => void
}) {
  const [leadId, setLeadId] = useState(leads[0]?.id ?? '')
  const [kind, setKind] = useState<FollowupKind>('call')
  const [dayOffset, setDayOffset] = useState(0)
  const [hour, setHour] = useState(10)

  const kinds: FollowupKind[] = ['call', 'message', 'reminder', 'meeting']

  return (
    <BottomSheet open={open} onClose={onClose} title="پیگیری جدید">
      <div className="space-y-4 pt-1">
        <div>
          <p className="mb-2 text-xs font-bold text-neutral-500">سرنخ</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {leads.slice(0, 12).map((l) => (
              <Chip key={l.id} active={leadId === l.id} onClick={() => setLeadId(l.id)}>
                {l.firstName} {l.lastName}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold text-neutral-500">نوع پیگیری</p>
          <div className="flex gap-2">
            {kinds.map((k) => (
              <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
                {followupKindLabels[k]}
              </Chip>
            ))}
          </div>
        </div>
        <FollowupPicker dayOffset={dayOffset} hour={hour} onDayChange={setDayOffset} onHourChange={setHour} />
        <Button
          full
          size="lg"
          icon={<ChevronLeft size={18} />}
          onClick={() => {
            const lead = leads.find((l) => l.id === leadId)
            onCreate({
              leadId,
              kind,
              title: lead ? `${followupKindLabels[kind]} با ${lead.firstName}` : followupKindLabels[kind],
              dueAt: buildFollowupIso(dayOffset, hour),
              priority: lead?.priority ?? 2,
            })
          }}
        >
          ساخت پیگیری
        </Button>
      </div>
    </BottomSheet>
  )
}
