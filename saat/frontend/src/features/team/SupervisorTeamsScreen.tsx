import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, Radio, ArrowLeft, Phone, Target, FileText, UserPlus } from 'lucide-react'
import { hasPermission } from '@/lib/permissions'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Avatar } from '@/components/ui/Avatar'
import { leaderForTeam, teamAgents } from '@/lib/teamUtils'
import { toFa } from '@/lib/format'
import { todayDateKey } from '@/lib/businessDate'
import { cn } from '@/lib/cn'

const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }

export function SupervisorTeamsScreen() {
  const navigate = useNavigate()
  const teams = useStore((s) => s.teams)
  const permissions = useStore((s) => s.permissions)
  const agents = useStore((s) => s.agents)
  const sales = useStore((s) => s.sales)
  const teamReports = useStore((s) => s.teamReports)
  const today = todayDateKey()

  const rows = useMemo(
    () =>
      teams.map((team) => {
        const members = teamAgents(teams, agents, team.id)
        const callsToday = members.reduce((sum, a) => sum + a.callsToday, 0)
        const successfulToday = members.reduce((sum, a) => sum + a.successfulToday, 0)
        const conversion =
          callsToday > 0 ? Math.round((successfulToday / callsToday) * 1000) / 10 : 0
        const pendingSales = sales.filter(
          (s) => s.teamId === team.id && s.status === 'pending_confirmation',
        ).length
        const report = teamReports.find((r) => r.teamId === team.id && r.reportDate === today)
        const leader = leaderForTeam(agents, team.leaderId)

        return {
          team,
          leader,
          members,
          callsToday,
          conversion,
          pendingSales,
          report,
        }
      }),
    [teams, agents, sales, teamReports, today],
  )

  const pendingReports = rows.filter((r) => r.report?.status === 'submitted').length
  const canIntakeLeads =
    hasPermission(permissions, 'leads.manage') ||
    hasPermission(permissions, 'leads.import') ||
    hasPermission(permissions, 'leads.reassign')

  return (
    <Page>
      <ScreenHeader
        sticky
        title="تیم‌ها"
        subtitle="نظارت بر همه تیم‌های فروش"
        icon={Users}
        iconTone="primary"
      />

      <div className="space-y-4 px-4 pb-6 pt-1">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="glass-hero rounded-[24px] p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-text-soft">تیم‌های فعال</p>
              <p className="mt-1 text-[28px] font-black tabular-nums text-text">{toFa(teams.length)}</p>
            </div>
            <span className="glass-inset inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold text-text-muted">
              <Radio size={12} className="text-emerald-500" />
              لایو
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {canIntakeLeads && (
              <button
                type="button"
                onClick={() => navigate('/leads/intake')}
                className="glass-inset col-span-2 flex items-center gap-2 rounded-[16px] border px-3 py-3 text-right"
              >
                <UserPlus size={16} className="shrink-0 text-[#3390EC] dark:text-[#8774E1]" />
                <span className="text-[12px] font-bold text-text">ورود و تقسیم مشتری</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/team-reports')}
              className="glass-inset flex items-center gap-2 rounded-[16px] border px-3 py-3 text-right"
            >
              <FileText size={16} className="shrink-0 text-[#3390EC] dark:text-[#8774E1]" />
              <span className="text-[12px] font-bold text-text">
                گزارش‌ها
                {pendingReports > 0 ? ` (${toFa(pendingReports)})` : ''}
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/sales?status=pending_confirmation')}
              className="glass-inset flex items-center gap-2 rounded-[16px] border px-3 py-3 text-right"
            >
              <Target size={16} className="shrink-0 text-warning-600" />
              <span className="text-[12px] font-bold text-text">تایید فروش</span>
            </button>
          </div>
        </motion.div>

        <div className="space-y-3">
          {rows.map(({ team, leader, members, callsToday, conversion, pendingSales, report }) => (
            <motion.button
              key={team.id}
              type="button"
              whileTap={{ scale: 0.99 }}
              onClick={() => navigate(`/team?teamId=${team.id}`)}
              className="glass-card w-full rounded-[22px] border border-white/55 p-4 text-right dark:border-white/10"
            >
              <div className="flex items-start gap-3">
                {leader ? (
                  <Avatar
                    id={leader.id}
                    first={leader.firstName}
                    last={leader.lastName}
                    src={leader.avatar}
                    size={48}
                    ring
                  />
                ) : (
                  <span className="icon-3d icon-3d-primary flex h-12 w-12 items-center justify-center">
                    <Users size={20} className="text-white" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-text">{team.name}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-text-soft">
                    لیدر: {leader ? `${leader.firstName} ${leader.lastName}` : 'نامشخص'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-bold text-text-muted dark:bg-white/10">
                      {toFa(members.length)} کارشناس
                    </span>
                    {report && (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold',
                          report.status === 'submitted' && 'bg-amber-500/15 text-amber-700',
                          report.status === 'approved' && 'bg-emerald-500/15 text-emerald-700',
                          report.status === 'forwarded_to_manager' && 'bg-primary-500/15 text-primary-700',
                        )}
                      >
                        {report.status === 'submitted'
                          ? 'گزارش جدید'
                          : report.status === 'approved'
                            ? 'تایید شده'
                            : 'ارسال به مدیریت'}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowLeft size={16} className="mt-1 shrink-0 text-text-soft" />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/50 pt-3 dark:border-white/10">
                <div>
                  <p className="flex items-center gap-1 text-[10px] font-semibold text-text-soft">
                    <Phone size={11} />
                    تماس
                  </p>
                  <p className="text-[15px] font-black tabular-nums text-text">{toFa(callsToday)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-text-soft">تبدیل</p>
                  <p className="text-[15px] font-black tabular-nums text-text">{toFa(conversion)}٪</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-text-soft">صف تایید</p>
                  <p className="text-[15px] font-black tabular-nums text-text">{toFa(pendingSales)}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </Page>
  )
}
