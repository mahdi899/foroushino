import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, Headphones, Lock, ScrollText, ChevronRight } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { LeadAvatar } from '@/components/domain/LeadAvatar'
import { LeadDetailsPanel } from '@/components/domain/LeadDetailsPanel'
import { useStore } from '@/store/useStore'
import { formatPhone, maskPhone } from '@/lib/format'
import { isNativeCallEnabled, isVoipCallEnabled } from '@/lib/call'
import { performStartCall } from '@/services/callActions'
import { ApiError } from '@/services/http'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'
const spring = { type: 'spring' as const, stiffness: 420, damping: 32 }

export function CallMethodSheet() {
  const navigate = useNavigate()
  const lead = useStore((s) => s.callMethodLead)
  const close = useStore((s) => s.closeCallMethodSheet)
  const appSettings = useStore((s) => s.appSettings)
  const pushToast = useStore((s) => s.pushToast)
  const [showDetails, setShowDetails] = useState(false)
  const [starting, setStarting] = useState(false)

  const open = lead !== null
  const maskPhoneNumbers = useStore((s) => s.maskPhoneNumbers)
  const voipEnabled = isVoipCallEnabled()
  const nativeEnabled = isNativeCallEnabled()

  useEffect(() => {
    if (!open) setShowDetails(false)
  }, [open])

  const beginCall = async (method: 'native' | 'voip') => {
    if (!lead || starting) return
    setStarting(true)
    try {
      haptic('medium')
      handleClose()
      await performStartCall(lead.id, method)
      navigate(`/dialer/${lead.id}`)
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error && error.message
            ? error.message
            : 'شروع تماس ناموفق بود. بعداً دوباره تلاش کن.'
      pushToast(message, 'error')
    } finally {
      setStarting(false)
    }
  }

  const handleNative = () => {
    if (!nativeEnabled) {
      pushToast('تماس سیم‌کارت از مدیریت غیرفعال شده.', 'info')
      return
    }
    void beginCall('native')
  }

  const handleVoip = () => {
    if (!voipEnabled) return
    void beginCall('voip')
  }

  const handleShowDetails = () => {
    haptic('light')
    setShowDetails(true)
  }

  const phoneLabel = lead
    ? maskPhoneNumbers
      ? maskPhone(lead.phone)
      : formatPhone(lead.phone)
    : ''

  const handleClose = () => {
    setShowDetails(false)
    close()
  }

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title={showDetails ? 'جزئیات مشتری' : 'روش تماس'}
      className={showDetails ? 'max-h-[92%]' : undefined}
    >
      {lead && (
        <div className="space-y-4 pt-1">
          {showDetails ? (
            <>
              <button
                type="button"
                onClick={() => {
                  haptic('light')
                  setShowDetails(false)
                }}
                className="flex items-center gap-1 text-[13px] font-bold text-[#3390EC] transition-opacity active:opacity-70 dark:text-[#8774E1]"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
                بازگشت به روش تماس
              </button>
              <LeadDetailsPanel lead={lead} />
            </>
          ) : (
            <>
              <div className="glass-inset flex items-center gap-3 rounded-[18px] border border-white/55 p-3 dark:border-white/10">
                <LeadAvatar lead={lead} size={44} ring />
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
                  onClick={handleShowDetails}
                  className={cn(
                    'glass-inset flex w-full items-center gap-3 rounded-[18px] border border-white/60 p-3.5 text-right',
                    'active:opacity-90 dark:border-white/10',
                  )}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#3390EC]/14 text-[#3390EC] dark:bg-[#8774E1]/14 dark:text-[#8774E1]">
                    <ScrollText size={20} strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold text-text">مشاهده جزئیات مشتری</p>
                    <p className="mt-0.5 text-[12px] font-medium text-text-muted">
                      قبل از تماس، اطلاعات کامل مشتری را ببین
                    </p>
                  </div>
                </motion.button>

                <div className="grid grid-cols-2 gap-2.5">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    transition={spring}
                    disabled={!nativeEnabled || starting}
                    onClick={handleNative}
                    className={cn(
                      'glass-card flex min-w-0 flex-col items-center gap-2 rounded-[18px] border border-white/60 p-3.5 text-center',
                      'active:opacity-90 dark:border-white/10',
                    )}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#31B545]/14 text-[#31B545] dark:bg-[#34D399]/14 dark:text-[#34D399]">
                      <Phone size={20} strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0 w-full">
                      <p className="text-[14px] font-bold text-text">سیم‌کارت</p>
                    </div>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: voipEnabled ? 0.98 : 1 }}
                    transition={spring}
                    disabled={!voipEnabled || starting}
                    onClick={handleVoip}
                    className={cn(
                      'glass-inset flex min-w-0 flex-col items-center gap-2 rounded-[18px] border p-3.5 text-center',
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
                    <div className="min-w-0 w-full">
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        <p className="text-[14px] font-bold text-text">VoIP</p>
                        {!voipEnabled && (
                          <span className="rounded-full bg-[#FFB000]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#B45309] dark:bg-[#FBBF24]/15 dark:text-[#FBBF24]">
                            {appSettings.voipEnabled ? 'آفلاین' : 'غیرفعال'}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </BottomSheet>
  )
}
