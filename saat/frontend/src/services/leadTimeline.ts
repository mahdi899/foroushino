import { http } from '@/services/http'
import { mapCall, mapFollowup, mapLeadStatusHistory, mapSale } from '@/services/mappers'
import type { Call, Followup, LeadStatusEvent, Sale } from '@/types'

type Dto = Record<string, unknown>

export interface LeadTimeline {
  calls: Call[]
  followups: Followup[]
  statusHistory: LeadStatusEvent[]
  sales: Sale[]
}

export async function fetchLeadTimeline(leadId: string): Promise<LeadTimeline> {
  const raw = await http.get<Dto>(`/leads/${leadId}/timeline`)
  const data = (raw.data as Dto | undefined) ?? raw

  return {
    calls: Array.isArray(data.calls) ? data.calls.map((row) => mapCall(row as Dto)) : [],
    followups: Array.isArray(data.followups)
      ? data.followups.map((row) => mapFollowup(row as Dto))
      : [],
    statusHistory: Array.isArray(data.status_histories)
      ? data.status_histories.map((row) => mapLeadStatusHistory(row as Dto))
      : [],
    sales: Array.isArray(data.sales) ? data.sales.map((row) => mapSale(row as Dto)) : [],
  }
}
