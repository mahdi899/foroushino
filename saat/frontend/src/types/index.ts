export type Role = 'agent' | 'leader' | 'supervisor' | 'manager' | 'admin'

export type Temperature = 'hot' | 'warm' | 'cold'

export type Priority = 1 | 2 | 3

export type LeadSource = string

export interface LeadSourceOption {
  id: string
  slug: string
  label: string
  sortOrder: number
  isActive: boolean
  isSystem: boolean
  showInForm: boolean
}

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
  | 'duplicate'
  | 'price_objection'
  | 'bad_timing'
  | 'incomplete_call'

// Full systemic lifecycle status of a lead (spec §2)
export type LeadStatus =
  | 'new'
  | 'assigned'
  | 'queued'
  | 'locked'
  | 'in_call'
  | 'contacted'
  | 'follow_up_required'
  | 'follow_up_overdue'
  | 'consultation_scheduled'
  | 'payment_pending'
  | 'payment_submitted'
  | 'sale_pending_confirmation'
  | 'won'
  | 'lost'
  | 'no_answer'
  | 'unreachable'
  | 'wrong_number'
  | 'duplicate'
  | 'do_not_call'
  | 'returned_to_pool'
  | 'needs_supervisor_review'

// What the system should do next after a call result (spec §6)
export type NextAction =
  | 'schedule_retry'
  | 'create_follow_up'
  | 'create_payment_pending_sale'
  | 'create_sale_pending_confirmation'
  | 'schedule_consultation'
  | 'mark_do_not_call'
  | 'close_lead'
  | 'mark_duplicate'
  | 'needs_review'
  | 'none'

// Why the smart engine suggested this lead now (spec §3)
export type SuggestReason =
  | 'overdue_follow_up'
  | 'today_follow_up'
  | 'hot_in_window'
  | 'interested_needs_follow_up'
  | 'fresh_high_prob'
  | 'warm'
  | 'cold'
  | 'from_pool'

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
  displayCode?: string
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
  assignedAgentName?: string | null
  assignedTeamId?: string | null
  avatar?: string | null
  // lifecycle & ownership (spec §2)
  status?: LeadStatus
  ownerId?: string | null
  lockedBy?: string | null
  lockedUntil?: string | null
  returnedToPool?: boolean
  doNotCall?: boolean
  duplicateOfId?: string | null
  productId?: string
  campaignId?: string
  statusHistory?: LeadStatusEvent[]
}

