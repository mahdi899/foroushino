import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BadgeCheck, Check, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { EmptyState } from '@/components/ui/States'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { CommissionReviewSheet } from '@/components/domain/CommissionReviewSheet'
import { formatMoney } from '@/lib/format'
import { commissionStatusLabels } from '@/data/labels'
import { filterCommissionQueue, resolveCommissionApprovalMode } from '@/lib/commissionQueue'
import { cn } from '@/lib/cn'
import { haptic } from '@/lib/telegram'
import {
  approveCommissionAsLeader,
  approveCommissionAsSupervisor,
  fetchCommissionQueue,
  rejectCommission,
} from '@/services/walletActions'
import { apiMode } from '@/services'
import type { Commission } from '@/types'

export function CommissionApprovalsScreen() {
  const role = useStore((s) => s.role)
  const permissions = useStore((s) => s.permissions)
  const commissions = useStore((s) => s.commissions)
  const agents = useStore((s) => s.agents)
  const teams = useStore((s) => s.teams)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const pushToast = useStore((s) => s.pushToast)
  const [list, setList] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewTarget, setReviewTarget] = useState<Commission | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Commission | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const mode = resolveCommissionApprovalMode(role, permissions)

  useEffect(() => {
    if (!mode) {
      setLoading(false)
      return
    }

    if (apiMode !== 'http') {
      setList(
        filterCommissionQueue(commissions, agents, teams, currentAgentId, role, mode),
      )
      setLoading(false)
      return
    }

    fetchCommissionQueue()
      .then(setList)
      .catch(() => pushToast('بارگذاری پورسانت‌ها ناموفق بود', 'error'))
      .finally(() => setLoading(false))
  }, [mode, pushToast, commissions, agents, teams, currentAgentId, role])

  const title = mode === 'leader' ? 'تایید پورسانت (لیدر)' : 'تایید نهایی پورسانت (ناظر)'
  const subtitle =
    mode === 'leader'
      ? 'ابتدا لیدر تیم باید هر پورسانت را تایید کند؛ سپس برای ناظر ارسال می‌شود.'
      : 'فقط پورسانت‌هایی که لیدر تیم تایید کرده — تایید نهایی و واریز به کیف پول کارشناس.'

  const approve = async (item: Commission) => {
    if (mode === 'leader') await approveCommissionAsLeader(item.id)
    else await approveCommissionAsSupervisor(item.id)
    setList((rows) => rows.filter((row) => row.id !== item.id))
    pushToast(mode === 'leader' ? 'برای ناظر ارسال شد' : 'به کیف پول کارشناس اضافه شد')
  }

  const reject = async (item: Commission, reason: string) => {
    await rejectCommission(item.id, reason)
    setList((rows) => rows.filter((row) => row.id !== item.id))
    pushToast('پورسانت رد شد')
  }

  const openRejectSheet = (item: Commission) => {
    setReviewTarget(null)
    setRejectReason('')
    setRejectTarget(item)
  }

  const submitReject = async () => {
    if (!rejectTarget || !rejectReason.trim() || rejecting) return
    setRejecting(true)
    try {
      await reject(rejectTarget, rejectReason.trim())
      haptic('warning')
      setRejectTarget(null)
      setRejectReason('')
    } catch {
      haptic('error')
      pushToast('رد ناموفق بود', 'error')
    } finally {
      setRejecting(false)
    }
  }

  if (!mode) return null

  return (
    <Page withNav={false}>
      <ScreenHeader sticky showBack title={title} subtitle={subtitle} icon={BadgeCheck} iconTone="success" />
      <div className="space-y-3 px-4 pb-24 pt-3">
        {loading ? (
          <p className="py-12 text-center text-[13px] font-semibold text-neutral-400">در حال بارگذاری…</p>
        ) : list.length === 0 ? (
          <EmptyState
            title="پورسانتی برای تایید نیست"
            description={
              mode === 'leader'
                ? 'بعد از تایید فروش توسط مدیریت، پورسانت کارشناسان تیم اینجا نمایش داده می‌شود.'
                : 'پورسانت‌هایی که لیدر تیم تایید کرده اینجا ظاهر می‌شوند — هنوز چیزی از لیدر نرسیده.'
            }
          />
        ) : (
          list.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-[18px] border border-white/55 p-4 dark:border-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-right">
                  <p className="text-[14px] font-bold text-text">{item.agentName ?? 'کارشناس'}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-text-soft">
                    {commissionStatusLabels[item.status]}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-text-soft">
                    فروش {formatMoney(item.saleAmount)} تومان
                  </p>
                </div>
                <p className="shrink-0 text-[15px] font-black tabular-nums text-emerald-600">
                  {formatMoney(item.commissionAmount)}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Check size={14} />}
                  onClick={() => setReviewTarget(item)}
                >
                  {mode === 'leader' ? 'بررسی و تایید' : 'بررسی و تایید نهایی'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<X size={14} />}
                  onClick={() => openRejectSheet(item)}
                >
                  رد
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <CommissionReviewSheet
        commission={reviewTarget}
        mode={mode}
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        onApprove={async (item) => {
          try {
            await approve(item)
          } catch {
            pushToast('تایید ناموفق بود', 'error')
            throw new Error('approve failed')
          }
        }}
        onReject={(item) => openRejectSheet(item)}
      />

      <BottomSheet
        open={!!rejectTarget}
        onClose={() => {
          if (rejecting) return
          setRejectTarget(null)
          setRejectReason('')
        }}
        title="رد پورسانت"
        description={
          rejectTarget
            ? `پورسانت ${rejectTarget.agentName ?? 'کارشناس'} — ${formatMoney(rejectTarget.commissionAmount)} تومان`
            : undefined
        }
      >
        <div className="space-y-3 px-4 pb-[calc(12px+var(--safe-bottom))] pt-1">
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="دلیل رد پورسانت را بنویس..."
            rows={3}
            disabled={rejecting}
            className={cn(
              'w-full resize-none rounded-[16px] border border-white/55 bg-white/40 p-3',
              'text-[13px] font-semibold text-text outline-none backdrop-blur-xl',
              'focus:border-[#3390EC]/40 dark:border-white/10 dark:bg-white/[0.06]',
              'dark:focus:border-[#8774E1]/40',
            )}
          />
          <Button
            size="md"
            variant="danger"
            icon={<X size={16} />}
            disabled={!rejectReason.trim() || rejecting}
            className="w-full"
            onClick={() => void submitReject()}
          >
            {rejecting ? 'در حال ثبت…' : 'ثبت رد پورسانت'}
          </Button>
        </div>
      </BottomSheet>
    </Page>
  )
}
