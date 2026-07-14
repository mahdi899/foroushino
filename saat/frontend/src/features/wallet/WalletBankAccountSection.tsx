import { useState } from 'react'
import { CreditCard, Landmark, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { saveBankAccount } from '@/services/walletActions'
import { useStore } from '@/store/useStore'
import {
  formatBankCardFa,
  formatShebaFa,
  parseCardDigits,
  parseShebaDigits,
  toFa,
} from '@/lib/format'
import { cn } from '@/lib/cn'

const bankInputClass = cn(
  'glass-inset ltr-nums w-full rounded-[14px] border border-white/55 px-3 py-3 text-left font-bold tabular-nums',
  'dark:border-white/10',
)

export function WalletBankAccountSection() {
  const wallet = useStore((s) => s.wallet)
  const pushToast = useStore((s) => s.pushToast)
  const [cardRaw, setCardRaw] = useState('')
  const [shebaRaw, setShebaRaw] = useState('')
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)

  const cardDigits = parseCardDigits(cardRaw)
  const shebaDigits = parseShebaDigits(shebaRaw)
  const cardValid = cardDigits.length === 16
  const shebaValid = shebaDigits.length === 24
  const canSave = cardValid && shebaValid && !saving

  const submit = async () => {
    setTouched(true)
    if (!cardValid || !shebaValid) {
      pushToast('شماره کارت (۱۶ رقم) و شبا (۲۴ رقم) هر دو الزامی هستند.', 'error')
      return
    }
    if (!canSave) return
    setSaving(true)
    try {
      await saveBankAccount(cardDigits, shebaDigits)
      setCardRaw('')
      setShebaRaw('')
      setTouched(false)
      pushToast('اطلاعات بانکی ثبت شد. منتظر تایید ناظر باش.', 'success')
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'ثبت اطلاعات بانکی ناموفق بود', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="glass-card rounded-[22px] border border-white/55 p-4 dark:border-white/10">
      <div className="mb-3 flex items-center gap-2">
        <CreditCard size={16} className="text-[#3390EC] dark:text-[#8774E1]" />
        <h3 className="text-[14px] font-extrabold text-text">اطلاعات بانکی</h3>
      </div>

      {(wallet.bankCardMasked || wallet.bankShebaRegistered) && (
        <div className="mb-3 space-y-2 rounded-[14px] border border-white/55 bg-white/30 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
          {wallet.bankCardMasked && (
            <p className="ltr-nums text-left text-[12px] font-bold text-text">
              کارت: {toFa(wallet.bankCardMasked)}
            </p>
          )}
          {wallet.bankShebaRegistered && (
            <p className="flex items-center gap-1.5 text-[12px] font-bold text-text">
              <Landmark size={13} className="text-text-soft" />
              شبا ثبت شده
            </p>
          )}
          <p
            className={cn(
              'flex items-center gap-1 text-[11px] font-semibold',
              wallet.bankCardConfirmed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
            )}
          >
            <ShieldCheck size={12} />
            {wallet.bankCardConfirmed ? 'تایید شده توسط ناظر' : 'در انتظار تایید ناظر'}
          </p>
        </div>
      )}

      {!wallet.bankCardConfirmed && (
        <>
          <p className="mb-3 text-[11px] font-semibold text-text-soft">
            برای درخواست تسویه، <strong className="text-text">هر دو</strong> فیلد شماره کارت (۱۶ رقم) و شبا (۲۴
            رقم) را وارد کن. بعد از تایید ناظر می‌توانی برداشت کنی.
          </p>

          <div className="mb-3 space-y-1">
            <label className="block text-[11px] font-semibold text-text-muted">
              شماره کارت <span className="text-red-500">*</span>
            </label>
            <input
              dir="ltr"
              inputMode="numeric"
              autoComplete="off"
              value={formatBankCardFa(cardDigits)}
              onChange={(e) => setCardRaw(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="۶۰۳۷ ۹۹۱۲ ۳۴۵۶ ۷۸۹۰"
              maxLength={19}
              className={cn(
                bankInputClass,
                'text-[15px] tracking-widest',
                touched && !cardValid && 'border-red-500/30',
              )}
            />
            {touched && !cardValid && (
              <p className="text-[10px] font-semibold text-red-500">
                {cardDigits.length === 0 ? 'شماره کارت الزامی است.' : 'شماره کارت باید دقیقاً ۱۶ رقم باشد.'}
              </p>
            )}
          </div>

          <div className="mb-3 space-y-1">
            <label className="block text-[11px] font-semibold text-text-muted">
              شماره شبا <span className="text-red-500">*</span>
            </label>
            <input
              dir="ltr"
              inputMode="numeric"
              autoComplete="off"
              value={formatShebaFa(shebaDigits)}
              onChange={(e) => setShebaRaw(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="IR ۶۰ ۳۷۹۹ ۱۲۳۴ ۵۶۷۸ ۹۰۱۲ ۳۴۵۶ ۷۸"
              maxLength={32}
              className={cn(
                bankInputClass,
                'text-[14px] tracking-wide',
                touched && !shebaValid && 'border-red-500/30',
              )}
            />
            {touched && !shebaValid && (
              <p className="text-[10px] font-semibold text-red-500">
                {shebaDigits.length === 0 ? 'شماره شبا الزامی است.' : 'شماره شبا باید ۲۴ رقم باشد (با یا بدون IR).'}
              </p>
            )}
          </div>

          <Button full size="md" disabled={!canSave} onClick={() => void submit()}>
            {wallet.bankCardMasked ? 'به‌روزرسانی اطلاعات بانکی' : 'ثبت اطلاعات بانکی'}
          </Button>
        </>
      )}
    </div>
  )
}
