import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PhoneCall,
  Check,
  NotebookPen,
  Star,
  ArrowLeft,
  Wallet,
  CalendarClock,
  Sparkles,
  Home,
  MessageCircleWarning,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { LeadAvatar } from '@/components/domain/LeadAvatar'
import { FeedbackResultCard } from '@/components/domain/FeedbackResultCard'
import { FollowupPicker, buildFollowupIso } from '@/components/domain/FollowupPicker'
import { ContactStatusBadge } from '@/components/domain/Badges'
import { suggestReasonIcon, suggestReasonChipLabel } from '@/components/domain/icons'
import { canEndAgentCall, MIN_AGENT_CALL_DURATION_SEC } from '@/lib/callPolicy'
import { formatDuration } from '@/lib/format'
import { EmptyState } from '@/components/ui/States'
import {
  objectionLabels,
  resultToStage,
  resultToNextAction,
  nextActionLabels,
  resultHint,
  followupKindLabels,
} from '@/data/labels'
import { routeCallResult } from '@/services/logic'
import { objectionsLibrary } from '@/data/mockExtra'
import { formatPhone, toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import type { CallResultOutcome } from '@/services/client'
import type { CallResult, FollowupKind, Objection } from '@/types'

const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: spring },
}
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.03 } },
}

const resultOrder: CallResult[] = [
  'very_hot',
  'interested',
  'needs_followup',
  'meeting_set',
  'payment_pending',
  'registered',
  'call_later',
  'no_answer',
  'unavailable',
  'bad_timing',
  'needs_info',
  'not_decision_maker',
  'price_objection',
  'not_interested',
  'wrong_number',
  'duplicate',
  'do_not_disturb',
  'incomplete_call',
]

const objectionOrder: Objection[] = ['price', 'time', 'trust', 'need_more_info', 'thinking', 'no_budget']

const followupKindOrder: FollowupKind[] = ['call', 'message', 'reminder', 'meeting', 'consultation', 'info']

