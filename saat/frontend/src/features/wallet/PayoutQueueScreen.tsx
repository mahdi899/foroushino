import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Banknote, Check, Copy, CreditCard, Landmark, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { EmptyState } from '@/components/ui/States'
import { Button } from '@/components/ui/Button'
import { hasPermission } from '@/lib/permissions'
import { formatMoney, relativeDayTime, toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import { approvePayout, fetchPayoutQueue, rejectPayout } from '@/services/walletActions'
import type { PayoutRequest } from '@/types'

function copyBankValue(raw: string, label: string, pushToast: (msg: string, tone?: 'error') => void) {
  const value = raw.replace(/\s/g, '')
  void navigator.clipboard?.writeText(value).then(
    () => pushToast(`${label} کپی شد`),
    () => pushToast('کپی ناموفق بود', 'error'),
  )
}

function BankDetailRow({
  icon: Icon,
  label,
  value,
  onCopy,
}: {
  icon: typeof CreditCard
  label: string
  value: string
  onCopy: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="icon-3d icon-3d-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]">
        <Icon size={13} className="text-white" strokeWidth={2.35} />
      </span>
      <div className="min-w-0 flex-1 text-right">
        <p className="text-[10px] font-bold text-text-soft">{label}</p>
        <p className="ltr-nums mt-0.5 text-[13px] font-black tabular-nums tracking-wide text-text">{toFa(value)}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          haptic('selection')
          onCopy()
        }}
        className="glass-inset flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/55 text-[#3390EC] transition-all active:scale-95 dark:border-white/10 dark:text-[#8774E1]"
        aria-label={`کپی ${label}`}
      >
        <Copy size={14} strokeWidth={2.25} />
      </button>
    </div>
  )
}

export function PayoutQueueScreen() {
  const permissions = useStore((s) => s.permissions)
  const pushToast = useStore((s) => s.pushToast)
  const [list, setList] = useState<PayoutRequest[]>([])
  const [loading, setLoading] = useState(true)

  const canManage = hasPermission(permissions, 'wallet.manage-payouts')

  useEffect(() => {
    if (!canManage) {
      setLoading(false)
      return
    }
    fetchPayoutQueue()
      .then(setList)
      .catch(() => pushToast('بارگذاری درخواست‌ها ناموفق بود', 'error'))
      .finally(() => setLoading(false))
  }, [canManage, pushToast])

  if (!canManage) return null

  const markPaid = async (item: PayoutRequest) => {
    try {
      await approvePayout(item.id)
      setList((rows) => rows.filter((row) => row.id !== item.id))
      pushToast('پرداخت ثبت شد')
    } catch {
      pushToast('ثبت پرداخت ناموفق بود', 'error')
    }
  }

  const reject = async (item: PayoutRequest) => {
    const reason = window.prompt('دلیل رد درخواست:')
    if (!reason?.trim()) return
    try {
      await rejectPayout(item.id, reason.trim())
      setList((rows) => rows.filter((row) => row.id !== item.id))
      pushToast('درخواست رد شد')
    } catch {
      pushToast('رد ناموفق بود', 'error')
    }
  }

  return (
    <Page withNav={false}>
      <ScreenHeader
        sticky
        showBack
        title="صف تسویه"
        subtitle="درخواست‌های تسویه کارشناسان"
        icon={Banknote}
        iconTone="success"
      />
      <div className="space-y-3 px-4 pb-24 pt-3">
        {loading ? (
          <p className="py-12 text-center text-[13px] font-semibold text-neutral-400">در حال بارگذاری…</p>
        ) : list.length === 0 ? (
          <EmptyState title="درخواستی نیست" description="همه تسویه‌ها انجام شده‌اند." />
        ) : (
          list.map((item) => {
            const cardNumber = item.bankCard ?? item.bankCardMasked
            const hasBankInfo = !!(cardNumber || item.bankSheba)

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-[20px] border border-white/55 p-4 dark:border-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-text">{item.agentName ?? 'کارشناس'}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-text-soft">
                      {relativeDayTime(item.requestedAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-left">
                    <p className="text-[15px] font-black tabular-nums text-emerald-600">{formatMoney(item.amount)}</p>
                    {item.netAmount != null && (
                      <p className="mt-0.5 text-[10px] font-semibold text-text-soft">
                        واریز: {formatMoney(item.netAmount)}
                      </p>
                    )}
                  </div>
                </div>

                {hasBankInfo && (
                  <div className="mt-3 space-y-2.5 rounded-[14px] border border-white/55 bg-white/30 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                    {cardNumber && (
                      <BankDetailRow
                        icon={CreditCard}
                        label="شماره کارت"
                        value={cardNumber}
                        onCopy={() => copyBankValue(cardNumber, 'شماره کارت', pushToast)}
                      />
                    )}
                    {item.bankSheba && (
                      <BankDetailRow
                        icon={Landmark}
                        label="شماره شبا"
                        value={item.bankSheba}
                        onCopy={() => copyBankValue(item.bankSheba!, 'شماره شبا', pushToast)}
                      />
                    )}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button size="sm" variant="primary" icon={<Check size={14} />} onClick={() => void markPaid(item)}>
                    پرداخت شد
                  </Button>
                  <Button size="sm" variant="secondary" icon={<X size={14} />} onClick={() => void reject(item)}>
                    رد
                  </Button>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </Page>
  )
}
