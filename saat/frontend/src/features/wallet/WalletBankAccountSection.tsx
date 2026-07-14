import { useState } from 'react'
import { CreditCard, Landmark, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { saveBankAccount } from '@/services/walletActions'
import { useStore } from '@/store/useStore'
import { toFa, toEn } from '@/lib/format'
import { cn } from '@/lib/cn'

export function WalletBankAccountSection() {
  const wallet = useStore((s) => s.wallet)
  const pushToast = useStore((s) => s.pushToast)
  const [cardRaw, setCardRaw] = useState('')
  const [shebaRaw, setShebaRaw] = useState('')
  const [saving, setSaving] = useState(false)

  const cardDigits = toEn(cardRaw).replace(/\D/g, '')
  const shebaDigits = toEn(shebaRaw).replace(/\D/g, '').replace(/^IR/i, '')
  const cardValid = cardDigits.length === 16
  const shebaValid = shebaDigits.length === 24
  const canSave = cardValid && shebaValid && !saving

  const submit = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await saveBankAccount(cardDigits, shebaDigits)
      setCardRaw('')
      setShebaRaw('')
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
            <p className="text-[12px] font-bold text-text">
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
          {!wallet.bankCardMasked && (
            <p className="mb-3 text-[11px] font-semibold text-text-soft">
              برای درخواست تسویه، شماره کارت و شبا را ثبت کن. بعد از تایید ناظر می‌توانی برداشت کنی.
            </p>
          )}

          <label className="mb-1.5 block text-[11px] font-semibold text-text-muted">شماره کارت</label>
          <input
            inputMode="numeric"
            value={cardDigits ? toFa(cardDigits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()) : ''}
            onChange={(e) => setCardRaw(e.target.value)}
            placeholder="۶۰۳۷ · · · · · · · · · · · ·"
            maxLength={19}
            className={cn(
              'glass-inset mb-3 w-full rounded-[14px] border border-white/55 px-3 py-3 text-[15px] font-bold tabular-nums tracking-widest',
              'dark:border-white/10',
              cardDigits.length > 0 && !cardValid && 'border-red-500/30',
            )}
          />

          <label className="mb-1.5 block text-[11px] font-semibold text-text-muted">شماره شبا</label>
          <input
            inputMode="numeric"
            value={
              shebaDigits
                ? toFa(`IR ${shebaDigits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()}`)
                : shebaRaw.toUpperCase().startsWith('IR')
                  ? toFa(shebaRaw)
                  : ''
            }
            onChange={(e) => setShebaRaw(e.target.value)}
            placeholder="IR · · · · · · · · · · · · · · · · · · · ·"
            className={cn(
              'glass-inset mb-3 w-full rounded-[14px] border border-white/55 px-3 py-3 text-[14px] font-bold tabular-nums',
              'dark:border-white/10',
              shebaDigits.length > 0 && !shebaValid && 'border-red-500/30',
            )}
          />

          <Button full size="md" disabled={!canSave} onClick={() => void submit()}>
            {wallet.bankCardMasked ? 'به‌روزرسانی اطلاعات بانکی' : 'ثبت اطلاعات بانکی'}
          </Button>
        </>
      )}
    </div>
  )
}