export function CallResultScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const lead = useStore((s) => s.leads.find((l) => l.id === id))
  const products = useStore((s) => s.products)
  const lastCallDuration = useStore((s) => s.lastCallDuration)
  const activeCallLeadId = useStore((s) => s.activeCallLeadId)
  const submitCallResult = useStore((s) => s.submitCallResult)
  const openCallMethodSheet = useStore((s) => s.openCallMethodSheet)
  const pushToast = useStore((s) => s.pushToast)

  const [result, setResult] = useState<CallResult | null>(null)
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')
  const [objection, setObjection] = useState<Objection | null>(null)
  const [followupKind, setFollowupKind] = useState<FollowupKind>('call')
  const [dayOffset, setDayOffset] = useState<number>(1)
  const [hour, setHour] = useState<number>(10)
  const [saleAmount, setSaleAmount] = useState<number | null>(null)
  const [outcome, setOutcome] = useState<CallResultOutcome | null>(null)

  const routed = useMemo(() => (result ? routeCallResult(result) : null), [result])
  const product = products.find((p) => p.id === (lead?.productId ?? products[0]?.id))

  if (!lead) {
    return (
      <Page withNav={false}>
        <TopBar title="نتیجه تماس" />
        <EmptyState title="سرنخ پیدا نشد" />
      </Page>
    )
  }

  if (!outcome && activeCallLeadId !== lead.id) {
    return (
      <Page withNav={false}>
        <TopBar title="نتیجه تماس" />
        <EmptyState
          title="ابتدا تماس بگیرید"
          description="برای ثبت نتیجه، اول با این سرنخ تماس بگیرید و بعد از پایان تماس نتیجه را ثبت کنید."
          action={{
            label: 'بازگشت به جزئیات سرنخ',
            onClick: () => navigate(`/leads/${lead.id}`, { replace: true }),
          }}
        />
      </Page>
    )
  }

  const showFollowup = !!routed?.createsFollowup
  const showSale = !!routed?.createsSale
  const showObjection =
    result === 'price_objection' || result === 'not_interested' || result === 'needs_info' || result === 'not_decision_maker'

  const save = () => {
    if (!result) return
    if (!canEndAgentCall(lastCallDuration)) {
      pushToast(
        `حداقل مدت تماس ${formatDuration(MIN_AGENT_CALL_DURATION_SEC)} است.`,
        'info',
      )
      return
    }
    haptic('success')
    const out = submitCallResult({
      leadId: lead.id,
      result,
      note,
      objection,
      nextStage: resultToStage[result] ?? null,
      rating,
      followupAt: showFollowup ? buildFollowupIso(dayOffset, hour) : null,
      followupKind: showFollowup ? followupKind : undefined,
      durationSec: lastCallDuration,
      saleAmount: showSale ? (saleAmount ?? product?.price ?? undefined) : undefined,
    })
    setOutcome(out)
  }

  return (
    <Page withNav={false} className="pb-28">
      <TopBar title="نتیجه تماس" />

      <div className="space-y-4 px-4 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="glass-hero relative overflow-hidden rounded-[26px] p-5 text-center"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-10 top-0 h-32 w-32 rounded-full bg-[#3390EC]/14 blur-3xl dark:bg-[#8774E1]/16" />
            <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/85 to-transparent dark:via-white/12" />
          </div>
          <div className="relative mx-auto w-fit">
            <LeadAvatar lead={lead} size={64} ring showTempBadge />
            <span className="absolute -bottom-0.5 -left-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white ring-[3px] ring-background">
              <Check size={13} strokeWidth={3} />
            </span>
          </div>
          <h2 className="relative mt-3 text-[17px] font-bold text-text">
            تماس با {lead.firstName} {lead.lastName}
          </h2>
          <p className="relative mt-0.5 text-[13px] font-semibold text-text-soft">نتیجه این تماس را ثبت کن</p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-2"
        >
          {resultOrder.map((r) => (
            <motion.div key={r} variants={fadeUp} className="min-w-0">
              <FeedbackResultCard
                result={r}
                selected={result === r}
                onClick={() => {
                  haptic('selection')
                  setResult(r)
                  setSaleAmount(null)
                }}
              />
            </motion.div>
          ))}
        </motion.div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-inset overflow-hidden rounded-[20px] border border-[#3390EC]/18 p-4 dark:border-[#8774E1]/20"
            >
              <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#3390EC] dark:text-[#8774E1]">
                <Sparkles size={14} />
                {nextActionLabels[resultToNextAction[result]]}
              </p>
              {resultHint[result] && (
                <p className="mt-1 text-[11px] font-bold text-primary-500/80">{resultHint[result]}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="glass-card rounded-[22px] border border-white/55 p-4 dark:border-white/10">
          <p className="mb-2.5 text-[13px] font-bold text-text">امتیاز سرنخ</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} onClick={() => setRating(i)}>
                <Star
                  size={30}
                  className={i <= rating ? 'fill-warning-400 text-warning-400' : 'fill-neutral-200 text-neutral-200'}
                />
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {showSale && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card overflow-hidden rounded-[22px] border border-white/55 p-4 dark:border-white/10"
            >
              <p className="mb-2.5 flex items-center gap-1.5 text-[13px] font-bold text-text">
                <Wallet size={15} className="text-emerald-600" strokeWidth={2.35} />
                مبلغ فروش ({product?.name ?? 'محصول'})
              </p>
              <div dir="ltr" className="glass-inset flex h-12 items-center gap-2 rounded-xl border border-white/50 px-3.5 dark:border-white/10">
                <input
                  inputMode="numeric"
                  value={toFa(String(saleAmount ?? product?.price ?? 0))}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^\d۰-۹]/g, '')
                    const en = digits.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
                    setSaleAmount(Number(en) || 0)
                  }}
                  className="h-full min-w-0 flex-1 bg-transparent text-left text-[15px] font-extrabold tabular-nums text-neutral-900 outline-none"
                />
                <span className="shrink-0 text-[12px] font-bold text-neutral-400">تومان</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showFollowup && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card overflow-hidden rounded-[22px] border border-white/55 p-4 dark:border-white/10"
            >
              <p className="mb-2.5 flex items-center gap-1.5 text-[13px] font-bold text-text">
                <CalendarClock size={15} className="text-[#3390EC] dark:text-[#8774E1]" />
                زمان پیگیری بعدی
              </p>
              <div className="mb-3 flex flex-wrap gap-2">
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
            </motion.div>
          )}
        </AnimatePresence>

        <div className="glass-card rounded-[22px] border border-white/55 p-4 dark:border-white/10">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-text">
            <NotebookPen size={15} className="text-[#3390EC] dark:text-[#8774E1]" />
            یادداشت (اختیاری)
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="یادداشت خود را اینجا بنویس..."
            rows={2}
            className="w-full resize-none rounded-xl border border-white/50 bg-white/35 p-3 text-[13px] font-semibold text-text outline-none focus:border-[#3390EC]/40 dark:border-white/10 dark:bg-white/[0.06] dark:focus:border-[#8774E1]/40"
          />
        </div>

        {showObjection && (
          <div>
            <p className="mb-2 text-[13px] font-extrabold text-neutral-900">دلیل مخالفت</p>
            <div className="flex flex-wrap gap-2">
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
              <div className="mt-2.5 flex items-start gap-2.5 rounded-xl bg-warning-50 p-3">
                <MessageCircleWarning size={15} className="mt-0.5 shrink-0 text-warning-600" />
                <p className="text-[12px] font-bold leading-6 text-warning-700">
                  {objectionsLibrary.find((o) => o.key === objection)?.suggestedResponse ??
                    'یادت باشه با آرامش به دلیل مخالفت گوش بده و راهکار مشخص بده.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="glass-header absolute inset-x-0 bottom-0 z-20 border-t border-white/50 px-4 pt-3 pb-[calc(14px+var(--safe-bottom))] dark:border-white/10">
        <Button full size="lg" disabled={!result} onClick={save} icon={<Check size={19} />}>
          ذخیره و ثبت نتیجه
        </Button>
      </div>

      <AnimatePresence>
        {outcome && (
          <SuccessOverlay
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
        )}
      </AnimatePresence>
    </Page>
  )
}

function SuccessOverlay({
  outcome,
  onNext,
  onHome,
}: {
  outcome: CallResultOutcome
  onNext: () => void
  onHome: () => void
}) {
  const next = outcome.suggestion?.lead ?? null
  const ReasonIcon = outcome.suggestion ? suggestReasonIcon[outcome.suggestion.reason] : null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-surface/95 glass px-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 220 }}
        className="flex h-24 w-24 items-center justify-center rounded-full bg-success-500 text-white shadow-float"
      >
        <Check size={48} strokeWidth={3} />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-5 text-xl font-black text-neutral-900"
      >
        ثبت شد، عالی بود
      </motion.h2>
      <p className="mt-1.5 max-w-[260px] text-center text-[13px] font-bold leading-6 text-neutral-500">
        {outcome.nextActionLabel}
      </p>

      {next && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 w-full rounded-3xl bg-neutral-50 p-4 border border-border/60"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold text-neutral-400">سرنخ بعدی پیشنهادی</p>
            {ReasonIcon && outcome.suggestion && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-extrabold text-primary-700">
                <ReasonIcon size={11} />
                {suggestReasonChipLabel[outcome.suggestion.reason]}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <LeadAvatar lead={next} size={48} ring className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-neutral-900">
                {next.firstName} {next.lastName}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <ContactStatusBadge temperature={next.temperature} size="sm" />
                <p className="ltr-nums text-xs font-bold text-primary-600 tabular-nums">
                  {formatPhone(next.phone)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="mt-6 w-full space-y-2.5">
        <Button full size="lg" icon={next ? <PhoneCall size={18} /> : <Home size={18} />} onClick={onNext}>
          {next ? 'تماس بعدی رو شروع کن' : 'بازگشت به خانه'}
        </Button>
        {next && (
          <button onClick={onHome} className="flex w-full items-center justify-center gap-1 text-sm font-bold text-neutral-400">
            <ArrowLeft size={15} />
            بعداً
          </button>
        )}
      </div>
    </motion.div>
  )
}
