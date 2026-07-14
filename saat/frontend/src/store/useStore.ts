import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ActivityLog,
  Agent,
  AppNotification,
  Availability,
  AvailabilityAutoReason,
  Call,
  Commission,
  Followup,
  Lead,
  LeadStatus,
  Payment,
  PaymentMethod,
  PayoutRequest,
  Product,
  Role,
  Sale,
  SaleStage,
  Team,
  TeamReport,
  Temperature,
  Wallet,
  WalletTransaction,
  WorkDaySummary,
  WorkSession,
} from '@/types'
import type { CallMethod } from '@/lib/call'
import type { AuthenticatedUser } from '@/services/auth'
import { clearToken, mapAuthUserRole } from '@/services/auth'
import { agentFromAuthenticatedUser } from '@/lib/agentFromUser'
import { hasPermission as checkPermission, resolvePermissions } from '@/lib/permissions'
import { canMakeCalls } from '@/lib/roles'
import {
  agents as mockAgents,
  followups as mockFollowups,
  leads as mockLeads,
  notifications as mockNotifications,
  teams as mockTeams,
  MY_AGENT_ID,
} from '@/data/mock'
import {
  activityLogs as mockActivity,
  commissions as mockCommissions,
  payments as mockPayments,
  payoutRequests as mockPayouts,
  products as mockProducts,
  PRODUCT_ID,
  sales as mockSales,
  teamReports as mockTeamReports,
  wallet as mockWallet,
  walletTransactions as mockWalletTx,
} from '@/data/mockExtra'
import { avatarUrl } from '@/data/avatars'
import { positiveResults, nextActionLabels } from '@/data/labels'
import {
  computeCommission,
  routeCallResult,
  stageToStatus,
  uid,
  type Suggestion,
} from '@/services/logic'
import { getSuggestionAfter } from '@/lib/leadUtils'
import type { CallResultInput, CallResultOutcome, FollowupInput } from '@/services/client'
import {
  calculateBankFee,
  payoutNetAmount,
  validatePayoutAmount,
} from '@/lib/payoutRules'
import type { SyncPayload } from '@/services/sync'
import type { TeamLiveData } from '@/services/teamLive'
import { agentsFromTeamLive, mergeTeamLiveIntoAgents, teamsFromTeamLive } from '@/services/teamLive'
import { isProductiveAvailability, mergeClosedSessionIntoDaySummaries } from '@/lib/shiftUtils'
import { getManagedTeam } from '@/lib/teamUtils'
import { mergeAgentDailyStats, syncAllAgentsDailyStats, syncCurrentAgentDailyStats, conversionRateFromStats } from '@/lib/dailyGoal'
import {
  DEFAULT_RUNTIME_APP_SETTINGS,
  type RuntimeAppSettings,
} from '@/lib/appSettings'

const usesRemoteData = import.meta.env.VITE_API_MODE === 'http'

export interface Toast {
  id: string
  message: string
  tone: 'success' | 'info' | 'error'
}

interface AppState {
  // session
  isAuthed: boolean
  phone: string
  role: Role
  permissions: string[]
  currentAgentId: string

  // shift & availability
  availability: Availability
  availabilityChangedAt: string | null
  availabilityAutoReason: AvailabilityAutoReason | null
  workSession: WorkSession | null
  workDaySummaries: WorkDaySummary[]
  dailyStatsDate: string | null

  // domain data
  agents: Agent[]
  teams: Team[]
  leads: Lead[]
  calls: Call[]
  followups: Followup[]
  notifications: AppNotification[]
  sales: Sale[]
  payments: Payment[]
  commissions: Commission[]
  wallet: Wallet
  walletTx: WalletTransaction[]
  payouts: PayoutRequest[]
  products: Product[]
  activity: ActivityLog[]
  teamReports: TeamReport[]

  // runtime config from management
  appSettings: RuntimeAppSettings
  powerDialEnabled: boolean
  dispositionMode: 'grid' | 'swipe'

  // transient call context
  activeCallLeadId: string | null
  activeCallMethod: CallMethod | null
  activeCallDraftNote: string
  lastCallDuration: number
  lastOutcome: CallResultOutcome | null

  // ui
  toasts: Toast[]
  darkMode: boolean
  callMethodLead: Lead | null

  // security & privacy
  maskPhoneNumbers: boolean
  autoLockEnabled: boolean
  autoLockMinutes: number
  isLocked: boolean

  // remote data sync (http mode)
  dataReady: boolean
  dataSyncing: boolean

  // session actions
  login: (phone: string) => void
  setSessionFromAuth: (user: AuthenticatedUser) => void
  hasPermission: (permission: string) => boolean
  logout: () => void

  // shift actions
  startShift: (initialAvailability?: Availability) => void
  endShift: () => void
  setAvailability: (
    status: Availability,
    options?: { source?: 'manual' | 'auto'; autoReason?: AvailabilityAutoReason | null },
  ) => void
  applyShiftState: (payload: {
    workSession: WorkSession | null
    availability: Availability
    availabilityChangedAt: string | null
    availabilityAutoReason?: AvailabilityAutoReason | null
    workDaySummaries?: WorkDaySummary[]
  }) => void
  syncDailyAgentStats: () => void

  // lead ownership / lock
  lockLead: (leadId: string) => { ok: boolean; lockedByOther?: boolean }
  releaseLead: (leadId: string) => void
  returnLeadToPool: (leadId: string) => void
  reclaimLead: (leadId: string) => void
  updateLeadStage: (leadId: string, stage: SaleStage) => void
  updateLeadTemperature: (leadId: string, temp: Temperature) => void
  updateLeadNote: (leadId: string, note: string) => void
  setActiveCallDraftNote: (note: string) => void
  addLead: (input: { firstName: string; lastName?: string; phone: string; city?: string }) => void
  distributeLeadsToTeams: () => number

  // call actions
  startCall: (leadId: string, method?: CallMethod) => void
  endCall: (durationSec: number) => void
  submitCallResult: (input: CallResultInput) => CallResultOutcome

