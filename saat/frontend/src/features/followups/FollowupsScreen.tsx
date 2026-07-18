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
  CalendarClock,
  Wallet,
  Users,
  FileText,
  HelpCircle,
  ListChecks,
  Clock3,
  Hash,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { LeadAvatar } from '@/components/domain/LeadAvatar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Chip, type ChipTone } from '@/components/ui/Chip'
import { FollowupPicker, buildFollowupIso } from '@/components/domain/FollowupPicker'
import { Fab } from '@/components/ui/Fab'
import { EmptyState } from '@/components/ui/States'
import {
  todayFollowups,
  overdueFollowups,
  tomorrowFollowups,
  thisWeekFollowups,
  criticalFollowups,
  doneFollowups,
  filterFollowupsForAgent,
  getSuggestion,
} from '@/lib/leadUtils'
import { followupKindLabels } from '@/data/labels'
import { isBusinessToday } from '@/lib/businessDate'
import { formatTime, toFa, relativeDay, relativeDayTime } from '@/lib/format'
import { leadDisplayCode } from '@/lib/leadCode'
import { haptic } from '@/lib/telegram'
import type { Followup, FollowupKind, Lead } from '@/types'
import { cn } from '@/lib/cn'
import { DataGate } from '@/components/pwa/DataGate'

const TG = 'text-[#3390EC] dark:text-[#8774E1]'

const kindIcon: Record<FollowupKind, LucideIcon> = {
  call: Phone,
  message: MessageCircle,
  reminder: Bell,
  meeting: CalendarDays,
  payment: Wallet,
  consultation: Users,
  info: FileText,
  decision: HelpCircle,
  custom: ListChecks,
}

type Bucket = 'today' | 'tomorrow' | 'overdue' | 'week' | 'critical' | 'done'

const buckets: { id: Bucket; label: string; icon: LucideIcon; tone: ChipTone }[] = [
  { id: 'today', label: 'امروز', icon: CalendarDays, tone: 'primary' },
  { id: 'tomorrow', label: 'فردا', icon: Clock3, tone: 'primary' },
  { id: 'overdue', label: 'عقب‌افتاده', icon: AlertTriangle, tone: 'error' },
  { id: 'week', label: 'این هفته', icon: CalendarClock, tone: 'primary' },
  { id: 'critical', label: 'بحرانی', icon: Flame, tone: 'hot' },
  { id: 'done', label: 'تکمیل‌شده', icon: Check, tone: 'neutral' },
]

const bucketLabels: Record<Bucket, string> = {
  today: 'امروز',
  tomorrow: 'فردا',
  overdue: 'عقب‌افتاده',
  week: 'این هفته',
  critical: 'بحرانی',
  done: 'تکمیل‌شده',
}

