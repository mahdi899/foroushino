import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ActivityLog,
  Agent,
  AppNotification,
  Availability,
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
  Temperature,
  Wallet,
  WalletTransaction,
  WorkSession,
} from '@/types'
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
  wallet as mockWallet,
  walletTransactions as mockWalletTx,
} from '@/data/mockExtra'
import { avatarUrl } from '@/data/avatars'
import { positiveResults, nextActionLabels } from '@/data/labels'
import {
  computeCommission,
  routeCallResult,
  stageToStatus,
  suggestNextAfter,
  uid,
  type Suggestion,
} from '@/services/logic'
import type { CallResultInput, CallResultOutcome, FollowupInput } from '@/services/client'

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
  currentAgentId: string

  // shift & availability
  availability: Availability
  workSession: WorkSession | null

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

  // transient call context
  activeCallLeadId: string | null
  lastCallDuration: number
  lastOutcome: CallResultOutcome | null

  // ui
  toasts: Toast[]
  darkMode: boolean

  // security & privacy
  maskPhoneNumbers: boolean
  autoLockEnabled: boolean
  autoLockMinutes: number
  isLocked: boolean

  // session actions
  login: (phone: string) => void
  logout: () => void
  setRole: (role: Role) => void

  // shift actions
  startShift: () => void
  endShift: () => void
  setAvailability: (status: Availability) => void

  // lead ownership / lock
  lockLead: (leadId: string) => { ok: boolean; lockedByOther?: boolean }
  releaseLead: (leadId: string) => void
  returnLeadToPool: (leadId: string) => void
  reclaimLead: (leadId: string) => void
  updateLeadStage: (leadId: string, stage: SaleStage) => void
  updateLeadTemperature: (leadId: string, temp: Temperature) => void
  updateLeadNote: (leadId: string, note: string) => void

  // call actions
  startCall: (leadId: string) => void
  endCall: (durationSec: number) => void
  submitCallResult: (input: CallResultInput) => CallResultOutcome

  // followups
  completeFollowup: (id: string) => void
  createFollowup: (input: FollowupInput) => Followup
  snoozeFollowup: (id: string, dueAt: string) => void

  // sales & payments
  submitPayment: (saleId: string, method: PaymentMethod, reference: string) => void
  confirmSale: (saleId: string) => void
  rejectSale: (saleId: string, reason: string) => void
  cancelSale: (saleId: string) => void
  releaseCommission: (commissionId: string) => void

  // wallet
  requestPayout: (amount: number) => { ok: boolean; message?: string }

  // notifications
  markAllRead: () => void
  pushNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void

  // ui
  toggleDarkMode: () => void
  pushToast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void

  // security & privacy
  setMaskPhoneNumbers: (on: boolean) => void
  setAutoLock: (enabled: boolean, minutes?: number) => void
  lockApp: () => void
  unlockApp: () => void
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

const AGENT_MAP: Record<Role, string> = {
  agent: 'a-me',
  leader: 'a-leader',
  supervisor: 'a-sup',
  manager: 'a-mgr',
}

type PersistedSlice = Pick<
  AppState,
  | 'isAuthed'
  | 'phone'
  | 'role'
  | 'currentAgentId'
  | 'availability'
  | 'workSession'
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
  | 'maskPhoneNumbers'
  | 'autoLockEnabled'
  | 'autoLockMinutes'
