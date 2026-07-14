import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Mic,
  MicOff,
  Grid3x3,
  NotebookPen,
  Volume2,
  BookOpen,
  MessageSquareText,
  PhoneOff,
  ChevronDown,
  MoreVertical,
  MapPin,
  AlertCircle,
  MessageSquareWarning,
  Wallet,
  History,
  Clock,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { LeadAvatar } from '@/components/domain/LeadAvatar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SalesScriptSheet } from '@/components/domain/SalesScriptSheet'
import { LeadSmsSheet } from '@/components/domain/LeadSmsSheet'
import { LeadNotesStrip } from '@/components/domain/LeadNotesStrip'
import { ContactStatusBadge, SourceChip } from '@/components/domain/Badges'
import { objectionLabels } from '@/data/labels'
import { formatDuration, toFa } from '@/lib/format'
import { leadDisplayCode } from '@/lib/leadCode'
import { dialNativePhone } from '@/lib/call'
import {
  canEndAgentCall,
  isMinCallDurationEnabled,
  remainingAgentCallSec,
} from '@/lib/callPolicy'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'
import { collectLeadNotes } from '@/lib/leadNotes'
import { performReconcileCall } from '@/services/callActions'

export function DialerScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const lead = useStore((s) => s.leads.find((l) => l.id === id))
  const calls = useStore((s) => s.calls.filter((c) => c.leadId === id))
  const followups = useStore((s) => s.followups.filter((f) => f.leadId === id))
  const activeCallMethod = useStore((s) => s.activeCallMethod)
  const endCall = useStore((s) => s.endCall)
  const updateLeadNote = useStore((s) => s.updateLeadNote)
  const activeCallDraftNote = useStore((s) => s.activeCallDraftNote)
  const setActiveCallDraftNote = useStore((s) => s.setActiveCallDraftNote)
  const pushToast = useStore((s) => s.pushToast)
  const minCallDurationSec = useStore((s) => s.appSettings.minCallDurationSec)

  const isNativeCall = activeCallMethod === 'native'
  const nativeDialed = useRef(false)

  const [seconds, setSeconds] = useState(0)
  const [muted, setMuted] = useState(false)
  const [speaker, setSpeaker] = useState(false)
  const [sheet, setSheet] = useState<null | 'note' | 'keypad' | 'guide' | 'sms'>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!isNativeCall || !lead || nativeDialed.current) return
    nativeDialed.current = true
    const timer = window.setTimeout(() => dialNativePhone(lead.phone), 280)
    return () => window.clearTimeout(timer)
  }, [isNativeCall, lead])

  const leadNotes = useMemo(
    () => (lead ? collectLeadNotes(lead, calls, followups) : []),
    [lead, calls, followups],
  )

  if (!lead) {
    navigate('/home', { replace: true })
    return null
  }

  const minCallEnabled = isMinCallDurationEnabled(minCallDurationSec)
  const canEndCall = canEndAgentCall(seconds, minCallDurationSec)
  const remainingSec = remainingAgentCallSec(seconds, minCallDurationSec)

  const hangUp = () => {
    if (!canEndCall) {
      haptic('error')
      pushToast(
        `حداقل ${formatDuration(minCallDurationSec)} تماس لازم است — ${formatDuration(remainingSec)} مانده.`,
        'info',
      )
      return
    }
    haptic('heavy')
    if (isNativeCall) {
      void performReconcileCall(lead.id, 'answered')
    }
    const mergedNote = note.trim() || useStore.getState().activeCallDraftNote.trim()
    if (mergedNote) {
      updateLeadNote(lead.id, mergedNote)
      setActiveCallDraftNote(mergedNote)
    }
    endCall(seconds)
    navigate(`/call-result/${lead.id}`, { replace: true })
  }

  const openGuide = () => setSheet('guide')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full flex-col overflow-hidden bg-gradient-to-b from-[#3390EC]/8 via-background to-background dark:from-[#8774E1]/12"
    >
      <div className="glass-header flex shrink-0 items-center justify-between px-3 pt-[calc(8px+var(--safe-top))] pb-2.5">
        <button
          type="button"
          onClick={hangUp}
          disabled={minCallEnabled && !canEndCall}
          className={cn(
            'glass-inset flex h-10 w-10 items-center justify-center rounded-full text-text-soft transition-all',
            !minCallEnabled || canEndCall ? 'active:scale-95' : 'cursor-not-allowed opacity-45',
          )}
        >
          <ChevronDown size={22} strokeWidth={2.25} />
        </button>
        <span className="glass-inset inline-flex items-center gap-1.5 rounded-full border border-white/55 px-3.5 py-1.5 text-[11px] font-bold text-emerald-600 dark:border-white/10">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          {isNativeCall ? 'تماس با سیم‌کارت' : 'در حال تماس'}
        </span>
        <button
          type="button"
          onClick={openGuide}
          className="glass-inset flex h-10 w-10 items-center justify-center rounded-full text-text-soft transition-all active:scale-95"
        >
          <MoreVertical size={20} strokeWidth={2.25} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
        <div className="relative flex items-center justify-center">
          <motion.span
            animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.15, 0.35] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute h-40 w-40 rounded-full bg-[#3390EC]/20 dark:bg-[#8774E1]/22"
          />
          <motion.span
            animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.25, 0.5] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            className="absolute h-32 w-32 rounded-full bg-[#3390EC]/12 dark:bg-[#8774E1]/14"
          />
          <LeadAvatar lead={lead} size={108} ring showTempBadge />
        </div>
        <h2 className="mt-5 text-xl font-black text-text">
          {lead.firstName} {lead.lastName}
        </h2>
        <p className="mt-1 text-sm font-bold text-text-soft">
          کد مشتری{' '}
          <span dir="ltr" className="font-extrabold tracking-[0.14em] text-text tabular-nums">
            {leadDisplayCode(lead)}
          </span>
        </p>
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
          <ContactStatusBadge temperature={lead.temperature} />
          <SourceChip source={lead.source} />
          {lead.conversionProbability > 0 && (
            <span className="rounded-full bg-[#3390EC]/12 px-2.5 py-1 text-[10px] font-extrabold text-[#3390EC] dark:bg-[#8774E1]/15 dark:text-[#8774E1]">
              امتیاز لید {toFa(lead.conversionProbability)}
            </span>
          )}
          {lead.callCount > 0 && (
            <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[10px] font-bold text-text-soft dark:bg-white/10">
              {toFa(lead.callCount)} تماس قبلی
            </span>
          )}
        </div>
        <div className="mt-2.5">
          <span
            className={cn(
              'glass-inset inline-flex items-center gap-1 rounded-full border border-white/50 px-2.5 py-1 text-sm font-bold tabular-nums dark:border-white/10',
              minCallEnabled && !canEndCall ? 'text-amber-600' : 'text-emerald-600',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                minCallEnabled && !canEndCall ? 'animate-pulse bg-amber-500' : 'bg-emerald-500',
              )}
            />
            {formatDuration(seconds)}
          </span>
        </div>
        <LeadNotesStrip notes={leadNotes} />
      </div>

      <div className="shrink-0 px-8 pb-[calc(12px+var(--safe-bottom))]">
        <div className={cn('grid gap-y-4 gap-x-3', isNativeCall ? 'grid-cols-2' : 'grid-cols-3')}>
          {!isNativeCall && (
            <>
              <ControlButton
                icon={muted ? <MicOff size={22} /> : <Mic size={22} />}
                label="بی‌صدا"
                active={muted}
                onClick={() => { haptic('light'); setMuted((v) => !v) }}
              />
              <ControlButton icon={<Grid3x3 size={22} />} label="صفحه کلید" onClick={() => setSheet('keypad')} />
            </>
          )}
          <ControlButton
            icon={<NotebookPen size={22} />}
            label="یادداشت"
            onClick={() => {
              setNote(activeCallDraftNote || lead.lastNote || '')
              setSheet('note')
            }}
          />
          {!isNativeCall && (
            <ControlButton
              icon={<Volume2 size={22} />}
              label="بلندگو"
              active={speaker}
              onClick={() => { haptic('light'); setSpeaker((v) => !v) }}
            />
          )}
          <ControlButton
            icon={<MessageSquareText size={22} />}
            label="پیامک"
            onClick={() => setSheet('sms')}
          />
          <ControlButton
            icon={<BookOpen size={22} />}
            label="راهنما"
            tone="accent"
            onClick={openGuide}
          />
        </div>

        <div className="mt-5 flex justify-center">
          <motion.button
            whileTap={!minCallEnabled || canEndCall ? { scale: 0.9 } : undefined}
            onClick={hangUp}
            disabled={minCallEnabled && !canEndCall}
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_12px_30px_-8px_rgba(229,72,77,0.6)]',
              !minCallEnabled || canEndCall ? 'bg-error' : 'cursor-not-allowed bg-error/45',
            )}
          >
            <PhoneOff size={24} />
          </motion.button>
        </div>
      </div>

      <BottomSheet open={sheet === 'note'} onClose={() => setSheet(null)} title="یادداشت تماس">
        <textarea
          value={note}
          onChange={(e) => {
            const value = e.target.value
            setNote(value)
            setActiveCallDraftNote(value)
          }}
          placeholder="نکات مهم این تماس را بنویس..."
          rows={5}
          className="w-full rounded-2xl border border-border bg-neutral-50 p-4 text-sm font-bold text-neutral-800 outline-none focus:border-primary-400"
        />
        <button
          onClick={() => {
            const trimmed = note.trim()
            updateLeadNote(lead.id, trimmed)
            setActiveCallDraftNote(trimmed)
            setSheet(null)
          }}
          className="mt-3 h-12 w-full rounded-2xl bg-primary-600 text-sm font-extrabold text-white"
        >
          ذخیره یادداشت
        </button>
      </BottomSheet>

      <BottomSheet open={sheet === 'keypad'} onClose={() => setSheet(null)} title="صفحه کلید">
        <Keypad />
      </BottomSheet>

      <LeadSmsSheet open={sheet === 'sms'} onClose={() => setSheet(null)} lead={lead} />

      <BottomSheet open={sheet === 'guide'} onClose={() => setSheet(null)} title="راهنما">
        <div className="space-y-5 pb-1 pt-1">
          <section className="space-y-3">
            <p className="text-[11px] font-bold text-text-soft">خلاصه مشتری</p>
            <div className="flex flex-wrap items-center gap-2">
              <ContactStatusBadge temperature={lead.temperature} size="sm" />
              <SourceChip source={lead.source} size="sm" />
              <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-extrabold text-primary-700 dark:bg-primary-500/15 dark:text-primary-200">
                {toFa(lead.conversionProbability)}٪ احتمال
              </span>
            </div>

            {lead.city && (
              <p className="flex items-center gap-1.5 text-[12px] font-bold text-neutral-500">
                <MapPin size={13} className="shrink-0 text-neutral-400" />
                {lead.city}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <SummaryField icon={Clock} label="بهترین زمان تماس" value={lead.bestCallTime || '-'} />
              <SummaryField icon={History} label="تعداد تلاش" value={toFa(lead.callCount)} />
              {lead.budget && <SummaryField icon={Wallet} label="بودجه حدودی" value={lead.budget} />}
            </div>

            {lead.painPoint && (
              <SummaryField icon={AlertCircle} label="نیاز اصلی مشتری" value={lead.painPoint} tone="warning" full />
            )}
            {lead.objection && (
              <SummaryField
                icon={MessageSquareWarning}
                label="اعتراض احتمالی"
                value={objectionLabels[lead.objection]}
                tone="error"
                full
              />
            )}
            {lead.lastNote && (
              <SummaryField icon={NotebookPen} label="آخرین یادداشت" value={lead.lastNote} full />
            )}
          </section>

          <div className="h-px bg-border/70" />

          <section className="space-y-2">
            <p className="text-[11px] font-bold text-text-soft">اسکریپت فروش</p>
            <SalesScriptSheet embedded />
          </section>
        </div>
      </BottomSheet>
    </motion.div>
  )
}

