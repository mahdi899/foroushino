import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Phone,
  PhoneCall,
  Users,
  Radio,
  ArrowLeft,
  BadgeDollarSign,
  ClipboardList,
  FileText,
  Pencil,
  Crown,
  Shield,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { AgentDetailSheet } from '@/components/domain/AgentDetailSheet'
import { TeamFormSheet } from '@/components/domain/TeamFormSheet'
import { Avatar } from '@/components/ui/Avatar'
import { availabilityLabels, resultLabels } from '@/data/labels'
import { availabilityDotClass } from '@/components/domain/icons'
import {
  agentById,
  getManagedTeam,
  getTeamAgentIds,
  leadById,
  leaderForTeam,
  teamCallsToday,
} from '@/lib/teamUtils'
import { formatDuration, relativeDayTime, toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'
import { isLeaderRole, hasMultiTeamView, isManagerRole } from '@/lib/roles'
import { hasPermission } from '@/lib/permissions'
import { buildTeamStaffOptions, memberIdsForTeam } from '@/lib/teamStaffOptions'
import { updateTeam } from '@/services/teamAdminActions'
import { apiMode } from '@/services'
import { fetchTeamLive, type TeamLiveMember } from '@/services/teamLive'
import { fetchAdminAgents } from '@/services/userAdminActions'
import type { Availability, Call } from '@/types'

const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }

const LIVE_POLL_MS = 10_000

