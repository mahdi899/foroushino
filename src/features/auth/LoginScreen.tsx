import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PhoneCall, ArrowLeft, ShieldCheck, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/store/useStore'
import { toFa, toEn } from '@/lib/format'
import { cn } from '@/lib/cn'
import { haptic } from '@/lib/telegram'

const DEMO_OTP = '12345'

type OtpPhase = 'idle' | 'merging' | 'success'

export function LoginScreen() {
  const navigate = useNavigate()
  const login = useStore((s) => s.login)
  const setRole = useStore((s) => s.setRole)
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', ''])
  const [otpPhase, setOtpPhase] = useState<OtpPhase>('idle')
  const [otpError, setOtpError] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const verifyTimer = useRef<ReturnType<typeof setTimeout>>()

  const phoneValid = /^09\d{9}$/.test(phone)
  const otpValid = otp.every((d) => d !== '')
  const otpLocked = otpPhase !== 'idle'

  const verify = useCallback(() => {
    haptic('success')
    login(phone)
    setRole('agent')
    navigate('/home', { replace: true })
  }, [login, navigate, phone, setRole])

  useEffect(() => {
    return () => {
      if (verifyTimer.current) clearTimeout(verifyTimer.current)
    }
  }, [])

  useEffect(() => {
    if (step !== 'otp') return
    setOtpPhase('idle')
    setOtpError(false)
    const t = setTimeout(() => inputs.current[0]?.focus(), 350)
    return () => clearTimeout(t)
  }, [step])

  useEffect(() => {
    if (step !== 'otp' || otpPhase !== 'idle') return
    const code = otp.join('')
    if (code.length !== 5) return

    if (code === DEMO_OTP) {
      inputs.current.forEach((el) => el?.blur())
      haptic('success')
      setOtpPhase('merging')
      verifyTimer.current = setTimeout(() => {
        setOtpPhase('success')
        verifyTimer.current = setTimeout(verify, 500)
      }, 550)
    } else {
      haptic('error')
      setOtpError(true)
      verifyTimer.current = setTimeout(() => {
        setOtp(['', '', '', '', ''])
        setOtpError(false)
        inputs.current[0]?.focus()
      }, 480)
    }
  }, [otp, step, otpPhase, verify])

  const handleOtp = (i: number, val: string) => {
    if (otpLocked) return
    const digits = toEn(val).replace(/\D/g, '')
    if (digits.length > 1) {
      const next = [...otp]
      for (let j = 0; j < digits.length && i + j < 5; j++) next[i + j] = digits[j]
      setOtp(next)
      inputs.current[Math.min(i + digits.length, 4)]?.focus()
      return
    }
    const digit = digits.slice(-1)
    const next = [...otp]
    next[i] = digit
    setOtp(next)
    if (digit && i < 4) inputs.current[i + 1]?.focus()
  }

  const resetOtp = () => {
    if (verifyTimer.current) clearTimeout(verifyTimer.current)
    setOtp(['', '', '', '', ''])
    setOtpPhase('idle')
    setOtpError(false)
  }

  return (
    <div className="flex h-full flex-col px-6 pt-[calc(24px+var(--safe-top))] pb-[calc(24px+var(--safe-bottom))]">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-float">
          <PhoneCall size={36} />
        </div>

        <AnimatePresence mode="wait">
          {step === 'phone' ? (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              className="w-full"
            >
              <h1 className="text-2xl font-black text-neutral-900">خوش آمدی</h1>
              <p className="mx-auto mt-2 max-w-[300px] text-[15px] leading-7 text-neutral-500">
                شماره موبایلت را وارد کن تا وارد فروشینو شوی.
              </p>

              <div className="mt-7 w-full text-right">
                <label className="mb-2 block text-xs font-bold text-neutral-500">شماره موبایل</label>
                <div
                  dir="ltr"
                  className="flex h-14 items-center gap-3 rounded-2xl border border-border bg-surface px-4 focus-within:border-primary-400"
                >
                  <span className="shrink-0 text-sm font-bold text-neutral-400">+۹۸</span>
                  <input
                    inputMode="numeric"
                    value={toFa(phone)}
                    onChange={(e) => setPhone(toEn(e.target.value).replace(/\D/g, '').slice(0, 11))}
                    placeholder={toFa('0912 345 6789')}
                    className="h-full min-w-0 flex-1 bg-transparent text-left text-base font-bold tabular-nums text-neutral-900 outline-none placeholder:text-neutral-300"
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              className="w-full"
            >
              <h1 className="text-2xl font-black text-neutral-900">کد تایید</h1>
              <p className="mx-auto mt-2 max-w-[300px] text-[15px] leading-7 text-neutral-500">
                کد ارسال‌شده به {toFa(phone)} را وارد کن.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700">
                <ShieldCheck size={14} />
                کد آزمایشی: ۱۲۳۴۵
              </div>

              <div dir="ltr" className="mt-7 flex justify-center">
                <div className="relative">
                <motion.div
                  className="inline-flex"
                  animate={{
                    x: otpError ? [0, -10, 10, -8, 8, 0] : 0,
                  }}
                  transition={{ x: { duration: 0.45 } }}
                >
                  {otp.map((d, i) => (
                    <motion.div
                      key={i}
                      className="relative w-14 shrink-0"
                      animate={{
                        marginLeft: i === 0 ? 0 : otpPhase === 'idle' ? 14 : 0,
                        borderRadius:
                          otpPhase === 'idle'
                            ? 16
                            : i === 0
                              ? '16px 0 0 16px'
                              : i === 4
                                ? '0 16px 16px 0'
                                : 0,
                      }}
                      transition={{
                        marginLeft: { type: 'spring', stiffness: 420, damping: 32 },
                        borderRadius: {
                          type: 'spring',
                          stiffness: 500,
                          damping: 34,
                          delay: otpPhase !== 'idle' ? i * 0.04 : 0,
                        },
                      }}
                    >
                      <motion.input
                        ref={(el) => (inputs.current[i] = el)}
                        inputMode="numeric"
                        disabled={otpLocked}
                        value={toFa(d)}
                        onChange={(e) => handleOtp(i, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus()
                        }}
                        animate={{ opacity: otpPhase === 'success' ? 0.15 : 1 }}
                        transition={{ duration: 0.25 }}
                        className={cn(
                          'h-14 w-full text-center text-xl font-extrabold tabular-nums outline-none transition-colors duration-300',
                          otpPhase === 'idle'
                            ? 'rounded-2xl border border-border bg-surface text-neutral-900 focus:border-primary-400'
                            : 'border-0 bg-primary-50 text-primary-700',
                          otpError && otpPhase === 'idle' && 'border-error-500 bg-error-50 text-error-500',
                        )}
                      />
                    </motion.div>
                  ))}
                </motion.div>

                <motion.div
                  className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-primary-400"
                  initial={false}
                  animate={{
                    opacity: otpPhase !== 'idle' ? 1 : 0,
                    scale: otpPhase !== 'idle' ? 1 : 1.06,
                    boxShadow:
                      otpPhase === 'success'
                        ? '0 0 28px -4px rgba(13, 148, 136, 0.45)'
                        : otpPhase === 'merging'
                          ? '0 0 16px -6px rgba(13, 148, 136, 0.25)'
                          : '0 0 0 0 transparent',
                  }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />

                <AnimatePresence>
                  {otpPhase === 'merging' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    >
                      <Loader2 size={28} className="animate-spin text-primary-500" />
                    </motion.div>
                  )}
                  {otpPhase === 'success' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                      className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 600, damping: 18, delay: 0.05 }}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-500 text-white shadow-float"
                      >
                        <Check size={22} strokeWidth={3} />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-3">
        {step === 'phone' ? (
          <Button size="lg" full disabled={!phoneValid} onClick={() => setStep('otp')}>
            دریافت کد
          </Button>
        ) : (
          <>
            <Button size="lg" full disabled={!otpValid || otpLocked} onClick={verify}>
              {otpLocked ? <Loader2 size={22} className="animate-spin" /> : 'ورود'}
            </Button>
            <button
              onClick={() => {
                resetOtp()
                setStep('phone')
              }}
              disabled={otpLocked}
              className="flex w-full items-center justify-center gap-1 text-sm font-bold text-neutral-400 disabled:opacity-40"
            >
              <ArrowLeft size={15} />
              ویرایش شماره
            </button>
          </>
        )}
        <p className="text-center text-[11px] leading-5 text-neutral-300">
          با ورود، قوانین و حریم خصوصی فروشینو را می‌پذیری.
        </p>
      </div>
    </div>
  )
}
