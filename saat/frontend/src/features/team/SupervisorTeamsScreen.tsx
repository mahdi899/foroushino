import { useMemo, useState, memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users,
  Radio,
  Phone,
  Target,
  FileText,
  UserPlus,
  Plus,
  Shield,
  Crown,
  Pencil,
  ChevronLeft,
} from 'lucide-react'
import { hasPermission } from '@/lib/permissions'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { TeamFormSheet } from '@/components/domain/TeamFormSheet'
import { SupervisorTeamsSheet } from '@/components/domain/SupervisorTeamsSheet'
import { Avatar } from '@/components/ui/Avatar'
import { buildTeamStaffOptions, memberIdsForTeam } from '@/lib/teamStaffOptions'
import { buildTeamHierarchyRows, buildSupervisorHierarchyList, sortTeamHierarchyRows } from '@/lib/teamHierarchy'
import { AGENTS_PER_TEAM, TEAMS_PER_SUPERVISOR } from '@/lib/teamCapacity'
import { apiErrorMessage } from '@/lib/apiErrors'
import { toFa } from '@/lib/format'
import { todayDateKey } from '@/lib/businessDate'
import { haptic } from '@/lib/telegram'
import {
  assignSupervisorTeams,
  createTeam,
  updateTeam,
} from '@/services/teamAdminActions'
import { isManagerRole } from '@/lib/roles'
import { cn } from '@/lib/cn'
import type { Team } from '@/types'
import type { TeamHierarchyRow } from '@/lib/teamHierarchy'

const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }

type DrillView = 'supervisors' | 'teams' | 'agents'

const TeamSummaryRow = memo(function TeamSummaryRow({
  row,
  onOpen,
  onEdit,
  canEdit,
}: {
  row: TeamHierarchyRow
  onOpen: () => void
  onEdit?: () => void
  canEdit?: boolean
}) {
  const { team, leader, members, callsToday, conversion, pendingSales, report } = row

  return (
    <div className="glass-card overflow-hidden rounded-[20px] border border-white/55 dark:border-white/10">
      <button type="button" onClick={onOpen} className="w-full p-4 text-right">
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
                {toFa(members.length)} / {toFa(team.agentsCapacity ?? AGENTS_PER_TEAM)} کارشناس
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
          <ChevronLeft size={16} className="mt-1 shrink-0 text-text-soft" />
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
      </button>

      {canEdit && onEdit && (
        <div className="border-t border-white/50 px-3 py-2 dark:border-white/10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-[12px] bg-black/[0.04] py-2 text-[11px] font-bold text-text dark:bg-white/[0.06]"
          >
            <Pencil size={13} />
            ویرایش تیم
          </button>
        </div>
      )}
    </div>
  )
})

