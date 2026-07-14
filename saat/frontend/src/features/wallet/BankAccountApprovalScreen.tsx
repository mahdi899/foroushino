import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, CreditCard, Landmark } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { EmptyState } from '@/components/ui/States'
import { Button } from '@/components/ui/Button'
import { hasPermission } from '@/lib/permissions'
import { relativeDayTime, toFa } from '@/lib/format'
import { confirmBankAccount, fetchBankAccountQueue } from '@/services/walletActions'
import type { BankAccountReview } from '@/types'

export function BankAccountApprovalScreen() {
  const permissions = useStore((s) => s.permissions)
  const pushToast = useStore((s) => s.pushToast)
  const upsertAgent = useStore((s) => s.upsertAgent)
  const [list, setList] = useState<BankAccountReview[]>([])
  const [loading, setLoading] = useState(true)

  const canManage =
    hasPermission(permissions, 'users.manage-team') || hasPermission(permissions, 'users.manage')

  useEffect(() => {
    if (!canManage) {
      setLoading(false)
      return
    }
    fetchBankAccountQueue()
      .then(setList)
      .catch(() => pushToast('بارگذاری اطلاعات بانکی ناموفق بود', 'error'))
      .finally(() => setLoading(false))
  }, [canManage, pushToast])

  if (!canManage) return null

  const approve = async (item: BankAccountReview) => {
    try {
      const agent = await confirmBankAccount(item.userId)
      upsertAgent(agent)
      setList((rows) => rows.filter((row) => row.userId !== item.userId))
      pushToast('اطلاعات بانکی تایید شد')
    } catch {
      pushToast('تایید ناموفق بود', 'error')
    }
  }

  return (
    <Page withNav={false}>
      <ScreenHeader
        sticky
        showBack
        title="تایید اطلاعات بانکی"
        subtitle="کارت و شبای کارشناسان در انتظار تایید"
        icon={CreditCard}
        iconTone="primary"
      />
      <div className="space-y-3 px-4 pb-24 pt-3">
        {loading ? (
          <p className="py-12 text-center text-[13px] font-semibold text-neutral-400">در حال بارگذاری…</p>
        ) : list.length === 0 ? (
          <EmptyState title="موردی نیست" description="همه اطلاعات بانکی تایید شده‌اند." />
        ) : (
          list.map((item) => (
            <motion.div
              key={item.userId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-[20px] border border-white/55 p-4 dark:border-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-bold text-text">{item.name}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-text-soft">
                    {item.teamName ?? 'بدون تیم'}
                    {item.updatedAt ? ` · ${relativeDayTime(item.updatedAt)}` : ''}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2 rounded-[14px] border border-white/55 bg-white/30 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
                <p className="flex items-center gap-1.5 text-[12px] font-bold text-text">
                  <CreditCard size={13} className="text-text-soft" />
                  کارت: {toFa(item.bankCard)}
                </p>
                <p className="flex items-center gap-1.5 text-[12px] font-bold text-text">
                  <Landmark size={13} className="text-text-soft" />
                  شبا: {toFa(item.bankSheba)}
                </p>
              </div>

              <Button
                full
                size="md"
                className="mt-3"
                icon={<Check size={15} />}
                onClick={() => void approve(item)}
              >
                تایید کارت و شبا
              </Button>
            </motion.div>
          ))
        )}
      </div>
    </Page>
  )
}
