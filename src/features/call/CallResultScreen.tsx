import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PhoneCall, Check, NotebookPen, Star, ArrowLeft } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Avatar } from '@/components/ui/Avatar'
import { FeedbackResultCard } from '@/components/domain/FeedbackResultCard'
import { FollowupPicker, buildFollowupIso } from '@/components/domain/FollowupPicker'
import { ContactStatusBadge } from '@/components/domain/Badges'
import { EmptyState } from '@/components/ui/States'
import { objectionLabels, resultToStage } from '@/data/labels'
import { getNextLeadAfter } from '@/lib/leadUtils'
import { formatPhone } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import type { CallResult, Objection } from '@/types'

const resultOrder: CallResult[] = [
  'interested',
  'very_hot',
  'needs_followup',
  'meeting_set',
  'payment_pending',
  'registered',
  'no_answer',
  'unavailable',
  'wrong_number',
  'not_interested',
  'do_not_disturb',
  'needs_info',
  'not_decision_maker',
  'call_later',
]

const objectionOrder: Objection[] = ['price', 'time', 'trust', 'need_more_info', 'thinking', 'no_budget']

const needsFollowup: CallResult[] = [
  'interested',
  'very_hot',
  'needs_followup',
  'meeting_set',
  'payment_pending',
  'needs_info',
  'call_later',
  'no_answer',
  'unavailable',
]

export function CallResultScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const lead = useStore((s) => s.leads.find((l) => l.id === id))
  const leads = useStore((s) => s.leads)
  const lastCallDuration = useStore((s) => s.lastCallDuration)
  const logCall = useStore((s) => s.logCall)
  const startCall = useStore((s) => s.startCall)
  const pushToast = useStore((s) => s.pushToast)

  const [result, setResult] = useState<CallResult | null>(null)
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')
  const [objection, setObjection] = useState<Objection | null>(null)
  const [dayOffset, setDayOffset] = useState<number>(1)
  const [hour, setHour] = useState<number>(10)
  const [saved, setSaved] = useState(false)

  if (!lead) {
    return (
      <Page withNav={false}>
        <TopBar title="نتیجه تماس" />
        <EmptyState title="سرنخ پیدا نشد" />
      </Page>
    )
  }

  const showFollowup = result ? needsFollowup.includes(result) : false
  const nextLead = getNextLeadAfter(leads, lead.id)

  const save = () => {
    if (!result) return
    haptic('success')
    logCall({
      leadId: lead.id,
      result,
      note,
      objection,
      nextStage: resultToStage[result] ?? null,
      rating,
      followupAt: showFollowup ? buildFollowupIso(dayOffset, hour) : null,
      durationSec: lastCallDuration,
    })
    setSaved(true)
  }

  return (
    <Page withNav={false} className="pb-28">
      <TopBar title="نتیجه تماس" />

      <div className="space-y-5 px-4">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary-50">
            <PhoneCall size={32} className="text-primary-600" />
            <span className="absolute -bottom-1 -left-1 flex h-7 w-7 items-center justify-center rounded-full bg-success-500 text-white ring-4 ring-background">
              <Check size={15} strokeWidth={3} />
            </span>
          </div>
          <h2 className="mt-3 text-lg font-extrabold text-neutral-900">
            تماس با {lead.firstName} {lead.lastName}
          </h2>
          <p className="mt-0.5 text-[13px] font-bold text-neutral-400">نتیجه این تماس را ثبت کن</p>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {resultOrder.map((r) => (
            <FeedbackResultCard
              key={r}
              result={r}
              selected={result === r}
              onClick={() => {
                haptic('selection')
                setResult(r)
              }}
            />
          ))}
        </div>

        <div className="rounded-2xl bg-surface p-4 shadow-card border border-border/60">
          <p className="mb-2.5 text-[13px] font-extrabold text-neutral-900">امتیاز سرنخ</p>
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
          {showFollowup && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-2xl bg-surface p-4 shadow-card border border-border/60"
            >
              <FollowupPicker
                dayOffset={dayOffset}
                hour={hour}
                onDayChange={setDayOffset}
                onHourChange={setHour}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-2xl bg-surface p-4 shadow-card border border-border/60">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-extrabold text-neutral-900">
            <NotebookPen size={15} className="text-primary-500" />
            یادداشت (اختیاری)
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="یادداشت خود را اینجا بنویس..."
            rows={2}
            className="w-full resize-none rounded-xl border border-border bg-neutral-50 p-3 text-[13px] font-bold text-neutral-800 outline-none focus:border-primary-400"
          />
        </div>

        <div>
          <p className="mb-2 text-[13px] font-extrabold text-neutral-900">دلیل مخالفت (اختیاری)</p>
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
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-border/60 bg-surface/90 glass px-4 pt-3 pb-[calc(14px+var(--safe-bottom))]">
        <Button full size="lg" disabled={!result} onClick={save} icon={<Check size={19} />}>
          ذخیره و ثبت نتیجه
        </Button>
      </div>

      <AnimatePresence>
        {saved && (
          <SuccessOverlay
            onNext={() => {
              if (nextLead) {
                startCall(nextLead.id)
                navigate(`/dialer/${nextLead.id}`, { replace: true })
              } else {
                navigate('/home', { replace: true })
              }
            }}
            onHome={() => {
              pushToast('نتیجه تماس ثبت شد')
              navigate('/home', { replace: true })
            }}
            next={nextLead}
          />
        )}
      </AnimatePresence>
    </Page>
  )
}

function SuccessOverlay({
  onNext,
  onHome,
  next,
}: {
  onNext: () => void
  onHome: () => void
  next: ReturnType<typeof getNextLeadAfter>
}) {
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
      <p className="mt-1 text-sm font-bold text-neutral-400">یک قدم به هدف امروز نزدیک‌تر شدی</p>

      {next && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-7 w-full rounded-3xl bg-neutral-50 p-4 border border-border/60"
        >
          <p className="mb-3 text-center text-xs font-bold text-neutral-400">سرنخ بعدی پیشنهادی</p>
          <div className="flex items-center gap-3">
            <Avatar id={next.id} first={next.firstName} last={next.lastName} src={next.avatar} size={48} ring />
            <div className="flex-1">
              <p className="text-sm font-extrabold text-neutral-900">
                {next.firstName} {next.lastName}
              </p>
              <p className="text-xs font-bold text-primary-600 tabular-nums">
                {formatPhone(next.phone)}
              </p>
            </div>
            <ContactStatusBadge temperature={next.temperature} size="sm" />
          </div>
        </motion.div>
      )}

      <div className="mt-6 w-full space-y-2.5">
        <Button full size="lg" icon={<PhoneCall size={18} />} onClick={onNext}>
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
