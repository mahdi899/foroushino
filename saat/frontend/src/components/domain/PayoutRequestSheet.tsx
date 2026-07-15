import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, TriangleAlert, Sparkles, Landmark, CreditCard } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import {
  calculateBankFee,
  canRequestPayout,
  DEFAULT_PAYOUT_SETTINGS,
  fullBalancePayoutAmount,
  payoutNetAmount,
  snapPayoutAmount,
  validatePayoutAmount,
} from '@/lib/payoutRules'
import { formatMoney, toFa, toEn } from '@/lib/format'
import { cn } from '@/lib/cn'

interface PayoutRequestSheetProps {
  open: boolean
  onClose: () => void
  balanceAvailable: number
  savedCardMasked?: string | null
  bankCardConfirmed?: boolean
  onSubmit: (amount: number) => void
}

const OK = 'text-emerald-600 dark:text-emerald-400'
const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }

export function PayoutRequestSheet({
  open,
  onClose,
  balanceAvailable,
  savedCardMasked,
  bankCardConfirmed = false,
  onSubmit,
}: PayoutRequestSheetProps) {
  const [raw, setRaw] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const amount = Number(toEn(raw).replace(/[^\d]/g, '')) || 0

  useEffect(() => {
    if (!open) {
      setRaw('')
      setConfirmed(false)
    }
  }, [open])

  const validation = useMemo(
    () => (amount > 0 ? validatePayoutAmount(amount, balanceAvailable) : null),
    [amount, balanceAvailable],
  )

  const invalid = amount <= 0 || validation?.ok === false || !confirmed || !bankCardConfirmed
  const overLimit = amount > balanceAvailable
  const belowMin = amount > 0 && amount < DEFAULT_PAYOUT_SETTINGS.minAmount
  const isFullBalance = amount > 0 && amount === balanceAvailable
  const notStep =
    amount > 0 && !isFullBalance && amount % DEFAULT_PAYOUT_SETTINGS.stepAmount !== 0
  const bankFee = amount > 0 ? calculateBankFee(amount) : 0
  const netAmount = amount > 0 ? payoutNetAmount(amount) : 0
  const payoutAllowed = canRequestPayout(balanceAvailable) && bankCardConfirmed
  const fullBalanceAmount = fullBalancePayoutAmount(balanceAvailable)

  const setAmount = (next: number) => {
    if (next <= 0) setRaw('')
    else setRaw(String(next))
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="درخواست تسویه">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.05 }}
        className="space-y-4 pt-1"
      >
        <div className="glass-hero glass-hero-success relative overflow-hidden rounded-[22px] p-4">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/12" />
          </div>

          <div className="relative flex items-center gap-3">
            <div className="min-w-0 flex-1 text-center">
              <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-text-soft">
                <Sparkles size={12} className={OK} strokeWidth={2.25} />
                موجودی قابل برداشت
              </p>
              <p className="mt-1.5 text-[26px] font-black tabular-nums leading-none text-text">
                {formatMoney(balanceAvailable)}{' '}
                <span className="text-[12px] font-bold text-text-muted">تومان</span>
              </p>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: payoutAllowed && fullBalanceAmount > 0 ? 0.96 : 1 }}
              disabled={!payoutAllowed || fullBalanceAmount <= 0}
              onClick={() => setAmount(fullBalanceAmount)}
              className={cn(
                'glass-inset shrink-0 rounded-[13px] border px-3 py-2.5 text-[11px] font-bold',
                'border-white/55 dark:border-white/10',
                isFullBalance
                  ? 'border-emerald-500/30 bg-emerald-500/14 text-emerald-700 dark:text-emerald-300'
                  : 'text-text-muted',
                (!payoutAllowed || fullBalanceAmount <= 0) && 'pointer-events-none opacity-40',
              )}
            >
              کل موجودی
            </motion.button>
          </div>
        </div>

        {!bankCardConfirmed && (
          <p className="rounded-[14px] border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
            شماره کارت تایید‌شده ندارید. ابتدا در پروفایل کارت را ثبت کنید تا ناظر آن را تایید کند.
          </p>
        )}

        {!payoutAllowed && bankCardConfirmed && (
          <p className="rounded-[14px] border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
            موجودی فعلی برای برداشت کافی نیست. حداقل {formatMoney(DEFAULT_PAYOUT_SETTINGS.minAmount)} تومان لازم است.
          </p>
        )}

        <div className={cn(!payoutAllowed && 'pointer-events-none opacity-50', 'space-y-3')}>
          <div>
            <label className="mb-2 block text-[12px] font-semibold text-text-muted">مبلغ درخواستی</label>
            <div
              className={cn(
                'glass-inset flex items-center gap-2 rounded-[18px] border px-4 py-3.5',
                'border-white/55 dark:border-white/10',
                (overLimit || belowMin || notStep) && 'border-red-500/30',
              )}
            >
              <input
                inputMode="numeric"
                value={raw ? toFa(amount.toLocaleString('en-US')) : ''}
                onChange={(e) => setRaw(e.target.value)}
                onBlur={() => {
                  if (amount > 0 && amount !== balanceAvailable) {
                    setRaw(String(snapPayoutAmount(amount)))
                  }
                }}
                placeholder="۰"
                className="w-full bg-transparent text-left text-[22px] font-black tabular-nums text-text outline-none placeholder:text-text-soft/40"
              />
              <span className="shrink-0 text-[12px] font-semibold text-text-soft">تومان</span>
            </div>
          </div>

          {savedCardMasked && (
            <div className="glass-inset flex items-center gap-2 rounded-[16px] border border-white/55 px-3 py-3 dark:border-white/10">
              <CreditCard size={16} className="text-[#3390EC] dark:text-[#8774E1]" />
              <div>
                <p className="text-[12px] font-bold text-text">کارت تایید‌شده</p>
                <p className="text-[11px] font-semibold text-text-soft">{toFa(savedCardMasked)}</p>
              </div>
            </div>
          )}

          <label className="flex items-start gap-2 text-[12px] font-semibold text-text-soft">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            مبلغ و کارت مقصد را بررسی کردم و درخواست تسویه را تایید می‌کنم.
          </label>

          {amount > 0 && validation?.ok && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'space-y-2 rounded-[16px] border border-white/55 p-3',
                'glass-inset dark:border-white/10',
              )}
            >
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-semibold text-text-muted">مبلغ درخواستی</span>
                <span className="font-bold tabular-nums text-text">{formatMoney(amount)}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1 font-semibold text-text-muted">
                  <Landmark size={13} strokeWidth={2.25} />
                  کارمزد بانکی
                </span>
                <span className="font-bold tabular-nums text-red-500">−{formatMoney(bankFee)}</span>
              </div>
              <div className="border-t border-white/40 pt-2 dark:border-white/8">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-bold text-text">واریز به حساب</span>
                  <span className={cn('font-black tabular-nums', OK)}>{formatMoney(netAmount)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <AnimatePresence>
          {validation && !validation.ok && amount > 0 && (
            <motion.p
              initial={{ opacity: 0, y: -4, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -4, height: 0 }}
              className={cn(
                'flex items-center gap-2 overflow-hidden rounded-[14px] border px-3 py-2.5',
                'border-red-500/25 bg-red-500/10 text-[11px] font-semibold text-red-600 dark:text-red-400',
              )}
            >
              <TriangleAlert size={14} strokeWidth={2.35} />
              {validation.message}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          whileTap={{ scale: invalid || !payoutAllowed ? 1 : 0.98 }}
          disabled={invalid || !payoutAllowed}
          onClick={() => {
            onSubmit(amount)
            setRaw('')
            setConfirmed(false)
          }}
          className={cn(
            'relative flex h-[54px] w-full items-center justify-center gap-2 overflow-hidden',
            'rounded-[16px] text-[15px] font-bold text-white',
            'bg-emerald-500 shadow-[0_8px_24px_rgba(16,163,127,0.32)]',
            'disabled:pointer-events-none disabled:opacity-45',
          )}
        >
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/10" />
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/35" />
          <Wallet size={18} strokeWidth={2.35} className="relative" />
          <span className="relative">ثبت درخواست تسویه</span>
        </motion.button>
      </motion.div>
    </BottomSheet>
  )
}
