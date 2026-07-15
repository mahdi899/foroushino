import type { Agent, Team } from '@/types'
import { avatarUrl } from './avatars'

export const AGENTS_PER_TEAM = 15

const TEAM_DEFS = [
  { id: 't1', name: 'تیم آلفا', leaderId: 'a-leader' },
  { id: 't2', name: 'تیم بتا', leaderId: 'a-leader2' },
  { id: 't3', name: 'تیم گاما', leaderId: 'a-leader3' },
] as const

const FIRST_NAMES = [
  'سارا', 'نگار', 'امیر', 'رضا', 'حامد', 'مریم', 'علی', 'زهرا', 'محمد',
  'فاطمه', 'پارسا', 'نرگس', 'کیان', 'الهام', 'بهرام',
]
const LAST_NAMES = [
  'احمدی', 'حسینی', 'محمدی', 'کریمی', 'رحیمی', 'نوری', 'صادقی', 'اکبری',
  'جعفری', 'موسوی', 'قربانی', 'زارع', 'ملکی', 'فرهادی', 'امینی',
]

export function buildMockTeamsAndAgents(): { teams: Team[]; agents: Agent[] } {
  const teams: Team[] = TEAM_DEFS.map((team) => ({
    id: team.id,
    name: team.name,
    leaderId: team.leaderId,
    agentIds: [],
  }))
  const agents: Agent[] = []
  let phone = 912_000_0001

  for (const team of teams) {
    for (let slot = 0; slot < AGENTS_PER_TEAM; slot++) {
      const id = team.id === 't1' && slot === 0 ? 'a-me' : `${team.id}-a${slot + 1}`
      const firstName =
        team.id === 't1' && slot === 0 ? 'سارا' : FIRST_NAMES[slot % FIRST_NAMES.length]
      const lastName =
        team.id === 't1' && slot === 0
          ? 'احمدی'
          : LAST_NAMES[(slot + team.id.charCodeAt(1)) % LAST_NAMES.length]

      team.agentIds.push(id)
      agents.push({
        id,
        firstName,
        lastName,
        role: 'agent',
        teamId: team.id,
        phone: String(phone++),
        level: 2 + (slot % 4),
        callsToday: 8 + (slot % 10),
        successfulToday: 3 + (slot % 6),
        conversionRate: 18 + (slot % 15),
        points: 900 + slot * 80,
        streak: slot % 8,
        callGoal: 25,
        avatar: avatarUrl(id),
      })
    }
  }

  return { teams, agents }
}

export const mockStaffAgents: Agent[] = [
  {
    id: 'a-leader',
    firstName: 'بهنام',
    lastName: 'رستمی',
    role: 'leader',
    teamId: 't1',
    phone: '09120001001',
    level: 6,
    callsToday: 0,
    successfulToday: 0,
    conversionRate: 27,
    points: 4200,
    streak: 12,
    callGoal: 0,
    avatar: avatarUrl('a-leader'),
  },
  {
    id: 'a-leader2',
    firstName: 'مینا',
    lastName: 'شریفی',
    role: 'leader',
    teamId: 't2',
    phone: '09120001002',
    level: 5,
    callsToday: 0,
    successfulToday: 0,
    conversionRate: 25,
    points: 3900,
    streak: 9,
    callGoal: 0,
    avatar: avatarUrl('a-leader2'),
  },
  {
    id: 'a-leader3',
    firstName: 'آرمان',
    lastName: 'یزدی',
    role: 'leader',
    teamId: 't3',
    phone: '09120001003',
    level: 5,
    callsToday: 0,
    successfulToday: 0,
    conversionRate: 24,
    points: 3600,
    streak: 7,
    callGoal: 0,
    avatar: avatarUrl('a-leader3'),
  },
  {
    id: 'a-sup',
    firstName: 'فرزانه',
    lastName: 'مرادی',
    role: 'supervisor',
    teamId: 't1',
    phone: '09120001011',
    level: 7,
    callsToday: 0,
    successfulToday: 0,
    conversionRate: 25,
    points: 5100,
    streak: 18,
    callGoal: 0,
    avatar: avatarUrl('a-sup'),
  },
  {
    id: 'a-mgr',
    firstName: 'کاوه',
    lastName: 'تهرانی',
    role: 'manager',
    teamId: 't1',
    phone: '09120001012',
    level: 9,
    callsToday: 0,
    successfulToday: 0,
    conversionRate: 24,
    points: 8200,
    streak: 30,
    callGoal: 0,
    avatar: avatarUrl('a-mgr'),
  },
]
