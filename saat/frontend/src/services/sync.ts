import type {
  ActivityLog,
  Agent,
  AppNotification,
  Availability,
  Call,
  Commission,
  Followup,
  Lead,
  Payment,
  PayoutRequest,
  Product,
  Role,
  Sale,
  Team,
  TeamReport,
  Wallet,
  WalletTransaction,
  WorkDaySummary,
  WorkSession,
} from '@/types'
import { fetchMe, mapAuthUserRole } from './auth'
import { http } from './http'
import {
  mapRuntimeAppSettings,
  type RuntimeAppSettings,
} from '@/lib/appSettings'
import { hasPermission } from '@/lib/permissions'
import {
  mapActivity,
  mapAgentFromAdmin,
  mapCall,
  mapCommission,
  mapFollowup,
  mapLead,
  mapPayoutRequest,
  mapTeamFromAdmin,
  mapTeamReport,
  mapWallet,
  mapWalletTransaction,
  mapSale,
  mapWorkDaySummary,
  mapWorkSession,
  splitName,
  id,
} from './mappers'
import { syncAllAgentsDailyStats, conversionRateFromStats } from '@/lib/dailyGoal'
import { isManagementRole } from '@/lib/roles'
import { fetchTeamLive, mergeTeamLiveIntoAgents, agentsFromTeamLive, teamsFromTeamLive } from './teamLive'

type Dto = Record<string, unknown>

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

async function safeGet<T>(path: string): Promise<T | null> {
  try {
    return await http.get<T>(path)
  } catch {
    return null
  }
}

export interface SyncPayload {
  leads: Lead[]
  followups: Followup[]
  calls: Call[]
  sales: Sale[]
  payments: Payment[]
  commissions: Commission[]
  wallet: Wallet
  walletTx: WalletTransaction[]
  payouts: PayoutRequest[]
  products: Product[]
  notifications: AppNotification[]
  agents: Agent[]
  teams: Team[]
  teamReports: TeamReport[]
  activity: ActivityLog[]
  agent: Agent
  role: Role
  permissions: string[]
  availability: Availability
  availabilityChangedAt: string | null
  workSession: WorkSession | null
  workDaySummaries: WorkDaySummary[]
  appSettings: RuntimeAppSettings
}

function mapProduct(dto: Dto): Product {
  return {
    id: id(dto.id as string | number),
    name: (dto.name as string) ?? '',
    price: Number(dto.price ?? 0),
    category: (dto.category as string) ?? '',
    commissionRate: Number(dto.commission_rate ?? dto.commissionRate ?? 0),
    isActive: dto.is_active !== false,
  }
}

function mapNotification(dto: Dto): AppNotification {
  return {
    id: id(dto.id as string | number),
    title: (dto.title as string) ?? '',
    body: (dto.body as string) ?? (dto.message as string) ?? '',
    kind: (dto.kind as AppNotification['kind']) ?? 'system',
    read: !!(dto.read ?? dto.is_read),
    createdAt: (dto.created_at as string) ?? new Date().toISOString(),
    href: (dto.href as string) ?? undefined,
  }
}

function mapPaymentFromSale(dto: Dto): Payment | null {
  if (!dto.payment_method && !dto.reference_number) return null
  return {
    id: id(dto.id as string | number),
    saleId: id(dto.id as string | number),
    amount: Number(dto.amount ?? 0),
    method: (dto.payment_method as Payment['method']) ?? 'card',
    referenceNumber: (dto.reference_number as string) ?? '',
    submittedAt: (dto.submitted_at as string) ?? new Date().toISOString(),
    status: (dto.payment_status as Payment['status']) ?? 'submitted',
  }
}

async function fetchShiftData(): Promise<{ shiftCurrentRaw: Dto; shiftHistoryRaw: Dto[] }> {
  try {
    const [shiftCurrentRaw, shiftHistoryRaw] = await Promise.all([
      http.get<Dto>('/shift/current'),
      http.get<Dto[]>('/shift/history?days=90'),
    ])
    return { shiftCurrentRaw, shiftHistoryRaw }
  } catch {
    return { shiftCurrentRaw: {}, shiftHistoryRaw: [] }
  }
}

