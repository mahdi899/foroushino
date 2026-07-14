import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell,
  Moon,
  Vibrate,
  Globe,
  Trash2,
  WifiOff,
  ChevronLeft,
  LogOut,
  ShieldCheck,
  EyeOff,
  TimerOff,
  Download,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { clearToken } from '@/services/auth'
import { useInstallPrompt } from '@/lib/pwa'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { OfflineState } from '@/components/ui/States'
import { Chip } from '@/components/ui/Chip'
import { toFa } from '@/lib/format'
import { cn } from '@/lib/cn'

const TG = 'text-[#3390EC] dark:text-[#8774E1]'
const lockOptions = [1, 5, 15]
const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: spring },
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}

export function SettingsScreen() {
  const navigate = useNavigate()
  const maskPhoneNumbers = useStore((s) => s.maskPhoneNumbers)
  const setMaskPhoneNumbers = useStore((s) => s.setMaskPhoneNumbers)
  const autoLockEnabled = useStore((s) => s.autoLockEnabled)
  const autoLockMinutes = useStore((s) => s.autoLockMinutes)
  const setAutoLock = useStore((s) => s.setAutoLock)
  const logout = useStore((s) => s.logout)
  const { canInstall, install, isInstalled } = useInstallPrompt()
  const [offline, setOffline] = useState(false)
  const [toggles, setToggles] = useState({ notif: true, haptic: true })

  if (offline) {
    return (
      <Page withNav={false}>
        <TopBar title="حالت آفلاین" onBack={() => setOffline(false)} />
        <OfflineState
          title="اتصال اینترنت قطع است"
          description="این یک نمایش از حالت آفلاین است. وقتی اتصال برقرار شود داده‌ها همگام می‌شوند."
          action={{ label: 'تلاش دوباره', onClick: () => setOffline(false) }}
        />
      </Page>
    )
  }

  const switches: { icon: LucideIcon; label: string; key: keyof typeof toggles }[] = [
    { icon: Bell, label: 'اعلان‌ها', key: 'notif' },
    { icon: Vibrate, label: 'لرزش لمسی', key: 'haptic' },
  ]

  return (
    <Page withNav={false}>
      <TopBar title="تنظیمات" />

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4 px-4 pb-6 pt-1">
        <SettingsSection title="عمومی">
          {canInstall && (
            <NavRow
              icon={Download}
              label="نصب روی گوشی"
              value="PWA"
              onClick={() => void install()}
              bordered
            />
          )}
          {isInstalled && (
            <NavRow icon={Download} label="نصب روی گوشی" value="نصب شده" disabled bordered />
          )}
          <SettingsRow
            icon={Moon}
            label="حالت تیره"
            sublabel="به‌زودی"
            disabled
            trailing={<Toggle on={false} disabled />}
          />
          {switches.map((s, i) => (
            <SettingsRow
              key={s.key}
              icon={s.icon}
              label={s.label}
              bordered={i < switches.length - 1}
              trailing={
                <Toggle
                  on={toggles[s.key]}
                  onToggle={() => setToggles((t) => ({ ...t, [s.key]: !t[s.key] }))}
                />
              }
            />
          ))}
        </SettingsSection>

        <SettingsSection title="حریم خصوصی و امنیت">
          <SettingsRow
            icon={EyeOff}
            label="پنهان‌سازی شماره لیدها"
            bordered
            trailing={
              <Toggle on={maskPhoneNumbers} onToggle={() => setMaskPhoneNumbers(!maskPhoneNumbers)} />
            }
          />
          <SettingsRow
            icon={TimerOff}
            label="قفل خودکار در عدم فعالیت"
            trailing={<Toggle on={autoLockEnabled} onToggle={() => setAutoLock(!autoLockEnabled)} />}
          />
          {autoLockEnabled && (
            <div className="flex items-center gap-2 border-t border-white/40 px-3.5 py-3 dark:border-white/8">
              {lockOptions.map((m) => (
                <Chip
                  key={m}
                  active={autoLockMinutes === m}
                  tone="primary"
                  onClick={() => setAutoLock(true, m)}
                >
                  {toFa(m)} دقیقه
                </Chip>
              ))}
            </div>
          )}
          <div className="mx-3.5 mb-3.5 flex items-start gap-2.5 rounded-[16px] border border-[#3390EC]/15 bg-[#3390EC]/8 p-3 dark:border-[#8774E1]/18 dark:bg-[#8774E1]/10">
            <ShieldCheck size={16} className={cn('mt-0.5 shrink-0', TG)} strokeWidth={2.35} />
            <p className="text-[11.5px] font-semibold leading-6 text-text-muted">
              اطلاعات مشتریان محرمانه است. از اشتراک‌گذاری شماره، یادداشت یا اطلاعات لیدها بیرون از این
              برنامه خودداری کن.
            </p>
          </div>
        </SettingsSection>

        <SettingsSection title="زبان">
          <NavRow icon={Globe} label="زبان" value="فارسی" sublabel="به‌زودی" disabled />
        </SettingsSection>

        <SettingsSection title="پیشرفته">
          <NavRow icon={WifiOff} label="نمایش حالت آفلاین" onClick={() => setOffline(true)} bordered />
          <NavRow
            icon={Trash2}
            label="بازنشانی داده‌های دمو"
            danger
            onClick={() => {
              clearToken()
              localStorage.removeItem('saat-store')
              location.reload()
            }}
          />
        </SettingsSection>

        <motion.button
          variants={fadeUp}
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
          className="glass-inset flex w-full items-center justify-center gap-2 rounded-[22px] border border-error-200/60 py-3.5 text-sm font-bold text-error-600 dark:border-error-500/25"
        >
          <LogOut size={18} strokeWidth={2.25} />
          خروج از حساب
        </motion.button>

        <motion.p variants={fadeUp} className="text-center text-[11px] font-medium text-[#8E8E93] dark:text-[#98989D]">
          سات · نسخه ۱.۰.۰
        </motion.p>
      </motion.div>
    </Page>
  )
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div variants={fadeUp}>
      <h2 className="mb-2 px-1 text-[12px] font-bold uppercase tracking-wide text-[#8E8E93] dark:text-[#98989D]">
        {title}
      </h2>
      <div className="glass-card overflow-hidden rounded-[22px] border border-white/55 dark:border-white/10">
        {children}
      </div>
    </motion.div>
  )
}

