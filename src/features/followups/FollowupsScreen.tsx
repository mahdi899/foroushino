import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Phone,
  MessageCircle,
  Bell,
  CalendarDays,
  Check,
  AlertTriangle,
  ChevronLeft,
  Flame,
  Sun,
  Sunrise,
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
              {today.map((f) => {
                const lead = leadOf(f.leadId)
                if (!lead) return null
                return (
                  <FollowupCard
                    key={f.id}
                    followup={f}
                    lead={lead}
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
              {overdue.map((f) => {
                const lead = leadOf(f.leadId)
                if (!lead) return null
                return (
                  <FollowupCard
                    key={f.id}
                    followup={f}
                    lead={lead}
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

const WEEKDAY_SHORT = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش']

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
        const [dayNum, month] = formatJalaliShort(d).split(' ')

        return (
          <div
            key={i}
            aria-label={relativeDay(d.toISOString())}
            className={cn(
              'flex min-h-[84px] min-w-[72px] shrink-0 flex-col items-center justify-center rounded-2xl border px-3.5 py-3',
              active
                ? 'border-primary-600 bg-primary-600 text-white shadow-[0_4px_14px_-4px_rgba(13,148,136,0.4)]'
                : 'border-border bg-surface text-neutral-500',
            )}
          >
            <div className="mb-2 flex h-6 w-6 items-center justify-center">
              {i === 0 ? (
                <Sun
                  size={17}
                  strokeWidth={2.25}
                  className={active ? 'text-white' : 'text-primary-500'}
                />
              ) : i === 1 ? (
                <Sunrise
                  size={17}
                  strokeWidth={2.25}
                  className={active ? 'text-white' : 'text-neutral-400'}
                />
              ) : (
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold leading-none',
                    active ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500',
                  )}
                >
                  {WEEKDAY_SHORT[d.getDay()]}
                </span>
              )}
            </div>
            <span className="text-[22px] font-black leading-none tabular-nums">{dayNum}</span>
            <span className="mt-1.5 text-[11px] font-bold leading-none opacity-80">{month}</span>
          </div>
        )
      })}
    </div>
  )
}

function FollowupCard({
  followup,
  lead,
  overdue,
  onOpen,
  onComplete,
  onCall,
}: {
  followup: Followup
  lead: Lead
  overdue?: boolean
  onOpen: () => void
  onComplete: () => void
  onCall: () => void
}) {
  const KindIcon = kindIcon[followup.kind]
  const theme = kindTheme[followup.kind]
  const highPriority = followup.priority === 3

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 overflow-hidden rounded-2xl border bg-surface py-3 pl-3 pr-2.5 shadow-card',
        overdue ? 'border-error-200/70' : 'border-border/50',
      )}
    >
      <div
        className={cn(
          'absolute inset-y-3 right-0 w-[3px] rounded-l-full',
          overdue ? 'bg-error-500' : theme.accent,
        )}
      />

      <div
        className={cn(
          'w-11 shrink-0 text-center tabular-nums',
          overdue ? 'text-error-600' : 'text-neutral-500',
        )}
      >
        <span className="text-[12px] font-extrabold leading-none">
          {formatTime(new Date(followup.dueAt))}
        </span>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-right"
      >
        <Avatar
          id={lead.id}
          first={lead.firstName}
          last={lead.lastName}
          src={lead.avatar}
          size={40}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="truncate text-[14px] font-extrabold leading-snug text-neutral-900">
              {lead.firstName} {lead.lastName}
            </p>
            {overdue && (
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-error-50 text-error-600"
                title="عقب‌افتاده"
                aria-label="عقب‌افتاده"
              >
                <AlertTriangle size={11} strokeWidth={2.5} />
              </span>
            )}
            {highPriority && (
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-hot-50 text-hot-600"
                title="اولویت بالا"
                aria-label="اولویت بالا"
              >
                <Flame size={11} strokeWidth={2.5} />
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-[12px] font-bold leading-snug text-neutral-500">
            {followup.title}
          </p>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-1.5 pl-0.5">
        <button
          type="button"
          onClick={onCall}
          aria-label={`${followupKindLabels[followup.kind]} با ${lead.firstName}`}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl transition-transform active:scale-90',
            overdue ? 'bg-error-50 text-error-600' : theme.actionBtn,
          )}
        >
          <KindIcon size={16} strokeWidth={2.25} />
        </button>
        <button
          type="button"
          onClick={onComplete}
          aria-label="علامت‌گذاری انجام‌شده"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-success-50 hover:text-success-600 active:scale-90"
        >
          <Check size={17} strokeWidth={2.25} />
        </button>
      </div>
    </div>
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
