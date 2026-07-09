import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, Headphones, Lock } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Avatar } from '@/components/ui/Avatar'
import { useStore } from '@/store/useStore'
import { formatPhone, maskPhone } from '@/lib/format'
import { isVoipCallEnabled } from '@/lib/call'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

const spring = { type: 'spring' as const, stiffness: 420, damping: 32 }

export function CallMethodSheet() {
  const navigate = useNavigate()
  const lead = useStore((s) => s.callMethodLead)
  const close = useStore((s) => s.closeCallMethodSheet)
  const startCall = useStore((s) => s.startCall)
  const maskPhoneNumbers = useStore((s) => s.maskPhoneNumbers)

  const open = lead !== null
  const voipEnabled = isVoipCallEnabled()

  const phoneLabel = lead
    ? maskPhoneNumbers
      ? maskPhone(lead.phone)
      : formatPhone(lead.phone)
    : ''

  const handleNative = () => {
    if (!lead) return
    haptic('medium')
    close()
    startCall(lead.id, 'native')
    navigate(`/dialer/${lead.id}`)
  }

  const handleVoip = () => {
    if (!lead || !voipEnabled) return
    haptic('medium')
    close()
    startCall(lead.id, 'voip')
    navigate(`/dialer/${lead.id}`)
  }

  return (
    <BottomSheet open={open} onClose={close} title="روش تماس">
      {lead && (
        <div className="space-y-4 pt-1">
          <div className="glass-inset flex items-center gap-3 rounded-[18px] border border-white/55 p-3 dark:border-white/10">
            <Avatar
              id={lead.id}
              first={lead.firstName}
              last={lead.lastName}
              src={lead.avatar}
              size={44}
              ring
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-text">
                {lead.firstName} {lead.lastName}
              </p>
              <p dir="ltr" className="mt-0.5 truncate text-[13px] font-semibold tabular-nums text-text-muted">
                {phoneLabel}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              transition={spring}
              onClick={handleNative}
              className={cn(
                'glass-card flex w-full items-center gap-3 rounded-[18px] border border-white/60 p-3.5 text-right',
                'active:opacity-90 dark:border-white/10',
              )}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#31B545]/14 text-[#31B545] dark:bg-[#34D399]/14 dark:text-[#34D399]">
                <Phone size={20} strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-text">تماس با سیم‌کارت</p>
                <p className="mt-0.5 text-[12px] font-medium text-text-muted">
                  با شماره گوشی خودت تماس بگیر
                </p>
              </div>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: voipEnabled ? 0.98 : 1 }}
              transition={spring}
              disabled={!voipEnabled}
              onClick={handleVoip}
              className={cn(
                'glass-inset flex w-full items-center gap-3 rounded-[18px] border p-3.5 text-right',
                voipEnabled
                  ? 'border-white/60 active:opacity-90 dark:border-white/10'
                  : 'cursor-not-allowed border-white/40 opacity-60 dark:border-white/8',
              )}
            >
              <span
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                  voipEnabled
                    ? 'bg-[#3390EC]/14 text-[#3390EC] dark:bg-[#8774E1]/14 dark:text-[#8774E1]'
                    : 'bg-black/5 text-text-soft dark:bg-white/8',
                )}
              >
                {voipEnabled ? (
                  <Headphones size={20} strokeWidth={2.25} />
                ) : (
                  <Lock size={18} strokeWidth={2.25} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-bold text-text">تماس VoIP</p>
                  {!voipEnabled && (
                    <span className="rounded-full bg-[#FFB000]/15 px-2 py-0.5 text-[10px] font-bold text-[#B45309] dark:bg-[#FBBF24]/15 dark:text-[#FBBF24]">
                      به‌زودی
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[12px] font-medium text-text-muted">
                  {voipEnabled
                    ? 'تماس از داخل اپ — بدون سیم‌کارت'
                    : 'تماس اینترنتی از داخل اپ — در حال توسعه'}
                </p>
              </div>
            </motion.button>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