export interface LeadStatusEvent {
  id: string
  status: LeadStatus
  at: string
  byAgentId: string
  note?: string
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

export type FollowupStatus = 'pending' | 'done' | 'overdue' | 'cancelled' | 'snoozed'
export type FollowupKind =
  | 'call'
  | 'message'
  | 'reminder'
  | 'meeting'
  | 'payment'
  | 'consultation'
  | 'info'
  | 'decision'
  | 'custom'

export interface Followup {
  id: string
  leadId: string
  agentId: string
  kind: FollowupKind
  title: string
  dueAt: string
  status: FollowupStatus
  priority: Priority
  note?: string
  createdFromCallId?: string | null
  completedAt?: string | null
}

export interface Agent {
  id: string
  firstName: string
  lastName: string
  role: Role
  teamId: string
  avatar?: string | null
  phone: string
  agentCode: number
  level: number
  callsToday: number
  successfulToday: number
  conversionRate: number
  points: number
  streak: number
  callGoal: number
  isActive?: boolean
  bankCard?: string | null
  bankCardMasked?: string | null
  bankCardConfirmed?: boolean
  bankSheba?: string | null
  bankShebaRegistered?: boolean
  callsThisMonth?: number
  shiftSecondsThisMonth?: number
  earnedThisMonth?: number
  withdrawnThisMonth?: number
  pointsThisMonth?: number
  successfulThisMonth?: number
}

export interface Team {
  id: string
  name: string
  leaderId: string
  agentIds: string[]
  leaderName?: string | null
  supervisorId?: string | null
  supervisorName?: string | null
  agentsCount?: number
  agentsCapacity?: number
}

export type TeamReportStatus = 'submitted' | 'approved' | 'forwarded_to_manager'

export type TeamReportAgentReviewStatus = 'pending' | 'approved' | 'rejected'

export interface TeamReportAgentMetrics {
  calls_today: number
  successful_today: number
  conversion_rate: number
  commission_today: number
  shift_seconds: number
}

export interface TeamReportAgentEntry {
  agent_id: string
  agent_name: string
  source: TeamReportAgentMetrics
  display?: Partial<TeamReportAgentMetrics> & { note?: string | null }
  review_status?: TeamReportAgentReviewStatus
}

export interface TeamReportSummary {
  calls_today: number
  successful_today: number
  conversion_rate: number
  pending_confirmation: number
  payment_submitted: number
  active_agents: number
  agents?: TeamReportAgentEntry[]
  narrative?: string | null
}

export interface TeamReport {
  id: string
  teamId: string
  teamName: string
  reportDate: string
  status: TeamReportStatus
  summary: TeamReportSummary
  leaderNotes?: string | null
  supervisorNotes?: string | null
  submittedBy: string
  submitterName?: string
  approvedAt?: string | null
  forwardedAt?: string | null
  createdAt: string
}

export type AgentReportStatus = 'submitted' | 'approved' | 'rejected'

export interface AgentReportSummary {
  calls_today: number
  successful_today: number
  conversion_rate: number
  followups_completed: number
  sales_submitted: number
}

export interface AgentReport {
  id: string
  agentId: string
  agentName?: string
  teamId: string
  teamName?: string
  reportDate: string
  status: AgentReportStatus
  summary: AgentReportSummary
  agentNotes?: string | null
  leaderNotes?: string | null
  approvedAt?: string | null
  rejectedAt?: string | null
  createdAt: string
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
  kind:
    | 'lead'
    | 'followup'
    | 'achievement'
    | 'system'
    | 'sale'
    | 'commission'
    | 'payout'
    | 'quality'
    | 'shift'
  createdAt: string
  read: boolean
  href?: string
}

export interface ScriptStep {
  id: string
  title: string
  body: string
}

// ---------------------------------------------------------------------------
// Sales operations domain (spec §8, §9)
// ---------------------------------------------------------------------------

export type SaleStatus =
  | 'draft'
  | 'payment_pending'
  | 'payment_submitted'
  | 'pending_confirmation'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'refunded'

export interface Sale {
  id: string
  leadId: string
  agentId: string
  teamId: string
  productId: string
  amount: number
  status: SaleStatus
  paymentMethod?: PaymentMethod | null
  createdAt: string
  submittedAt?: string | null
  confirmedAt?: string | null
  rejectedAt?: string | null
  rejectionReason?: string | null
  confirmedBy?: string | null
  /** Populated from API embed when the lead is not in the synced leads list. */
  leadName?: string | null
  productName?: string | null
}

export type PaymentMethod = 'card' | 'gateway' | 'installment' | 'cash'
export type PaymentStatus = 'submitted' | 'verified' | 'rejected'

export interface Payment {
  id: string
  saleId: string
  amount: number
  method: PaymentMethod
  referenceNumber: string
  status: PaymentStatus
  submittedAt: string
  verifiedAt?: string | null
  rejectedReason?: string | null
}

export type CommissionStatus =
  | 'pending'
  | 'approved'
  | 'available'
  | 'rejected'
  | 'paid'
  | 'reversed'

export interface Commission {
  id: string
  saleId: string
  agentId: string
  agentName?: string
  productId: string
  leadId: string
  saleAmount: number
  commissionRate: number
  commissionAmount: number
  status: CommissionStatus
  createdAt: string
  availableAt?: string | null
  approvedAt?: string | null
  leaderApprovedAt?: string | null
  rejectionReason?: string | null
}

export interface Wallet {
  balanceAvailable: number
  balancePending: number
  balanceLocked: number
  totalEarned: number
  totalPaid: number
  bankCardMasked?: string | null
  bankCardConfirmed?: boolean
  bankShebaRegistered?: boolean
}

export interface BankAccountReview {
  userId: string
  name: string
  teamId?: string
  teamName?: string | null
  bankCard: string
  bankSheba: string
  updatedAt?: string | null
}

export type WalletTxType =
  | 'commission_pending'
  | 'commission_approved'
  | 'commission_available'
  | 'payout_requested'
  | 'payout_paid'
  | 'payout_rejected'
  | 'reversal'
  | 'adjustment'

export interface WalletTransaction {
  id: string
  type: WalletTxType
  amount: number
  description: string
  referenceType?: 'commission' | 'payout' | 'sale' | null
  referenceId?: string | null
  createdAt: string
}

export type PayoutStatus = 'requested' | 'approved' | 'paid' | 'rejected' | 'cancelled'

export interface PayoutRequest {
  id: string
  agentId: string
  agentName?: string
  amount: number
  bankFee?: number
  netAmount?: number
  bankCard?: string | null
  bankCardMasked?: string | null
  bankSheba?: string | null
  status: PayoutStatus
  requestedAt: string
  processedAt?: string | null
  rejectionReason?: string | null
}

// ---------------------------------------------------------------------------
// Shift & availability (spec §1)
// ---------------------------------------------------------------------------

export type Availability =
  | 'available'
  | 'in_call'
  | 'on_break'
  | 'doing_follow_up'
  | 'offline'

export type AvailabilityAutoReason = 'follow_up_route' | 'away_from_app'

export interface WorkSession {
  id?: string
  startedAt: string | null
  endedAt: string | null
  totalBreakSeconds: number
  totalCallSeconds: number
  totalProductiveSeconds: number
}

export interface WorkDaySummary {
  date: string
  sessionsCount: number
  totalProductiveSeconds: number
  totalBreakSeconds: number
  totalCallSeconds: number
  firstStartedAt: string | null
  lastEndedAt: string | null
  isOpen: boolean
}

// ---------------------------------------------------------------------------
// Products & campaigns (spec §15)
// ---------------------------------------------------------------------------

export interface Product {
  id: string
  name: string
  slug?: string
  price: number
  category: string
  commissionRate: number
  description?: string
  coverImageUrl?: string
  videoUrl?: string
  landingUrl?: string
  isActive: boolean
}

export interface Campaign {
  id: string
  name: string
  productId: string
  isActive: boolean
}

// ---------------------------------------------------------------------------
// Training & objection library (spec §12, §14)
// ---------------------------------------------------------------------------

export interface ScriptDoc {
  id: string
  productId: string
  title: string
  stage: string
  content: string
}

export interface ObjectionDoc {
  id: string
  productId: string
  key: Objection
  title: string
  suggestedResponse: string
  category: string
}

// ---------------------------------------------------------------------------
// Activity log & performance (spec §11)
// ---------------------------------------------------------------------------

export type ActivityKind =
  | 'call'
  | 'result'
  | 'follow_up'
  | 'sale'
  | 'payment'
  | 'commission'
  | 'shift'
  | 'lead'
  | 'payout'

export interface ActivityLog {
  id: string
  agentId: string
  kind: ActivityKind
  title: string
  meta?: string
  createdAt: string
}
