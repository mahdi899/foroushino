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
  AgentReport,
  Wallet,
  WalletTransaction,
  WorkDaySummary,
  WorkSession,
  LeadSourceOption,
} from '@/types'
import { fetchMe, mapAuthUserRole, type AuthenticatedUser } from './auth'
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
  mapAgentReport,
  mapWallet,
  mapWalletTransaction,
  mapSale,
  mapLeadFromSaleEmbed,
  mapWorkDaySummary,
  mapWorkSession,
  splitName,
  id,
} from './mappers'
import { syncAllAgentsDailyStats, conversionRateFromStats } from '@/lib/dailyGoal'
import { writeCachedAdminTeams, writeCachedAdminUsers } from '@/services/adminDataCache'
import { todayDateKey } from '@/lib/businessDate'
import { hasMultiTeamView, isAgentRole, isLeaderRole, isManagementRole, isSupervisorRole } from '@/lib/roles'
import { fetchTeamLive, mergeTeamLiveIntoAgents, agentsFromTeamLive, teamsFromTeamLive } from './teamLive'
import { mapProduct } from '@/services/products'

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
  leadSources: LeadSourceOption[]
  notifications: AppNotification[]
  agents: Agent[]
  teams: Team[]
  teamReports: TeamReport[]
  agentReports: AgentReport[]
  activity: ActivityLog[]
  agent: Agent
  role: Role
  permissions: string[]
  availability: Availability
  availabilityChangedAt: string | null
  workSession: WorkSession | null
  workDaySummaries: WorkDaySummary[]
  businessDate: string
  appSettings: RuntimeAppSettings
}