export function SupervisorTeamsScreen() {
  const navigate = useNavigate()
  const role = useStore((s) => s.role)
  const teams = useStore((s) => s.teams)
  const permissions = useStore((s) => s.permissions)
  const agents = useStore((s) => s.agents)
  const sales = useStore((s) => s.sales)
  const pendingSales = useMemo(
    () => sales.filter((sale) => sale.status === 'pending_confirmation'),
    [sales],
  )
  const teamReports = useStore((s) => s.teamReports)
  const pushToast = useStore((s) => s.pushToast)
  const today = todayDateKey()

  const [view, setView] = useState<DrillView>('supervisors')
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [editTeam, setEditTeam] = useState<Team | null>(null)
  const [editSupervisorId, setEditSupervisorId] = useState<string | null>(null)
  const [supervisorTeamIds, setSupervisorTeamIds] = useState<string[]>([])

  const [teamName, setTeamName] = useState('')
  const [leaderId, setLeaderId] = useState('')
  const [supervisorId, setSupervisorId] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const canManageTeams = hasPermission(permissions, 'teams.manage')
  const canAssignSupervisor = hasPermission(permissions, 'users.manage') && isManagerRole(role)
  const { leaders, members, supervisors } = useMemo(
    () => buildTeamStaffOptions(agents, teams),
    [agents, teams],
  )

  const supervisorAgents = useMemo(
    () => agents.filter((agent) => agent.role === 'supervisor'),
    [agents],
  )

  const hierarchy = useMemo(() => {
    const rows = buildTeamHierarchyRows(teams, agents, pendingSales, teamReports, today)
    return buildSupervisorHierarchyList(supervisorAgents, rows, agents)
  }, [teams, agents, pendingSales, teamReports, today, supervisorAgents])

  const selectedGroup = useMemo(
    () => hierarchy.find((group) => group.supervisorId === selectedSupervisorId) ?? null,
    [hierarchy, selectedSupervisorId],
  )

  const selectedTeamRow = useMemo(() => {
    if (!selectedTeamId) return null
    return selectedGroup?.teams.find((row) => row.team.id === selectedTeamId) ?? null
  }, [selectedGroup, selectedTeamId])

  const pendingReports = useMemo(
    () => teamReports.filter((r) => r.status === 'submitted' && r.reportDate === today).length,
    [teamReports, today],
  )

  const canIntakeLeads =
    hasPermission(permissions, 'leads.manage') ||
    hasPermission(permissions, 'leads.import') ||
    hasPermission(permissions, 'leads.reassign')

  const totalAgents = hierarchy.reduce((sum, group) => sum + group.agentCount, 0)
  const supervisorCount = supervisorAgents.length

  const openCreate = () => {
    setEditTeam(null)
    setTeamName('')
    setLeaderId('')
    setSupervisorId(selectedSupervisorId ?? supervisors[0]?.id ?? '')
    setMemberIds([])
    setCreateOpen(true)
  }

  const openTeamEdit = useCallback((team: Team) => {
    setCreateOpen(false)
    setEditTeam(team)
    setTeamName(team.name)
    setLeaderId(team.leaderId || '')
    setSupervisorId(team.supervisorId || selectedSupervisorId || '')
    setMemberIds(
      team.agentIds.length > 0 ? [...team.agentIds] : memberIdsForTeam(team.id, agents),
    )
  }, [agents, selectedSupervisorId])

  const openSupervisorEdit = (supervisorIdValue: string) => {
    const assigned = teams.filter((team) => team.supervisorId === supervisorIdValue).map((team) => team.id)
    setEditSupervisorId(supervisorIdValue)
    setSupervisorTeamIds(assigned)
  }

  const submitCreate = async () => {
    if (!teamName.trim()) {
      pushToast('نام تیم را وارد کن', 'error')
      return
    }

    setBusy(true)
    try {
      await createTeam({
        name: teamName,
        leaderId: leaderId || undefined,
        supervisorId: canAssignSupervisor && supervisorId ? supervisorId : undefined,
        agentIds: memberIds,
      })
      pushToast('تیم ایجاد شد', 'success')
      setCreateOpen(false)
    } catch (error) {
      pushToast(apiErrorMessage(error, 'ایجاد تیم ناموفق بود'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const submitTeamEdit = async () => {
    if (!editTeam || !teamName.trim()) return
    setBusy(true)
    try {
      await updateTeam(editTeam.id, {
        name: teamName,
        leaderId: leaderId || null,
        supervisorId: canAssignSupervisor ? supervisorId || null : undefined,
        agentIds: memberIds,
      })
      pushToast('تیم به‌روز شد', 'success')
      setEditTeam(null)
    } catch (error) {
      pushToast(apiErrorMessage(error, 'ویرایش تیم ناموفق بود'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const submitSupervisorTeams = async () => {
    if (!editSupervisorId) return
    if (supervisorTeamIds.length > TEAMS_PER_SUPERVISOR) {
      pushToast(`هر ناظر حداکثر ${toFa(TEAMS_PER_SUPERVISOR)} تیم می‌تواند داشته باشد`, 'error')
      return
    }

    setBusy(true)
    try {
      await assignSupervisorTeams(editSupervisorId, supervisorTeamIds)
      pushToast('تیم‌های ناظر به‌روز شد', 'success')
      setEditSupervisorId(null)
    } catch (error) {
      pushToast(apiErrorMessage(error, 'ذخیره تیم‌های ناظر ناموفق بود'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const goBack = () => {
    if (view === 'agents') {
      setView('teams')
      setSelectedTeamId(null)
      return
    }
    if (view === 'teams') {
      setView('supervisors')
      setSelectedSupervisorId(null)
    }
  }

  const headerTitle =
    view === 'agents'
      ? selectedTeamRow?.team.name ?? 'کارشناسان تیم'
      : view === 'teams'
        ? selectedGroup?.supervisorName ?? 'تیم‌ها'
        : 'تیم‌ها'

  const headerSubtitle =
    view === 'agents'
      ? `${toFa(selectedTeamRow?.members.length ?? 0)} کارشناس`
      : view === 'teams'
        ? `${toFa(selectedGroup?.teamCount ?? 0)} تیم · ${toFa(selectedGroup?.agentCount ?? 0)} کارشناس`
        : 'نظارت بر همه تیم‌های فروش'

  const editingSupervisor = editSupervisorId
    ? agents.find((agent) => agent.id === editSupervisorId)
    : null

  const formProps = {
    name: teamName,
    leaderId,
    memberIds,
    supervisorId,
    leaderOptions: leaders,
    memberOptions: members,
    supervisorOptions: supervisors,
    showSupervisorPicker: canAssignSupervisor,
    membersCapacity: AGENTS_PER_TEAM,
    onName: setTeamName,
    onLeader: setLeaderId,
    onSupervisor: setSupervisorId,
    onMemberIds: setMemberIds,
    busy,
  }

  return (
    <Page>
      <ScreenHeader
        sticky
        showBack={view !== 'supervisors'}
        onBack={view !== 'supervisors' ? goBack : undefined}
        title={headerTitle}
        subtitle={headerSubtitle}
        icon={Users}
        iconTone="primary"
        action={
          canManageTeams && view !== 'agents' ? (
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
        {view === 'supervisors' && (
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
                  {toFa(supervisorCount)} ناظر · {toFa(totalAgents)} کارشناس
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
        )}

        {view === 'supervisors' && (
          <>
            {hierarchy.length === 0 ? (
              <div className="glass-card rounded-[22px] border border-white/55 p-6 text-center dark:border-white/10">
                <span className="icon-3d icon-3d-primary mx-auto flex h-12 w-12 items-center justify-center rounded-[14px]">
                  <Users size={20} className="text-white" />
                </span>
                <p className="mt-3 text-[14px] font-bold text-text">هنوز ناظر یا تیمی ثبت نشده</p>
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
              <div className="space-y-2">
                {hierarchy.map((group) => (
                  <div
                    key={group.supervisorId ?? 'unassigned'}
                    className="glass-card overflow-hidden rounded-[20px] border border-white/55 dark:border-white/10"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (group.supervisorId) {
                          setSelectedSupervisorId(group.supervisorId)
                          setView('teams')
                        }
                      }}
                      disabled={!group.supervisorId}
                      className="flex w-full items-center gap-3 p-4 text-right disabled:opacity-80"
                    >
                      {group.supervisor ? (
                        <Avatar
                          id={group.supervisor.id}
                          first={group.supervisor.firstName}
                          last={group.supervisor.lastName}
                          src={group.supervisor.avatar}
                          size={46}
                          ring
                        />
                      ) : (
                        <span className="icon-3d icon-3d-primary flex h-11 w-11 items-center justify-center">
                          <Shield size={18} className="text-white" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-extrabold text-text">{group.supervisorName}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-text-soft">
                          {toFa(group.teamCount)} / {toFa(TEAMS_PER_SUPERVISOR)} تیم · {toFa(group.agentCount)}{' '}
                          کارشناس
                        </p>
                      </div>
                      {group.supervisorId ? <ChevronLeft size={16} className="shrink-0 text-text-soft" /> : null}
                    </button>

                    {canAssignSupervisor && group.supervisorId && (
                      <div className="border-t border-white/50 px-3 py-2 dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => openSupervisorEdit(group.supervisorId!)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-[12px] bg-black/[0.04] py-2 text-[11px] font-bold text-text dark:bg-white/[0.06]"
                        >
                          <Pencil size={13} />
                          ویرایش تیم‌های ناظر
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {view === 'teams' && selectedGroup && (
          <div className="space-y-3">
            {selectedGroup.teams.length === 0 ? (
              <div className="glass-card rounded-[20px] border border-dashed border-white/55 p-6 text-center dark:border-white/10">
                <p className="text-[13px] font-bold text-text">تیمی برای این ناظر ثبت نشده</p>
                {canManageTeams && (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#3390EC] px-4 py-2 text-[12px] font-bold text-white dark:bg-[#8774E1]"
                  >
                    <Plus size={14} />
                    افزودن تیم
                  </button>
                )}
              </div>
            ) : (
              sortTeamHierarchyRows(selectedGroup.teams).map((row) => (
                <TeamSummaryRow
                  key={row.team.id}
                  row={row}
                  canEdit={canManageTeams}
                  onOpen={() => {
                    setSelectedTeamId(row.team.id)
                    setView('agents')
                  }}
                  onEdit={() => openTeamEdit(row.team)}
                />
              ))
            )}
          </div>
        )}

        {view === 'agents' && selectedTeamRow && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="text-[11px] font-bold text-text-soft">
                کارشناسان ({toFa(selectedTeamRow.members.length)} / {toFa(AGENTS_PER_TEAM)})
              </p>
              <button
                type="button"
                onClick={() => navigate(`/team?teamId=${selectedTeamRow.team.id}`)}
                className="text-[11px] font-bold text-[#3390EC] dark:text-[#8774E1]"
              >
                نمای لایو
              </button>
            </div>

            {selectedTeamRow.members.length === 0 ? (
              <div className="glass-card rounded-[20px] border border-dashed border-white/55 p-6 text-center dark:border-white/10">
                <p className="text-[13px] font-semibold text-text-soft">هنوز کارشناسی در این تیم نیست</p>
                {canManageTeams && (
                  <button
                    type="button"
                    onClick={() => openTeamEdit(selectedTeamRow.team)}
                    className="mt-3 text-[12px] font-bold text-[#3390EC] dark:text-[#8774E1]"
                  >
                    افزودن کارشناس
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                {selectedTeamRow.members.map((agent) => (
                  <div
                    key={agent.id}
                    className="glass-card flex items-center gap-3 rounded-[16px] border border-white/55 px-3 py-2.5 dark:border-white/10"
                  >
                    <Avatar
                      id={agent.id}
                      first={agent.firstName}
                      last={agent.lastName}
                      src={agent.avatar}
                      size={36}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-text">
                        {agent.firstName} {agent.lastName}
                      </p>
                    </div>
                    <div className="shrink-0 text-left">
                      <p className="text-[13px] font-black tabular-nums text-text">{toFa(agent.callsToday)}</p>
                      <p className="text-[9px] font-semibold text-text-soft">تماس</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {canManageTeams && (
              <button
                type="button"
                onClick={() => openTeamEdit(selectedTeamRow.team)}
                className="glass-inset flex w-full items-center justify-center gap-1.5 rounded-[16px] border px-3 py-3 text-[12px] font-bold text-text"
              >
                <Pencil size={14} />
                ویرایش تیم و کارشناسان
              </button>
            )}
          </div>
        )}
      </div>

      <TeamFormSheet
        open={createOpen}
        title="افزودن تیم"
        submitLabel="ایجاد تیم"
        {...formProps}
        onClose={() => setCreateOpen(false)}
        onSubmit={() => void submitCreate()}
      />

      <TeamFormSheet
        open={!!editTeam}
        title="ویرایش تیم"
        submitLabel="ذخیره تغییرات"
        {...formProps}
        onClose={() => setEditTeam(null)}
        onSubmit={() => void submitTeamEdit()}
      />

      <SupervisorTeamsSheet
        open={!!editSupervisorId}
        editingSupervisorId={editSupervisorId}
        supervisorName={
          editingSupervisor
            ? `${editingSupervisor.firstName} ${editingSupervisor.lastName}`.trim()
            : 'ناظر'
        }
        teams={teams}
        selectedTeamIds={supervisorTeamIds}
        capacity={TEAMS_PER_SUPERVISOR}
        onChange={setSupervisorTeamIds}
        onClose={() => setEditSupervisorId(null)}
        onSubmit={() => void submitSupervisorTeams()}
        busy={busy}
      />
    </Page>
  )
}
