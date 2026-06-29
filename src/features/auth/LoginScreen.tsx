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

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18, ease: 'easeOut' },
}

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
    const t = setTimeout(() => inputs.current[0]?.focus(), 280)
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
        verifyTimer.current = setTimeout(verify, 420)
      }, 480)
    } else {
      haptic('error')
      setOtpError(true)
      verifyTimer.current = setTimeout(() => {
        setOtp(['', '', '', '', ''])
        setOtpError(false)
        inputs.current[0]?.focus()
      }, 420)
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
    <div className="flex h-full min-h-full flex-col px-5 pt-[calc(8px+var(--safe-top))] pb-[calc(20px+var(--safe-bottom))]">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 py-4">
        <div
          className="mb-5 flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-[0_12px_32px_-12px_rgba(13,148,136,0.45)]"
        >
          <PhoneCall size={32} strokeWidth={2.25} />
        </div>

        <AnimatePresence mode="wait">
          {step === 'phone' ? (
            <motion.div key="phone" {...fade} className="w-full text-center">
              <h1 className="text-[21px] font-black text-neutral-900">خوش آمدی</h1>
              <p className="mx-auto mt-2 max-w-[280px] text-[14px] leading-[1.65] text-neutral-500">
                شماره موبایلت را وارد کن تا وارد فروشینو شوی.
              </p>

              <div className="mt-6 w-full text-right">
                <label className="mb-1.5 block text-xs font-bold text-neutral-500">
                  شماره موبایل
                </label>
                <div
                  dir="ltr"
                  className="flex h-[52px] items-center gap-2.5 rounded-2xl border border-border bg-surface px-3.5 focus-within:border-primary-400"
                >
                  <span className="shrink-0 text-[13px] font-bold text-neutral-400">+۹۸</span>
                  <input
                    inputMode="numeric"
                    value={toFa(phone)}
                    onChange={(e) =>
                      setPhone(toEn(e.target.value).replace(/\D/g, '').slice(0, 11))
                    }
                    placeholder={toFa('0912 345 6789')}
                    className="h-full min-w-0 flex-1 bg-transparent text-left text-[15px] font-bold tabular-nums text-neutral-900 outline-none placeholder:text-neutral-300"
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="otp" {...fade} className="w-full text-center">
              <h1 className="text-[21px] font-black text-neutral-900">کد تایید</h1>
              <p className="mx-auto mt-2 max-w-[280px] text-[14px] leading-[1.65] text-neutral-500">
                کد ارسال‌شده به {toFa(phone)} را وارد کن.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[11px] font-bold text-primary-700">
                <ShieldCheck size={13} />
                کد آزمایشی: ۱۲۳۴۵
              </div>

              <div dir="ltr" className="mt-6 flex justify-center">
                <div className="relative">
                  <div
                    className={cn(
                      'inline-flex gap-2.5 transition-transform duration-200',
                      otpError && otpPhase === 'idle' && 'animate-shake',
                    )}
                  >
                    {otp.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => (inputs.current[i] = el)}
                        inputMode="numeric"
                        disabled={otpLocked}
                        value={toFa(d)}
                        onChange={(e) => handleOtp(i, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !otp[i] && i > 0)
                            inputs.current[i - 1]?.focus()
                        }}
                        className={cn(
                          'h-[52px] w-[52px] rounded-2xl border text-center text-lg font-extrabold tabular-nums outline-none transition-[border-color,background-color,opacity] duration-200',
                          otpPhase === 'idle'
                            ? 'border-border bg-surface text-neutral-900 focus:border-primary-400'
                            : 'border-primary-200 bg-primary-50 text-primary-700 opacity-60',
                          otpError &&
                            otpPhase === 'idle' &&
                            'border-error-500 bg-error-50 text-error-500',
                        )}
                      />
                    ))}
                  </div>

                  <div
                    className={cn(
                      'pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl transition-opacity duration-200',
                      otpPhase === 'idle' ? 'opacity-0' : 'opacity-100',
                    )}
                  >
                    {otpPhase === 'merging' && (
                      <Loader2 size={26} className="animate-spin text-primary-500" />
                    )}
                    {otpPhase === 'success' && (
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-white shadow-[0_8px_20px_-8px_rgba(13,148,136,0.5)]"
                      >
                        <Check size={20} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="shrink-0 space-y-3">
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
              className="flex w-full items-center justify-center gap-1 py-1 text-[13px] font-bold text-neutral-400 disabled:opacity-40"
            >
              <ArrowLeft size={14} />
              ویرایش شماره
            </button>
          </>
        )}
        <p className="text-center text-[11px] leading-5 text-neutral-300">
          با ورود، قوانین و حریم خصوصی فروشینو را می‌پذیری.
        </p>
      </footer>
    </div>
  )
}
