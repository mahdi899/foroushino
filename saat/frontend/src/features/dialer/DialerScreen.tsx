import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Mic,
  MicOff,
  Grid3x3,
  NotebookPen,
  Volume2,
  MessageSquareText,
  PhoneOff,
  ChevronDown,
  MapPin,
  AlertCircle,
  MessageSquareWarning,
  CalendarPlus,
  UserRound,
  Clock,
  History,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { LeadAvatar } from '@/components/domain/LeadAvatar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { LeadSmsSheet } from '@/components/domain/LeadSmsSheet'
import { FollowupPicker, buildFollowupIso } from '@/components/domain/FollowupPicker'
import { ContactStatusBadge } from '@/components/domain/Badges'
import { objectionLabels, resultLabels, stageLabels } from '@/data/labels'
import { formatDuration, relativeDayTime, toFa } from '@/lib/format'
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
import { performReconcileCall, getActiveCallId, waitForActiveCallId } from '@/services/callActions'
import { saveCallSession } from '@/services/callSession'

const TG = 'text-[#3390EC] dark:text-[#8774E1]'

type Sheet = null | 'keypad' | 'sms' | 'callback'

export function DialerScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const pendingMethod = (location.state as { method?: 'native' | 'voip' } | null)?.method
  const lead = useStore((s) => s.leads.find((l) => l.id === id))
  const calls = useStore((s) => s.calls.filter((c) => c.leadId === id))
  const followups = useStore((s) => s.followups.filter((f) => f.leadId === id))
  const activeCallMethod = useStore((s) => s.activeCallMethod)
  const endCall = useStore((s) => s.endCall)
  const updateLeadNote = useStore((s) => s.updateLeadNote)
  const activeCallDraftNote = useStore((s) => s.activeCallDraftNote)
  const setActiveCallDraftNote = useStore((s) => s.setActiveCallDraftNote)
  const createFollowup = useStore((s) => s.createFollowup)
  const pushToast = useStore((s) => s.pushToast)
  const minCallDurationSec = useStore((s) => s.appSettings.minCallDurationSec)

  const isNativeCall = activeCallMethod === 'native' || pendingMethod === 'native'
  const nativeDialed = useRef(false)

  const [seconds, setSeconds] = useState(0)
  const [muted, setMuted] = useState(false)
  const [speaker, setSpeaker] = useState(false)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [callbackDay, setCallbackDay] = useState(1)
  const [callbackHour, setCallbackHour] = useState(10)
  const [note, setNote] = useState(activeCallDraftNote)

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!isNativeCall || !lead || nativeDialed.current) return
    nativeDialed.current = true
    dialNativePhone(lead.phone)
  }, [isNativeCall, lead])

  useEffect(() => {
    setNote(activeCallDraftNote)
  }, [activeCallDraftNote])

  const leadNotes = useMemo(
    () => (lead ? collectLeadNotes(lead, calls, followups) : []),
    [lead, calls, followups],
  )

  const recentCalls = useMemo(
    () =>
      [...calls]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 2),
    [calls],
  )

  if (!lead) {
    navigate('/home', { replace: true })
    return null
  }

  const minCallEnabled = isMinCallDurationEnabled(minCallDurationSec)
  const canEndCall = canEndAgentCall(seconds, minCallDurationSec)
  const remainingSec = remainingAgentCallSec(seconds, minCallDurationSec)
  const contextNote = leadNotes[leadNotes.length - 1]?.text ?? lead.interestReason

  const hangUp = async () => {
    if (!canEndCall) {
      haptic('error')
      pushToast(
        `حداقل ${formatDuration(minCallDurationSec)} تماس لازم است — ${formatDuration(remainingSec)} مانده.`,
        'info',
      )
      return
    }
    haptic('heavy')
    const callId = (await waitForActiveCallId(lead.id, 12_000)) ?? getActiveCallId(lead.id)
    if (isNativeCall && callId) {
      void performReconcileCall(lead.id, 'answered')
    }
    const mergedNote = note.trim() || useStore.getState().activeCallDraftNote.trim()
    if (mergedNote) {
      updateLeadNote(lead.id, mergedNote)
      setActiveCallDraftNote(mergedNote)
    }
    endCall(seconds)
    saveCallSession({
      leadId: lead.id,
      callId,
      durationSec: seconds,
      endedAt: new Date().toISOString(),
    })
    navigate(`/call-result/${lead.id}`, { replace: true })
  }

  const scheduleCallback = () => {
    haptic('success')
    createFollowup({
      leadId: lead.id,
      kind: 'call',
      title: `تماس ${lead.firstName}`,
      dueAt: buildFollowupIso(callbackDay, callbackHour),
      priority: lead.priority,
    })
    pushToast('پیگیری بعدی ثبت شد')
    setSheet(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full flex-col overflow-hidden bg-background"
    >
      {/* Status bar */}
      <div className="glass-header flex shrink-0 items-center justify-between px-4 pt-[calc(8px+var(--safe-top))] pb-2">
        <button
          type="button"
          onClick={hangUp}
          disabled={minCallEnabled && !canEndCall}
          className={cn(
            'glass-inset flex h-9 w-9 items-center justify-center rounded-full text-text-soft',
            !minCallEnabled || canEndCall ? 'active:scale-95' : 'cursor-not-allowed opacity-45',
          )}
          aria-label="پایان تماس"
        >
          <ChevronDown size={20} strokeWidth={2.25} />
        </button>

        <div
          className={cn(
            'glass-inset flex items-center gap-2 rounded-full border border-white/55 px-4 py-2 dark:border-white/10',
            minCallEnabled && !canEndCall && 'border-amber-400/30',
          )}
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span
            className={cn(
              'text-[22px] font-black tabular-nums leading-none',
              minCallEnabled && !canEndCall ? 'text-amber-600' : 'text-text',
            )}
          >
            {formatDuration(seconds)}
          </span>
          <span className="text-[10px] font-bold text-text-soft">
            {isNativeCall ? 'سیم‌کارت' : 'VoIP'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/leads/${lead.id}`)}
          className="glass-inset flex h-9 w-9 items-center justify-center rounded-full text-text-soft active:scale-95"
          aria-label="جزئیات مشتری"
        >
          <UserRound size={18} strokeWidth={2.25} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 pb-2">
        {/* Lead card */}
        <div className="glass-card rounded-[18px] border border-white/55 p-3 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <LeadAvatar lead={lead} size={44} ring showTempBadge />
            <div className="min-w-0 flex-1 text-right">
              <h2 className="truncate text-[15px] font-bold leading-tight text-text">
                {lead.firstName} {lead.lastName}
              </h2>
              <div className="mt-1 flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                <span className="text-[11px] font-semibold text-text-soft">
                  کد مشتری:{' '}
                  <span dir="ltr" className="text-[13px] font-black tabular-nums text-text">
                    {leadDisplayCode(lead)}
                  </span>
                </span>
                {lead.city && (
                  <>
                    <span className="text-text-soft/30">·</span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-text-soft">
                      <MapPin size={9} strokeWidth={2.25} />
                      {lead.city}
                    </span>
                  </>
                )}
                <span className="text-text-soft/30">·</span>
                <ContactStatusBadge temperature={lead.temperature} size="sm" />
                {lead.conversionProbability > 0 && (
                  <>
                    <span className="text-text-soft/30">·</span>
                    <span className={cn('text-[10px] font-bold tabular-nums', TG)}>
                      {toFa(lead.conversionProbability)}٪
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-3 gap-1">
            <InfoPill icon={History} label="مرحله" value={stageLabels[lead.stage]} />
            <InfoPill
              icon={Clock}
              label="بهترین زمان"
              value={lead.bestCallTime || '—'}
            />
            <InfoPill
              icon={PhoneOff}
              label="تماس قبلی"
              value={
                lead.lastCallAt
                  ? relativeDayTime(lead.lastCallAt)
                  : lead.callCount > 0
                    ? toFa(lead.callCount)
                    : '—'
              }
            />
          </div>

          {(contextNote || lead.painPoint || lead.objection) && (
            <div className="mt-2.5 space-y-1.5 border-t border-white/40 pt-2.5 dark:border-white/8">
              {contextNote && (
                <ContextLine icon={NotebookPen} label="یادداشت قبلی" value={contextNote} />
              )}
              {lead.painPoint && (
                <ContextLine icon={AlertCircle} label="نیاز" value={lead.painPoint} tone="warning" />
              )}
              {lead.objection && (
                <ContextLine
                  icon={MessageSquareWarning}
                  label="اعتراض محتمل"
                  value={objectionLabels[lead.objection]}
                  tone="error"
                />
              )}
            </div>
          )}
        </div>

        {/* Live notes — standard in call center desktops */}
        <div className="glass-card mt-3 rounded-[18px] border border-white/55 p-3 dark:border-white/10">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-text-soft">
            <NotebookPen size={12} className={TG} strokeWidth={2.25} />
            یادداشت همین تماس
          </p>
          <textarea
            value={note}
            onChange={(e) => {
              const value = e.target.value
              setNote(value)
              setActiveCallDraftNote(value)
            }}
            placeholder="نکات مهم مکالمه را همین‌جا بنویس…"
            rows={3}
            className="glass-inset w-full resize-none rounded-[14px] border border-white/50 px-3 py-2.5 text-[13px] font-semibold leading-relaxed text-text outline-none focus:border-[#3390EC]/35 dark:border-white/10"
          />
        </div>

        {recentCalls.length > 0 && (
          <div className="glass-card mt-3 rounded-[18px] border border-white/55 p-3 dark:border-white/10">
            <p className="mb-2 text-[11px] font-bold text-text-soft">آخرین تماس‌ها</p>
            <div className="space-y-1.5">
              {recentCalls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between gap-2 rounded-[12px] bg-black/[0.03] px-2.5 py-2 dark:bg-white/[0.04]"
                >
                  <span className="text-[12px] font-semibold text-text">
                    {resultLabels[call.result]}
                  </span>
                  <span className="shrink-0 text-[10px] font-bold tabular-nums text-text-soft">
                    {relativeDayTime(call.createdAt)}
                    {call.durationSec > 0 && ` · ${formatDuration(call.durationSec)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {minCallEnabled && !canEndCall && (
          <p className="mt-3 text-center text-[11px] font-semibold text-amber-600">
            حداقل {formatDuration(minCallDurationSec)} — {formatDuration(remainingSec)} مانده
          </p>
        )}
      </div>

      {/* Quick tools */}
      <div className="shrink-0 px-4 pb-[calc(12px+var(--safe-bottom))]">
        <div className="glass-card overflow-hidden rounded-[18px] border border-white/55 dark:border-white/10">
          <div className="grid grid-cols-3 gap-px bg-white/40 dark:bg-white/8">
            {!isNativeCall && (
              <>
                <ActionCell
                  icon={muted ? MicOff : Mic}
                  label="بی‌صدا"
                  active={muted}
                  onClick={() => {
                    haptic('light')
                    setMuted((v) => !v)
                  }}
                />
                <ActionCell icon={Grid3x3} label="کلید" onClick={() => setSheet('keypad')} />
                <ActionCell
                  icon={Volume2}
                  label="بلندگو"
                  active={speaker}
                  onClick={() => {
                    haptic('light')
                    setSpeaker((v) => !v)
                  }}
                />
              </>
            )}
            <ActionCell icon={MessageSquareText} label="پیامک" onClick={() => setSheet('sms')} />
            <ActionCell icon={CalendarPlus} label="پیگیری" onClick={() => setSheet('callback')} />
            {isNativeCall && (
              <ActionCell
                icon={UserRound}
                label="جزئیات"
                onClick={() => navigate(`/leads/${lead.id}`)}
              />
            )}
          </div>
        </div>

        <motion.button
          whileTap={!minCallEnabled || canEndCall ? { scale: 0.97 } : undefined}
          onClick={hangUp}
          disabled={minCallEnabled && !canEndCall}
          className={cn(
            'mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] text-[15px] font-bold text-white',
            'shadow-[0_8px_24px_-6px_rgba(229,72,77,0.5)]',
            !minCallEnabled || canEndCall ? 'bg-error' : 'cursor-not-allowed bg-error/45',
          )}
        >
          <PhoneOff size={20} strokeWidth={2.25} />
          پایان تماس و ثبت نتیجه
        </motion.button>
      </div>

      <BottomSheet open={sheet === 'keypad'} onClose={() => setSheet(null)} title="صفحه کلید">
        <Keypad />
      </BottomSheet>

      <LeadSmsSheet open={sheet === 'sms'} onClose={() => setSheet(null)} lead={lead} />

      <BottomSheet open={sheet === 'callback'} onClose={() => setSheet(null)} title="زمان‌بندی پیگیری">
        <div className="space-y-4 pt-1">
          <p className="text-[12px] font-semibold text-text-muted">
            تماس بعدی با {lead.firstName} را برای بعد از این مکالمه رزرو کن.
          </p>
          <FollowupPicker
            dayOffset={callbackDay}
            hour={callbackHour}
            onDayChange={setCallbackDay}
            onHourChange={setCallbackHour}
          />
          <Button full size="lg" onClick={scheduleCallback}>
            ثبت پیگیری
          </Button>
        </div>
      </BottomSheet>
    </motion.div>
  )
}

function InfoPill({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="glass-inset rounded-[12px] px-2 py-2 text-center">
      <Icon size={12} className={cn('mx-auto mb-1', TG)} strokeWidth={2.25} />
      <p className="truncate text-[10px] font-bold text-text">{value}</p>
      <p className="mt-0.5 text-[9px] font-semibold text-text-soft">{label}</p>
    </div>
  )
}

function ContextLine({
  icon: Icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: LucideIcon
  label: string
  value: string
  tone?: 'neutral' | 'warning' | 'error'
}) {
  const toneCls = {
    neutral: TG,
    warning: 'text-amber-600 dark:text-amber-400',
    error: 'text-error-600 dark:text-error-400',
  }[tone]

  return (
    <div className="flex items-start gap-2 text-right">
      <Icon size={13} className={cn('mt-0.5 shrink-0', toneCls)} strokeWidth={2.25} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-text-soft">{label}</p>
        <p className="text-[12px] font-semibold leading-snug text-text-muted line-clamp-2">{value}</p>
      </div>
    </div>
  )
}

function ActionCell({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: LucideIcon
  label: string
  onClick?: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 bg-white/50 px-1.5 py-2.5 transition-colors active:bg-white/70',
        'dark:bg-white/[0.04] dark:active:bg-white/[0.08]',
        active && 'bg-[#3390EC]/10 dark:bg-[#8774E1]/14',
      )}
    >
      <Icon size={19} strokeWidth={2.25} className={active ? TG : 'text-text-muted'} />
      <span className="text-[9px] font-semibold text-text-soft">{label}</span>
    </button>
  )
}

function Keypad() {
  const keys = ['۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹', '*', '۰', '#']
  return (
    <div className="grid grid-cols-3 gap-2 pb-2">
      {keys.map((k) => (
        <button
          key={k}
          className="glass-inset flex h-14 items-center justify-center rounded-2xl text-xl font-bold text-text active:opacity-80"
        >
          {k}
        </button>
      ))}
    </div>
  )
}
