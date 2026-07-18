import type { AuthenticatedUser } from '@/services/auth'
import { mapAuthUserRole } from '@/services/auth'
import { splitName } from '@/services/mappers'
import type { Agent } from '@/types'

/** Minimal agent row from auth payload — shown before full sync finishes. */
export function agentFromAuthenticatedUser(user: AuthenticatedUser): Agent {
  const { firstName, lastName } = splitName(user.name)
  const role = mapAuthUserRole(user.roles)

  return {
    id: String(user.id),
    firstName,
    lastName,
    role,
    teamId: user.team_id ? String(user.team_id) : '',
    avatar: user.avatar,
    phone: user.phone ?? user.email,
    agentCode: Number(user.id),
    level: Number(user.level ?? 1),
    callsToday: 0,
    successfulToday: 0,
    conversionRate: 0,
    points: Number(user.points ?? 0),
    streak: Number(user.streak ?? 0),
    callGoal: Number(user.call_goal ?? 0),
  }
}