  // followups
  completeFollowup: (id: string) => void
  createFollowup: (input: FollowupInput) => Followup
  snoozeFollowup: (id: string, dueAt: string) => void

  // sales & payments
  submitPayment: (saleId: string, method: PaymentMethod, reference: string) => void
  forwardSaleForConfirmation: (saleId: string) => void
  confirmSale: (saleId: string) => void
  rejectSale: (saleId: string, reason: string) => void
  cancelSale: (saleId: string) => void
  releaseCommission: (commissionId: string) => void

  // team reports
  submitTeamReport: (leaderNotes?: string) => void
  approveTeamReport: (reportId: string, supervisorNotes?: string) => void
  forwardTeamReport: (reportId: string) => void

  // wallet
  requestPayout: (amount: number) => { ok: boolean; message?: string }

  // notifications
  markAllRead: () => void
  pushNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void

  // ui
  toggleDarkMode: () => void
  pushToast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void
  openCallMethodSheet: (lead: Lead) => void
  closeCallMethodSheet: () => void

  // security & privacy
  setMaskPhoneNumbers: (on: boolean) => void
  setAutoLock: (enabled: boolean, minutes?: number) => void
  lockApp: () => void
  unlockApp: () => void

  // sync
  applySyncData: (payload: SyncPayload) => void
  mergeTeamLiveStats: (live: TeamLiveData) => void
  setAppSettings: (settings: RuntimeAppSettings) => void
  setPowerDialEnabled: (enabled: boolean) => void
  setDispositionMode: (mode: 'grid' | 'swipe') => void
  upsertLead: (lead: Lead) => void
  setAgentAvatar: (avatar: string | null) => void
  setDataReady: (ready: boolean) => void
  setDataSyncing: (syncing: boolean) => void
}

function syncFollowupStatuses(followups: Followup[]): Followup[] {
  const now = Date.now()
  return followups.map((f) => {
    if (f.status === 'done' || f.status === 'cancelled') return f
    return {
      ...f,
      status: new Date(f.dueAt).getTime() < now ? 'overdue' : 'pending',
    }
  })
}

function withAvatars<T extends { id: string; avatar?: string | null }>(
  items: T[],
  mockItems: T[],
): T[] {
  return items.map((item) => {
    const mock = mockItems.find((m) => m.id === item.id)
    return {
      ...item,
      avatar: item.avatar || mock?.avatar || avatarUrl(item.id),
    }
  })
}

// Demo seed: one lead pre-locked by a teammate, one returned to the pool —
// so the ownership/lock/return flows are visible on first run without any
// agent interaction. Applied only while a field is still `undefined`
// (never touched), so agent actions (release/reclaim) persist afterwards.
const DEMO_LOCKED_LEAD_ID = 'l9'
const DEMO_LOCK_AGENT_ID = 'a2'
const DEMO_RETURNED_LEAD_ID = 'l31'

function hydrateLeads(leads: Lead[]): Lead[] {
  return leads.map((l) => {
    const isDemoLocked = l.id === DEMO_LOCKED_LEAD_ID && l.lockedBy === undefined
    const isDemoReturned = l.id === DEMO_RETURNED_LEAD_ID && l.returnedToPool === undefined
    const status: LeadStatus =
      l.status ?? (isDemoLocked ? 'locked' : isDemoReturned ? 'returned_to_pool' : stageToStatus(l))
    return {
      ...l,
      ownerId: l.ownerId ?? l.assignedAgentId,
      status,
      lockedBy: isDemoLocked ? DEMO_LOCK_AGENT_ID : (l.lockedBy ?? null),
      lockedUntil: isDemoLocked ? new Date(Date.now() + 8 * 60_000).toISOString() : (l.lockedUntil ?? null),
      doNotCall: l.doNotCall ?? false,
      returnedToPool: isDemoReturned ? true : (l.returnedToPool ?? false),
      productId: l.productId ?? PRODUCT_ID,
      statusHistory: l.statusHistory ?? [
        {
          id: uid('lh'),
          status,
          at: l.lastCallAt ?? new Date().toISOString(),
          byAgentId: l.assignedAgentId,
          note: isDemoReturned ? 'سه تلاش بی‌پاسخ؛ برگشت خودکار به صف عمومی' : undefined,
        },
      ],
    }
  })
}

function pushStatus(lead: Lead, status: LeadStatus, byAgentId: string, note?: string): Lead {
  if (lead.status === status) return { ...lead, status }
  const event = { id: uid('lh'), status, at: new Date().toISOString(), byAgentId, note }
  return { ...lead, status, statusHistory: [event, ...(lead.statusHistory ?? [])] }
}

function flushAvailabilitySegment(
  state: Pick<AppState, 'availability' | 'availabilityChangedAt' | 'workSession'>,
  nowMs: number,
): Partial<Pick<AppState, 'workSession' | 'availabilityChangedAt'>> {
  if (!state.workSession?.startedAt || state.workSession.endedAt) {
    return {}
  }

  const elapsed = state.availabilityChangedAt
    ? Math.max(0, Math.floor((nowMs - new Date(state.availabilityChangedAt).getTime()) / 1000))
    : 0

  if (elapsed === 0) {
    return { availabilityChangedAt: new Date(nowMs).toISOString() }
  }

  if (isProductiveAvailability(state.availability)) {
    return {
      workSession: {
        ...state.workSession,
        totalProductiveSeconds: (state.workSession.totalProductiveSeconds ?? 0) + elapsed,
      },
      availabilityChangedAt: new Date(nowMs).toISOString(),
    }
  }

  if (state.availability !== 'offline') {
    return {
      workSession: {
        ...state.workSession,
        totalBreakSeconds: state.workSession.totalBreakSeconds + elapsed,
      },
      availabilityChangedAt: new Date(nowMs).toISOString(),
    }
  }

  return { availabilityChangedAt: new Date(nowMs).toISOString() }
}

