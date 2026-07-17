import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  NotebookPen,
  Star,
  Wallet,
  CalendarClock,
  Sparkles,
  MessageCircleWarning,
  Clock3,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { LeadAvatar } from '@/components/domain/LeadAvatar'
import { FeedbackResultRow } from '@/components/domain/FeedbackResultCard'
import { resultIcon } from '@/components/domain/icons'
import { FollowupPicker, buildFollowupIso } from '@/components/domain/FollowupPicker'
import { ContactStatusBadge } from '@/components/domain/Badges'
import { suggestReasonIcon, suggestReasonChipLabel } from '@/components/domain/icons'
import { canEndAgentCall } from '@/lib/callPolicy'
import { formatDuration, toFa } from '@/lib/format'
import { formatCustomerPhone } from '@/lib/phonePrivacy'
import { EmptyState } from '@/components/ui/States'
import { SuccessScreen } from '@/components/ui/SuccessScreen'
import {
  objectionLabels,
  resultToStage,
  resultToNextAction,
  nextActionLabels,
  resultHint,
  followupKindLabels,
  resultLabels,
} from '@/data/labels'
import { routeCallResult } from '@/services/logic'
import { performSubmitCallResult, getActiveCallId } from '@/services/callActions'
import { ApiError } from '@/services/http'
import { readCallSession } from '@/services/callSession'
import { collectLeadNotes } from '@/lib/leadNotes'
import { objectionsLibrary } from '@/data/mockExtra'
import { leadDisplayCode } from '@/lib/leadCode'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'
import type { CallResultOutcome } from '@/services/client'
import type { CallResult, FollowupKind, Objection } from '@/types'

const TG = 'text-[#3390EC] dark:text-[#8774E1]'
const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }

const quickResults: CallResult[] = [
  'no_answer',
  'interested',
  'needs_followup',
  'very_hot',
  'call_later',
  'not_interested',
]

const resultGroups: { label: string; results: CallResult[] }[] = [
  {
    label: 'فروش و پیشرو',
    results: ['meeting_set', 'payment_pending', 'registered', 'needs_info', 'bad_timing'],
  },
  {
    label: 'بدون ارتباط',
    results: ['unavailable', 'incomplete_call', 'not_decision_maker', 'price_objection'],
  },
  {
    label: 'بستن پرونده',
    results: ['wrong_number', 'duplicate', 'do_not_disturb'],
  },
]

const objectionOrder: Objection[] = ['price', 'time', 'trust', 'need_more_info', 'thinking', 'no_budget']

const followupKindOrder: FollowupKind[] = ['call', 'message', 'reminder', 'meeting', 'consultation', 'info']