export async function syncAppData(): Promise<SyncPayload> {
  const me = await fetchMe()
  const permissions = me.permissions ?? []

  const [
    home,
    leadsRaw,
    followupsRaw,
    callsRaw,
    salesRaw,
    walletRaw,
    walletTxRaw,
    commissionsRaw,
    payoutsRaw,
    productsRaw,
    notificationsRaw,
    appConfigRaw,
    activityRaw,
    adminUsersRaw,
    adminTeamsRaw,
    teamReportsRaw,
    shiftData,
  ] = await Promise.all([
    http.get<Dto>('/home/agent'),
    http.get<Dto[]>('/leads?per_page=100'),
    http.get<Dto[]>('/followups?per_page=100'),
    safeGet<Dto[]>('/calls?per_page=100'),
    http.get<Dto[]>('/sales?per_page=100'),
    http.get<Dto>('/wallet'),
    http.get<Dto[]>('/wallet/transactions?per_page=100'),
    http.get<Dto[]>('/wallet/commissions?per_page=100'),
    http.get<Dto[]>('/wallet/payout-requests?per_page=50'),
    http.get<Dto[]>('/products'),
    http.get<Dto[]>('/notifications?per_page=50'),
    http.get<Dto>('/app-config'),
    safeGet<Dto[]>('/activity'),
    hasPermission(permissions, 'users.view') ? safeGet<Dto[]>('/admin/users') : Promise.resolve(null),
    hasPermission(permissions, 'users.view') ? safeGet<Dto[]>('/admin/teams') : Promise.resolve(null),
    hasPermission(permissions, 'reports.view-team') || hasPermission(permissions, 'reports.view-all')
      ? safeGet<Dto[]>('/team-reports')
      : Promise.resolve(null),
    fetchShiftData(),
  ])

  const target = (home.target as Dto) ?? {}
  const { firstName, lastName } = splitName(me.name)

  let agent: Agent = {
    id: String(me.id),
    firstName,
    lastName,
    role: mapAuthUserRole(me.roles),
    teamId: me.team_id ? String(me.team_id) : '',
    avatar: me.avatar,
    phone: me.phone ?? me.email,
    level: Number(home.level ?? me.level ?? 1),
    callsToday: Number(target.calls_made ?? 0),
    successfulToday: 0,
    conversionRate: 0,
    points: Number(home.points ?? me.points ?? 0),
    streak: Number(home.streak ?? me.streak ?? 0),
    callGoal: Number(target.call_goal ?? me.call_goal ?? 0),
  }

  const sales = asArray<Dto>(salesRaw).map(mapSale)
  const payments = asArray<Dto>(salesRaw)
    .map(mapPaymentFromSale)
    .filter((payment): payment is Payment => payment !== null)

  const mappedLeads = asArray<Dto>(leadsRaw).map(mapLead)
  const suggestedRaw = home.suggested_lead as Dto | null | undefined
  if (suggestedRaw && typeof suggestedRaw === 'object') {
    const suggested = mapLead(suggestedRaw)
    if (!mappedLeads.some((l) => l.id === suggested.id)) {
      mappedLeads.unshift(suggested)
    }
  }

  const adminUsers = asArray<Dto>(adminUsersRaw)
  const calls = asArray<Dto>(callsRaw).map(mapCall)
  const role = mapAuthUserRole(me.roles)
  const teamLive = isManagementRole(role)
    ? await fetchTeamLive(me.team_id ? String(me.team_id) : null)
    : null

  let agents: Agent[]
  if (adminUsers.length > 0) {
    agents = adminUsers.map(mapAgentFromAdmin)
    if (teamLive) agents = mergeTeamLiveIntoAgents(agents, teamLive)
  } else if (teamLive) {
    agents = agentsFromTeamLive(teamLive, agent)
  } else {
    agents = [agent]
  }

  if (!isManagementRole(role)) {
    const dailySynced = syncAllAgentsDailyStats([agent], calls, null)
    agent = {
      ...dailySynced.agents[0],
      points: agent.points,
      streak: agent.streak,
      level: agent.level,
      callGoal: agent.callGoal,
      conversionRate: conversionRateFromStats(
        dailySynced.agents[0].callsToday,
        dailySynced.agents[0].successfulToday,
      ),
    }
    agents = [agent]
  }

  const teams: Team[] =
    asArray<Dto>(adminTeamsRaw).length > 0
      ? asArray<Dto>(adminTeamsRaw).map((team) =>
          mapTeamFromAdmin(
            team,
            agents
              .filter((a) => a.teamId === id(team.id as string | number) && a.role === 'agent')
              .map((a) => a.id),
          ),
        )
      : teamLive
        ? teamsFromTeamLive(teamLive, agent.id)
        : []

  return {
    leads: mappedLeads,
    followups: asArray<Dto>(followupsRaw).map(mapFollowup),
    calls,
    sales,
    payments,
    commissions: asArray<Dto>(commissionsRaw).map(mapCommission),
    wallet: mapWallet(walletRaw),
    walletTx: asArray<Dto>(walletTxRaw).map(mapWalletTransaction),
    payouts: asArray<Dto>(payoutsRaw).map(mapPayoutRequest),
    products: asArray<Dto>(productsRaw).map(mapProduct),
    notifications: asArray<Dto>(notificationsRaw).map(mapNotification),
    agents,
    teams,
    teamReports: asArray<Dto>(teamReportsRaw).map(mapTeamReport),
    activity: asArray<Dto>(activityRaw).map(mapActivity),
    agent,
    role,
    permissions,
    availability: ((shiftData.shiftCurrentRaw.availability as Availability) ??
      (home.availability as Availability) ??
      me.availability ??
      'offline') as Availability,
    availabilityChangedAt: (shiftData.shiftCurrentRaw.availability_changed_at as string) ?? null,
    workSession: mapWorkSession(shiftData.shiftCurrentRaw.session as Dto | null | undefined),
    workDaySummaries: asArray<Dto>(shiftData.shiftHistoryRaw).map(mapWorkDaySummary),
    appSettings: mapRuntimeAppSettings(appConfigRaw),
  }
}