export function TeamLiveScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedTeamId = searchParams.get('teamId')
  const role = useStore((s) => s.role)
  const permissions = useStore((s) => s.permissions)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const agents = useStore((s) => s.agents)
  const teams = useStore((s) => s.teams)
  const leads = useStore((s) => s.leads)
  const calls = useStore((s) => s.calls)
  const sales = useStore((s) => s.sales)
  const activeCallLeadId = useStore((s) => s.activeCallLeadId)
  const availability = useStore((s) => s.availability)

  const [liveMembers, setLiveMembers] = useState<TeamLiveMember[] | null>(null)
  const [liveOnlineCount, setLiveOnlineCount] = useState<number | null>(null)
  const [liveRecentCalls, setLiveRecentCalls] = useState<Call[] | null>(null)
  const [profileAgentId, setProfileAgentId] = useState<string | null>(null)
  const [profileAvailability, setProfileAvailability] = useState<Availability | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [leaderId, setLeaderId] = useState('')
  const [supervisorId, setSupervisorId] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [savingTeam, setSavingTeam] = useState(false)

  const pushToast = useStore((s) => s.pushToast)
  const canManageTeams = hasPermission(permissions, 'teams.manage')
  const canManageRoster = hasPermission(permissions, 'users.manage-team-roster')
  const canEditTeam = canManageTeams || canManageRoster
  const rosterOnlyEdit = canManageRoster && !canManageTeams
  const canAssignSupervisor = canManageTeams && isManagerRole(role)
  const { leaders, members: memberOptions, supervisors } = useMemo(
    () => buildTeamStaffOptions(agents, teams),
    [agents, teams],
  )
  const canViewAgentProfile = hasPermission(permissions, 'users.view')
  const canViewFinance =
    hasPermission(permissions, 'users.view') || hasPermission(permissions, 'users.manage-team')
  const canManageAgents =
    hasPermission(permissions, 'users.manage-team') || hasPermission(permissions, 'users.manage')

  const team = useMemo(() => {
    if (selectedTeamId && hasMultiTeamView(role)) {
      return teams.find((t) => t.id === selectedTeamId) ?? null
    }
    return getManagedTeam(teams, currentAgentId, role)
  }, [selectedTeamId, teams, currentAgentId, role])

  const teamAgentIds = useMemo(() => {
    if (team) return team.agentIds
    return getTeamAgentIds(teams, agents, currentAgentId, role)
  }, [team, teams, agents, currentAgentId, role])

  const refreshTeamLive = useCallback(async () => {
    if (apiMode !== 'http') return

    try {
      const live = await fetchTeamLive(team?.id ?? selectedTeamId)
      setLiveMembers(live.members)
      setLiveOnlineCount(live.onlineCount)
      setLiveRecentCalls(live.recentCalls)
    } catch {
      // Keep last good snapshot; store fallback still renders.
    }
  }, [team?.id, selectedTeamId])

  useEffect(() => {
    if (apiMode !== 'http') return

    void refreshTeamLive()
    const timer = setInterval(() => void refreshTeamLive(), LIVE_POLL_MS)
    return () => clearInterval(timer)
  }, [refreshTeamLive])

  const members = useMemo(() => {
    if (liveMembers) {
      return liveMembers.map((member) => ({
        id: member.agentId,
        firstName: member.firstName,
        lastName: member.lastName,
        avatar: member.avatar,
        callsToday: member.callsToday,
        availability: member.availability,
        activeCallLeadId: member.activeCallLeadId,
        activeCallLeadName: member.activeCallLeadName,
      }))
    }

    return agents
      .filter((agent) => teamAgentIds.includes(agent.id))
      .map((agent) => ({
        id: agent.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        avatar: agent.avatar,
        callsToday: agent.callsToday,
        availability:
          agent.id === currentAgentId
            ? availability
            : agent.callsToday > 0
              ? ('available' as Availability)
              : ('offline' as Availability),
        activeCallLeadId: agent.id === currentAgentId ? activeCallLeadId : null,
        activeCallLeadName: null as string | null,
      }))
  }, [
    liveMembers,
    agents,
    teamAgentIds,
    currentAgentId,
    availability,
    activeCallLeadId,
  ])

  const recentCalls = useMemo(() => {
    if (liveRecentCalls) return liveRecentCalls
    return teamCallsToday(calls, teams, agents, currentAgentId, role).slice(0, 20)
  }, [liveRecentCalls, calls, teams, agents, currentAgentId, role])

  const paymentReviewCount = useMemo(
    () =>
      sales.filter(
        (sale) =>
          sale.status === 'payment_submitted' && teamAgentIds.includes(sale.agentId),
      ).length,
    [sales, teamAgentIds],
  )

  const onlineCount = useMemo(() => {
    if (liveOnlineCount !== null) return liveOnlineCount

    return members.filter((member) => {
      if (member.id === currentAgentId) {
        return availability !== 'offline'
      }
      return member.availability !== 'offline'
    }).length
  }, [liveOnlineCount, members, currentAgentId, availability])

  const canReviewPayments = hasPermission(permissions, 'sales.review-payment')
  const canApproveAgentReports = hasPermission(permissions, 'reports.approve-agent')
  const agentReports = useStore((s) => s.agentReports)
  const pendingAgentReports = useMemo(() => {
    if (!canApproveAgentReports) return 0
    return agentReports.filter(
      (report) => report.status === 'submitted' && teamAgentIds.includes(report.agentId),
    ).length
  }, [agentReports, canApproveAgentReports, teamAgentIds])

  const profileAgent = useMemo(
    () => (profileAgentId ? agents.find((agent) => agent.id === profileAgentId) ?? null : null),
    [agents, profileAgentId],
  )

  const openTeamEdit = () => {
    if (!team) return
    haptic('selection')
    setTeamName(team.name)
    setLeaderId(team.leaderId || '')
    setSupervisorId(team.supervisorId || '')
    setMemberIds(
      team.agentIds.length > 0 ? [...team.agentIds] : memberIdsForTeam(team.id, agents),
    )
    setEditOpen(true)
  }

  const submitTeamEdit = async () => {
    if (!team || !teamName.trim()) {
      pushToast('نام تیم را وارد کن', 'error')
      return
    }

    setSavingTeam(true)
    try {
      await updateTeam(team.id, {
        name: rosterOnlyEdit ? undefined : teamName,
        leaderId: rosterOnlyEdit ? undefined : leaderId || null,
        supervisorId: canAssignSupervisor ? supervisorId || null : undefined,
        agentIds: memberIds,
      })
      pushToast('تیم به‌روز شد', 'success')
      setEditOpen(false)
    } catch {
      pushToast('ویرایش تیم ناموفق بود', 'error')
    } finally {
      setSavingTeam(false)
    }
  }

  const teamLeader = team ? leaderForTeam(agents, team.leaderId) : null
  const leaderLabel =
    team?.leaderName ??
    (teamLeader ? `${teamLeader.firstName} ${teamLeader.lastName}`.trim() : null)
  const supervisorLabel =
    team?.supervisorName ??
    (team?.supervisorId
      ? agents.find((agent) => agent.id === team.supervisorId)
      : null)
  const supervisorName = supervisorLabel
    ? typeof supervisorLabel === 'string'
      ? supervisorLabel
      : `${supervisorLabel.firstName} ${supervisorLabel.lastName}`.trim()
    : null

  const openAgentProfile = (agentId: string, availability: Availability) => {
    haptic('selection')
    setProfileAgentId(agentId)
    setProfileAvailability(availability)
    if (apiMode === 'http' && canViewAgentProfile) {
      void fetchAdminAgents().catch(() => {
        pushToast('بارگذاری پروفایل کارشناس ناموفق بود', 'error')
      })
    }
  }

  return (
    <Page>
      <ScreenHeader
        sticky
        title={team ? team.name : 'تیم من'}
        subtitle={isLeaderRole(role) ? 'نظارت لایو بر کارشناسان' : 'وضعیت لحظه‌ای تیم'}
        icon={Users}
        iconTone="primary"
        action={
          canEditTeam && team ? (
            <button
              type="button"
              onClick={openTeamEdit}
              className="flex items-center gap-1 rounded-full border border-[#3390EC]/25 bg-[#3390EC]/10 px-3 py-2 text-[11px] font-bold text-[#3390EC] dark:border-[#8774E1]/25 dark:bg-[#8774E1]/10 dark:text-[#8774E1]"
            >
              <Pencil size={13} strokeWidth={2.5} />
              {rosterOnlyEdit ? 'کارشناسان' : 'ویرایش'}
            </button>
          ) : undefined
        }
      />

      {team && (leaderLabel || supervisorName) && (
        <div className="mx-4 -mt-1 mb-1 flex flex-wrap gap-2">
          {leaderLabel && (
            <span className="glass-inset inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold text-text-soft">
              <Crown size={11} className="text-amber-600" />
              لیدر: {leaderLabel}
            </span>
          )}
          {supervisorName && (
            <span className="glass-inset inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold text-text-soft">
              <Shield size={11} className="text-[#3390EC] dark:text-[#8774E1]" />
              ناظر: {supervisorName}
            </span>
          )}
        </div>
      )}

      <div className="space-y-5 px-4 pb-6 pt-1">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="glass-hero rounded-[24px] p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-text-soft">کارشناسان فعال امروز</p>
              <p className="mt-1 text-[28px] font-black tabular-nums text-text">
                {toFa(onlineCount)}
                <span className="text-[14px] font-bold text-text-soft"> / {toFa(members.length)}</span>
              </p>
            </div>
            <span className="glass-inset inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold text-text-muted">
              <Radio size={12} className="text-emerald-500" />
              لایو
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => navigate('/leads')}
              className="glass-inset flex items-center gap-2 rounded-[16px] border px-3 py-3 text-right"
            >
              <ClipboardList size={16} className="shrink-0 text-[#3390EC] dark:text-[#8774E1]" />
              <span className="text-[12px] font-bold text-text">بررسی مشتریان</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/activity')}
              className="glass-inset flex items-center gap-2 rounded-[16px] border px-3 py-3 text-right"
            >
              <FileText size={16} className="shrink-0 text-[#3390EC] dark:text-[#8774E1]" />
              <span className="text-[12px] font-bold text-text">فعالیت تیم</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/agent-reports?inbox=1')}
              className="glass-inset flex items-center gap-2 rounded-[16px] border px-3 py-3 text-right"
            >
              <ClipboardList size={16} className="shrink-0 text-warning-600" />
              <span className="text-[12px] font-bold text-text">
                گزارش کارشناسان
                {pendingAgentReports > 0 ? ` (${toFa(pendingAgentReports)})` : ''}
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/sales?status=payment_submitted')}
              className="glass-inset flex items-center gap-2 rounded-[16px] border px-3 py-3 text-right"
            >
              <BadgeDollarSign size={16} className="shrink-0 text-warning-600" />
              <span className="text-[12px] font-bold text-text">
                پرداخت‌ها
                {paymentReviewCount > 0 ? ` (${toFa(paymentReviewCount)})` : ''}
              </span>
            </button>
          </div>
        </motion.div>

        <section>
          <h2 className="mb-3 text-[15px] font-extrabold text-text">کارشناسان تیم</h2>
          <div className="space-y-2.5">
            {members.map((member) => {
              const isSelf = member.id === currentAgentId
              const memberAvailability = isSelf ? availability : member.availability
              const inCallLead = member.activeCallLeadId
                ? leadById(leads, member.activeCallLeadId) ??
                  (member.activeCallLeadName
                    ? {
                        id: member.activeCallLeadId,
                        firstName: member.activeCallLeadName.split(' ')[0] ?? '',
                        lastName: member.activeCallLeadName.split(' ').slice(1).join(' '),
                      }
                    : undefined)
                : undefined

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => openAgentProfile(member.id, memberAvailability)}
                  className="glass-card flex w-full items-center gap-3 rounded-[20px] border border-white/55 p-3.5 text-right transition-transform active:scale-[0.99] dark:border-white/10"
                >
                  <Avatar
                    id={member.id}
                    first={member.firstName}
                    last={member.lastName}
                    src={member.avatar}
                    size={46}
                    ring
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-text">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-text-soft">
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full',
                          availabilityDotClass[memberAvailability],
                        )}
                      />
                      {availabilityLabels[memberAvailability]}
                      {inCallLead ? ` · ${inCallLead.firstName} ${inCallLead.lastName}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-left">
                    <p className="text-[13px] font-black tabular-nums text-text">
                      {toFa(member.callsToday)}
                    </p>
                    <p className="text-[10px] font-semibold text-text-soft">تماس امروز</p>
                  </div>
                  <ArrowLeft size={14} className="shrink-0 text-text-soft" />
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold text-text">
              <PhoneCall size={16} className="text-[#3390EC] dark:text-[#8774E1]" />
              تماس‌های امروز تیم
            </h2>
            <span className="text-[11px] font-bold text-text-soft">{toFa(recentCalls.length)} مورد</span>
          </div>

          {recentCalls.length === 0 ? (
            <div className="glass-inset rounded-[18px] border px-4 py-8 text-center text-[13px] font-semibold text-text-soft">
              هنوز تماسی از تیم ثبت نشده
            </div>
          ) : (
            <div className="space-y-2">
              {recentCalls.map((call) => {
                const liveAgent = liveMembers?.find((member) => member.agentId === call.agentId)
                const agent = agentById(agents, call.agentId)
                const agentLabel = agent
                  ? `${agent.firstName} ${agent.lastName}`
                  : liveAgent
                    ? `${liveAgent.firstName} ${liveAgent.lastName}`
                    : 'کارشناس'
                const lead = leadById(leads, call.leadId)
                return (
                  <button
                    key={call.id}
                    type="button"
                    onClick={() => lead && navigate(`/leads/${lead.id}`)}
                    className="glass-card flex w-full items-center gap-3 rounded-[18px] border border-white/55 p-3.5 text-right dark:border-white/10"
                  >
                    <span className="icon-3d icon-3d-primary flex h-10 w-10 shrink-0 items-center justify-center">
                      <Phone size={16} className="text-white" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-text">
                        {agentLabel}
                        <span className="text-text-soft"> → </span>
                        {lead ? `${lead.firstName} ${lead.lastName}` : 'مشتری'}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] font-semibold text-text-soft">
                        {resultLabels[call.result]} · {formatDuration(call.durationSec)} ·{' '}
                        {relativeDayTime(call.createdAt)}
                      </p>
                    </div>
                    <ArrowLeft size={14} className="shrink-0 text-text-soft" />
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {canReviewPayments && paymentReviewCount > 0 && (
          <button
            type="button"
            onClick={() => navigate('/sales?status=payment_submitted')}
            className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-warning-500 px-4 py-3.5 text-[13px] font-extrabold text-white"
          >
            <BadgeDollarSign size={16} />
            {toFa(paymentReviewCount)} پرداخت منتظر بررسی لیدر
          </button>
        )}
      </div>

      <AgentDetailSheet
        open={!!profileAgent}
        onClose={() => {
          setProfileAgentId(null)
          setProfileAvailability(null)
        }}
        title="پروفایل کارشناس"
        agent={profileAgent}
        teams={teams}
        viewMode
        availability={profileAvailability ?? undefined}
        showFinance={canViewFinance}
        name={profileAgent ? `${profileAgent.firstName} ${profileAgent.lastName}`.trim() : ''}
        phone={profileAgent?.phone ?? ''}
        teamId={profileAgent?.teamId ?? ''}
        canViewBank={canManageAgents}
        pushToast={pushToast}
      />

      <TeamFormSheet
        open={editOpen}
        title={rosterOnlyEdit ? 'انتخاب کارشناسان' : 'ویرایش تیم'}
        name={teamName}
        leaderId={leaderId}
        memberIds={memberIds}
        supervisorId={supervisorId}
        leaderOptions={leaders}
        memberOptions={memberOptions}
        supervisorOptions={supervisors}
        showSupervisorPicker={canAssignSupervisor}
        rosterOnly={rosterOnlyEdit}
        submitLabel="ذخیره تغییرات"
        onName={setTeamName}
        onLeader={setLeaderId}
        onSupervisor={setSupervisorId}
        onMemberIds={setMemberIds}
        onClose={() => setEditOpen(false)}
        onSubmit={() => void submitTeamEdit()}
        busy={savingTeam}
      />
    </Page>
  )
}
