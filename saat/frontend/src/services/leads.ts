import { http } from './http'
import { mapLead } from './mappers'
import type { ExperienceLevel, Lead, LeadSource, Priority, Temperature } from '@/types'

export interface CreateLeadInput {
  first_name: string
  last_name?: string
  phone: string
  city?: string
  source?: LeadSource
  product_id?: number
  temperature?: Temperature
  priority?: Priority
  budget?: string
  job?: string
  experience?: ExperienceLevel
  income_goal?: string
  interest_reason?: string
  best_call_time?: string
  pain_point?: string
  last_note?: string
}

export interface ImportBatchResult {
  imported_count: number
  duplicate_count: number
  error_count: number
  total_rows: number
}

export interface DistributeTeamsResult {
  distributed: number
  teams: number
}

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const dto = await http.post<Record<string, unknown>>('/leads', input)
  return mapLead(dto)
}

export async function fetchLeadsFromApi(): Promise<Lead[]> {
  const rows = await http.get<Record<string, unknown>[]>('/leads')
  return rows.map(mapLead)
}

export async function importLeadsCsv(file: File): Promise<ImportBatchResult> {
  const form = new FormData()
  form.append('file', file)
  return http.postForm<ImportBatchResult>('/leads/import', form)
}

export async function distributeLeadsToTeams(limit = 200): Promise<DistributeTeamsResult> {
  return http.post<DistributeTeamsResult>('/leads/distribute-teams', { limit })
}
