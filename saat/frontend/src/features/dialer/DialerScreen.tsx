import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Mic,
  MicOff,
  Grid3x3,
  NotebookPen,
  BookOpen,
  Volume2,
  UserPlus,
  PhoneOff,
  ChevronDown,
  MoreVertical,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Avatar } from '@/components/ui/Avatar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SalesScriptSheet } from '@/components/domain/SalesScriptSheet'
import { ContactStatusBadge } from '@/components/domain/Badges'
import { formatDuration, formatPhone } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

export function DialerScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const lead = useStore((s) => s.leads.find((l) => l.id === id))
  const endCall = useStore((s) => s.endCall)

  const [seconds, setSeconds] = useState(0)
  const [muted, setMuted] = useState(false)
  const [speaker, setSpeaker] = useState(false)
  const [sheet, setSheet] = useState<null | 'note' | 'keypad'>(null)
  const [note, setNote] = useState('')
  const [scriptOpen, setScriptOpen] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  if (!lead) {
    navigate('/home', { replace: true })
    return null
  }

  const hangUp = () => {
    haptic('heavy')
    endCall(seconds)
    navigate(`/call-result/${lead.id}`, { replace: true })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full flex-col overflow-hidden bg-gradient-to-b from-primary-50/60 via-background to-background"
    >
      <div className="flex shrink-0 items-center justify-between px-4 pt-[calc(16px+var(--safe-top))]">
        <button
          onClick={hangUp}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-card text-neutral-500"
        >
          <ChevronDown size={22} />
        </button>
        <span className="flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-xs font-extrabold text-primary-700 shadow-card">
          <span className="h-2 w-2 animate-pulse rounded-full bg-success-500" />
          در حال تماس
        </span>
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-card text-neutral-500">
          <MoreVertical size={20} />
        </button>
      </div>

      {scriptOpen ? (
        <div className="flex shrink-0 items-center gap-3 px-5 py-3">
          <Avatar id={lead.id} first={lead.firstName} last={lead.lastName} src={lead.avatar} size={52} ring />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-black text-neutral-900">
              {lead.firstName} {lead.lastName}
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <ContactStatusBadge temperature={lead.temperature} />
              <span className="flex items-center gap-1 text-xs font-bold text-success-600 tabular-nums">
                <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                {formatDuration(seconds)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
            <div className="relative flex items-center justify-center">
              <span className="absolute h-36 w-36 animate-pulse-ring rounded-full bg-primary-400/20" />
              <span className="absolute h-28 w-28 rounded-full bg-primary-400/10" />
              <Avatar id={lead.id} first={lead.firstName} last={lead.lastName} src={lead.avatar} size={108} ring />
            </div>
            <h2 className="mt-5 text-xl font-black text-neutral-900">
              {lead.firstName} {lead.lastName}
            </h2>
            <p className="ltr-nums mt-1 text-sm font-bold text-neutral-500 tabular-nums">
              {formatPhone(lead.phone)}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <ContactStatusBadge temperature={lead.temperature} />
              <span className="flex items-center gap-1 text-sm font-bold text-success-600 tabular-nums">
                <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                {formatDuration(seconds)}
              </span>
            </div>
          </div>

          <div className="shrink-0 px-8 pb-3">
            <div className="grid grid-cols-3 gap-y-4 gap-x-3">
              <ControlButton
                icon={muted ? <MicOff size={22} /> : <Mic size={22} />}
                label="بی‌صدا"
                active={muted}
                onClick={() => { haptic('light'); setMuted((v) => !v) }}
              />
              <ControlButton icon={<Grid3x3 size={22} />} label="صفحه کلید" onClick={() => setSheet('keypad')} />
              <ControlButton icon={<NotebookPen size={22} />} label="یادداشت" onClick={() => setSheet('note')} />
              <ControlButton
                icon={<BookOpen size={22} />}
                label="اسکریپت"
                tone="secondary"
                active={scriptOpen}
                onClick={() => setScriptOpen(true)}
              />
              <ControlButton
                icon={<Volume2 size={22} />}
                label="بلندگو"
                active={speaker}
                onClick={() => { haptic('light'); setSpeaker((v) => !v) }}
              />
              <ControlButton
                icon={<UserPlus size={22} />}
                label="پیگیری بعدی"
                tone="accent"
                onClick={() => navigate(`/call-result/${lead.id}`)}
              />
            </div>

            <div className="mt-5 flex justify-center">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={hangUp}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-error text-white shadow-[0_12px_30px_-8px_rgba(229,72,77,0.6)]"
              >
                <PhoneOff size={24} />
              </motion.button>
            </div>
          </div>
        </>
      )}

      <div
        id="dialer-script"
        className={cn(
          'shrink-0 pb-[var(--safe-bottom,0px)]',
          scriptOpen && 'flex min-h-0 flex-1 flex-col',
        )}
      >
        <SalesScriptSheet
          expanded={scriptOpen}
          onExpandedChange={setScriptOpen}
          fill={scriptOpen}
        />
      </div>

      <BottomSheet open={sheet === 'note'} onClose={() => setSheet(null)} title="یادداشت تماس">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="نکات مهم این تماس را بنویس..."
          rows={5}
          className="w-full rounded-2xl border border-border bg-neutral-50 p-4 text-sm font-bold text-neutral-800 outline-none focus:border-primary-400"
        />
        <button
          onClick={() => setSheet(null)}
          className="mt-3 h-12 w-full rounded-2xl bg-primary-600 text-sm font-extrabold text-white"
        >
          ذخیره یادداشت
        </button>
      </BottomSheet>

      <BottomSheet open={sheet === 'keypad'} onClose={() => setSheet(null)} title="صفحه کلید">
        <Keypad />
      </BottomSheet>
    </motion.div>
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
      ? 'bg-secondary-50 text-secondary-600'
      : tone === 'accent'
        ? 'bg-accent-50 text-accent-600'
        : 'bg-surface text-neutral-700'
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5">
      <motion.span
        whileTap={{ scale: 0.9 }}
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full shadow-card',
          active ? 'bg-primary-600 text-white' : toneCls,
        )}
      >
        {icon}
      </motion.span>
      <span className="text-[10px] font-bold text-neutral-500">{label}</span>
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
          className="flex h-16 items-center justify-center rounded-2xl bg-neutral-50 text-2xl font-extrabold text-neutral-800 active:bg-neutral-100"
        >
          {k}
        </button>
      ))}
    </div>
  )
}