function SettingsIcon({ icon: Icon, danger }: { icon: LucideIcon; danger?: boolean }) {
  return (
    <span
      className={cn(
        'glass-inset flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-white/50 dark:border-white/10',
        danger ? 'text-error-600' : TG,
      )}
    >
      <Icon size={17} strokeWidth={2.25} />
    </span>
  )
}

function SettingsRow({
  icon,
  label,
  sublabel,
  bordered,
  disabled,
  trailing,
}: {
  icon: LucideIcon
  label: string
  sublabel?: string
  bordered?: boolean
  disabled?: boolean
  trailing: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3.5 py-3',
        bordered && 'border-b border-white/40 dark:border-white/8',
        disabled && 'opacity-55',
      )}
    >
      <SettingsIcon icon={icon} />
      <div className="min-w-0 flex-1">
        <span className="text-[15px] font-semibold text-text">{label}</span>
        {sublabel && <p className="mt-0.5 text-[11px] font-semibold text-text-soft">{sublabel}</p>}
      </div>
      {trailing}
    </div>
  )
}

function NavRow({
  icon,
  label,
  value,
  sublabel,
  danger,
  bordered,
  disabled,
  onClick,
}: {
  icon: LucideIcon
  label: string
  value?: string
  sublabel?: string
  danger?: boolean
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
        'flex w-full items-center gap-3 px-3.5 py-3.5 transition-colors active:bg-black/[0.03] dark:active:bg-white/[0.04]',
        bordered && 'border-b border-white/40 dark:border-white/8',
        disabled && 'cursor-default opacity-55 active:bg-transparent dark:active:bg-transparent',
      )}
    >
      <SettingsIcon icon={icon} danger={danger} />
      <div className="min-w-0 flex-1 text-right">
        <span className={cn('text-[15px] font-semibold', danger ? 'text-error-600' : 'text-text')}>
          {label}
        </span>
        {sublabel && <p className="mt-0.5 text-[11px] font-semibold text-text-soft">{sublabel}</p>}
      </div>
      {value && <span className="text-[13px] font-semibold text-text-soft">{value}</span>}
      {!disabled && (
        <ChevronLeft size={18} className="text-[#C7C7CC] dark:text-[#48484A]" strokeWidth={2.25} />
      )}
    </button>
  )
}

function Toggle({
  on,
  onToggle,
  disabled,
}: {
  on: boolean
  onToggle?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onToggle}
      aria-disabled={disabled}
      data-on={on ? 'true' : 'false'}
      data-disabled={disabled ? 'true' : 'false'}
      className="ios-toggle"
    >
      <span className="ios-toggle-knob" />
    </button>
  )
}