const AGENT_MAP: Record<Role, string> = {
  agent: 'a-me',
  leader: 'a-leader',
  supervisor: 'a-sup',
  manager: 'a-mgr',
  admin: 'a-mgr',
}

type PersistedSlice = Pick<
  AppState,
  | 'isAuthed'
  | 'phone'
  | 'role'
  | 'currentAgentId'
  | 'availability'
  | 'availabilityChangedAt'
  | 'workSession'
  | 'workDaySummaries'
  | 'dailyStatsDate'
  | 'leads'
  | 'calls'
  | 'followups'
  | 'notifications'
  | 'sales'
  | 'payments'
  | 'commissions'
  | 'wallet'
  | 'walletTx'
  | 'payouts'
  | 'products'
  | 'activity'
  | 'agents'
  | 'darkMode'
>

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthed: false,
      phone: '',
      role: 'agent',
      permissions: [],
      currentAgentId: MY_AGENT_ID,

      availability: 'offline',
      availabilityChangedAt: null,
      availabilityAutoReason: null,
      workSession: null,
      workDaySummaries: [],
      dailyStatsDate: null,

      agents: mockAgents,
      teams: mockTeams,
      leads: hydrateLeads(mockLeads),
      calls: [],
      followups: syncFollowupStatuses(mockFollowups),
      notifications: mockNotifications,
      sales: mockSales,
      payments: mockPayments,
      commissions: mockCommissions,
      wallet: mockWallet,
      walletTx: mockWalletTx,
      payouts: mockPayouts,
      products: mockProducts,
      activity: mockActivity,
      teamReports: mockTeamReports,
      appSettings: DEFAULT_RUNTIME_APP_SETTINGS,
      powerDialEnabled: false,
      dispositionMode: 'grid',

      activeCallLeadId: null,
      activeCallMethod: null,
      activeCallDraftNote: '',
      lastCallDuration: 0,
      lastOutcome: null,

      toasts: [],
      darkMode: false,
      callMethodLead: null,

      maskPhoneNumbers: true,
      autoLockEnabled: true,
      autoLockMinutes: 5,
      isLocked: false,

      dataReady: !usesRemoteData,
      dataSyncing: false,

      login: (phone) => set({ isAuthed: true, phone }),
      setSessionFromAuth: (user) => {
        const role = mapAuthUserRole(user.roles)
        const next: Partial<AppState> = {
          isAuthed: true,
          phone: user.phone ?? user.email,
          role,
          permissions: resolvePermissions(role, user.permissions ?? []),
          currentAgentId: usesRemoteData ? String(user.id) : AGENT_MAP[role],
          dataReady: !usesRemoteData,
        }

        if (usesRemoteData) {
          const self = agentFromAuthenticatedUser(user)
          next.agents = [self]
          next.sales = []
          next.payments = []
          next.leads = []
          next.products = []
        }

        set(next)
      },
      hasPermission: (permission) => checkPermission(get().permissions, permission),
      logout: () => {
        clearToken()
        set({
          isAuthed: false,
          phone: '',
          availability: 'offline',
          availabilityChangedAt: null,
          availabilityAutoReason: null,
          role: 'agent',
          permissions: [],
          currentAgentId: AGENT_MAP.agent,
          workSession: null,
          workDaySummaries: [],
          isLocked: false,
          dataReady: !usesRemoteData,
          dataSyncing: false,
        })
      },

      startShift: (initialAvailability = 'available') => {
        const now = new Date().toISOString()
        set({
          availability: initialAvailability,
          availabilityChangedAt: now,
          availabilityAutoReason: null,
          workSession: {
            startedAt: now,
            endedAt: null,
            totalBreakSeconds: 0,
            totalCallSeconds: 0,
            totalProductiveSeconds: 0,
          },
        })
      },
      endShift: () =>
        set((state) => {
          const nowMs = Date.now()
          const flushed = flushAvailabilitySegment(state, nowMs)
          const session = flushed.workSession ?? state.workSession
          const closedSession = session
            ? { ...session, endedAt: new Date(nowMs).toISOString() }
            : null

          return {
            ...flushed,
            availability: 'offline',
            availabilityChangedAt: new Date(nowMs).toISOString(),
            availabilityAutoReason: null,
            workSession: null,
            workDaySummaries: closedSession
              ? mergeClosedSessionIntoDaySummaries(state.workDaySummaries, closedSession)
              : state.workDaySummaries,
          }
        }),
      setAvailability: (status, options) =>
        set((state) => {
          const nowMs = Date.now()
          const flushed = flushAvailabilitySegment(state, nowMs)
          const autoReason =
            options?.source === 'manual'
              ? null
              : options?.autoReason !== undefined
                ? options.autoReason
                : state.availabilityAutoReason

          return {
            ...flushed,
            availability: status,
            availabilityChangedAt: new Date(nowMs).toISOString(),
            availabilityAutoReason: autoReason,
          }
        }),
      applyShiftState: (payload) =>
        set({
          workSession: payload.workSession,
          availability: payload.availability,
          availabilityChangedAt: payload.availabilityChangedAt,
          availabilityAutoReason: payload.availabilityAutoReason ?? null,
          ...(payload.workDaySummaries ? { workDaySummaries: payload.workDaySummaries } : {}),
        }),
      syncDailyAgentStats: () =>
        set((state) => {
          const synced = syncCurrentAgentDailyStats(
            state.agents,
            state.calls,
            state.currentAgentId,
            state.dailyStatsDate,
          )
          return { agents: synced.agents, dailyStatsDate: synced.dailyStatsDate }
        }),

      lockLead: (leadId) => {
        const state = get()
        const lead = state.leads.find((l) => l.id === leadId)
        if (!lead) return { ok: false }
        if (lead.lockedBy && lead.lockedBy !== state.currentAgentId) {
          return { ok: false, lockedByOther: true }
        }
        const until = new Date(Date.now() + state.appSettings.callLockMinutes * 60_000).toISOString()
        set({
          leads: state.leads.map((l) =>
            l.id === leadId
              ? pushStatus({ ...l, lockedBy: state.currentAgentId, lockedUntil: until }, 'locked', state.currentAgentId)
              : l,
          ),
        })
        return { ok: true }
      },

      releaseLead: (leadId) =>
        set((state) => ({
          leads: state.leads.map((l) =>
            l.id === leadId ? { ...l, lockedBy: null, lockedUntil: null } : l,
          ),
        })),

      returnLeadToPool: (leadId) =>
        set((state) => ({
          leads: state.leads.map((l) =>
            l.id === leadId
              ? pushStatus(
                  { ...l, lockedBy: null, lockedUntil: null, returnedToPool: true, assignedAgentId: '' },
                  'returned_to_pool',
                  state.currentAgentId,
                )
              : l,
          ),
        })),

      reclaimLead: (leadId) =>
        set((state) => ({
          leads: state.leads.map((l) =>
            l.id === leadId
              ? pushStatus(
                  {
                    ...l,
                    returnedToPool: false,
                    assignedAgentId: state.currentAgentId,
                    ownerId: state.currentAgentId,
                  },
                  'assigned',
                  state.currentAgentId,
                  'بازپس‌گیری از صف عمومی',
                )
              : l,
          ),
        })),

      updateLeadStage: (leadId, stage) =>
        set((state) => ({
          leads: state.leads.map((l) => (l.id === leadId ? { ...l, stage } : l)),
        })),

      updateLeadNote: (leadId, note) =>
        set((state) => ({
          leads: state.leads.map((l) => (l.id === leadId ? { ...l, lastNote: note } : l)),
        })),

      setActiveCallDraftNote: (note) => set({ activeCallDraftNote: note }),

      updateLeadTemperature: (leadId, temp) =>
        set((state) => ({
          leads: state.leads.map((l) =>
            l.id === leadId ? { ...l, temperature: temp } : l,
          ),
        })),

      addLead: ({ firstName, lastName = '', phone, city = '' }) => {
        const id = uid('lead')
        const lead: Lead = {
          id,
          firstName,
          lastName,
          phone,
          city,
          source: 'form',
          temperature: 'warm',
          priority: 2,
          stage: 'new',
          product: '',
          budget: '',
          job: '',
          experience: 'none',
          incomeGoal: '',
          interestReason: '',
          bestCallTime: '',
          lastCallAt: null,
          callCount: 0,
          lastNote: '',
          conversionProbability: 40,
          painPoint: '',
          objection: null,
          nextFollowupAt: null,
          rating: 0,
          assignedAgentId: '',
          assignedTeamId: null,
          status: 'new',
        }
        set((state) => ({ leads: [lead, ...state.leads] }))
      },

      distributeLeadsToTeams: () => {
        let distributed = 0
        set((state) => {
          const teamIds = state.teams.map((t) => t.id)
          if (teamIds.length === 0) return state

          const pool = state.leads.filter(
            (lead) =>
              !lead.assignedAgentId &&
              !lead.assignedTeamId &&
              lead.status === 'new' &&
              !lead.doNotCall,
          )
          if (pool.length === 0) return state

          const updates = new Map<string, string>()
          pool.forEach((lead, index) => {
            updates.set(lead.id, teamIds[index % teamIds.length])
          })
          distributed = pool.length

          return {
            leads: state.leads.map((lead) =>
              updates.has(lead.id)
                ? { ...lead, assignedTeamId: updates.get(lead.id)!, status: 'assigned' as const }
                : lead,
            ),
          }
        })
        return distributed
      },

      startCall: (leadId, method = 'voip') => {
        set((state) => {
          const nowMs = Date.now()
          const flushed = flushAvailabilitySegment(state, nowMs)

          return {
            ...flushed,
            activeCallLeadId: leadId,
            activeCallMethod: method,
            activeCallDraftNote: '',
            lastCallDuration: 0,
            availability: 'in_call',
            availabilityChangedAt: new Date(nowMs).toISOString(),
            availabilityAutoReason: null,
            leads: state.leads.map((l) =>
              l.id === leadId
                ? pushStatus({ ...l, lockedBy: state.currentAgentId }, 'in_call', state.currentAgentId)
                : l,
            ),
          }
        })
      },
      endCall: (durationSec) =>
        set((state) => {
          const nowMs = Date.now()
          const flushed = flushAvailabilitySegment(
            { ...state, availability: 'in_call' },
            nowMs,
          )
          const nextAvailability = 'available'

          return {
            ...flushed,
            lastCallDuration: durationSec,
            availability: nextAvailability,
            availabilityChangedAt: new Date(nowMs).toISOString(),
            availabilityAutoReason: null,
            workSession:
              flushed.workSession ?? state.workSession
                ? {
                    ...(flushed.workSession ?? state.workSession)!,
                    totalCallSeconds:
                      (flushed.workSession ?? state.workSession)!.totalCallSeconds + durationSec,
                  }
                : state.workSession,
          }
        }),

      submitCallResult: (input) => {
        const state = get()
        const agentId = state.currentAgentId
        const routed = routeCallResult(input.result)
        const isSuccess = positiveResults.includes(input.result)
        const nowIso = new Date().toISOString()

        const call: Call = {
          id: uid('call'),
          leadId: input.leadId,
          agentId,
          result: input.result,
          note: input.note,
          durationSec: input.durationSec,
          objection: input.objection,
          nextStage: routed.stage,
          createdAt: nowIso,
        }

        const lead = state.leads.find((l) => l.id === input.leadId)
        const product = state.products.find((p) => p.id === (lead?.productId ?? PRODUCT_ID))

        // --- update lead ---
        let temperature: Temperature = lead?.temperature ?? 'warm'
        if (input.result === 'very_hot' || input.result === 'interested') temperature = 'hot'
        else if (input.result === 'not_interested') temperature = 'cold'

        const leads = state.leads.map((l) => {
          if (l.id !== input.leadId) return l
          const updated: Lead = {
            ...l,
            stage: routed.stage ?? l.stage,
            temperature,
            lastCallAt: nowIso,
            callCount: l.callCount + 1,
            lastNote: input.note.trim() || l.lastNote,
            objection: input.objection ?? l.objection,
            rating: input.rating || l.rating,
            nextFollowupAt: input.followupAt ?? l.nextFollowupAt,
            doNotCall: routed.removesFromCycle ? true : l.doNotCall,
            lockedBy: null,
            lockedUntil: null,
          }
          return pushStatus(updated, routed.status, agentId, input.note)
        })

        // --- follow-up ---
        let followups = state.followups
        let createdFollowupId: string | null = null
        if (routed.createsFollowup && input.followupAt) {
          const l = leads.find((x) => x.id === input.leadId)
          const fu: Followup = {
            id: uid('fu'),
            leadId: input.leadId,
            agentId,
            kind: input.followupKind ?? 'call',
            title: l ? `پیگیری ${l.firstName} ${l.lastName}` : 'پیگیری',
            dueAt: input.followupAt,
            status: new Date(input.followupAt).getTime() < Date.now() ? 'overdue' : 'pending',
            priority: l?.priority ?? 2,
            note: input.note,
            createdFromCallId: call.id,
          }
          followups = [...followups, fu]
          createdFollowupId = fu.id
        }

        // --- sale ---
        let sales = state.sales
        let createdSaleId: string | null = null
        const notifications = [...state.notifications]
        if (routed.createsSale) {
          const amount = input.saleAmount ?? product?.price ?? 0
          const sale: Sale = {
            id: uid('sale'),
            leadId: input.leadId,
            agentId,
            teamId: state.agents.find((a) => a.id === agentId)?.teamId ?? 't1',
            productId: product?.id ?? PRODUCT_ID,
            amount,
            status: routed.createsSale === 'pending_confirmation' ? 'pending_confirmation' : 'payment_pending',
            paymentMethod: null,
            createdAt: nowIso,
            submittedAt: routed.createsSale === 'pending_confirmation' ? nowIso : null,
          }
          sales = [sale, ...sales]
          createdSaleId = sale.id
          notifications.unshift({
            id: uid('n'),
            title: routed.createsSale === 'pending_confirmation' ? 'فروش برای تایید ارسال شد' : 'فروش در انتظار پرداخت',
            body: lead ? `${lead.firstName} ${lead.lastName}` : '',
            kind: 'sale',
            createdAt: nowIso,
            read: false,
            href: '/sales',
          })
        }

        const calls = [call, ...state.calls]
        const syncedFollowups = syncFollowupStatuses(followups)
        const suggestion: Suggestion | null = getSuggestionAfter(
          leads,
          syncedFollowups,
          input.leadId,
          agentId,
        )

        const outcome: CallResultOutcome = {
          nextActionLabel: nextActionLabels[routed.nextAction],
          createdSaleId,
          createdFollowupId,
          suggestion,
          savedNote: input.note.trim() || null,
        }

        const activity: ActivityLog[] = [
          {
            id: uid('al'),
            agentId,
            kind: 'result',
            title: lead ? `نتیجه تماس: ${lead.firstName} ${lead.lastName}` : 'نتیجه تماس ثبت شد',
            meta: routed.nextAction,
            createdAt: nowIso,
          },
          ...state.activity,
        ]

        const nowMs = Date.now()
        const flushed = flushAvailabilitySegment(
          { ...state, availability: 'in_call' },
          nowMs,
        )
        const sessionBase = flushed.workSession ?? state.workSession
        const callDurationAlreadyCounted =
          state.lastCallDuration > 0 && state.lastCallDuration === input.durationSec
        const workSessionWithCall =
          sessionBase && input.durationSec > 0 && !callDurationAlreadyCounted
            ? {
                ...sessionBase,
                totalCallSeconds: sessionBase.totalCallSeconds + input.durationSec,
              }
            : sessionBase

        const { agents: syncedAgents, dailyStatsDate } = syncAllAgentsDailyStats(
          state.agents.map((a) =>
            a.id === agentId
              ? {
                  ...a,
                  points: a.points + (isSuccess ? 25 : 5),
                }
              : a,
          ),
          calls,
          state.dailyStatsDate,
        )

        set({
          ...flushed,
          calls,
          leads,
          followups: syncedFollowups,
          sales,
          agents: syncedAgents,
          dailyStatsDate,
          activity,
          notifications,
          activeCallLeadId: null,
          activeCallMethod: null,
            availability: 'available',
            availabilityChangedAt: new Date(nowMs).toISOString(),
            availabilityAutoReason: null,
            workSession: workSessionWithCall,
          lastOutcome: outcome,
        })

        return outcome
      },

      completeFollowup: (id) =>
        set((state) => ({
          followups: state.followups.map((f) =>
            f.id === id ? { ...f, status: 'done', completedAt: new Date().toISOString() } : f,
          ),
        })),

      createFollowup: (input) => {
        const state = get()
        const followup: Followup = {
          id: uid('fu'),
          leadId: input.leadId,
          agentId: state.currentAgentId,
          kind: input.kind,
          title: input.title,
          dueAt: input.dueAt,
          status: new Date(input.dueAt).getTime() < Date.now() ? 'overdue' : 'pending',
          priority: input.priority,
          note: input.note,
        }
        const leads = state.leads.map((l) =>
          l.id === input.leadId ? { ...l, nextFollowupAt: input.dueAt } : l,
        )
        set({ followups: [...state.followups, followup], leads })
        return followup
      },

      snoozeFollowup: (id, dueAt) =>
        set((state) => ({
          followups: state.followups.map((f) =>
            f.id === id ? { ...f, dueAt, status: 'snoozed' } : f,
          ),
        })),

      submitPayment: (saleId, method, reference) => {
        const state = get()
        const sale = state.sales.find((s) => s.id === saleId)
        if (!sale) return
        const nowIso = new Date().toISOString()
        const payment: Payment = {
          id: uid('pay'),
          saleId,
          amount: sale.amount,
          method,
          referenceNumber: reference,
          status: 'submitted',
          submittedAt: nowIso,
        }
        const sales = state.sales.map((s) =>
          s.id === saleId
            ? { ...s, status: 'payment_submitted' as const, paymentMethod: method, submittedAt: nowIso }
            : s,
        )
        const leads = state.leads.map((l) =>
          l.id === sale.leadId ? pushStatus(l, 'payment_submitted', state.currentAgentId) : l,
        )
        set({
          payments: [payment, ...state.payments],
          sales,
          leads,
          activity: [
            { id: uid('al'), agentId: state.currentAgentId, kind: 'payment', title: 'پرداخت ثبت شد', meta: reference, createdAt: nowIso },
            ...state.activity,
          ],
        })
        get().pushNotification({ title: 'پرداخت ثبت شد', body: 'فروش برای تایید لیدر ارسال شد.', kind: 'sale', href: '/sales' })
      },

      forwardSaleForConfirmation: (saleId) => {
        const state = get()
        const sale = state.sales.find((s) => s.id === saleId)
        if (!sale || sale.status !== 'payment_submitted') return
        const nowIso = new Date().toISOString()
        set({
          sales: state.sales.map((s) =>
            s.id === saleId ? { ...s, status: 'pending_confirmation' as const } : s,
          ),
          leads: state.leads.map((l) =>
            l.id === sale.leadId ? pushStatus(l, 'sale_pending_confirmation', state.currentAgentId) : l,
          ),
          activity: [
            {
              id: uid('al'),
              agentId: state.currentAgentId,
              kind: 'sale',
              title: 'پرداخت تایید شد',
              meta: 'ارسال به مدیریت',
              createdAt: nowIso,
            },
            ...state.activity,
          ],
        })
        get().pushNotification({
          title: 'ارسال به مدیریت',
          body: 'فروش برای تایید نهایی ارسال شد.',
          kind: 'sale',
          href: '/sales',
        })
      },

      confirmSale: (saleId) => {
        const state = get()
        const sale = state.sales.find((s) => s.id === saleId)
        if (!sale || sale.status === 'confirmed') return
        const nowIso = new Date().toISOString()
        const product = state.products.find((p) => p.id === sale.productId)
        const commissionAmount = computeCommission(product, sale.amount)

        const commission: Commission = {
          id: uid('com'),
          saleId: sale.id,
          agentId: sale.agentId,
          productId: sale.productId,
          leadId: sale.leadId,
          saleAmount: sale.amount,
          commissionRate: product?.commissionRate ?? 15,
          commissionAmount,
          status: 'pending',
          createdAt: nowIso,
          availableAt: new Date(Date.now() + 3 * 86400_000).toISOString(),
        }
        const walletTx: WalletTransaction = {
          id: uid('wt'),
          type: 'commission_pending',
          amount: commissionAmount,
          description: 'پورسانت فروش تاییدشده',
          referenceType: 'commission',
          referenceId: commission.id,
          createdAt: nowIso,
        }
        set({
          sales: state.sales.map((s) =>
            s.id === saleId
              ? { ...s, status: 'confirmed' as const, confirmedAt: nowIso, confirmedBy: state.currentAgentId }
              : s,
          ),
          leads: state.leads.map((l) =>
            l.id === sale.leadId ? pushStatus({ ...l, stage: 'won' }, 'won', state.currentAgentId) : l,
          ),
          commissions: [commission, ...state.commissions],
          wallet: {
            ...state.wallet,
            balancePending: state.wallet.balancePending + commissionAmount,
          },
          walletTx: [walletTx, ...state.walletTx],
          activity: [
            { id: uid('al'), agentId: sale.agentId, kind: 'sale', title: 'فروش تایید شد', meta: `پورسانت ${commissionAmount}`, createdAt: nowIso },
            ...state.activity,
          ],
        })
        get().pushNotification({ title: 'فروش تایید شد', body: 'پورسانت به کیف پول (معلق) اضافه شد.', kind: 'commission', href: '/wallet' })
      },

      rejectSale: (saleId, reason) => {
        const state = get()
        const sale = state.sales.find((s) => s.id === saleId)
        if (!sale) return
        const nowIso = new Date().toISOString()
        set({
          sales: state.sales.map((s) =>
            s.id === saleId ? { ...s, status: 'rejected' as const, rejectedAt: nowIso, rejectionReason: reason } : s,
          ),
          leads: state.leads.map((l) =>
            l.id === sale.leadId ? pushStatus(l, 'follow_up_required', state.currentAgentId, reason) : l,
          ),
        })
        get().pushNotification({ title: 'فروش رد شد', body: reason, kind: 'sale', href: '/sales' })
      },

      cancelSale: (saleId) =>
        set((state) => ({
          sales: state.sales.map((s) =>
            s.id === saleId ? { ...s, status: 'cancelled' as const } : s,
          ),
        })),

      submitTeamReport: (leaderNotes) => {
        const state = get()
        const team = getManagedTeam(state.teams, state.currentAgentId, state.role)
        if (!team) return

        const members = state.agents.filter((a) => team.agentIds.includes(a.id))
        const callsToday = members.reduce((sum, a) => sum + a.callsToday, 0)
        const successfulToday = members.reduce((sum, a) => sum + a.successfulToday, 0)
        const conversion = callsToday > 0 ? Math.round((successfulToday / callsToday) * 1000) / 10 : 0
        const nowIso = new Date().toISOString()
        const today = nowIso.slice(0, 10)
        const leader = state.agents.find((a) => a.id === state.currentAgentId)

        const report: TeamReport = {
          id: uid('tr'),
          teamId: team.id,
          teamName: team.name,
          reportDate: today,
          status: 'submitted',
          summary: {
            calls_today: callsToday,
            successful_today: successfulToday,
            conversion_rate: conversion,
            pending_confirmation: state.sales.filter(
              (s) => s.teamId === team.id && s.status === 'pending_confirmation',
            ).length,
            payment_submitted: state.sales.filter(
              (s) => s.teamId === team.id && s.status === 'payment_submitted',
            ).length,
            active_agents: members.length,
          },
          leaderNotes: leaderNotes ?? null,
          submittedBy: state.currentAgentId,
          submitterName: leader ? `${leader.firstName} ${leader.lastName}` : undefined,
          createdAt: nowIso,
        }

        set({
          teamReports: [
            report,
            ...state.teamReports.filter((r) => !(r.teamId === team.id && r.reportDate === today)),
          ],
        })
        get().pushNotification({
          title: 'گزارش ارسال شد',
          body: `گزارش ${team.name} برای سوپروایزر ارسال شد.`,
          kind: 'system',
          href: '/team-reports',
        })
        get().pushToast('گزارش روزانه برای سوپروایزر ارسال شد')
      },

      approveTeamReport: (reportId, supervisorNotes) => {
        const nowIso = new Date().toISOString()
        set((state) => ({
          teamReports: state.teamReports.map((report) =>
            report.id === reportId && report.status === 'submitted'
              ? {
                  ...report,
                  status: 'approved' as const,
                  supervisorNotes: supervisorNotes ?? null,
                  approvedAt: nowIso,
                }
              : report,
          ),
        }))
        get().pushToast('گزارش تایید شد')
      },

      forwardTeamReport: (reportId) => {
        const nowIso = new Date().toISOString()
        const state = get()
        const report = state.teamReports.find((r) => r.id === reportId)
        set({
          teamReports: state.teamReports.map((r) =>
            r.id === reportId && r.status === 'approved'
              ? { ...r, status: 'forwarded_to_manager' as const, forwardedAt: nowIso }
              : r,
          ),
        })
        if (report) {
          get().pushNotification({
            title: 'گزارش برای مدیریت',
            body: `گزارش تایید‌شده ${report.teamName} برای مدیر ارسال شد.`,
            kind: 'system',
            href: '/team-reports?inbox=1',
          })
        }
        get().pushToast('گزارش برای مدیریت ارسال شد')
      },

      releaseCommission: (commissionId) => {
        const state = get()
        const com = state.commissions.find((c) => c.id === commissionId)
        if (!com || com.status === 'available' || com.status === 'paid') return
        const nowIso = new Date().toISOString()
        set({
          commissions: state.commissions.map((c) =>
            c.id === commissionId ? { ...c, status: 'available' as const, approvedAt: c.approvedAt ?? nowIso } : c,
          ),
          wallet: {
            ...state.wallet,
            balancePending: Math.max(0, state.wallet.balancePending - com.commissionAmount),
            balanceAvailable: state.wallet.balanceAvailable + com.commissionAmount,
            totalEarned: state.wallet.totalEarned + com.commissionAmount,
          },
          walletTx: [
            {
              id: uid('wt'),
              type: 'commission_available',
              amount: com.commissionAmount,
              description: 'پورسانت قابل برداشت شد',
              referenceType: 'commission',
              referenceId: com.id,
              createdAt: nowIso,
            },
            ...state.walletTx,
          ],
        })
        get().pushNotification({ title: 'پورسانت آزاد شد', body: 'پورسانت شما قابل برداشت شد.', kind: 'commission', href: '/wallet' })
      },

      requestPayout: (amount) => {
        const state = get()
        const validation = validatePayoutAmount(amount, state.wallet.balanceAvailable)
        if (!validation.ok) return { ok: false, message: validation.message }

        const bankFee = calculateBankFee(amount)
        const netAmount = payoutNetAmount(amount)
        const nowIso = new Date().toISOString()
        const payout: PayoutRequest = {
          id: uid('po'),
          agentId: state.currentAgentId,
          amount,
          bankFee,
          netAmount,
          status: 'requested',
          requestedAt: nowIso,
        }
        const feeNote = ` — کارمزد بانکی ${bankFee.toLocaleString('fa-IR')} تومان`
        set({
          payouts: [payout, ...state.payouts],
          wallet: {
            ...state.wallet,
            balanceAvailable: state.wallet.balanceAvailable - amount,
            balanceLocked: state.wallet.balanceLocked + amount,
          },
          walletTx: [
            {
              id: uid('wt'),
              type: 'payout_requested',
              amount,
              description: `درخواست تسویه ثبت شد${feeNote}`,
              referenceType: 'payout',
              referenceId: payout.id,
              createdAt: nowIso,
            },
            ...state.walletTx,
          ],
          activity: [
            { id: uid('al'), agentId: state.currentAgentId, kind: 'payout', title: 'درخواست تسویه', meta: String(amount), createdAt: nowIso },
            ...state.activity,
          ],
        })
        return { ok: true }
      },

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      pushNotification: (n) =>
        set((state) => ({
          notifications: [
            { ...n, id: uid('n'), createdAt: new Date().toISOString(), read: false },
            ...state.notifications,
          ],
        })),

      toggleDarkMode: () => {
        const next = !get().darkMode
        set({ darkMode: next })
        document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
      },

      pushToast: (message, tone = 'success') => {
        const id = uid('toast')
        set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }))
        setTimeout(() => get().dismissToast(id), 2600)
      },
      dismissToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

      openCallMethodSheet: (lead) => {
        if (!canMakeCalls(get().role)) return
        set({ callMethodLead: lead })
      },
      closeCallMethodSheet: () => set({ callMethodLead: null }),

      setMaskPhoneNumbers: (on) => set({ maskPhoneNumbers: on }),
      setAutoLock: (enabled, minutes) =>
        set((state) => ({ autoLockEnabled: enabled, autoLockMinutes: minutes ?? state.autoLockMinutes })),
      lockApp: () => {
        if (get().autoLockEnabled) set({ isLocked: true })
      },
      unlockApp: () => set({ isLocked: false }),

      setAppSettings: (appSettings) => set({ appSettings }),
      setPowerDialEnabled: (enabled) => set({ powerDialEnabled: enabled }),
      setDispositionMode: (mode) => set({ dispositionMode: mode }),

      mergeTeamLiveStats: (live) =>
        set((state) => {
          const self = state.agents.find((agent) => agent.id === state.currentAgentId)
          const baseAgents =
            state.agents.some((agent) => agent.role === 'agent')
              ? state.agents
              : self
                ? agentsFromTeamLive(live, self)
                : state.agents

          return {
            agents: mergeTeamLiveIntoAgents(baseAgents, live),
            teams:
              state.teams.length > 0
                ? state.teams
                : teamsFromTeamLive(live, state.currentAgentId),
          }
        }),

      applySyncData: (payload) =>
        set((state) => {
          const baseAgents =
            payload.agents.length > 0
              ? payload.agents.map((remote) =>
                  remote.id === payload.agent.id
                    ? mergeAgentDailyStats(remote, payload.agent)
                    : remote,
                )
              : state.agents.some((agent) => agent.id === payload.agent.id)
                ? state.agents.map((agent) =>
                    agent.id === payload.agent.id
                      ? mergeAgentDailyStats(agent, payload.agent)
                      : agent,
                  )
                : [...state.agents, payload.agent]

          const nextCalls = payload.calls ?? state.calls
          const synced = syncCurrentAgentDailyStats(
            baseAgents,
            nextCalls,
            payload.agent.id,
            state.dailyStatsDate,
          )
          const agents = synced.agents.map((row) => ({
            ...row,
            conversionRate: conversionRateFromStats(row.callsToday, row.successfulToday),
          }))

          return {
            leads: hydrateLeads(payload.leads),
            followups: syncFollowupStatuses(payload.followups),
            calls: nextCalls,
            sales: payload.sales,
            payments: payload.payments,
            commissions: payload.commissions,
            wallet: payload.wallet,
            walletTx: payload.walletTx,
            payouts: payload.payouts,
            products: payload.products,
            notifications: payload.notifications,
            agents,
            teams: payload.teams ?? state.teams,
            teamReports: payload.teamReports ?? state.teamReports,
            activity: payload.activity ?? state.activity,
            availability: payload.availability,
            availabilityChangedAt: payload.availabilityChangedAt,
            availabilityAutoReason: null,
            workSession: payload.workSession,
            workDaySummaries: payload.workDaySummaries,
            currentAgentId: payload.agent.id,
            role: payload.role,
            permissions: resolvePermissions(payload.role, payload.permissions),
            dailyStatsDate: synced.dailyStatsDate,
            appSettings: payload.appSettings ?? state.appSettings,
            powerDialEnabled:
              state.powerDialEnabled || (payload.appSettings?.powerDialDefault ?? false),
            dataReady: true,
            dataSyncing: false,
          }
        }),
      upsertLead: (lead) =>
        set((state) => {
          const hydrated = hydrateLeads([lead])[0]
          const exists = state.leads.some((l) => l.id === hydrated.id)
          return {
            leads: exists
              ? state.leads.map((l) => (l.id === hydrated.id ? { ...l, ...hydrated } : l))
              : [hydrated, ...state.leads],
          }
        }),
      setAgentAvatar: (avatar) =>
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === state.currentAgentId ? { ...agent, avatar } : agent,
          ),
        })),
      setDataReady: (ready) => set({ dataReady: ready }),
      setDataSyncing: (syncing) => set({ dataSyncing: syncing }),
    }),
    {
      name: 'saat-store',
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as Partial<PersistedSlice>
        if (version < 2) {
          // Reset to a fully-seeded v2 shape to avoid partial legacy data.
          return {
            ...state,
            leads: hydrateLeads(mockLeads),
            agents: withAvatars(mockAgents, mockAgents),
            sales: mockSales,
            payments: mockPayments,
            commissions: mockCommissions,
            wallet: mockWallet,
            walletTx: mockWalletTx,
            payouts: mockPayouts,
            products: mockProducts,
            activity: mockActivity,
            availability: 'offline',
            availabilityChangedAt: null,
            workSession: null,
            workDaySummaries: [],
            dailyStatsDate: null,
            darkMode: false,
          } as PersistedSlice
        }
        return state as PersistedSlice
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.agents = withAvatars(state.agents, mockAgents)
        state.leads = hydrateLeads(state.leads)
        if (!usesRemoteData) {
          const synced = syncAllAgentsDailyStats(
            state.agents,
            state.calls ?? [],
            state.dailyStatsDate ?? null,
          )
          state.agents = synced.agents
          state.dailyStatsDate = synced.dailyStatsDate
        }
        state.maskPhoneNumbers = true
        state.autoLockEnabled = true
        state.autoLockMinutes = 5
        if (state.darkMode) {
          document.documentElement.setAttribute('data-theme', 'dark')
        }
      },
      partialize: (state) => ({
        isAuthed: state.isAuthed,
        phone: state.phone,
        role: state.role,
        currentAgentId: state.currentAgentId,
        availability: state.availability,
        availabilityChangedAt: state.availabilityChangedAt,
        workSession: state.workSession,
        workDaySummaries: state.workDaySummaries,
        dailyStatsDate: state.dailyStatsDate,
        leads: state.leads,
        calls: state.calls,
        followups: state.followups,
        notifications: state.notifications,
        sales: state.sales,
        payments: state.payments,
        commissions: state.commissions,
        wallet: state.wallet,
        walletTx: state.walletTx,
        payouts: state.payouts,
        products: state.products,
        activity: state.activity,
        agents: state.agents,
        darkMode: state.darkMode,
        powerDialEnabled: state.powerDialEnabled,
        dispositionMode: state.dispositionMode,
      }),
    },
  ),
)
