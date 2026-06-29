import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Agent,
  AppNotification,
  Call,
  CallResult,
  Followup,
  FollowupKind,
  Lead,
  Role,
  SaleStage,
  Objection,
  Temperature,
} from '@/types'
import {
  agents as mockAgents,
  followups as mockFollowups,
  leads as mockLeads,
  notifications as mockNotifications,
  MY_AGENT_ID,
} from '@/data/mock'
import { avatarUrl } from '@/data/avatars'
import { positiveResults, resultToStage } from '@/data/labels'

let idCounter = 1000
const uid = (prefix: string) => `${prefix}-${++idCounter}-${Date.now().toString(36)}`

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

  // data
  agents: Agent[]
  leads: Lead[]
  calls: Call[]
  followups: Followup[]
  notifications: AppNotification[]

  // transient call context
  activeCallLeadId: string | null
  lastCallDuration: number

  // ui
  toasts: Toast[]

  // session actions
  login: (phone: string) => void
  logout: () => void
  setRole: (role: Role) => void

  // call actions
  startCall: (leadId: string) => void
  endCall: (durationSec: number) => void
  logCall: (input: {
    leadId: string
    result: CallResult
    note: string
    objection: Objection | null
    nextStage: SaleStage | null
    rating: number
    followupAt: string | null
    durationSec: number
  }) => void

  // followups
  completeFollowup: (id: string) => void
  createFollowup: (input: {
    leadId: string
    kind: FollowupKind
    title: string
    dueAt: string
    priority: 1 | 2 | 3
  }) => void

  // leads
  updateLeadStage: (leadId: string, stage: SaleStage) => void
  updateLeadTemperature: (leadId: string, temp: Temperature) => void

  // notifications
  markAllRead: () => void

  // toasts
  pushToast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void
}

function syncFollowupStatuses(followups: Followup[]): Followup[] {
  const now = Date.now()
  return followups.map((f) => {
    if (f.status === 'done') return f
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

type PersistedSlice = Pick<
  AppState,
  | 'isAuthed'
  | 'phone'
  | 'role'
  | 'currentAgentId'
  | 'leads'
  | 'calls'
  | 'followups'
  | 'notifications'
  | 'agents'
>

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthed: false,
      phone: '',
      role: 'agent',
      currentAgentId: MY_AGENT_ID,

      agents: mockAgents,
      leads: mockLeads,
      calls: [],
      followups: syncFollowupStatuses(mockFollowups),
      notifications: mockNotifications,

      activeCallLeadId: null,
      lastCallDuration: 0,

      toasts: [],

      login: (phone) => set({ isAuthed: true, phone }),
      logout: () => set({ isAuthed: false, phone: '' }),
      setRole: (role) => {
        const map: Record<Role, string> = {
          agent: 'a-me',
          leader: 'a-leader',
          supervisor: 'a-sup',
          manager: 'a-mgr',
        }
        set({ role, currentAgentId: map[role] })
      },

      startCall: (leadId) => set({ activeCallLeadId: leadId, lastCallDuration: 0 }),
      endCall: (durationSec) => set({ lastCallDuration: durationSec }),

      logCall: (input) => {
        const state = get()
        const call: Call = {
          id: uid('call'),
          leadId: input.leadId,
          agentId: state.currentAgentId,
          result: input.result,
          note: input.note,
          durationSec: input.durationSec,
          objection: input.objection,
          nextStage: input.nextStage,
          createdAt: new Date().toISOString(),
        }

        const nextStage = input.nextStage ?? resultToStage[input.result] ?? null
        const isSuccess = positiveResults.includes(input.result)

        const leads = state.leads.map((l) => {
          if (l.id !== input.leadId) return l
          let temperature = l.temperature
          if (input.result === 'very_hot') temperature = 'hot'
          else if (input.result === 'interested') temperature = 'hot'
          else if (input.result === 'not_interested') temperature = 'cold'
          return {
            ...l,
            stage: nextStage ?? l.stage,
            temperature,
            lastCallAt: call.createdAt,
            callCount: l.callCount + 1,
            lastNote: input.note || l.lastNote,
            objection: input.objection ?? l.objection,
            rating: input.rating || l.rating,
            nextFollowupAt: input.followupAt ?? l.nextFollowupAt,
          }
        })

        let followups = state.followups
        if (input.followupAt) {
          const lead = leads.find((l) => l.id === input.leadId)
          followups = [
            ...followups,
            {
              id: uid('fu'),
              leadId: input.leadId,
              agentId: state.currentAgentId,
              kind: 'call',
              title: lead ? `پیگیری ${lead.firstName} ${lead.lastName}` : 'پیگیری',
              dueAt: input.followupAt,
              status: 'pending',
              priority: lead?.priority ?? 2,
            },
          ]
        }

        const agents = state.agents.map((a) => {
          if (a.id !== state.currentAgentId) return a
          return {
            ...a,
            callsToday: a.callsToday + 1,
            successfulToday: a.successfulToday + (isSuccess ? 1 : 0),
            points: a.points + (isSuccess ? 25 : 5),
          }
        })

        set({
          calls: [call, ...state.calls],
          leads,
          followups: syncFollowupStatuses(followups),
          agents,
          activeCallLeadId: null,
        })
      },

      completeFollowup: (id) =>
        set((state) => ({
          followups: state.followups.map((f) =>
            f.id === id ? { ...f, status: 'done' } : f,
          ),
        })),

      createFollowup: (input) =>
        set((state) => {
          const lead = state.leads.find((l) => l.id === input.leadId)
          const followup: Followup = {
            id: uid('fu'),
            leadId: input.leadId,
            agentId: state.currentAgentId,
            kind: input.kind,
            title: input.title,
            dueAt: input.dueAt,
            status: new Date(input.dueAt).getTime() < Date.now() ? 'overdue' : 'pending',
            priority: input.priority,
          }
          const leads = lead
            ? state.leads.map((l) =>
                l.id === input.leadId ? { ...l, nextFollowupAt: input.dueAt } : l,
              )
            : state.leads
          return { followups: [...state.followups, followup], leads }
        }),

      updateLeadStage: (leadId, stage) =>
        set((state) => ({
          leads: state.leads.map((l) => (l.id === leadId ? { ...l, stage } : l)),
        })),

      updateLeadTemperature: (leadId, temp) =>
        set((state) => ({
          leads: state.leads.map((l) =>
            l.id === leadId ? { ...l, temperature: temp } : l,
          ),
        })),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      pushToast: (message, tone = 'success') => {
        const id = uid('toast')
        set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }))
        setTimeout(() => get().dismissToast(id), 2600)
      },
      dismissToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'foroushino-store',
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as PersistedSlice
        if (version < 1) {
          return {
            ...state,
            agents: withAvatars(state.agents ?? mockAgents, mockAgents),
            leads: withAvatars(state.leads ?? mockLeads, mockLeads),
          }
        }
        return state
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.agents = withAvatars(state.agents, mockAgents)
        state.leads = withAvatars(state.leads, mockLeads)
      },
      partialize: (state) => ({
        isAuthed: state.isAuthed,
        phone: state.phone,
        role: state.role,
        currentAgentId: state.currentAgentId,
        leads: state.leads,
        calls: state.calls,
        followups: state.followups,
        notifications: state.notifications,
        agents: state.agents,
      }),
    },
  ),
)
