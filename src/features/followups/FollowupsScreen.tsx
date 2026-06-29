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
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
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

const kindTheme: Record<FollowupKind, { accent: string; actionBtn: string }> = {
  call: {
    accent: 'bg-success-500',
    actionBtn: 'bg-success-50 text-success-600',
  },
  message: {
    accent: 'bg-secondary-500',
    actionBtn: 'bg-secondary-50 text-secondary-600',
  },
  reminder: {
    accent: 'bg-accent-500',
    actionBtn: 'bg-accent-50 text-accent-600',
  },
  meeting: {
    accent: 'bg-primary-500',
    actionBtn: 'bg-primary-50 text-primary-600',
  },
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
      <ScreenHeader
        title="پیگیری‌ها"
        subtitle="هیچ فرصتی را از دست نده"
        icon={CalendarDays}
        iconTone="accent"
      >
        <DateStrip date={todayDate} />
      </ScreenHeader>

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
  const theme = kindTheme[followup.kind]

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        'relative flex items-center gap-2.5 overflow-hidden rounded-2xl border bg-surface py-2.5 pl-2.5 pr-3 shadow-card',
        overdue ? 'border-error-200/60' : 'border-border/50',
      )}
    >
      <div
        className={cn(
          'absolute inset-y-2.5 right-0 w-[3px] rounded-l-full',
          overdue ? 'bg-error-500' : theme.accent,
        )}
      />

      <span
        className={cn(
          'w-9 shrink-0 text-center text-[11px] font-extrabold tabular-nums leading-none',
          overdue ? 'text-error-600' : 'text-neutral-500',
        )}
      >
        {formatTime(new Date(followup.dueAt))}
      </span>

      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-right"
      >
        <Avatar
          id={lead.id}
          first={lead.firstName}
          last={lead.lastName}
          src={lead.avatar}
          size={36}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-extrabold leading-tight text-neutral-900">
            {lead.firstName} {lead.lastName}
          </p>
          <p className="truncate text-[11px] font-bold leading-tight text-neutral-400">
            {followup.title}
            {(overdue || followup.priority === 3) && (
              <span className={cn(overdue ? 'text-error-500' : 'text-hot-500')}>
                {' · '}
                {overdue ? 'عقب‌افتاده' : 'اولویت بالا'}
              </span>
            )}
          </p>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onCall}
          aria-label={`${followupKindLabels[followup.kind]} با ${lead.firstName}`}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg',
            overdue ? 'bg-error-50 text-error-600' : theme.actionBtn,
          )}
        >
          <Icon size={15} strokeWidth={2.25} />
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onComplete}
          aria-label="علامت‌گذاری انجام‌شده"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-success-50 hover:text-success-600"
        >
          <Check size={16} strokeWidth={2.25} />
        </motion.button>
      </div>
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
