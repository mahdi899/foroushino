import { useState } from 'react'
import { Wallet, TriangleAlert } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { formatMoney, toFa, toEn } from '@/lib/format'

interface PayoutRequestSheetProps {
  open: boolean
  onClose: () => void
  balanceAvailable: number
  onSubmit: (amount: number) => void
}

const presets = [0.25, 0.5, 1]

export function PayoutRequestSheet({ open, onClose, balanceAvailable, onSubmit }: PayoutRequestSheetProps) {
  const [raw, setRaw] = useState('')
  const amount = Number(toEn(raw).replace(/[^\d]/g, '')) || 0
  const invalid = amount <= 0 || amount > balanceAvailable

  return (
    <BottomSheet open={open} onClose={onClose} title="درخواست تسویه">
      <div className="space-y-4 pt-1">
        <div className="rounded-2xl bg-success-50 p-4 text-center">
          <p className="text-[11px] font-bold text-success-600">موجودی قابل برداشت</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-success-700">
            {formatMoney(balanceAvailable)} <span className="text-xs font-bold">تومان</span>
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] font-extrabold text-neutral-600">مبلغ درخواستی</label>
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-neutral-50 px-4 py-3">
            <input
              inputMode="numeric"
              value={raw ? toFa(amount.toLocaleString('en-US')) : ''}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="۰"
              className="w-full bg-transparent text-left text-lg font-black tabular-nums text-neutral-900 outline-none"
            />
            <span className="shrink-0 text-[12px] font-bold text-neutral-400">تومان</span>
          </div>
          <div className="mt-2 flex gap-2">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setRaw(String(Math.floor(balanceAvailable * p)))}
                className="flex-1 rounded-xl bg-neutral-100 py-2 text-[11px] font-extrabold text-neutral-600 active:bg-neutral-200"
              >
                {p === 1 ? 'کل موجودی' : `${toFa(p * 100)}٪`}
              </button>
            ))}
          </div>
        </div>

        {amount > balanceAvailable && (
          <p className="flex items-center gap-1.5 rounded-lg bg-error-50 px-3 py-2 text-[11px] font-bold text-error-600">
            <TriangleAlert size={13} />
            مبلغ درخواستی از موجودی قابل برداشت بیشتر است.
          </p>
        )}

        <Button
          full
          size="lg"
          icon={<Wallet size={16} />}
          disabled={invalid}
          onClick={() => {
            onSubmit(amount)
            setRaw('')
          }}
        >
          ثبت درخواست تسویه
        </Button>
      </div>
    </BottomSheet>
  )
}
