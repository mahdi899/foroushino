import type {
  Agent,
  AppNotification,
  Availability,
  Commission,
  Followup,
  Lead,
  Payment,
  PayoutRequest,
  Product,
  Role,
  Sale,
  Wallet,
  WalletTransaction,
  WorkDaySummary,
  WorkSession,
} from '@/types'
import { fetchMe, mapAuthUserRole } from './auth'
import { http } from './http'
import {
  mapCommission,
  mapFollowup,
  mapLead,
  mapPayoutRequest,
  mapWallet,
  mapWalletTransaction,
  mapSale,
  mapWorkDaySummary,
  mapWorkSession,
  splitName,
  id,
} from './mappers'

type Dto = Record<string, unknown>

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export interface SyncPayload {
  leads: Lead[]
  followups: Followup[]
  sales: Sale[]
  payments: Payment[]
  commissions: Commission[]
  wallet: Wallet
  walletTx: WalletTransaction[]
  payouts: PayoutRequest[]
  products: Product[]
  notifications: AppNotification[]
  agent: Agent
  role: Role
  permissions: string[]
  availability: Availability
  availabilityChangedAt: string | null
  workSession: WorkSession | null
  workDaySummaries: WorkDaySummary[]
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
      http.get<Dto[]>('/shift/history?days=366'),
    ])
    return { shiftCurrentRaw, shiftHistoryRaw }
  } catch {
    // Shift endpoints must not block the rest of the app (e.g. pending migration).
    return { shiftCurrentRaw: {}, shiftHistoryRaw: [] }
  }
}

export async function syncAppData(): Promise<SyncPayload> {
  const [
    [
      me,
      home,
      leadsRaw,
      followupsRaw,
      salesRaw,
      walletRaw,
      walletTxRaw,
      commissionsRaw,
      payoutsRaw,
      productsRaw,
      notificationsRaw,
    ],
    { shiftCurrentRaw, shiftHistoryRaw },
  ] = await Promise.all([
    Promise.all([
      fetchMe(),
      http.get<Dto>('/home/agent'),
      // Backend validates per_page max=100 on /leads (IndexLeadRequest).
      http.get<Dto[]>('/leads?per_page=100'),
      http.get<Dto[]>('/followups?per_page=100'),
      http.get<Dto[]>('/sales?per_page=100'),
      http.get<Dto>('/wallet'),
      http.get<Dto[]>('/wallet/transactions?per_page=100'),
      http.get<Dto[]>('/wallet/commissions?per_page=100'),
      http.get<Dto[]>('/wallet/payout-requests?per_page=50'),
      http.get<Dto[]>('/products'),
      http.get<Dto[]>('/notifications?per_page=50'),
    ]),
    fetchShiftData(),
  ])

  const target = (home.target as Dto) ?? {}
  const { firstName, lastName } = splitName(me.name)

  const agent: Agent = {
    id: String(me.id),
    firstName,
    lastName,
    role: mapAuthUserRole(me.roles),
    teamId: me.team_id ? String(me.team_id) : '',
    avatar: me.avatar,
    phone: me.phone ?? me.email,
    level: Number(home.level ?? me.level ?? 1),
    callsToday: Number(target.calls_made ?? 0),
    successfulToday: Number(target.sales_made ?? 0),
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

  return {
    leads: mappedLeads,
    followups: asArray<Dto>(followupsRaw).map(mapFollowup),
    sales,
    payments,
    commissions: asArray<Dto>(commissionsRaw).map(mapCommission),
    wallet: mapWallet(walletRaw),
    walletTx: asArray<Dto>(walletTxRaw).map(mapWalletTransaction),
    payouts: asArray<Dto>(payoutsRaw).map(mapPayoutRequest),
    products: asArray<Dto>(productsRaw).map(mapProduct),
    notifications: asArray<Dto>(notificationsRaw).map(mapNotification),
    agent,
    role: mapAuthUserRole(me.roles),
    permissions: me.permissions ?? [],
    availability: ((shiftCurrentRaw.availability as Availability) ?? (home.availability as Availability) ?? me.availability ?? 'offline') as Availability,
    availabilityChangedAt: (shiftCurrentRaw.availability_changed_at as string) ?? null,
    workSession: mapWorkSession(shiftCurrentRaw.session as Dto | null | undefined),
    workDaySummaries: asArray<Dto>(shiftHistoryRaw).map(mapWorkDaySummary),
  }
}
