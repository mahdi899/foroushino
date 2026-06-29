import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PhoneCall, ArrowLeft, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/store/useStore'
import { toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'

export function LoginScreen() {
  const navigate = useNavigate()
  const login = useStore((s) => s.login)
  const setRole = useStore((s) => s.setRole)
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', ''])
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const phoneValid = /^09\d{9}$/.test(phone)
  const otpValid = otp.every((d) => d !== '')

  const handleOtp = (i: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[i] = digit
    setOtp(next)
    if (digit && i < 4) inputs.current[i + 1]?.focus()
  }

  const verify = () => {
    haptic('success')
    login(phone)
    setRole('agent')
    navigate('/home', { replace: true })
  }

  return (
    <div className="flex h-full flex-col px-6 pt-[calc(24px+var(--safe-top))] pb-[calc(24px+var(--safe-bottom))]">
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-float">
          <PhoneCall size={30} />
        </div>

        <AnimatePresence mode="wait">
          {step === 'phone' ? (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
            >
              <h1 className="text-2xl font-black text-neutral-900">خوش آمدی</h1>
              <p className="mt-2 text-[15px] leading-7 text-neutral-500">
                شماره موبایلت را وارد کن تا وارد فروشینو شوی.
              </p>

              <div className="mt-7">
                <label className="mb-2 block text-xs font-bold text-neutral-500">شماره موبایل</label>
                <div className="flex h-14 items-center gap-2 rounded-2xl border border-border bg-surface px-4 focus-within:border-primary-400">
                  <span className="text-sm font-bold text-neutral-400">+۹۸</span>
                  <input
                    dir="ltr"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="0912 345 6789"
                    className="h-full flex-1 bg-transparent text-left text-base font-bold text-neutral-900 outline-none placeholder:text-neutral-300"
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
            >
              <h1 className="text-2xl font-black text-neutral-900">کد تایید</h1>
              <p className="mt-2 text-[15px] leading-7 text-neutral-500">
                کد ارسال‌شده به {toFa(phone)} را وارد کن.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700">
                <ShieldCheck size={14} />
                کد آزمایشی: ۱۲۳۴۵
              </div>

              <div dir="ltr" className="mt-7 flex justify-between gap-2">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputs.current[i] = el)}
                    inputMode="numeric"
                    value={toFa(d)}
                    onChange={(e) => handleOtp(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus()
                    }}
                    className="h-14 w-full rounded-2xl border border-border bg-surface text-center text-xl font-extrabold text-neutral-900 outline-none focus:border-primary-400"
                  />
                ))}
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
            <Button size="lg" full disabled={!otpValid} onClick={verify}>
              ورود
            </Button>
            <button
              onClick={() => setStep('phone')}
              className="flex w-full items-center justify-center gap-1 text-sm font-bold text-neutral-400"
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
