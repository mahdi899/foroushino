import { useCallback, useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { useStore } from '@/store/useStore'
import {
  requestPhoneOtp,
  verifyPhoneOtp,
  loginWithPassword,
} from '@/services/auth'
import { ApiError } from '@/services/http'
import { SAAT_LOGO_ALT, SAAT_LOGO_AUTH_CLASS, SAAT_LOGO_SRC } from '@/lib/brand'
import { toFa, toEn } from '@/lib/format'
import { cn } from '@/lib/cn'
import { haptic } from '@/lib/telegram'
import { completeLoginSession } from '@/services/loginFlow'
import { useStoreHydrated } from '@/hooks/useStoreHydrated'

const OTP_LEN = 5
const OTP_GREEN_MS = 105

type OtpPhase = 'idle' | 'validating' | 'complete'

const spring = { type: 'spring' as const, stiffness: 420, damping: 32 }
const popSpring = { type: 'spring' as const, stiffness: 560, damping: 26 }

const stepVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export function LoginScreen() {
  const navigate = useNavigate()
  const hydrated = useStoreHydrated()
  const isAuthed = useStore((s) => s.isAuthed)
  const setSessionFromAuth = useStore((s) => s.setSessionFromAuth)
  const pushToast = useStore((s) => s.pushToast)
  const [step, setStep] = useState<'phone' | 'choice' | 'otp' | 'password'>('phone')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpHint, setOtpHint] = useState('')
  const [loginOptions, setLoginOptions] = useState({ password: false, otp: false })
  const [otp, setOtp] = useState(() => Array(OTP_LEN).fill(''))
  const [otpPhase, setOtpPhase] = useState<OtpPhase>('idle')
  const [otpError, setOtpError] = useState(false)
  const [validatedUpTo, setValidatedUpTo] = useState(-1)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const otpTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const otpSubmitId = useRef(0)

  const phoneValid = /^09\d{9}$/.test(phone)
  const otpLocked = otpPhase !== 'idle'
  const otpActiveIndex = otp.findIndex((x) => x === '')

  const completeAuth = useCallback(
    async (user: Parameters<typeof setSessionFromAuth>[0]) => {
      try {
        await completeLoginSession(user)
        haptic('success')
        navigate('/home', { replace: true })
      } catch (error) {
        haptic('error')
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'ورود ناموفق بود'
        pushToast(message, 'error')
      }
    },
    [navigate, pushToast],
  )

  useEffect(() => {
    if (hydrated && isAuthed) {
      navigate('/home', { replace: true })
    }
  }, [hydrated, isAuthed, navigate])

  const runGreenValidation = useCallback(
    (onDone: () => void) => {
      inputs.current.forEach((el) => el?.blur())
      setOtpPhase('validating')
      setValidatedUpTo(-1)

      const schedule = (fn: () => void, ms: number) => {
        const id = setTimeout(fn, ms)
        otpTimers.current.push(id)
      }

      for (let i = 0; i < OTP_LEN; i++) {
        schedule(() => {
          setValidatedUpTo(i)
          haptic('selection')
        }, 60 + i * OTP_GREEN_MS)
      }

      schedule(() => {
        setOtpPhase('complete')
        haptic('success')
      }, 60 + OTP_LEN * OTP_GREEN_MS + 100)

      schedule(onDone, 60 + OTP_LEN * OTP_GREEN_MS + 580)
    },
    [],
  )

  const clearOtpTimers = useCallback(() => {
    otpTimers.current.forEach(clearTimeout)
    otpTimers.current = []
  }, [])

  useEffect(() => () => clearOtpTimers(), [clearOtpTimers])

  useEffect(() => {
    if (step !== 'otp') return
    clearOtpTimers()
    setOtpPhase('idle')
    setOtpError(false)
    setValidatedUpTo(-1)
    const t = setTimeout(() => inputs.current[0]?.focus(), 320)
    return () => clearTimeout(t)
  }, [step, clearOtpTimers])

  useEffect(() => {
    if (step !== 'otp' || otpPhase !== 'idle') return
    const code = otp.join('')
    if (code.length !== OTP_LEN) return

    const submitId = ++otpSubmitId.current
    let cancelled = false

    const rejectOtp = (message?: string) => {
      haptic('error')
      if (message) pushToast(message, 'error')
      setOtpError(true)
      otpTimers.current.push(
        setTimeout(() => {
          setOtp(Array(OTP_LEN).fill(''))
          setOtpError(false)
          inputs.current[0]?.focus()
        }, 520),
      )
    }

    const submit = async () => {
      try {
        const user = await verifyPhoneOtp(phone, code)
        if (cancelled || submitId !== otpSubmitId.current) return
        runGreenValidation(() => {
          void completeAuth(user)
        })
      } catch (error) {
        if (cancelled || submitId !== otpSubmitId.current) return
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'کد وارد شده نادرست است'
        rejectOtp(message)
      }
    }

    void submit()

    return () => {
      cancelled = true
    }
  }, [otp, step, otpPhase, phone, runGreenValidation, completeAuth, pushToast])

  const handleOtp = (i: number, val: string) => {
    if (otpLocked) return
    const digits = toEn(val).replace(/\D/g, '')
    if (digits.length > 1) {
      const next = [...otp]
      for (let j = 0; j < digits.length && i + j < OTP_LEN; j++) next[i + j] = digits[j]
      setOtp(next)
      inputs.current[Math.min(i + digits.length, 4)]?.focus()
      return
    }
    const digit = digits.slice(-1)
    const next = [...otp]
    next[i] = digit
    setOtp(next)
    if (digit && i < OTP_LEN - 1) inputs.current[i + 1]?.focus()
  }

  const resetOtp = () => {
    clearOtpTimers()
    setOtp(Array(OTP_LEN).fill(''))
    setOtpPhase('idle')
    setOtpError(false)
    setValidatedUpTo(-1)
    setOtpHint('')
  }

  const goToNextStep = async () => {
    haptic('light')
    setLoading(true)
    try {
      const result = await requestPhoneOtp(phone)
      setLoginOptions({
        password:
          result.password_available ??
          (result.channel === 'password' || result.channel === 'choice'),
        otp:
          result.otp_available ??
          (result.channel === 'telegram' ||
            result.channel === 'choice' ||
            result.channel === 'demo'),
      })
      setOtpHint(result.hint ?? (result.channel === 'demo' ? 'کد ثابت دمو' : 'کد تأیید ارسال شد.'))
      if (result.channel === 'choice') {
        setStep('choice')
      } else if (result.channel === 'password') {
        setPassword('')
        setStep('password')
      } else {
        setOtp(Array(OTP_LEN).fill(''))
        setStep('otp')
      }
    } catch (error) {
      haptic('error')
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'ارسال کد ناموفق بود'
      pushToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const startPasswordLogin = () => {
    haptic('light')
    setPassword('')
    setStep('password')
  }

  const startOtpLogin = async () => {
    haptic('light')
    setLoading(true)
    try {
      const result = await requestPhoneOtp(phone, 'otp')
      setLoginOptions({
        password: result.password_available ?? true,
        otp: true,
      })
      setOtpHint(result.hint ?? 'کد تأیید ارسال شد.')
      setOtp(Array(OTP_LEN).fill(''))
      setStep('otp')
    } catch (error) {
      haptic('error')
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'ارسال کد ناموفق بود'
      pushToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const submitPassword = async () => {
    if (password.length < 12) {
      pushToast('رمز عبور باید حداقل ۱۲ کاراکتر باشد', 'error')
      return
    }
    haptic('light')
    setLoading(true)
    try {
      const user = await loginWithPassword(phone, password)
      await completeAuth(user)
    } catch (error) {
      haptic('error')
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'ورود ناموفق بود'
      pushToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex h-full min-h-full flex-col bg-[#FFFFFF] dark:bg-[#17212B]">
      <div className="relative z-10 flex h-full min-h-full flex-col px-5 pt-[calc(12px+var(--safe-top))] pb-[calc(16px+var(--safe-bottom))]">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring, delay: 0.04 }}
          className="flex shrink-0 flex-col items-center pt-6"
        >
          <img
            src={SAAT_LOGO_SRC}
            alt={SAAT_LOGO_ALT}
            className={SAAT_LOGO_AUTH_CLASS}
            draggable={false}
          />
        </motion.div>

        <div className="flex min-h-0 flex-1 flex-col pt-6">
          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div
                key="phone"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex flex-1 flex-col"
              >
                <div className="text-center">
                  <h1 className="text-[22px] font-semibold leading-tight text-[#000000] dark:text-[#F5F5F5]">
                    ورود
                  </h1>
                  <p className="mx-auto mt-3 max-w-[300px] text-[15px] leading-[1.55] text-[#707579] dark:text-[#8E9396]">
                    شماره موبایلت را وارد کن.
                    <br />
                    با رمز عبور یا کد تأیید وارد می‌شوی.
                  </p>
                </div>

                <div className="mt-8 w-full">
                  <div
                    dir="ltr"
                    className={cn(
                      'overflow-hidden rounded-[12px] border px-4 py-[13px]',
                      'border-[#E5E5E5] bg-[#FFFFFF]',
                      'dark:border-[#2B3945] dark:bg-[#242F3D]',
                    )}
                  >
                    <input
                      inputMode="numeric"
                      autoFocus
                      value={toFa(phone)}
                      onChange={(e) =>
                        setPhone(toEn(e.target.value).replace(/\D/g, '').slice(0, 11))
                      }
                      placeholder={toFa('0912 345 6789')}
                      className={cn(
                        'h-[26px] w-full bg-transparent text-left text-[16px] font-normal tabular-nums outline-none',
                        'text-[#000000] placeholder:text-[#A8A8A8] dark:text-[#F5F5F5] dark:placeholder:text-[#5E6770]',
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            ) : step === 'choice' ? (
              <motion.div
                key="choice"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex flex-1 flex-col"
              >
                <div className="text-center">
                  <h1 className="text-[26px] font-semibold leading-tight text-[#000000] dark:text-[#F5F5F5]">
                    {toFa(phone)}
                  </h1>
                  <p className="mx-auto mt-3 max-w-[300px] text-[15px] leading-[1.55] text-[#707579] dark:text-[#8E9396]">
                    روش ورود را انتخاب کن.
                  </p>
                </div>
                <div className="mt-8 space-y-3">
                  {loginOptions.password && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={startPasswordLogin}
                      className="flex h-[50px] w-full items-center justify-center rounded-[10px] bg-[#3390EC] text-[16px] font-semibold text-white active:bg-[#2B7FD4] disabled:opacity-60 dark:bg-[#8774E1] dark:active:bg-[#7563D4]"
                    >
                      ورود با رمز عبور
                    </button>
                  )}
                  {loginOptions.otp && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void startOtpLogin()}
                      className="flex h-[50px] w-full items-center justify-center rounded-[10px] border border-[#3390EC]/30 bg-[#3390EC]/8 text-[16px] font-semibold text-[#3390EC] disabled:opacity-60 dark:border-[#8774E1]/30 dark:bg-[#8774E1]/10 dark:text-[#8774E1]"
                    >
                      {loading ? 'در حال ارسال کد…' : 'ورود با کد تلگرام'}
                    </button>
                  )}
                </div>
              </motion.div>
            ) : step === 'password' ? (
              <motion.div
                key="password"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex flex-1 flex-col"
              >
                <div className="text-center">
                  <h1 className="text-[26px] font-semibold leading-tight text-[#000000] dark:text-[#F5F5F5]">
                    {toFa(phone)}
                  </h1>
                  <p className="mx-auto mt-3 max-w-[300px] text-[15px] leading-[1.55] text-[#707579] dark:text-[#8E9396]">
                    رمز عبور حساب خود را وارد کن.
                  </p>
                </div>
                <div className="mt-8 w-full">
                  <div
                    className={cn(
                      'overflow-hidden rounded-[12px] border px-4 py-[13px]',
                      'border-[#E5E5E5] bg-[#FFFFFF]',
                      'dark:border-[#2B3945] dark:bg-[#242F3D]',
                    )}
                  >
                    <input
                      type="password"
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="رمز عبور"
                      className={cn(
                        'h-[26px] w-full bg-transparent text-[16px] font-normal outline-none',
                        'text-[#000000] placeholder:text-[#A8A8A8] dark:text-[#F5F5F5] dark:placeholder:text-[#5E6770]',
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex flex-1 flex-col"
              >
                <div className="text-center">
                  <h1 className="text-[26px] font-semibold leading-tight text-[#000000] dark:text-[#F5F5F5]">
                    {toFa(phone)}
                  </h1>
                  <p className="mx-auto mt-3 max-w-[300px] text-[15px] leading-[1.55] text-[#707579] dark:text-[#8E9396]">
                    کد تأیید را وارد کن
                    {otpHint ? (
                      <>
                        <br />
                        <span className="text-[14px]">{otpHint}</span>
                      </>
                    ) : null}
                  </p>
                </div>

                <div dir="ltr" className="mt-8 flex justify-center">
                  <div
                    className={cn(
                      'inline-flex gap-2',
                      otpError && otpPhase === 'idle' && 'animate-shake',
                    )}
                  >
                    {otp.map((d, i) => {
                      const isGreen = validatedUpTo >= i
                      const focusIndex = otpActiveIndex === -1 ? OTP_LEN - 1 : otpActiveIndex
                      const isActive = otpPhase === 'idle' && !otpError && i === focusIndex

                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            scale: validatedUpTo === i ? [1, 1.1, 1] : 1,
                          }}
                          transition={{
                            scale: { duration: 0.25, ease: [0.34, 1.56, 0.64, 1] },
                            opacity: { delay: 0.03 * i, duration: 0.2 },
                            y: { delay: 0.03 * i, ...popSpring },
                          }}
                          className={cn(
                            'relative flex h-[48px] w-[44px] items-center justify-center overflow-hidden rounded-[10px] border',
                            isGreen
                              ? 'border-[#31B545] bg-[#31B545]/10'
                              : otpError
                                ? 'border-[#E53935] bg-[#E53935]/8'
                                : isActive
                                  ? 'border-[#3390EC] bg-[#FFFFFF] dark:border-[#8774E1] dark:bg-[#242F3D]'
                                  : d
                                    ? 'border-[#3390EC]/50 bg-[#FFFFFF] dark:border-[#8774E1]/40 dark:bg-[#242F3D]'
                                    : 'border-[#E5E5E5] bg-[#FFFFFF] dark:border-[#2B3945] dark:bg-[#242F3D]',
                            otpPhase !== 'idle' && !isGreen && 'opacity-75',
                          )}
                        >
                          <input
                            ref={(el) => (inputs.current[i] = el)}
                            inputMode="numeric"
                            autoComplete={i === 0 ? 'one-time-code' : 'off'}
                            disabled={otpLocked}
                            value={toFa(d)}
                            onChange={(e) => handleOtp(i, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Backspace' && !otp[i] && i > 0)
                                inputs.current[i - 1]?.focus()
                            }}
                            className={cn(
                              'relative z-[1] h-full w-full bg-transparent text-center text-[20px] font-medium tabular-nums outline-none',
                              'text-[#000000] caret-[#3390EC] dark:text-[#F5F5F5] dark:caret-[#8774E1]',
                              isGreen && 'text-[#31B545]',
                              otpError && 'text-[#E53935]',
                            )}
                          />
                        </motion.div>
                      )
                    })}
                  </div>
                </div>

                <AnimatePresence>
                  {otpPhase !== 'idle' && (
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-5 text-center text-[14px] font-medium text-[#31B545]"
                    >
                      {otpPhase === 'complete' ? 'ورود موفق — در حال انتقال…' : 'در حال تأیید کد…'}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.footer
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.12 }}
          className="shrink-0 space-y-4 pt-4"
        >
          {step === 'phone' ? (
            <div className="space-y-3">
              <motion.button
                type="button"
                whileTap={{ scale: phoneValid ? 0.98 : 1 }}
                disabled={!phoneValid || loading}
                onClick={() => void goToNextStep()}
                className={cn(
                  'flex h-[50px] w-full items-center justify-center rounded-[10px] text-[16px] font-semibold text-white',
                  phoneValid
                    ? 'bg-[#3390EC] active:bg-[#2B7FD4] dark:bg-[#8774E1] dark:active:bg-[#7563D4]'
                    : 'cursor-not-allowed bg-[#3390EC]/35 dark:bg-[#8774E1]/35',
                )}
              >
                {loading ? 'در حال ارسال کد…' : 'ادامه'}
              </motion.button>
            </div>
          ) : step === 'password' ? (
            <div className="space-y-3">
              <motion.button
                type="button"
                whileTap={{ scale: password.length >= 12 ? 0.98 : 1 }}
                disabled={password.length < 12 || loading}
                onClick={() => void submitPassword()}
                className={cn(
                  'flex h-[50px] w-full items-center justify-center rounded-[10px] text-[16px] font-semibold text-white',
                  password.length >= 12
                    ? 'bg-[#3390EC] active:bg-[#2B7FD4] dark:bg-[#8774E1] dark:active:bg-[#7563D4]'
                    : 'cursor-not-allowed bg-[#3390EC]/35 dark:bg-[#8774E1]/35',
                )}
              >
                {loading ? 'در حال ورود…' : 'ورود'}
              </motion.button>
              {loginOptions.otp && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void startOtpLogin()}
                  className="flex w-full items-center justify-center py-2 text-[15px] font-medium text-[#3390EC] disabled:opacity-40 dark:text-[#8774E1]"
                >
                  ورود با کد تلگرام
                </button>
              )}
            </div>
          ) : step === 'choice' ? (
            <button
              type="button"
              onClick={() => {
                setPassword('')
                setStep('phone')
              }}
              className="flex w-full items-center justify-center gap-1 py-2 text-[15px] font-medium text-[#3390EC] dark:text-[#8774E1]"
            >
              <ChevronLeft size={16} className="rotate-180" />
              ویرایش شماره
            </button>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  resetOtp()
                  setPassword('')
                  setStep('phone')
                }}
                disabled={otpLocked}
                className={cn(
                  'flex w-full items-center justify-center gap-1 py-2 text-[15px] font-medium',
                  'text-[#3390EC] disabled:opacity-40 dark:text-[#8774E1]',
                )}
              >
                <ChevronLeft size={16} className="rotate-180" />
                ویرایش شماره
              </button>
              {loginOptions.password && (
                <button
                  type="button"
                  disabled={otpLocked || loading}
                  onClick={startPasswordLogin}
                  className="flex w-full items-center justify-center py-2 text-[15px] font-medium text-[#3390EC] disabled:opacity-40 dark:text-[#8774E1]"
                >
                  ورود با رمز عبور
                </button>
              )}
            </div>
          )}

          <p className="text-center text-[12px] leading-[1.6] text-[#707579] dark:text-[#8E9396]">
            با ورود،{' '}
            <span className="text-[#3390EC] dark:text-[#8774E1]">قوانین</span> و{' '}
            <span className="text-[#3390EC] dark:text-[#8774E1]">حریم خصوصی</span> سات را می‌پذیری.
          </p>
        </motion.footer>
      </div>
    </div>
  )
}