export function FollowupsScreen() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const followups = useStore((s) => s.followups)
  const leads = useStore((s) => s.leads)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const completeFollowup = useStore((s) => s.completeFollowup)
  const snoozeFollowup = useStore((s) => s.snoozeFollowup)
  const createFollowup = useStore((s) => s.createFollowup)
  const openCallMethodSheet = useStore((s) => s.openCallMethodSheet)
  const pushToast = useStore((s) => s.pushToast)

  const [bucket, setBucket] = useState<Bucket>('today')
  const [createOpen, setCreateOpen] = useState(false)
  const [snoozeTarget, setSnoozeTarget] = useState<Followup | null>(null)
  const [snoozeDay, setSnoozeDay] = useState(1)
  const [snoozeHour, setSnoozeHour] = useState(10)

  useEffect(() => {
    if (params.get('new') === '1') {
      setCreateOpen(true)
      params.delete('new')
      setParams(params, { replace: true })
    }
    const bucketParam = params.get('bucket')
    if (
      bucketParam &&
      ['today', 'tomorrow', 'overdue', 'week', 'critical', 'done'].includes(bucketParam)
    ) {
      setBucket(bucketParam as Bucket)
      params.delete('bucket')
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  const visibleFollowups = useMemo(
    () => filterFollowupsForAgent(followups, leads, currentAgentId),
    [followups, leads, currentAgentId],
  )

  const today = useMemo(() => todayFollowups(visibleFollowups), [visibleFollowups])
  const tomorrow = useMemo(() => tomorrowFollowups(visibleFollowups), [visibleFollowups])
  const overdue = useMemo(() => overdueFollowups(visibleFollowups), [visibleFollowups])
  const week = useMemo(() => thisWeekFollowups(visibleFollowups), [visibleFollowups])
  const critical = useMemo(() => criticalFollowups(visibleFollowups), [visibleFollowups])
  const done = useMemo(() => doneFollowups(visibleFollowups), [visibleFollowups])

  const counts: Record<Bucket, number> = {
    today: today.length,
    tomorrow: tomorrow.length,
    overdue: overdue.length,
    week: week.length,
    critical: critical.length,
    done: done.length,
  }

  const listByBucket: Record<Bucket, Followup[]> = {
    today,
    tomorrow,
    overdue,
    week,
    critical,
    done,
  }

  const list = listByBucket[bucket]
  const leadOf = (leadId: string) => leads.find((l) => l.id === leadId)
  const suggestion = useMemo(
    () => getSuggestion(leads, followups, currentAgentId),
    [leads, followups, currentAgentId],
  )

  const complete = (f: Followup) => {
    haptic('success')
    completeFollowup(f.id)
    pushToast('پیگیری انجام شد')
  }

  const call = (lead: Lead) => {
    haptic('medium')
    openCallMethodSheet(lead)
  }

  const activeTotal = counts.today + counts.overdue

  return (
    <Page>
      <ScreenHeader
        sticky
        subtitleInline
        title="پیگیری‌ها"
        subtitle={activeTotal > 0 ? `${toFa(activeTotal)} فوری` : `${toFa(counts[bucket])} مورد`}
        className="pb-1"
      >
        <div className="glass-inset -mx-0.5 overflow-hidden rounded-[16px] border border-white/50 p-1 dark:border-white/10">
          <div className="-mx-0.5 flex gap-1.5 overflow-x-auto overflow-y-visible px-0.5 py-0.5 no-scrollbar">
            {buckets.map((b) => (
              <Chip
                key={b.id}
                active={bucket === b.id}
                tone={b.tone}
                onClick={() => setBucket(b.id)}
                icon={<b.icon size={13} />}
                className="h-8 px-3 text-[12px]"
              >
                {b.label}
                {counts[b.id] > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[9px] tabular-nums',
                      bucket === b.id ? 'bg-white/25' : 'bg-black/[0.06] dark:bg-white/10',
                    )}
                  >
                    {toFa(counts[b.id])}
                  </span>
                )}
              </Chip>
            ))}
          </div>
        </div>
      </ScreenHeader>

      <DataGate mode="placeholder">
        <div className="space-y-3 px-4 pt-2 pb-1">
          {suggestion && bucket !== 'done' && (
            <button
              type="button"
              onClick={() => call(suggestion.lead)}
              className="list-row flex w-full items-center gap-3 rounded-[18px] border border-[#3390EC]/20 px-3.5 py-3 text-right active:scale-[0.98] dark:border-[#8774E1]/25"
            >
              <LeadAvatar lead={suggestion.lead} size={42} ring />
              <div className="min-w-0 flex-1">
                <p className={cn('text-[10px] font-bold', TG)}>اولویت تماس</p>
                <p className="truncate text-[14px] font-bold text-text">
                  {suggestion.lead.firstName} {suggestion.lead.lastName}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-text-soft">
                  کد {leadDisplayCode(suggestion.lead)}
                </p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3390EC] text-white dark:bg-[#8774E1]">
                <Phone size={16} strokeWidth={2.35} />
              </span>
            </button>
          )}

          {list.length === 0 ? (
            <EmptyState
              title={bucket === 'done' ? 'هنوز پیگیری تکمیل‌شده‌ای نیست' : 'پیگیری‌ای در این بخش نیست'}
              description={
                bucket === 'done'
                  ? 'پیگیری‌های انجام‌شده اینجا نمایش داده می‌شوند.'
                  : 'وقت خوبیه برای تماس با مشتریان جدید.'
              }
            />
          ) : (
            <div className="list-panel overflow-hidden rounded-[22px]">
              <div className="pointer-events-none border-b border-white/40 px-3.5 py-2 dark:border-white/8">
                <p className="text-[11px] font-semibold text-text-soft">
                  {toFa(list.length)} پیگیری · {bucketLabels[bucket]}
                </p>
              </div>

              {list.map((f, i) => {
                const lead = leadOf(f.leadId)
                if (!lead) return null
                return (
                  <FollowupRow
                    key={f.id}
                    followup={f}
                    lead={lead}
                    bordered={i < list.length - 1}
                    overdue={
                      bucket === 'overdue' ||
                      (f.status !== 'done' && overdue.some((o) => o.id === f.id))
                    }
                    done={bucket === 'done'}
                    onOpen={() => navigate(`/leads/${lead.id}`)}
                    onComplete={() => complete(f)}
                    onCall={() => call(lead)}
                    onSnooze={() => {
                      setSnoozeTarget(f)
                      setSnoozeDay(1)
                      setSnoozeHour(10)
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>
      </DataGate>

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

      <BottomSheet open={!!snoozeTarget} onClose={() => setSnoozeTarget(null)} title="به تعویق انداختن پیگیری">
        <div className="space-y-4 pt-1">
          <FollowupPicker
            dayOffset={snoozeDay}
            hour={snoozeHour}
            onDayChange={setSnoozeDay}
            onHourChange={setSnoozeHour}
          />
          <Button
            full
            size="lg"
            icon={<ChevronLeft size={18} />}
            onClick={() => {
              if (!snoozeTarget) return
              haptic('light')
              snoozeFollowup(snoozeTarget.id, buildFollowupIso(snoozeDay, snoozeHour))
              pushToast('پیگیری به زمان جدید موکول شد')
              setSnoozeTarget(null)
            }}
          >
            تایید زمان جدید
          </Button>
        </div>
      </BottomSheet>
    </Page>
  )
}

function FollowupRow({
  followup,
  lead,
  overdue,
  done,
  bordered,
  onOpen,
  onComplete,
  onCall,
  onSnooze,
}: {
  followup: Followup
  lead: Lead
  overdue?: boolean
  done?: boolean
  bordered?: boolean
  onOpen: () => void
  onComplete: () => void
  onCall: () => void
  onSnooze: () => void
}) {
  const KindIcon = kindIcon[followup.kind]
  const highPriority = followup.priority === 3
  const code = leadDisplayCode(lead)
  const timeLabel = formatTime(new Date(followup.dueAt))
  const dayLabel = !isBusinessToday(followup.dueAt) ? relativeDay(followup.dueAt) : null

  return (
    <article
      className={cn(
        'relative transition-colors',
        bordered && 'border-b border-white/40 dark:border-white/8',
        done && 'opacity-65',
      )}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-right">
          <LeadAvatar lead={lead} size={44} ring />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="min-w-0 truncate text-[15px] font-bold leading-snug text-text">
                {lead.firstName} {lead.lastName}
              </h3>
              {overdue && !done && (
                <AlertTriangle size={12} className="shrink-0 text-error-500" strokeWidth={2.5} />
              )}
              {highPriority && !done && !overdue && (
                <Flame size={12} className="shrink-0 text-hot-500" strokeWidth={2.5} />
              )}
              <span
                dir="ltr"
                className="mr-auto inline-flex shrink-0 items-center gap-0.5 rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-text-soft dark:bg-white/[0.06]"
              >
                <Hash size={9} strokeWidth={2.5} />
                {code}
              </span>
            </div>

            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-text-soft">
              <span className={cn('inline-flex shrink-0 items-center gap-0.5', overdue && !done && 'text-error-600 dark:text-error-400')}>
                <KindIcon size={10} strokeWidth={2.25} />
                {followupKindLabels[followup.kind]}
              </span>
              <span className="text-text-soft/40">·</span>
              <span className="truncate text-text-muted">
                {done ? relativeDayTime(followup.completedAt ?? followup.dueAt) : followup.title}
              </span>
            </p>
          </div>
        </button>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="text-left">
            {dayLabel && (
              <p className={cn('text-[9px] font-bold leading-tight', overdue && !done ? 'text-error-600 dark:text-error-400' : 'text-text-soft')}>
                {dayLabel}
              </p>
            )}
            <p
              className={cn(
                'text-[12px] font-black tabular-nums leading-none',
                overdue && !done ? 'text-error-600 dark:text-error-400' : 'text-text',
              )}
            >
              {timeLabel}
            </p>
          </div>

          {!done ? (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={onCall}
                aria-label={`${followupKindLabels[followup.kind]} با ${lead.firstName}`}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-90',
                  overdue
                    ? 'bg-error-500 text-white'
                    : 'bg-[#3390EC] text-white dark:bg-[#8774E1]',
                )}
              >
                <KindIcon size={14} strokeWidth={2.35} />
              </button>
              <button
                type="button"
                onClick={onSnooze}
                aria-label="به تعویق انداختن"
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-soft transition-colors active:bg-black/[0.05] dark:active:bg-white/[0.06]"
              >
                <Clock3 size={14} strokeWidth={2.25} />
              </button>
              <button
                type="button"
                onClick={onComplete}
                aria-label="انجام شد"
                className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-600 transition-colors active:bg-emerald-500/10"
              >
                <Check size={15} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600">
              <Check size={15} strokeWidth={2.5} />
            </span>
          )}
        </div>
      </div>
    </article>
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

  const kinds: FollowupKind[] = [
    'call',
    'message',
    'reminder',
    'meeting',
    'payment',
    'consultation',
    'info',
    'decision',
  ]

  return (
    <BottomSheet open={open} onClose={onClose} title="پیگیری جدید">
      <div className="space-y-4 pt-1">
        <div>
          <p className="mb-2 text-xs font-bold text-neutral-500">مشتری</p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {leads.slice(0, 12).map((l) => (
              <Chip key={l.id} active={leadId === l.id} onClick={() => setLeadId(l.id)}>
                {l.firstName} {l.lastName}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold text-neutral-500">نوع پیگیری</p>
          <div className="flex flex-wrap gap-2">
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
              title: lead ? `${followupKindLabels[kind]} ${lead.firstName}` : followupKindLabels[kind],
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
