import { useState } from 'react'
import { CreditCard, Landmark, CalendarRange, Banknote, Check } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { paymentMethodLabels } from '@/data/labels'
import { formatMoney } from '@/lib/format'
import type { PaymentMethod, Sale } from '@/types'
import { cn } from '@/lib/cn'

const methodIcon: Record<PaymentMethod, typeof CreditCard> = {
  card: CreditCard,
  gateway: Landmark,
  installment: CalendarRange,
  cash: Banknote,
}

const methods: PaymentMethod[] = ['gateway', 'card', 'installment', 'cash']

export function PaymentSubmitSheet({
  sale,
  open,
  onClose,
  onSubmit,
}: {
  sale: Sale | null
  open: boolean
  onClose: () => void
  onSubmit: (method: PaymentMethod, reference: string) => void
}) {
  const [method, setMethod] = useState<PaymentMethod>('gateway')
  const [reference, setReference] = useState('')

  if (!sale) return null

  return (
    <BottomSheet open={open} onClose={onClose} title="ثبت پرداخت فروش">
      <div className="space-y-4 pt-1">
        <div className="rounded-2xl bg-neutral-50 px-4 py-3 text-center">
          <p className="text-[11px] font-bold text-neutral-400">مبلغ فروش</p>
          <p className="mt-1 text-[22px] font-black tabular-nums text-neutral-900">
            {formatMoney(sale.amount)} <span className="text-[12px] font-bold text-neutral-400">تومان</span>
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold text-neutral-500">روش پرداخت</p>
          <div className="grid grid-cols-2 gap-2">
            {methods.map((m) => {
              const Icon = methodIcon[m]
              const active = method === m
              return (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-right transition-colors',
                    active ? 'border-primary-400 bg-primary-50' : 'border-border bg-surface',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                      active ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-500',
                    )}
                  >
                    <Icon size={16} strokeWidth={2.25} />
                  </span>
                  <span className="text-[12.5px] font-extrabold text-neutral-800">
                    {paymentMethodLabels[m]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold text-neutral-500">شماره پیگیری / مرجع تراکنش</p>
          <input
            dir="ltr"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="مثلاً ۷۷۳۱۹۹۸۲"
            className="h-12 w-full rounded-xl border border-border bg-neutral-50 px-3.5 text-left text-[14px] font-extrabold tabular-nums text-neutral-900 outline-none focus:border-primary-400 dark:bg-white/[0.06] dark:text-neutral-100"
          />
        </div>

        <Button
          full
          size="lg"
          icon={<Check size={18} />}
          disabled={!reference.trim()}
          onClick={() => {
            onSubmit(method, reference.trim())
            setReference('')
          }}
        >
          ثبت پرداخت و ارسال برای تایید
        </Button>
      </div>
    </BottomSheet>
  )
}
