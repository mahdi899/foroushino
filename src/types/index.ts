export type Role = 'agent' | 'leader' | 'supervisor' | 'manager'

export type Temperature = 'hot' | 'warm' | 'cold'

export type Priority = 1 | 2 | 3

export type LeadSource =
  | 'instagram'
  | 'website'
  | 'telegram'
  | 'ads'
  | 'webinar'
  | 'form'
  | 'excel'

export type SaleStage =
  | 'new'
  | 'first_call'
  | 'interested'
  | 'follow_up'
  | 'meeting'
  | 'payment_pending'
  | 'won'
  | 'lost'

export type CallResult =
  | 'interested'
  | 'very_hot'
  | 'needs_followup'
  | 'meeting_set'
  | 'payment_pending'
  | 'registered'
  | 'no_answer'
  | 'unavailable'
  | 'wrong_number'
  | 'not_interested'
  | 'do_not_disturb'
  | 'needs_info'
  | 'not_decision_maker'
  | 'call_later'

export type Objection =
  | 'price'
  | 'time'
  | 'trust'
  | 'need_more_info'
  | 'thinking'
  | 'spouse_decision'
  | 'no_budget'

export type ExperienceLevel = 'none' | 'beginner' | 'intermediate' | 'advanced'

export interface Lead {
  id: string
  firstName: string
  lastName: string
  phone: string
  city: string
  source: LeadSource
  temperature: Temperature
  priority: Priority
  stage: SaleStage
  product: string
  budget: string
  job: string
  experience: ExperienceLevel
  incomeGoal: string
  interestReason: string
  bestCallTime: string
  lastCallAt: string | null
  callCount: number
  lastNote: string
  conversionProbability: number
  painPoint: string
  objection: Objection | null
  nextFollowupAt: string | null
  rating: number
  assignedAgentId: string
  avatar?: string | null
}

export interface Call {
  id: string
  leadId: string
  agentId: string
  result: CallResult
  note: string
  durationSec: number
  objection: Objection | null
  nextStage: SaleStage | null
  createdAt: string
}

export type FollowupStatus = 'pending' | 'done' | 'overdue'
export type FollowupKind = 'call' | 'message' | 'reminder' | 'meeting'

export interface Followup {
  id: string
  leadId: string
  agentId: string
  kind: FollowupKind
  title: string
  dueAt: string
  status: FollowupStatus
  priority: Priority
}

export interface Agent {
  id: string
  firstName: string
  lastName: string
  role: Role
  teamId: string
  avatar?: string | null
  phone: string
  level: number
  callsToday: number
  successfulToday: number
  conversionRate: number
  points: number
  streak: number
  callGoal: number
}

export interface Team {
  id: string
  name: string
  leaderId: string
  agentIds: string[]
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  color: string
}

export interface AppNotification {
  id: string
  title: string
  body: string
  kind: 'lead' | 'followup' | 'achievement' | 'system'
  createdAt: string
  read: boolean
}

export interface ScriptStep {
  id: string
  title: string
  body: string
}