>

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthed: false,
      phone: '',
      role: 'agent',
      currentAgentId: MY_AGENT_ID,

      availability: 'offline',
      workSession: null,

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

      activeCallLeadId: null,
      lastCallDuration: 0,
      lastOutcome: null,

      toasts: [],
      darkMode: false,

      maskPhoneNumbers: false,
      autoLockEnabled: false,
      autoLockMinutes: 5,
      isLocked: false,

      login: (phone) => set({ isAuthed: true, phone }),
      logout: () => set({ isAuthed: false, phone: '', availability: 'offline' }),
      setRole: (role) => set({ role, currentAgentId: AGENT_MAP[role] }),

      startShift: () =>
        set({
          availability: 'available',
          workSession: {
            startedAt: new Date().toISOString(),
            endedAt: null,
            totalBreakSeconds: 0,
            totalCallSeconds: 0,
          },
        }),
      endShift: () =>
        set((state) => ({
          availability: 'offline',
          workSession: state.workSession
            ? { ...state.workSession, endedAt: new Date().toISOString() }
            : null,
        })),
      setAvailability: (status) => set({ availability: status }),

      lockLead: (leadId) => {
        const state = get()
        const lead = state.leads.find((l) => l.id === leadId)
        if (!lead) return { ok: false }
        if (lead.lockedBy && lead.lockedBy !== state.currentAgentId) {
          return { ok: false, lockedByOther: true }
        }
        const until = new Date(Date.now() + 10 * 60_000).toISOString()
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

      updateLeadTemperature: (leadId, temp) =>
        set((state) => ({
          leads: state.leads.map((l) =>
            l.id === leadId ? { ...l, temperature: temp } : l,
          ),
        })),

      startCall: (leadId) => {
        set((state) => ({
          activeCallLeadId: leadId,
          lastCallDuration: 0,
          availability: 'in_call',
          leads: state.leads.map((l) =>
            l.id === leadId
              ? pushStatus({ ...l, lockedBy: state.currentAgentId }, 'in_call', state.currentAgentId)
              : l,
          ),
        }))
      },
      endCall: (durationSec) =>
        set((state) => ({
          lastCallDuration: durationSec,
          availability: state.availability === 'in_call' ? 'available' : state.availability,
          workSession: state.workSession
            ? { ...state.workSession, totalCallSeconds: state.workSession.totalCallSeconds + durationSec }
            : state.workSession,
        })),

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
            lastNote: input.note || l.lastNote,
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

        // --- agent stats ---
        const agents = state.agents.map((a) =>
          a.id === agentId
            ? {
                ...a,
                callsToday: a.callsToday + 1,
                successfulToday: a.successfulToday + (isSuccess ? 1 : 0),
                points: a.points + (isSuccess ? 25 : 5),
              }
            : a,
        )

        // --- activity ---
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

        const syncedFollowups = syncFollowupStatuses(followups)
        const suggestion: Suggestion | null = suggestNextAfter(leads, syncedFollowups, input.leadId)

        const outcome: CallResultOutcome = {
          nextActionLabel: nextActionLabels[routed.nextAction],
          createdSaleId,
          createdFollowupId,
          suggestion,
        }

        set({
          calls: [call, ...state.calls],
          leads,
          followups: syncedFollowups,
          sales,
          agents,
          activity,
          notifications,
          activeCallLeadId: null,
          availability: 'available',
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
            ? { ...s, status: 'pending_confirmation' as const, paymentMethod: method, submittedAt: nowIso }
            : s,
        )
        const leads = state.leads.map((l) =>
          l.id === sale.leadId ? pushStatus(l, 'sale_pending_confirmation', state.currentAgentId) : l,
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
        get().pushNotification({ title: 'پرداخت ثبت شد', body: 'فروش برای تایید ارسال شد.', kind: 'sale', href: '/sales' })
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
        if (amount <= 0) return { ok: false, message: 'مبلغ نامعتبر است.' }
        if (amount > state.wallet.balanceAvailable) {
          return { ok: false, message: 'مبلغ درخواستی بیشتر از موجودی قابل برداشت است.' }
        }
        const nowIso = new Date().toISOString()
        const payout: PayoutRequest = {
          id: uid('po'),
          agentId: state.currentAgentId,
          amount,
          status: 'requested',
          requestedAt: nowIso,
        }
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
              description: 'درخواست تسویه ثبت شد',
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

      setMaskPhoneNumbers: (on) => set({ maskPhoneNumbers: on }),
      setAutoLock: (enabled, minutes) =>
        set((state) => ({ autoLockEnabled: enabled, autoLockMinutes: minutes ?? state.autoLockMinutes })),
      lockApp: () => {
        if (get().autoLockEnabled) set({ isLocked: true })
      },
      unlockApp: () => set({ isLocked: false }),
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
            workSession: null,
            darkMode: false,
          } as PersistedSlice
        }
        return state as PersistedSlice
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.agents = withAvatars(state.agents, mockAgents)
        state.leads = hydrateLeads(withAvatars(state.leads, mockLeads))
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
        workSession: state.workSession,
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
        maskPhoneNumbers: state.maskPhoneNumbers,
        autoLockEnabled: state.autoLockEnabled,
        autoLockMinutes: state.autoLockMinutes,
      }),
    },
  ),
)