function SummaryField({
  icon: Icon,
  label,
  value,
  tone = 'primary',
  full,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone?: 'primary' | 'warning' | 'error'
  full?: boolean
}) {
  const toneClass = {
    primary: 'text-primary-600',
    warning: 'text-warning-600',
    error: 'text-error-600',
  }[tone]
  return (
    <div className={cn('rounded-xl bg-neutral-50 px-3 py-2 dark:bg-white/5', full && 'col-span-2')}>
      <p className="mb-0.5 flex items-center gap-1 text-[10px] font-bold text-neutral-400">
        <Icon size={11} className={toneClass} />
        {label}
      </p>
      <p className="text-[12px] font-extrabold leading-5 text-neutral-800 dark:text-neutral-200">{value}</p>
    </div>
  )
}

function ControlButton({
  icon,
  label,
  onClick,
  active,
  tone = 'neutral',
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  active?: boolean
  tone?: 'neutral' | 'secondary' | 'accent'
}) {
  const toneCls =
    tone === 'secondary'
      ? 'border-secondary-500/20 text-secondary-600'
      : tone === 'accent'
        ? 'border-accent-500/20 text-accent-600'
        : 'border-white/50 text-text dark:border-white/10'
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5">
      <motion.span
        whileTap={{ scale: 0.9 }}
        className={cn(
          'glass-inset flex h-14 w-14 items-center justify-center rounded-full border transition-colors',
          active
            ? 'border-[#3390EC]/30 bg-[#3390EC]/15 text-[#3390EC] dark:border-[#8774E1]/35 dark:bg-[#8774E1]/18 dark:text-[#8774E1]'
            : toneCls,
        )}
      >
        {icon}
      </motion.span>
      <span className="text-[10px] font-semibold text-text-soft">{label}</span>
    </button>
  )
}

function Keypad() {
  const keys = ['۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹', '*', '۰', '#']
  return (
    <div className="grid grid-cols-3 gap-3 pb-2">
      {keys.map((k) => (
        <button
          key={k}
          className="flex h-16 items-center justify-center rounded-2xl bg-neutral-50 text-2xl font-extrabold text-neutral-800 active:bg-neutral-100 dark:bg-white/8 dark:text-neutral-100"
        >
          {k}
        </button>
      ))}
    </div>
  )
}
