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
  Flame,
  CalendarClock,
  Wallet,
  Users,
  FileText,
  HelpCircle,
  ListChecks,
  Sparkles,
  Clock3,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Avatar } from '@/components/ui/Avatar'
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
import { formatTime, toFa, relativeDay, relativeDayTime } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import type { Followup, FollowupKind, Lead } from '@/types'
import { cn } from '@/lib/cn'
import { DataGate } from '@/components/pwa/DataGate'

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

const kindTheme: Record<FollowupKind, { accent: string; actionBtn: string }> = {
  call: { accent: 'bg-emerald-500', actionBtn: 'glass-inset border border-emerald-500/20 text-emerald-600' },
  message: { accent: 'bg-secondary-500', actionBtn: 'glass-inset border border-secondary-500/20 text-secondary-600' },
  reminder: { accent: 'bg-accent-500', actionBtn: 'glass-inset border border-accent-500/20 text-accent-600' },
  meeting: { accent: 'bg-[#3390EC]', actionBtn: 'glass-inset border border-[#3390EC]/20 text-[#3390EC] dark:text-[#8774E1]' },
  payment: { accent: 'bg-warning-500', actionBtn: 'glass-inset border border-warning-500/20 text-warning-600' },
  consultation: { accent: 'bg-primary-500', actionBtn: 'glass-inset border border-primary-500/20 text-primary-600' },
  info: { accent: 'bg-cold-500', actionBtn: 'glass-inset border border-cold-500/20 text-cold-600' },
  decision: { accent: 'bg-secondary-500', actionBtn: 'glass-inset border border-secondary-500/20 text-secondary-600' },
  custom: { accent: 'bg-neutral-400', actionBtn: 'glass-inset border border-white/50 text-neutral-600' },
}

