import { http } from './http'
import { mapLead } from './mappers'
import type { Lead } from '@/types'

export interface CreateLeadInput {
  first_name: string
  last_name?: string
  phone: string
  city?: string
  source?: string
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

export async function importLeadsCsv(file: File): Promise<ImportBatchResult> {
  const form = new FormData()
  form.append('file', file)
  return http.postForm<ImportBatchResult>('/leads/import', form)
}

export async function distributeLeadsToTeams(limit = 200): Promise<DistributeTeamsResult> {
  return http.post<DistributeTeamsResult>('/leads/distribute-teams', { limit })
}
