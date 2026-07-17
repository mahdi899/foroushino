import { useMemo, useState } from 'react'
import { Users, Crown, Shield } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { hasPermission } from '@/lib/permissions'
import { isManagerRole } from '@/lib/roles'
import { toFa } from '@/lib/format'
import { createTeam, updateTeam } from '@/services/teamAdminActions'
import { TeamFormSheet } from '@/components/domain/TeamFormSheet'
import { buildTeamStaffOptions, memberIdsForTeam } from '@/lib/teamStaffOptions'
import { groupTeamsBySupervisor } from '@/lib/teamHierarchy'
import { teamAgents } from '@/lib/teamUtils'
import type { Team } from '@/types'

export function TeamManagementScreen() {
  const permissions = useStore((s) => s.permissions)
  const role = useStore((s) => s.role)
  const teams = useStore((s) => s.teams)
  const agents = useStore((s) => s.agents)
  const pushToast = useStore((s) => s.pushToast)

  const canManage = hasPermission(permissions, 'teams.manage')
  const canAssignSupervisor = canManage && isManagerRole(role)
  const { leaders, members, supervisors } = useMemo(
    () => buildTeamStaffOptions(agents, teams),
    [agents, teams],
  )

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Team | null>(null)
  const [name, setName] = useState('')
  const [leaderId, setLeaderId] = useState('')
  const [supervisorId, setSupervisorId] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  if (!canManage) return null

  const openCreate = () => {
    setName('')
    setLeaderId('')
    setSupervisorId(supervisors[0]?.id ?? '')
    setMemberIds([])
    setCreateOpen(true)
  }

  const openEdit = (team: Team) => {
    setEditTarget(team)
    setName(team.name)
    setLeaderId(team.leaderId || '')
    setSupervisorId(team.supervisorId || '')
    setMemberIds(
      team.agentIds.length > 0 ? [...team.agentIds] : memberIdsForTeam(team.id, agents),
    )
  }

  const submitCreate = async () => {
    if (!name.trim()) {
      pushToast('نام تیم را وارد کن', 'error')
      return
    }
    setBusy(true)
    try {
      await createTeam({
        name,
        leaderId: leaderId || undefined,
        supervisorId: canAssignSupervisor && supervisorId ? supervisorId : undefined,
        agentIds: memberIds,
      })
      pushToast('تیم ایجاد شد')
      setCreateOpen(false)
    } catch {
      pushToast('ایجاد تیم ناموفق بود', 'error')
    } finally {
      setBusy(false)
    }
  }

  const submitEdit = async () => {
    if (!editTarget || !name.trim()) return
    setBusy(true)
    try {
      await updateTeam(editTarget.id, {
        name,
        leaderId: leaderId || null,
        supervisorId: canAssignSupervisor ? supervisorId || null : undefined,
        agentIds: memberIds,
      })
      pushToast('تیم به‌روز شد')
      setEditTarget(null)
    } catch {
      pushToast('ویرایش تیم ناموفق بود', 'error')
    } finally {
      setBusy(false)
    }
  }

  const hierarchy = useMemo(() => {
    const rows = teams.map((team) => ({
      team,
      leader: agents.find((agent) => agent.id === team.leaderId) ?? null,
      members: teamAgents(teams, agents, team.id),
      callsToday: 0,
      conversion: 0,
      pendingSales: 0,
    }))
    return groupTeamsBySupervisor(rows, agents)
  }, [teams, agents])

  const formProps = {
    name,
    leaderId,
    memberIds,
    supervisorId,
    leaderOptions: leaders,
    memberOptions: members,
    supervisorOptions: supervisors,
    showSupervisorPicker: canAssignSupervisor,
    onName: setName,
    onLeader: setLeaderId,
    onSupervisor: setSupervisorId,
    onMemberIds: setMemberIds,
    busy,
  }

  return (
    <Page withNav={false}>
      <ScreenHeader
        sticky
        showBack
        title="مدیریت تیم‌ها"
        subtitle="ناظر، سرتیم و کارشناسان"
        icon={Users}
        iconTone="primary"
        action={
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-[#3390EC] px-3 py-2 text-[11px] font-bold text-white dark:bg-[#8774E1]"
          >
            افزودن
          </button>
        }
      />

      <div className="space-y-5 px-4 pb-24 pt-3">
        {hierarchy.map((group) => (
          <section key={group.supervisorId ?? 'unassigned'}>
            <div className="mb-2 flex items-center gap-2 px-1">
              <Shield size={14} className="shrink-0 text-[#3390EC] dark:text-[#8774E1]" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold text-text">{group.supervisorName}</p>
                <p className="text-[10px] font-semibold text-text-soft">
                  {toFa(group.teamCount)} تیم · {toFa(group.agentCount)} کارشناس
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {group.teams
                .sort((a, b) => a.team.name.localeCompare(b.team.name, 'fa'))
                .map(({ team }) => {
                  const leaderAgent = agents.find((agent) => agent.id === team.leaderId)
                  const leader =
                    team.leaderName ??
                    (leaderAgent ? `${leaderAgent.firstName} ${leaderAgent.lastName}`.trim() : null)
                  const teamMembers = teamAgents(teams, agents, team.id)
                  const agentCount = team.agentsCount ?? team.agentIds.length
                  const capacity = team.agentsCapacity ?? 15

                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => openEdit(team)}
                      className="glass-card flex w-full items-center gap-3 rounded-[20px] border border-white/55 p-3.5 text-right dark:border-white/10"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#3390EC]/12 text-[#3390EC] dark:bg-[#8774E1]/15 dark:text-[#8774E1]">
                        <Users size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold text-text">{team.name}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-text-soft">
                          <Crown size={11} />
                          {leader ? `سرتیم: ${leader}` : 'بدون سرتیم'}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold text-text-muted">
                          {toFa(agentCount)} / {toFa(capacity)} کارشناس
                          {teamMembers.length > 0
                            ? ` · ${teamMembers
                                .slice(0, 3)
                                .map((agent) => agent.firstName)
                                .join('، ')}${teamMembers.length > 3 ? '…' : ''}`
                            : ''}
                        </p>
                      </div>
                    </button>
                  )
                })}
            </div>
          </section>
        ))}
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
        open={!!editTarget}
        title="ویرایش تیم"
        submitLabel="ذخیره تغییرات"
        {...formProps}
        onClose={() => setEditTarget(null)}
        onSubmit={() => void submitEdit()}
      />
    </Page>
  )
}