const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: spring },
}
const listStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
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
  const suggestion = useMemo(() => getSuggestion(leads, followups, currentAgentId), [leads, followups, currentAgentId])

  const complete = (f: Followup) => {
    haptic('success')
    completeFollowup(f.id)
    pushToast('پیگیری انجام شد')
  }

  const call = (lead: Lead) => {
    haptic('medium')
    openCallMethodSheet(lead)
  }

  const todayDate = new Date()

  return (
    <Page>
      <ScreenHeader
        sticky
        title="پیگیری‌ها"
        subtitle="هیچ فرصتی را از دست نده"
        icon={CalendarDays}
        iconTone="accent"
        className="pb-2"
      >
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto overflow-y-visible px-1 py-1.5 no-scrollbar">
          {buckets.map((b) => (
            <Chip
              key={b.id}
              active={bucket === b.id}
              tone={b.tone}
              onClick={() => setBucket(b.id)}
              icon={<b.icon size={14} />}
            >
              {b.label}
              {counts[b.id] > 0 && (
                <span
                  className={cn(
                    'mr-0.5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                    bucket === b.id ? 'bg-white/25' : 'bg-black/5',
                  )}
                >
                  {toFa(counts[b.id])}
                </span>
              )}
            </Chip>
          ))}
        </div>
      </ScreenHeader>

      <DataGate mode="placeholder">
      <div className="space-y-4 px-4 pt-3">
        {bucket === 'today' && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-400">
            <CalendarDays size={13} />
            {relativeDay(todayDate.toISOString())}
          </div>
        )}

        {suggestion && bucket !== 'done' && (
          <motion.button
            variants={fadeUp}
            whileTap={{ scale: 0.985 }}
            onClick={() => call(suggestion.lead)}
            className={cn(
              'glass-card relative flex w-full items-center gap-3 overflow-hidden rounded-[22px]',
              'border border-white/55 p-3.5 text-right dark:border-white/10',
            )}
          >
            <div className="pointer-events-none absolute -left-8 top-0 h-24 w-24 rounded-full bg-[#3390EC]/12 blur-2xl dark:bg-[#8774E1]/14" />
            <span className="icon-3d icon-3d-primary relative flex h-10 w-10 shrink-0 items-center justify-center">
              <Sparkles size={16} className="text-white" strokeWidth={2.35} />
            </span>
            <div className="relative min-w-0 flex-1">
              <p className="text-[11px] font-bold text-[#3390EC] dark:text-[#8774E1]">پیگیری بعدی پیشنهادی</p>
              <p className="truncate text-[14px] font-bold text-text">
                {suggestion.lead.firstName} {suggestion.lead.lastName}
              </p>
            </div>
            <Phone size={17} className="relative shrink-0 text-[#3390EC] dark:text-[#8774E1]" strokeWidth={2.35} />
          </motion.button>
        )}

        {list.length === 0 ? (
          <EmptyState
            title={bucket === 'done' ? 'هنوز پیگیری تکمیل‌شده‌ای نیست' : 'پیگیری‌ای در این بخش نیست'}
            description={bucket === 'done' ? 'پیگیری‌های انجام‌شده اینجا نمایش داده می‌شوند.' : 'وقت خوبیه برای تماس با سرنخ‌های جدید.'}
          />
        ) : (
          <motion.div variants={listStagger} initial="hidden" animate="show" className="space-y-3">
            {list.map((f) => {
              const lead = leadOf(f.leadId)
              if (!lead) return null
              return (
                <FollowupCard
                  key={f.id}
                  followup={f}
                  lead={lead}
                  overdue={bucket === 'overdue' || (f.status !== 'done' && overdue.some((o) => o.id === f.id))}
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
          </motion.div>
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

function FollowupCard({
  followup,
  lead,
  overdue,
  done,
  onOpen,
  onComplete,
  onCall,
  onSnooze,
}: {
  followup: Followup
  lead: Lead
  overdue?: boolean
  done?: boolean
  onOpen: () => void
  onComplete: () => void
  onCall: () => void
  onSnooze: () => void
}) {
  const KindIcon = kindIcon[followup.kind]
  const theme = kindTheme[followup.kind]
  const highPriority = followup.priority === 3

  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        'glass-card relative flex items-center gap-2 overflow-hidden rounded-[20px] border py-3 pl-3 pr-2.5',
        overdue ? 'border-error-200/50 dark:border-error-500/20' : 'border-white/55 dark:border-white/10',
        done && 'opacity-70',
      )}
    >
      <div
        className={cn(
          'absolute inset-y-3 right-0 w-[3px] rounded-l-full',
          overdue ? 'bg-error-500' : done ? 'bg-success-500' : theme.accent,
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
            {overdue && !done && (
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-error-50 text-error-600"
                title="عقب‌افتاده"
                aria-label="عقب‌افتاده"
              >
                <AlertTriangle size={11} strokeWidth={2.5} />
              </span>
            )}
            {highPriority && !done && (
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
            {done ? relativeDayTime(followup.completedAt ?? followup.dueAt) : followup.title}
          </p>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-1.5 pl-0.5">
        {!done && (
          <>
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
              onClick={onSnooze}
              aria-label="به تعویق انداختن"
              className="glass-inset flex h-9 w-9 items-center justify-center rounded-xl border border-white/50 text-text-soft transition-all active:scale-90 dark:border-white/10"
            >
              <Clock3 size={16} strokeWidth={2.25} />
            </button>
            <button
              type="button"
              onClick={onComplete}
              aria-label="علامت‌گذاری انجام‌شده"
              className="glass-inset flex h-9 w-9 items-center justify-center rounded-xl border border-white/50 text-text-soft transition-all hover:text-emerald-600 active:scale-90 dark:border-white/10"
            >
              <Check size={17} strokeWidth={2.25} />
            </button>
          </>
        )}
        {done && (
          <span className="glass-inset flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 text-emerald-600">
            <Check size={17} strokeWidth={2.25} />
          </span>
        )}
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

  const kinds: FollowupKind[] = ['call', 'message', 'reminder', 'meeting', 'payment', 'consultation', 'info', 'decision']

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
