import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, Headphones, ChevronLeft, ChevronRight, UserRound, Hash } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { LeadAvatar } from '@/components/domain/LeadAvatar'
import { ContactStatusBadge } from '@/components/domain/Badges'
import { LeadDetailsPanel } from '@/components/domain/LeadDetailsPanel'
import { useStore } from '@/store/useStore'
import { formatCustomerPhone } from '@/lib/phonePrivacy'
import { toFa } from '@/lib/format'
import { leadDisplayCode } from '@/lib/leadCode'
import { isNativeCallEnabled, isVoipCallEnabled } from '@/lib/call'
import { performStartCall } from '@/services/callActions'
import { ApiError } from '@/services/http'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

const TG = 'text-[#3390EC] dark:text-[#8774E1]'
const spring = { type: 'spring' as const, stiffness: 420, damping: 32 }

export function CallMethodSheet() {
  const navigate = useNavigate()
  const lead = useStore((s) => s.callMethodLead)
  const close = useStore((s) => s.closeCallMethodSheet)
  const appSettings = useStore((s) => s.appSettings)
  const pushToast = useStore((s) => s.pushToast)
  const role = useStore((s) => s.role)
  const [showDetails, setShowDetails] = useState(false)
  const [starting, setStarting] = useState(false)

  const open = lead !== null
  const voipEnabled = isVoipCallEnabled()
  const nativeEnabled = isNativeCallEnabled()

  useEffect(() => {
    if (!open) setShowDetails(false)
  }, [open])

  const beginCall = async (method: 'native' | 'voip') => {
    if (!lead || starting) return
    setStarting(true)
    const leadId = lead.id
    try {
      haptic('medium')
      handleClose()
      navigate(`/dialer/${leadId}`, { state: { method } })
      await performStartCall(leadId, method)
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error && error.message
            ? error.message
            : 'شروع تماس ناموفق بود. بعداً دوباره تلاش کن.'
      pushToast(message, 'error')
      navigate(-1)
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

  const handleClose = () => {
    setShowDetails(false)
    close()
  }

  const phoneLabel = lead ? formatCustomerPhone(lead.phone, role) : ''

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title={showDetails ? 'جزئیات مشتری' : undefined}
      className={showDetails ? 'max-h-[92%]' : undefined}
    >
      {lead && (
        <div className="space-y-4 pt-0.5">
          {showDetails ? (
            <>
              <button
                type="button"
                onClick={() => {
                  haptic('light')
                  setShowDetails(false)
                }}
                className={cn('flex items-center gap-1 text-[13px] font-bold', TG)}
              >
                <ChevronRight size={16} strokeWidth={2.5} />
                بازگشت
              </button>
              <LeadDetailsPanel lead={lead} />
            </>
          ) : (
            <>
              {/* Lead identity */}
              <div className="flex flex-col items-center px-2 pt-1 text-center">
                <LeadAvatar lead={lead} size={56} ring showTempBadge animated />
                <h2 className="mt-2.5 text-[18px] font-bold text-text">
                  {lead.firstName} {lead.lastName}
                </h2>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
                  <span
                    dir="ltr"
                    className="inline-flex items-center gap-0.5 rounded-full bg-black/[0.04] px-2 py-0.5 text-[11px] font-bold tabular-nums text-text-soft dark:bg-white/[0.06]"
                  >
                    <Hash size={10} strokeWidth={2.5} />
                    {leadDisplayCode(lead)}
                  </span>
                  <ContactStatusBadge temperature={lead.temperature} size="sm" />
                  {lead.conversionProbability > 0 && (
                    <span className={cn('text-[11px] font-bold tabular-nums', TG)}>
                      {toFa(lead.conversionProbability)}٪
                    </span>
                  )}
                </div>
                <p dir="ltr" className="mt-1.5 text-[13px] font-semibold tabular-nums text-text-muted">
                  {phoneLabel}
                </p>
              </div>

              {/* Primary CTA — sim card */}
              <motion.button
                type="button"
                whileTap={{ scale: nativeEnabled && !starting ? 0.98 : 1 }}
                transition={spring}
                disabled={!nativeEnabled || starting}
                onClick={handleNative}
                className={cn(
                  'flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] text-[16px] font-bold text-white',
                  nativeEnabled
                    ? 'bg-[#3390EC] shadow-[0_6px_20px_rgba(51,144,236,0.28)] dark:bg-[#8774E1] dark:shadow-[0_6px_20px_rgba(135,116,225,0.24)]'
                    : 'cursor-not-allowed bg-black/20 dark:bg-white/10',
                )}
              >
                <Phone size={19} strokeWidth={2.35} />
                {starting ? 'در حال شروع…' : 'تماس با سیم‌کارت'}
              </motion.button>

              {/* Secondary options */}
              <div className="glass-card overflow-hidden rounded-[18px] border border-white/55 dark:border-white/10">
                <SheetRow
                  icon={UserRound}
                  label="جزئیات مشتری"
                  onClick={() => {
                    haptic('light')
                    setShowDetails(true)
                  }}
                />
                {voipEnabled ? (
                  <SheetRow
                    icon={Headphones}
                    label="تماس VoIP"
                    bordered
                    onClick={handleVoip}
                    disabled={starting}
                  />
                ) : (
                  <SheetRow
                    icon={Headphones}
                    label="تماس VoIP"
                    sublabel={appSettings.voipEnabled ? 'در دسترس نیست' : 'غیرفعال'}
                    bordered
                    disabled
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}
    </BottomSheet>
  )
}

function SheetRow({
  icon: Icon,
  label,
  sublabel,
  bordered,
  disabled,
  onClick,
}: {
  icon: typeof Phone
  label: string
  sublabel?: string
  bordered?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-3.5 py-3 text-right transition-colors',
        bordered && 'border-t border-white/40 dark:border-white/8',
        disabled
          ? 'cursor-default opacity-50'
          : 'active:bg-black/[0.03] dark:active:bg-white/[0.04]',
      )}
    >
      <span className="glass-inset flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-white/50 dark:border-white/10">
        <Icon size={17} strokeWidth={2.25} className={TG} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-text">{label}</p>
        {sublabel && <p className="mt-0.5 text-[11px] font-semibold text-text-soft">{sublabel}</p>}
      </div>
      {!disabled && <ChevronLeft size={18} strokeWidth={2.25} className="shrink-0 text-[#C7C7CC] dark:text-[#48484A]" />}
    </button>
  )
}
