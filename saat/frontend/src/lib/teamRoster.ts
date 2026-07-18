import type { Agent, Team } from '@/types'
import { sortAgentsByDailyPerformance } from '@/lib/dailyTopPerformers'

export interface TeamRosterView {
  supervisor: Agent | null
  leader: Agent | null
  agents: Agent[]
}

function splitDisplayName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') }
}

function staffFromTeamFallback(
  staffId: string | null | undefined,
  staffName: string | null | undefined,
  role: Agent['role'],
  teamId: string,
  agents: Agent[],
): Agent | null {
  if (!staffId) return null
  const found = agents.find((member) => member.id === staffId)
  if (found) return found
  if (!staffName) return null

  const { firstName, lastName } = splitDisplayName(staffName)

  return {
    id: staffId,
    firstName,
    lastName,
    role,
    teamId,
    phone: '',
    agentCode: Number(staffId) || 0,
    level: 1,
    callsToday: 0,
    successfulToday: 0,
    conversionRate: 0,
    points: 0,
    streak: 0,
    callGoal: 0,
  }
}

export function getTeamRosterView(team: Team | null | undefined, agents: Agent[]): TeamRosterView {
  if (!team) {
    return { supervisor: null, leader: null, agents: [] }
  }

  const supervisor = staffFromTeamFallback(
    team.supervisorId,
    team.supervisorName,
    'supervisor',
    team.id,
    agents,
  )

  const leader = staffFromTeamFallback(team.leaderId, team.leaderName, 'leader', team.id, agents)

  const teamAgents = sortAgentsByDailyPerformance(
    agents.filter((member) => member.role === 'agent' && member.teamId === team.id),
  )

  return { supervisor, leader, agents: teamAgents }
}
