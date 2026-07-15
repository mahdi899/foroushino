import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Banknote, Check, CreditCard, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { EmptyState } from '@/components/ui/States'
import { Button } from '@/components/ui/Button'
import { hasPermission } from '@/lib/permissions'
import { formatMoney, relativeDayTime, toFa } from '@/lib/format'
import { approvePayout, fetchPayoutQueue, rejectPayout } from '@/services/walletActions'
import type { PayoutRequest } from '@/types'

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
        title="صف پرداخت"
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
          list.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-[20px] border border-white/55 p-4 dark:border-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-bold text-text">{item.agentName ?? 'کارشناس'}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-text-soft">
                    {relativeDayTime(item.requestedAt)}
                  </p>
                </div>
                <p className="text-[15px] font-black tabular-nums text-emerald-600">{formatMoney(item.amount)}</p>
              </div>
              {item.bankSheba && (
                <p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-text-soft">
                  <CreditCard size={13} />
                  شبا: {toFa(item.bankSheba)}
                </p>
              )}
              {item.bankCardMasked && (
                <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-text-soft">
                  <CreditCard size={13} />
                  کارت: {toFa(item.bankCardMasked)}
                </p>
              )}
              {item.netAmount != null && (
                <p className="mt-1 text-[11px] font-semibold text-text-muted">
                  واریز خالص: {formatMoney(item.netAmount)} تومان
                </p>
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
          ))
        )}
      </div>
    </Page>
  )
}