function mapLeadSource(dto: Dto): LeadSourceOption {
  return {
    id: id(dto.id as string | number),
    slug: (dto.slug as string) ?? '',
    label: (dto.label as string) ?? '',
    sortOrder: Number(dto.sort_order ?? dto.sortOrder ?? 0),
    isActive: dto.is_active !== false,
    isSystem: dto.is_system === true,
    showInForm: dto.show_in_form !== false,
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

function teamsFromAuthUser(me: AuthenticatedUser, leaderAgentId: string, agents: Agent[]): Team[] {
  const teamId = id(me.team_id as number)
  return [
    {
      id: teamId,
      name: me.team_name ?? 'تیم من',
      leaderId: leaderAgentId,
      agentIds: agents
        .filter((a) => a.teamId === teamId && a.role === 'agent')
        .map((a) => a.id),
    },
  ]
}

async function fetchShiftData(days = 14): Promise<{ shiftCurrentRaw: Dto; shiftHistoryRaw: Dto[] }> {
  try {
    const [shiftCurrentRaw, shiftHistoryRaw] = await Promise.all([
      http.get<Dto>('/shift/current'),
      http.get<Dto[]>(`/shift/history?days=${days}`),
    ])
    return { shiftCurrentRaw, shiftHistoryRaw }
  } catch {
    return { shiftCurrentRaw: {}, shiftHistoryRaw: [] }
  }
}

let syncInFlight: Promise<SyncPayload> | null = null

async function doSyncAppData(options?: { priorDailyStatsDate?: string | null }): Promise<SyncPayload> {
  const me = await fetchMe()
  const permissions = me.permissions ?? []
  const role = mapAuthUserRole(me.roles)
  const management = isManagementRole(role)
  const canViewTeamActivity =
    management || hasPermission(permissions, 'reports.view-team')
  const canViewAgentReports =
    hasPermission(permissions, 'reports.submit-agent') ||
    hasPermission(permissions, 'reports.approve-agent')
  const leadsPage = management ? 100 : 50
  const callsPage = management ? 100 : 30
  const followupsPage = management ? 100 : 50
  const skipTeamLiveOnSync = hasMultiTeamView(role) && hasPermission(permissions, 'users.view')
  const walletPage = 50
  const fetchWalletBundle = isAgentRole(role)
    ? Promise.all([
        http.get<Dto>('/wallet'),
        http.get<Dto[]>(`/wallet/commissions?per_page=${walletPage}`),
        http.get<Dto[]>(`/wallet/transactions?per_page=${walletPage}`),
        http.get<Dto[]>('/wallet/payout-requests'),
      ])
    : Promise.all([
        safeGet<Dto>('/wallet'),
        safeGet<Dto[]>(`/wallet/commissions?per_page=${walletPage}`),
        safeGet<Dto[]>(`/wallet/transactions?per_page=${walletPage}`),
        safeGet<Dto[]>('/wallet/payout-requests'),
      ])

  const [
    home,
    leadsRaw,
    followupsRaw,
    callsRaw,
    salesRaw,
    [walletDetailRaw, commissionsRaw, walletTxRaw, payoutsRaw],
    productsRaw,
    leadSourcesRaw,
    notificationsRaw,
    appConfigRaw,
    activityRaw,
    adminUsersRaw,
    adminTeamsRaw,
    teamReportsRaw,
    agentReportsRaw,
    shiftData,
  ] = await Promise.all([
    http.get<Dto>('/home/agent'),
    http.get<Dto[]>(`/leads?per_page=${leadsPage}`),
    http.get<Dto[]>(`/followups?per_page=${followupsPage}`),
    safeGet<Dto[]>(`/calls?per_page=${callsPage}`),
    http.get<Dto[]>(`/sales?per_page=${management ? 100 : 40}`),
    fetchWalletBundle,
    http.get<Dto[]>('/products'),
    http.get<Dto[]>('/lead-sources'),
    http.get<Dto[]>('/notifications?per_page=50'),
    http.get<Dto>('/app-config'),
    canViewTeamActivity ? safeGet<Dto[]>('/activity') : Promise.resolve(null),
    hasPermission(permissions, 'users.view') ? safeGet<Dto[]>('/admin/users') : Promise.resolve(null),
    hasPermission(permissions, 'users.view') ? safeGet<Dto[]>('/admin/teams') : Promise.resolve(null),
    hasPermission(permissions, 'reports.view')
      ? safeGet<Dto[]>('/team-reports?per_page=50')
      : Promise.resolve(null),
    canViewAgentReports ? safeGet<Dto[]>('/agent-reports?per_page=50') : Promise.resolve(null),
    fetchShiftData(management ? 30 : 14),
  ])

  const walletRaw = (walletDetailRaw as Dto | null) ?? (home.wallet as Dto) ?? {}

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
    agentCode: Number(me.id),
    level: Number(home.level ?? me.level ?? 1),
    callsToday: Number(target.calls_made ?? 0),
    successfulToday: 0,
    conversionRate: 0,
    points: Number(home.points ?? me.points ?? 0),
    streak: Number(home.streak ?? me.streak ?? 0),
    callGoal: Number(target.call_goal ?? me.call_goal ?? 0),
  }

  const salesDtos = asArray<Dto>(salesRaw)
  const sales = salesDtos.map(mapSale)
  const payments = salesDtos
    .map(mapPaymentFromSale)
    .filter((payment): payment is Payment => payment !== null)

  const mappedLeads = asArray<Dto>(leadsRaw).map(mapLead)
  for (const dto of salesDtos) {
    if (!dto.lead || typeof dto.lead !== 'object') continue
    const embedded = mapLeadFromSaleEmbed(dto.lead as Dto)
    if (embedded && !mappedLeads.some((lead) => lead.id === embedded.id)) {
      mappedLeads.push(embedded)
    }
  }

  const adminUsers = asArray<Dto>(adminUsersRaw).filter((dto) => dto.is_active !== false)
  const calls = asArray<Dto>(callsRaw).map(mapCall)
  const teamLive = !skipTeamLiveOnSync && isManagementRole(role)
    ? await fetchTeamLive(me.team_id ? String(me.team_id) : null)
    : null

  let agents: Agent[]
  if (adminUsers.length > 0) {
    agents = adminUsers.map(mapAgentFromAdmin)
    if (teamLive) agents = mergeTeamLiveIntoAgents(agents, teamLive)
    if (!agents.some((row) => row.id === agent.id)) {
      agents = [agent, ...agents]
    }
  } else if (teamLive) {
    agents = agentsFromTeamLive(teamLive, agent)
  } else {
    agents = [agent]
  }

  const businessDate =
    (home.business_date as string | undefined) ??
    (appConfigRaw.business_date as string | undefined) ??
    todayDateKey()

  if (!isManagementRole(role)) {
    const dailySynced = syncAllAgentsDailyStats(
      [agent],
      calls,
      options?.priorDailyStatsDate ?? null,
    )
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

  let teams: Team[] =
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
        ? teamsFromTeamLive(teamLive, agent.id, me.team_name ?? 'تیم من')
        : []

  if (teams.length === 0 && me.team_id && (isLeaderRole(role) || isSupervisorRole(role))) {
    teams = teamsFromAuthUser(me, agent.id, agents)
  }

  if (adminUsers.length > 0) {
    writeCachedAdminUsers(agents)
  }
  if (asArray<Dto>(adminTeamsRaw).length > 0) {
    writeCachedAdminTeams(teams)
  }

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
    leadSources: asArray<Dto>(leadSourcesRaw).map(mapLeadSource),
    notifications: asArray<Dto>(notificationsRaw).map(mapNotification),
    agents,
    teams,
    teamReports: asArray<Dto>(teamReportsRaw).map(mapTeamReport),
    agentReports: asArray<Dto>(agentReportsRaw).map(mapAgentReport),
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
    businessDate,
  }
}

export async function syncAppData(options?: { priorDailyStatsDate?: string | null }): Promise<SyncPayload> {
  if (syncInFlight) return syncInFlight
  syncInFlight = doSyncAppData(options).finally(() => {
    syncInFlight = null
  })
  return syncInFlight
}

/** Fetches fresh app data without throwing — safe after a successful write. */
export async function trySyncAppData(): Promise<SyncPayload | null> {
  try {
    const { useStore } = await import('@/store/useStore')
    return await syncAppData({ priorDailyStatsDate: useStore.getState().dailyStatsDate })
  } catch {
    return null
  }
}
