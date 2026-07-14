import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileText, Check, X, ClipboardList } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Chip } from '@/components/ui/Chip'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { EmptyState } from '@/components/ui/States'
import {
  fetchAgentReports,
  performApproveAgentReport,
  performRejectAgentReport,
  performSubmitAgentReport,
} from '@/services/agentReportActions'
import { apiMode } from '@/services'
import { hasPermission } from '@/lib/permissions'
import { isAgentRole, isLeaderRole } from '@/lib/roles'
import { getTeamAgentIds } from '@/lib/teamUtils'
import { toFa, formatIsoDateJalali } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import type { AgentReport, AgentReportStatus } from '@/types'
import { cn } from '@/lib/cn'

type Filter = 'all' | AgentReportStatus

const statusLabels: Record<AgentReportStatus, string> = {
  submitted: 'منتظر تایید',
  approved: 'تایید شده',
  rejected: 'رد شده',
}

const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }

export function AgentReportsScreen() {
  const [searchParams] = useSearchParams()
  const role = useStore((s) => s.role)
  const permissions = useStore((s) => s.permissions)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const agents = useStore((s) => s.agents)
  const teams = useStore((s) => s.teams)
  const agentReports = useStore((s) => s.agentReports)
  const setAgentReports = useStore((s) => s.setAgentReports)
  const pushToast = useStore((s) => s.pushToast)

  const canSubmit = hasPermission(permissions, 'reports.submit-agent')
  const canApprove = hasPermission(permissions, 'reports.approve-agent')
  const inboxOnly = searchParams.get('inbox') === '1'
  const initialFilter: Filter = inboxOnly
    ? 'submitted'
    : searchParams.get('status') === 'submitted' ||
        searchParams.get('status') === 'approved' ||
        searchParams.get('status') === 'rejected'
      ? (searchParams.get('status') as AgentReportStatus)
      : 'all'
  const [filter, setFilter] = useState<Filter>(initialFilter)
  const [loading, setLoading] = useState(apiMode === 'http' && (canSubmit || canApprove))
  const [approveTarget, setApproveTarget] = useState<AgentReport | null>(null)
  const [rejectTarget, setRejectTarget] = useState<AgentReport | null>(null)

  useEffect(() => {
    setFilter(initialFilter)
  }, [initialFilter])

  useEffect(() => {
    if (apiMode !== 'http' || (!canSubmit && !canApprove)) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    fetchAgentReports()
      .then((reports) => {
        if (!cancelled) setAgentReports(reports)
      })
      .catch(() => {
        if (!cancelled) pushToast('بارگذاری گزارش‌ها ناموفق بود', 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [canSubmit, canApprove, setAgentReports, pushToast])

  const teamAgentIds = useMemo(
    () => getTeamAgentIds(teams, agents, currentAgentId, role),
    [teams, agents, currentAgentId, role],
  )

  const visible = useMemo(() => {
    let list = [...agentReports]
    if (isLeaderRole(role)) {
      list = list.filter((r) => teamAgentIds.includes(r.agentId))
    } else if (isAgentRole(role)) {
      list = list.filter((r) => r.agentId === currentAgentId)
    }
    if (filter !== 'all') {
      list = list.filter((r) => r.status === filter)
    }
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [agentReports, role, teamAgentIds, currentAgentId, filter])

  const pendingCount = useMemo(() => {
    let list = [...agentReports]
    if (isLeaderRole(role)) {
      list = list.filter((r) => teamAgentIds.includes(r.agentId))
    }
    return list.filter((r) => r.status === 'submitted').length
  }, [agentReports, role, teamAgentIds])

  return (
    <Page withNav={false}>
      <ScreenHeader
        sticky
        showBack
        title={isLeaderRole(role) ? 'گزارش کارشناسان' : 'گزارش روزانه من'}
        subtitle={
          isLeaderRole(role)
            ? 'تایید فعالیت روزانه اعضای تیم'
            : 'ارسال گزارش برای لیدر تیم'
        }
        icon={FileText}
        iconTone="primary"
        action={
          canSubmit ? (
            <button
              type="button"
              onClick={() => {
                haptic('success')
                void performSubmitAgentReport().catch(() =>
                  pushToast('ارسال گزارش ناموفق بود', 'error'),
                )
              }}
              className="rounded-full bg-[#3390EC] px-3 py-2 text-[11px] font-bold text-white dark:bg-[#8774E1]"
            >
              ارسال گزارش امروز
            </button>
          ) : undefined
        }
      >
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 py-1 no-scrollbar">
          {(
            [
              ['all', 'همه'],
              ['submitted', 'منتظر تایید'],
              ['approved', 'تایید شده'],
              ['rejected', 'رد شده'],
            ] as const
          ).map(([id, label]) => (
            <Chip key={id} active={filter === id} onClick={() => setFilter(id)}>
              {label}
            </Chip>
          ))}
        </div>
      </ScreenHeader>

      <div className="space-y-3 px-4 pb-24 pt-3">
        {isLeaderRole(role) && pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-[16px] bg-amber-500/12 px-4 py-3 text-[12px] font-bold text-amber-800">
            <ClipboardList size={14} />
            {toFa(pendingCount)} گزارش منتظر تایید توست
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-[13px] font-semibold text-neutral-400">
            در حال بارگذاری گزارش‌ها…
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            title="گزارشی نیست"
            description={
              canSubmit
                ? 'گزارش امروزت را برای لیدر ارسال کن.'
                : 'هنوز گزارشی از کارشناسان ثبت نشده.'
            }
          />
        ) : (
          visible.map((report) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              className="glass-card rounded-[20px] border border-white/55 p-4 dark:border-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-bold text-text">
                    {report.agentName ?? 'کارشناس'}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-text-soft">
                    {formatIsoDateJalali(report.reportDate)}
                    {report.teamName ? ` · ${report.teamName}` : ''}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold',
                    report.status === 'submitted' && 'bg-amber-500/15 text-amber-700',
                    report.status === 'approved' && 'bg-emerald-500/15 text-emerald-700',
                    report.status === 'rejected' && 'bg-error-500/15 text-error-700',
                  )}
                >
                  {statusLabels[report.status]}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <Metric label="تماس" value={toFa(report.summary.calls_today)} />
                <Metric label="موفق" value={toFa(report.summary.successful_today)} />
                <Metric label="تبدیل" value={`${toFa(report.summary.conversion_rate)}٪`} />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <Metric
                  label="پیگیری"
                  value={toFa(report.summary.followups_completed)}
                  compact
                />
                <Metric label="فروش" value={toFa(report.summary.sales_submitted)} compact />
              </div>

              {report.agentNotes && (
                <p className="mt-3 rounded-[14px] bg-black/[0.04] px-3 py-2 text-[12px] font-semibold text-text-soft dark:bg-white/6">
                  {report.agentNotes}
                </p>
              )}

              {report.leaderNotes && report.status !== 'submitted' && (
                <p className="mt-2 rounded-[14px] bg-primary-500/8 px-3 py-2 text-[12px] font-semibold text-primary-800 dark:text-primary-200">
                  {report.leaderNotes}
                </p>
              )}

              {canApprove && report.status === 'submitted' && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setApproveTarget(report)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-emerald-500 py-2.5 text-[12px] font-bold text-white"
                  >
                    <Check size={14} />
                    تایید
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectTarget(report)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-error-500/90 py-2.5 text-[12px] font-bold text-white"
                  >
                    <X size={14} />
                    رد
                  </button>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      <ConfirmModal
        open={!!approveTarget}
        title="تایید گزارش کارشناس"
        description={`گزارش ${approveTarget?.agentName} را تایید می‌کنی؟`}
        icon={Check}
        tone="success"
        confirmLabel="تایید"
        onCancel={() => setApproveTarget(null)}
        onConfirm={() => {
          if (!approveTarget) return
          haptic('success')
          void performApproveAgentReport(approveTarget.id).catch(() =>
            pushToast('تایید گزارش ناموفق بود', 'error'),
          )
          setApproveTarget(null)
        }}
      />

      <ConfirmModal
        open={!!rejectTarget}
        title="رد گزارش کارشناس"
        description={`گزارش ${rejectTarget?.agentName} رد می‌شود.`}
        icon={X}
        tone="error"
        confirmLabel="رد گزارش"
        onCancel={() => setRejectTarget(null)}
        onConfirm={() => {
          if (!rejectTarget) return
          haptic('light')
          void performRejectAgentReport(rejectTarget.id).catch(() =>
            pushToast('رد گزارش ناموفق بود', 'error'),
          )
          setRejectTarget(null)
        }}
      />
    </Page>
  )
}

function Metric({
  label,
  value,
  compact,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-[12px] bg-black/[0.04] text-center dark:bg-white/6',
        compact ? 'px-2 py-1.5' : 'px-2 py-2',
      )}
    >
      <p className="text-[10px] font-semibold text-text-soft">{label}</p>
      <p className="text-[13px] font-black tabular-nums text-text">{value}</p>
    </div>
  )
}
