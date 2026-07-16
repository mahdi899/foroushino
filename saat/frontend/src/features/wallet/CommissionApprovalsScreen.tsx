import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BadgeCheck, Check, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { EmptyState } from '@/components/ui/States'
import { Button } from '@/components/ui/Button'
import { hasPermission } from '@/lib/permissions'
import { isLeaderRole, isSupervisorRole } from '@/lib/roles'
import { formatMoney } from '@/lib/format'
import { commissionStatusLabels } from '@/data/labels'
import { filterCommissionQueue } from '@/lib/commissionQueue'
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

  const canLeader = hasPermission(permissions, 'commissions.approve-leader')
  const canSupervisor = hasPermission(permissions, 'commissions.approve-supervisor')
  const mode = isLeaderRole(role) && canLeader ? 'leader' : isSupervisorRole(role) && canSupervisor ? 'supervisor' : null

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

  const title = mode === 'leader' ? 'تایید پورسانت' : 'تایید نهایی پورسانت'
  const subtitle =
    mode === 'leader'
      ? 'پورسانت‌های منتظر تایید سرتیم'
      : 'پورسانت‌های تایید‌شده توسط لیدر'

  const approve = async (item: Commission) => {
    try {
      if (mode === 'leader') await approveCommissionAsLeader(item.id)
      else await approveCommissionAsSupervisor(item.id)
      setList((rows) => rows.filter((row) => row.id !== item.id))
      pushToast(mode === 'leader' ? 'برای ناظر ارسال شد' : 'به کیف پول کارشناس اضافه شد')
    } catch {
      pushToast('تایید ناموفق بود', 'error')
    }
  }

  const reject = async (item: Commission) => {
    const reason = window.prompt('دلیل رد پورسانت:')
    if (!reason?.trim()) return
    try {
      await rejectCommission(item.id, reason.trim())
      setList((rows) => rows.filter((row) => row.id !== item.id))
      pushToast('پورسانت رد شد')
    } catch {
      pushToast('رد ناموفق بود', 'error')
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
                ? 'وقتی فروش کارشناسان تیم تایید نهایی شود، پورسانت اینجا نمایش داده می‌شود.'
                : 'پورسانت‌های تایید‌شده توسط لیدرها اینجا ظاهر می‌شوند.'
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
                <Button size="sm" variant="primary" icon={<Check size={14} />} onClick={() => void approve(item)}>
                  {mode === 'leader' ? 'تایید لیدر' : 'تایید نهایی'}
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