export function CallResultScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const lead = useStore((s) => s.leads.find((l) => l.id === id))
  const calls = useStore((s) => s.calls.filter((c) => c.leadId === id))
  const followups = useStore((s) => s.followups.filter((f) => f.leadId === id))
  const products = useStore((s) => s.products)
  const lastCallDuration = useStore((s) => s.lastCallDuration)
  const minCallDurationSec = useStore((s) => s.appSettings.minCallDurationSec)
  const activeCallLeadId = useStore((s) => s.activeCallLeadId)
  const openCallMethodSheet = useStore((s) => s.openCallMethodSheet)
  const pushToast = useStore((s) => s.pushToast)
  const powerDialEnabled = useStore((s) => s.powerDialEnabled)
  const activeCallDraftNote = useStore((s) => s.activeCallDraftNote)
  const setActiveCallDraftNote = useStore((s) => s.setActiveCallDraftNote)

  const [result, setResult] = useState<CallResult | null>(null)
  const [rating, setRating] = useState(0)
  const [objection, setObjection] = useState<Objection | null>(null)
  const [followupKind, setFollowupKind] = useState<FollowupKind>('call')
  const [dayOffset, setDayOffset] = useState<number>(1)
  const [hour, setHour] = useState<number>(10)
  const [saleAmount, setSaleAmount] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [outcome, setOutcome] = useState<CallResultOutcome | null>(null)

  const callSession = useMemo(() => readCallSession(), [activeCallLeadId, lastCallDuration])
  const sessionDuration =
    callSession?.leadId === lead?.id ? (callSession?.durationSec ?? 0) : 0
  const effectiveDuration = Math.max(lastCallDuration, sessionDuration)
  const canRegisterResult =
    !!outcome ||
    activeCallLeadId === lead?.id ||
    getActiveCallId(lead?.id ?? '') !== undefined ||
    (callSession?.leadId === lead?.id && (callSession?.durationSec ?? 0) > 0)

  useEffect(() => {
    if (!lead || outcome || activeCallLeadId !== lead.id) return
    const draft = useStore.getState().activeCallDraftNote.trim()
    if (!draft && lead.lastNote.trim()) {
      setActiveCallDraftNote(lead.lastNote.trim())
    }
  }, [lead, activeCallLeadId, outcome, setActiveCallDraftNote])

  const routed = useMemo(() => (result ? routeCallResult(result) : null), [result])
  const product = products.find((p) => p.id === (lead?.productId ?? products[0]?.id))
  const leadNotes = useMemo(
    () => (lead ? collectLeadNotes(lead, calls, followups) : []),
    [lead, calls, followups],
  )
  const lastContextNote = leadNotes[leadNotes.length - 1]?.text ?? ''
  const displayNote = outcome?.savedNote ?? activeCallDraftNote
  const noteLocked = !!outcome || submitting

  const selectResult = (nextResult: CallResult) => {
    haptic('selection')
    setResult(nextResult)
    setSaleAmount(null)
  }

  if (!lead) {
    return (
      <Page withNav={false}>
        <TopBar title="نتیجه تماس" />
        <EmptyState title="مشتری پیدا نشد" />
      </Page>
    )
  }

  if (!canRegisterResult) {
    return (
      <Page withNav={false}>
        <TopBar title="نتیجه تماس" />
        <EmptyState
          title="ابتدا تماس بگیرید"
          description="برای ثبت نتیجه، اول با این مشتری تماس بگیرید و بعد از پایان تماس نتیجه را ثبت کنید."
          action={{
            label: 'بازگشت به جزئیات مشتری',
            onClick: () => navigate(`/leads/${lead.id}`, { replace: true }),
          }}
        />
      </Page>
    )
  }

  const showFollowup = !!routed?.createsFollowup
  const showSale = !!routed?.createsSale
  const showObjection =
    result === 'price_objection' ||
    result === 'not_interested' ||
    result === 'needs_info' ||
    result === 'not_decision_maker'

  const save = async () => {
    if (submitting) return
    if (!result) {
      pushToast('اول نتیجه تماس را انتخاب کن.', 'info')
      return
    }

    const latestSession = readCallSession()
    const durationSec = Math.max(
      effectiveDuration,
      latestSession?.leadId === lead.id ? latestSession.durationSec ?? 0 : 0,
    )
    const endedViaDialer = latestSession?.leadId === lead.id && !!latestSession.endedAt

    if (!endedViaDialer && !canEndAgentCall(durationSec, minCallDurationSec)) {
      pushToast(`حداقل مدت تماس ${formatDuration(minCallDurationSec)} است.`, 'info')
      return
    }
    haptic('success')
    setSubmitting(true)
    try {
      const trimmedNote = activeCallDraftNote.trim()
      const out = await performSubmitCallResult({
        leadId: lead.id,
        result,
        note: trimmedNote,
        objection,
        nextStage: resultToStage[result] ?? null,
        rating,
        followupAt: showFollowup ? buildFollowupIso(dayOffset, hour) : null,
        followupKind: showFollowup ? followupKind : undefined,
        durationSec,
        saleAmount: showSale ? (saleAmount ?? product?.price ?? undefined) : undefined,
        advance: powerDialEnabled,
      })
      if (powerDialEnabled && out.suggestion?.lead) {
        openCallMethodSheet(out.suggestion.lead)
        return
      }
      setOutcome({ ...out, savedNote: trimmedNote || null })
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error && error.message
            ? error.message
            : 'ثبت نتیجه ناموفق بود. دوباره تلاش کن.'
      pushToast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (outcome) {
    return (
      <CallResultSuccessView
        outcome={outcome}
        onNext={() => {
          if (outcome.suggestion) {
            openCallMethodSheet(outcome.suggestion.lead)
          } else {
            navigate('/home', { replace: true })
          }
        }}
        onHome={() => {
          pushToast('نتیجه تماس ثبت شد')
          navigate('/home', { replace: true })
        }}
      />
    )
  }

  return (
    <Page withNav={false} className="relative pb-28">
      <TopBar title="ثبت نتیجه" />

      <div className="space-y-3 px-4 pb-6">
        {/* Lead summary */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="glass-card rounded-[18px] border border-white/55 p-3 dark:border-white/10"
        >
          <div className="flex items-center gap-2.5">
            <LeadAvatar lead={lead} size={44} ring showTempBadge />
            <div className="min-w-0 flex-1 text-right">
              <h2 className="truncate text-[15px] font-bold leading-tight text-text">
                {lead.firstName} {lead.lastName}
              </h2>
              <div className="mt-1 flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5">
                <span className="text-[11px] font-semibold text-text-soft">
                  کد{' '}
                  <span dir="ltr" className="text-[12px] font-black tabular-nums text-text">
                    {leadDisplayCode(lead)}
                  </span>
                </span>
                {effectiveDuration > 0 && (
                  <>
                    <span className="text-text-soft/30">·</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold tabular-nums text-emerald-600">
                      <Clock3 size={11} strokeWidth={2.5} />
                      {formatDuration(effectiveDuration)}
                    </span>
                  </>
                )}
                <span className="text-text-soft/30">·</span>
                <ContactStatusBadge temperature={lead.temperature} size="sm" />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2.5 overflow-hidden rounded-xl border border-[#3390EC]/20 bg-[#3390EC]/8 px-3 py-2 dark:border-[#8774E1]/22 dark:bg-[#8774E1]/10"
              >
                <p className={cn('flex items-center gap-1.5 text-[12px] font-bold', TG)}>
                  <Sparkles size={13} strokeWidth={2.35} />
                  {nextActionLabels[resultToNextAction[result]]}
                </p>
                {resultHint[result] && (
                  <p className="mt-0.5 text-[11px] font-semibold text-text-soft">{resultHint[result]}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Quick picks */}
        <section>
          <p className="mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wide text-text-soft">
            پرکاربرد
          </p>
          <div className="glass-card overflow-hidden rounded-[18px] border border-white/55 dark:border-white/10">
            <div className="flex gap-2 overflow-x-auto px-3 py-2.5 no-scrollbar">
              {quickResults.map((r) => {
                const Icon = resultIcon[r]
                const selected = result === r
                return (
                  <button
                    key={r}
                    type="button"
                    disabled={submitting}
                    onClick={() => selectResult(r)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] font-bold transition-colors active:scale-[0.97]',
                      selected
                        ? 'border-[#3390EC]/40 bg-[#3390EC] text-white dark:border-[#8774E1]/40 dark:bg-[#8774E1]'
                        : 'glass-inset border-white/50 text-text dark:border-white/10',
                    )}
                  >
                    <Icon size={14} strokeWidth={2.25} />
                    {resultLabels[r]}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Grouped results */}
        {resultGroups.map((group) => (
          <section key={group.label}>
            <p className="mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wide text-text-soft">
              {group.label}
            </p>
            <div className="glass-card overflow-hidden rounded-[18px] border border-white/55 dark:border-white/10">
              {group.results.map((r, index) => (
                <FeedbackResultRow
                  key={r}
                  result={r}
                  selected={result === r}
                  showDivider={index < group.results.length - 1}
                  onClick={() => !submitting && selectResult(r)}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Follow-up scheduling */}
        <AnimatePresence>
          {showFollowup && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wide text-text-soft">
                پیگیری بعدی
              </p>
              <div className="glass-card overflow-hidden rounded-[18px] border border-white/55 p-3.5 dark:border-white/10">
                <p className="mb-2.5 flex items-center gap-1.5 text-[13px] font-bold text-text">
                  <CalendarClock size={15} className={TG} />
                  زمان پیگیری
                </p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {followupKindOrder.map((k) => (
                    <Chip key={k} active={followupKind === k} onClick={() => setFollowupKind(k)}>
                      {followupKindLabels[k]}
                    </Chip>
                  ))}
                </div>
                <FollowupPicker
                  dayOffset={dayOffset}
                  hour={hour}
                  onDayChange={setDayOffset}
                  onHourChange={setHour}
                />
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Sale amount */}
        <AnimatePresence>
          {showSale && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wide text-text-soft">
                فروش
              </p>
              <div className="glass-card overflow-hidden rounded-[18px] border border-white/55 p-3.5 dark:border-white/10">
                <p className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-text">
                  <Wallet size={15} className="text-emerald-600" strokeWidth={2.35} />
                  مبلغ ({product?.name ?? 'محصول'})
                </p>
                <div
                  dir="ltr"
                  className="glass-inset flex h-11 items-center gap-2 rounded-xl border border-white/50 px-3 dark:border-white/10"
                >
                  <input
                    inputMode="numeric"
                    value={toFa(String(saleAmount ?? product?.price ?? 0))}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^\d۰-۹]/g, '')
                      const en = digits.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
                      setSaleAmount(Number(en) || 0)
                    }}
                    className="h-full min-w-0 flex-1 bg-transparent text-left text-[15px] font-extrabold tabular-nums text-text outline-none"
                  />
                  <span className="shrink-0 text-[11px] font-bold text-text-soft">تومان</span>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Objection */}
        <AnimatePresence>
          {showObjection && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wide text-text-soft">
                دلیل مخالفت
              </p>
              <div className="glass-card overflow-hidden rounded-[18px] border border-white/55 p-3.5 dark:border-white/10">
                <div className="flex flex-wrap gap-1.5">
                  {objectionOrder.map((o) => (
                    <Chip
                      key={o}
                      active={objection === o}
                      onClick={() => setObjection((prev) => (prev === o ? null : o))}
                    >
                      {objectionLabels[o]}
                    </Chip>
                  ))}
                </div>
                {objection && (
                  <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-warning-50/80 p-2.5 dark:bg-warning-500/10">
                    <MessageCircleWarning size={14} className="mt-0.5 shrink-0 text-warning-600" />
                    <p className="text-[11px] font-semibold leading-5 text-warning-700 dark:text-warning-400">
                      {objectionsLibrary.find((o) => o.key === objection)?.suggestedResponse ??
                        'با آرامش به دلیل مخالفت گوش بده و راهکار مشخص بده.'}
                    </p>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Note + rating */}
        <section>
          <p className="mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wide text-text-soft">
            جزئیات اختیاری
          </p>
          <div className="glass-card overflow-hidden rounded-[18px] border border-white/55 p-3.5 dark:border-white/10">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-[12px] font-bold text-text-soft">امتیاز مشتری</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button key={i} type="button" onClick={() => setRating(i)} aria-label={`امتیاز ${i}`}>
                    <Star
                      size={22}
                      className={
                        i <= rating
                          ? 'fill-warning-400 text-warning-400'
                          : 'fill-neutral-200/80 text-neutral-200 dark:fill-white/10 dark:text-white/15'
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-white/40 pt-3 dark:border-white/8">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[12px] font-bold text-text">
                  <NotebookPen size={14} className={TG} />
                  یادداشت
                </p>
                {noteLocked && displayNote.trim() && (
                  <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600">
                    ذخیره شد
                  </span>
                )}
              </div>
              {lastContextNote && !noteLocked && !displayNote.trim() && (
                <p className="mb-2 truncate rounded-lg bg-black/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-text-soft dark:bg-white/[0.04]">
                  قبلی: {lastContextNote}
                </p>
              )}
              <textarea
                value={displayNote}
                onChange={(e) => setActiveCallDraftNote(e.target.value)}
                readOnly={noteLocked}
                placeholder="یادداشت کوتاه از تماس..."
                rows={2}
                className="w-full resize-none rounded-xl border border-white/50 bg-white/35 p-2.5 text-[13px] font-semibold text-text outline-none focus:border-[#3390EC]/40 read-only:opacity-90 dark:border-white/10 dark:bg-white/[0.06] dark:focus:border-[#8774E1]/40"
              />
            </div>
          </div>
        </section>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(14px+var(--safe-bottom))]">
        <div className="glass-fab pointer-events-auto mx-auto max-w-[408px] rounded-[20px] border border-white/55 p-2.5 shadow-2xl dark:border-white/10">
          {result ? (
            <p className="mb-1.5 truncate text-center text-[11px] font-bold text-text">
              {resultLabels[result]}
              <span className="mx-1 text-text-soft/40">·</span>
              <span className={TG}>{nextActionLabels[resultToNextAction[result]]}</span>
            </p>
          ) : (
            <p className="mb-1.5 text-center text-[11px] font-bold text-text-soft">
              یکی از نتایج را انتخاب کن
            </p>
          )}
          <Button
            full
            size="lg"
            disabled={!result || submitting}
            onClick={() => void save()}
            icon={<Check size={19} />}
          >
            {submitting ? 'در حال ثبت…' : 'ثبت نتیجه'}
          </Button>
        </div>
      </div>
    </Page>
  )
}

function CallResultSuccessView({
  outcome,
  onNext,
  onHome,
}: {
  outcome: CallResultOutcome
  onNext: () => void
  onHome: () => void
}) {
  const role = useStore((s) => s.role)
  const next = outcome.suggestion?.lead ?? null
  const ReasonIcon = outcome.suggestion ? suggestReasonIcon[outcome.suggestion.reason] : null

  return (
    <div className="fixed inset-0 z-[80]">
      <SuccessScreen
        title="ثبت شد، عالی بود"
        description={outcome.nextActionLabel}
        primaryLabel={next ? 'تماس بعدی رو شروع کن' : 'بازگشت به خانه'}
        onPrimary={onNext}
        secondaryLabel={next ? 'بعداً' : undefined}
        onSecondary={next ? onHome : undefined}
      >
        {outcome.savedNote && (
          <div className="rounded-2xl border border-border/60 bg-neutral-50/80 p-3.5 text-right dark:bg-white/[0.06]">
            <p className="mb-1 flex items-center justify-center gap-1.5 text-[11px] font-bold text-neutral-400">
              <NotebookPen size={13} />
              یادداشت ثبت‌شده
            </p>
            <p className="text-[13px] font-semibold leading-6 text-neutral-700 dark:text-neutral-200">
              {outcome.savedNote}
            </p>
          </div>
        )}

        {next && (
          <div className="rounded-2xl border border-border/60 bg-neutral-50/80 p-3.5 text-right dark:bg-white/[0.06]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-neutral-400">مشتری بعدی پیشنهادی</p>
              {ReasonIcon && outcome.suggestion && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-extrabold text-primary-700">
                  <ReasonIcon size={11} />
                  {suggestReasonChipLabel[outcome.suggestion.reason]}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <LeadAvatar lead={next} size={48} ring className="shrink-0" />
              <div className="min-w-0 flex-1 text-right">
                <p className="truncate text-sm font-extrabold text-neutral-900 dark:text-neutral-100">
                  {next.firstName} {next.lastName}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center justify-end gap-2">
                  <ContactStatusBadge temperature={next.temperature} size="sm" />
                  <p className="ltr-nums text-xs font-bold text-primary-600 tabular-nums">
                    {formatCustomerPhone(next.phone, role)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </SuccessScreen>
    </div>
  )
}
