import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileText, Check, Send, ClipboardList } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Chip } from '@/components/ui/Chip'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { EmptyState } from '@/components/ui/States'
import { hasPermission } from '@/lib/permissions'
import { isLeaderRole, isSupervisorRole } from '@/lib/roles'
import { getManagedTeam } from '@/lib/teamUtils'
import { toFa, formatIsoDateJalali } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import {
  performApproveTeamReport,
  performForwardTeamReport,
  performSubmitTeamReport,
} from '@/services/teamReportActions'
import type { TeamReport, TeamReportStatus } from '@/types'
import { cn } from '@/lib/cn'

type Filter = 'all' | TeamReportStatus

const statusLabels: Record<TeamReportStatus, string> = {
  submitted: 'منتظر تایید',
  approved: 'تایید شده',
  forwarded_to_manager: 'ارسال به مدیریت',
}

const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }

export function TeamReportsScreen() {
  const [searchParams] = useSearchParams()
  const role = useStore((s) => s.role)
  const permissions = useStore((s) => s.permissions)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const teams = useStore((s) => s.teams)
  const teamReports = useStore((s) => s.teamReports)
  const pushToast = useStore((s) => s.pushToast)

  const canSubmit = hasPermission(permissions, 'reports.submit-team')
  const canApprove = hasPermission(permissions, 'reports.approve-team')
  const inboxOnly = searchParams.get('inbox') === '1'
  const statusParam = searchParams.get('status')
  const initialFilter: Filter =
    inboxOnly
      ? 'forwarded_to_manager'
      : statusParam === 'submitted' || statusParam === 'approved' || statusParam === 'forwarded_to_manager'
        ? statusParam
        : 'all'
  const [filter, setFilter] = useState<Filter>(initialFilter)
  const [approveTarget, setApproveTarget] = useState<TeamReport | null>(null)
  const [forwardTarget, setForwardTarget] = useState<TeamReport | null>(null)

  const visible = useMemo(() => {
    let list = [...teamReports]
    if (isLeaderRole(role)) {
      const team = getManagedTeam(teams, currentAgentId, role)
      list = team ? list.filter((r) => r.teamId === team.id) : []
    }
    if (filter !== 'all') {
      list = list.filter((r) => r.status === filter)
    }
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [teamReports, role, teams, currentAgentId, filter])

  const counts = useMemo(
    () => ({
      all: teamReports.length,
      submitted: teamReports.filter((r) => r.status === 'submitted').length,
      approved: teamReports.filter((r) => r.status === 'approved').length,
      forwarded_to_manager: teamReports.filter((r) => r.status === 'forwarded_to_manager').length,
    }),
    [teamReports],
  )

  return (
    <Page withNav={false}>
      <ScreenHeader
        sticky
        showBack
        title="گزارش تیم‌ها"
        subtitle={
          isSupervisorRole(role)
            ? 'بررسی و ارسال به مدیریت'
            : isLeaderRole(role)
              ? 'گزارش روزانه تیم'
              : 'گزارش‌های تایید‌شده'
        }
        icon={FileText}
        iconTone="primary"
        action={
          canSubmit ? (
            <button
              type="button"
              onClick={() => {
                haptic('success')
                void performSubmitTeamReport().catch(() => pushToast('ارسال گزارش ناموفق بود', 'error'))
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
              ['forwarded_to_manager', 'مدیریت'],
            ] as const
          ).map(([id, label]) => (
            <Chip key={id} active={filter === id} onClick={() => setFilter(id)}>
              {label}
              {counts[id] > 0 && (
                <span className="mr-0.5 rounded-full bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-bold tabular-nums dark:bg-white/10">
                  {toFa(counts[id])}
                </span>
              )}
            </Chip>
          ))}
        </div>
      </ScreenHeader>

      <div className="space-y-3 px-4 pb-24 pt-3">
        {visible.length === 0 ? (
          <EmptyState
            title="گزارشی نیست"
            description={
              canSubmit ? 'گزارش امروز تیمت را ارسال کن.' : 'هنوز گزارشی ثبت نشده.'
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
                  <p className="text-[15px] font-bold text-text">{report.teamName}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-text-soft">
                    {formatIsoDateJalali(report.reportDate)} · {report.submitterName ?? 'لیدر'}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold',
                    report.status === 'submitted' && 'bg-amber-500/15 text-amber-700',
                    report.status === 'approved' && 'bg-emerald-500/15 text-emerald-700',
                    report.status === 'forwarded_to_manager' && 'bg-primary-500/15 text-primary-700',
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

              {report.leaderNotes && (
                <p className="mt-3 rounded-[14px] bg-black/[0.04] px-3 py-2 text-[12px] font-semibold text-text-soft dark:bg-white/6">
                  {report.leaderNotes}
                </p>
              )}

              {canApprove && report.status === 'submitted' && (
                <button
                  type="button"
                  onClick={() => setApproveTarget(report)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-[14px] bg-emerald-500 py-2.5 text-[12px] font-bold text-white"
                >
                  <Check size={14} />
                  تایید گزارش
                </button>
              )}

              {canApprove && report.status === 'approved' && (
                <button
                  type="button"
                  onClick={() => setForwardTarget(report)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#3390EC] py-2.5 text-[12px] font-bold text-white dark:bg-[#8774E1]"
                >
                  <Send size={14} />
                  ارسال به مدیریت
                </button>
              )}

              {report.status === 'forwarded_to_manager' && (
                <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-primary-700 dark:text-primary-300">
                  <ClipboardList size={13} />
                  برای بررسی مدیریت ارسال شده
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      <ConfirmModal
        open={!!approveTarget}
        title="تایید گزارش تیم"
        description={`گزارش ${approveTarget?.teamName} را تایید می‌کنی؟`}
        icon={Check}
        tone="success"
        confirmLabel="تایید"
        onCancel={() => setApproveTarget(null)}
        onConfirm={() => {
          if (!approveTarget) return
          haptic('success')
          void performApproveTeamReport(approveTarget.id).catch(() =>
            pushToast('تایید گزارش ناموفق بود', 'error'),
          )
          setApproveTarget(null)
        }}
      />

      <ConfirmModal
        open={!!forwardTarget}
        title="ارسال به مدیریت"
        description={`گزارش تایید‌شده ${forwardTarget?.teamName} برای مدیر فروش ارسال می‌شود.`}
        icon={Send}
        tone="success"
        confirmLabel="ارسال"
        onCancel={() => setForwardTarget(null)}
        onConfirm={() => {
          if (!forwardTarget) return
          haptic('success')
          void performForwardTeamReport(forwardTarget.id)
            .then(() => pushToast('گزارش برای مدیریت ارسال شد'))
            .catch(() => pushToast('ارسال گزارش ناموفق بود', 'error'))
          setForwardTarget(null)
        }}
      />
    </Page>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-black/[0.04] px-2 py-2 text-center dark:bg-white/6">
      <p className="text-[10px] font-semibold text-text-soft">{label}</p>
      <p className="text-[13px] font-black tabular-nums text-text">{value}</p>
    </div>
  )
}
