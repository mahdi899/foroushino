import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users,
  Radio,
  ArrowLeft,
  Phone,
  Target,
  FileText,
  UserPlus,
  Plus,
  Shield,
  Crown,
} from 'lucide-react'
import { hasPermission } from '@/lib/permissions'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { TeamFormSheet } from '@/components/domain/TeamFormSheet'
import { Avatar } from '@/components/ui/Avatar'
import { buildTeamStaffOptions } from '@/lib/teamStaffOptions'
import { buildTeamHierarchyRows, groupTeamsBySupervisor } from '@/lib/teamHierarchy'
import { toFa } from '@/lib/format'
import { todayDateKey } from '@/lib/businessDate'
import { haptic } from '@/lib/telegram'
import { createTeam } from '@/services/teamAdminActions'
import { isManagerRole } from '@/lib/roles'
import { cn } from '@/lib/cn'
import type { TeamHierarchyRow } from '@/lib/teamHierarchy'

const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }

function TeamCard({
  row,
  onOpenTeam,
}: {
  row: TeamHierarchyRow
  onOpenTeam: (teamId: string) => void
}) {
  const { team, leader, members, callsToday, conversion, pendingSales, report } = row

  return (
    <div className="glass-card overflow-hidden rounded-[20px] border border-white/55 dark:border-white/10">
      <motion.button
        type="button"
        whileTap={{ scale: 0.99 }}
        onClick={() => onOpenTeam(team.id)}
        className="w-full p-4 text-right"
      >
        <div className="flex items-start gap-3">
          {leader ? (
            <Avatar
              id={leader.id}
              first={leader.firstName}
              last={leader.lastName}
              src={leader.avatar}
              size={44}
              ring
            />
          ) : (
            <span className="icon-3d icon-3d-primary flex h-11 w-11 items-center justify-center">
              <Crown size={18} className="text-white" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-text">{team.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-text-soft">
              <Crown size={11} />
              سرتیم: {leader ? `${leader.firstName} ${leader.lastName}` : 'نامشخص'}
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

      {members.length > 0 && (
        <div className="border-t border-white/50 px-3 py-2 dark:border-white/10">
          <p className="mb-1.5 px-1 text-[10px] font-extrabold text-text-soft">کارشناسان</p>
          <div className="space-y-1">
            {members.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center gap-2 rounded-[12px] bg-black/[0.03] px-2.5 py-2 dark:bg-white/[0.04]"
              >
                <Avatar
                  id={agent.id}
                  first={agent.firstName}
                  last={agent.lastName}
                  src={agent.avatar}
                  size={30}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-bold text-text">
                    {agent.firstName} {agent.lastName}
                  </p>
                </div>
                <div className="shrink-0 text-left">
                  <p className="text-[12px] font-black tabular-nums text-text">{toFa(agent.callsToday)}</p>
                  <p className="text-[9px] font-semibold text-text-soft">تماس</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function SupervisorTeamsScreen() {
  const navigate = useNavigate()
  const role = useStore((s) => s.role)
  const teams = useStore((s) => s.teams)
  const permissions = useStore((s) => s.permissions)
  const agents = useStore((s) => s.agents)
  const sales = useStore((s) => s.sales)
  const teamReports = useStore((s) => s.teamReports)
  const pushToast = useStore((s) => s.pushToast)
  const today = todayDateKey()

  const [createOpen, setCreateOpen] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [leaderId, setLeaderId] = useState('')
  const [supervisorId, setSupervisorId] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const canManageTeams = hasPermission(permissions, 'teams.manage')
  const canAssignSupervisor = hasPermission(permissions, 'users.manage') && isManagerRole(role)
  const { leaders, members, supervisors } = useMemo(
    () => buildTeamStaffOptions(agents, teams),
    [agents, teams],
  )

  const hierarchy = useMemo(() => {
    const rows = buildTeamHierarchyRows(teams, agents, sales, teamReports, today)
    return groupTeamsBySupervisor(rows, agents)
  }, [teams, agents, sales, teamReports, today])

  const pendingReports = useMemo(
    () => teamReports.filter((r) => r.status === 'submitted' && r.reportDate === today).length,
    [teamReports, today],
  )

  const canIntakeLeads =
    hasPermission(permissions, 'leads.manage') ||
    hasPermission(permissions, 'leads.import') ||
    hasPermission(permissions, 'leads.reassign')

  const openCreate = () => {
    setTeamName('')
    setLeaderId('')
    setSupervisorId(supervisors[0]?.id ?? '')
    setMemberIds([])
    setCreateOpen(true)
  }

  const submitCreate = async () => {
    if (!teamName.trim()) {
      pushToast('نام تیم را وارد کن', 'error')
      return
    }

    setCreating(true)
    try {
      await createTeam({
        name: teamName,
        leaderId: leaderId || undefined,
        supervisorId: canAssignSupervisor && supervisorId ? supervisorId : undefined,
        agentIds: memberIds,
      })
      pushToast('تیم ایجاد شد', 'success')
      setCreateOpen(false)
    } catch {
      pushToast('ایجاد تیم ناموفق بود', 'error')
    } finally {
      setCreating(false)
    }
  }

  const totalAgents = hierarchy.reduce((sum, group) => sum + group.agentCount, 0)

  return (
    <Page>
      <ScreenHeader
        sticky
        title="تیم‌ها"
        subtitle="نظارت بر همه تیم‌های فروش"
        icon={Users}
        iconTone="primary"
        action={
          canManageTeams ? (
            <button
              type="button"
              onClick={() => {
                haptic('selection')
                openCreate()
              }}
              className="flex items-center gap-1 rounded-full bg-[#3390EC] px-3 py-2 text-[11px] font-bold text-white dark:bg-[#8774E1]"
            >
              <Plus size={13} strokeWidth={2.5} />
              افزودن تیم
            </button>
          ) : undefined
        }
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
              <p className="mt-0.5 text-[10px] font-semibold text-text-soft">
                {toFa(hierarchy.length)} ناظر · {toFa(totalAgents)} کارشناس
              </p>
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
            {canManageTeams && (
              <button
                type="button"
                onClick={() => {
                  haptic('selection')
                  openCreate()
                }}
                className="glass-inset col-span-2 flex items-center gap-2 rounded-[16px] border px-3 py-3 text-right"
              >
                <Plus size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[12px] font-bold text-text">افزودن تیم جدید</span>
              </button>
            )}
            {canAssignSupervisor && (
              <button
                type="button"
                onClick={() => navigate('/admin/staff')}
                className="glass-inset col-span-2 flex items-center gap-2 rounded-[16px] border px-3 py-3 text-right"
              >
                <Shield size={16} className="shrink-0 text-[#3390EC] dark:text-[#8774E1]" />
                <span className="text-[12px] font-bold text-text">مدیریت ناظران و سرتیم‌ها</span>
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

        {hierarchy.length === 0 ? (
          <div className="glass-card rounded-[22px] border border-white/55 p-6 text-center dark:border-white/10">
            <span className="icon-3d icon-3d-primary mx-auto flex h-12 w-12 items-center justify-center rounded-[14px]">
              <Users size={20} className="text-white" />
            </span>
            <p className="mt-3 text-[14px] font-bold text-text">هنوز تیمی ثبت نشده</p>
            <p className="mt-1 text-[12px] font-semibold text-text-soft">
              برای شروع، اولین تیم فروش را ایجاد کنید.
            </p>
            {canManageTeams && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#3390EC] px-4 py-2.5 text-[12px] font-bold text-white dark:bg-[#8774E1]"
              >
                <Plus size={14} />
                افزودن تیم
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {hierarchy.map((group) => (
              <section key={group.supervisorId ?? 'unassigned'}>
                <div className="mb-2 flex items-center gap-2.5 px-1">
                  {group.supervisor ? (
                    <Avatar
                      id={group.supervisor.id}
                      first={group.supervisor.firstName}
                      last={group.supervisor.lastName}
                      src={group.supervisor.avatar}
                      size={36}
                      ring
                    />
                  ) : (
                    <span className="icon-3d icon-3d-primary flex h-9 w-9 items-center justify-center">
                      <Shield size={16} className="text-white" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-extrabold text-text">{group.supervisorName}</p>
                    <p className="text-[10px] font-semibold text-text-soft">
                      {toFa(group.teamCount)} تیم · {toFa(group.agentCount)} کارشناس
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pr-1">
                  {group.teams
                    .sort((a, b) => a.team.name.localeCompare(b.team.name, 'fa'))
                    .map((row) => (
                      <TeamCard
                        key={row.team.id}
                        row={row}
                        onOpenTeam={(teamId) => navigate(`/team?teamId=${teamId}`)}
                      />
                    ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <TeamFormSheet
        open={createOpen}
        title="افزودن تیم"
        name={teamName}
        leaderId={leaderId}
        supervisorId={supervisorId}
        memberIds={memberIds}
        leaderOptions={leaders}
        memberOptions={members}
        supervisorOptions={supervisors}
        showSupervisorPicker={canAssignSupervisor}
        onName={setTeamName}
        onLeader={setLeaderId}
        onSupervisor={setSupervisorId}
        onMemberIds={setMemberIds}
        onClose={() => setCreateOpen(false)}
        onSubmit={() => void submitCreate()}
        busy={creating}
      />
    </Page>
  )
}
