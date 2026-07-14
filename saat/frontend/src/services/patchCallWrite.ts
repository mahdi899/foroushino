import { useStore } from '@/store/useStore'
import { mapCall, mapFollowup, mapLead, mapSale } from '@/services/mappers'

type Dto = Record<string, unknown>

function upsertLead(leads: ReturnType<typeof useStore.getState>['leads'], dto: unknown) {
  const lead = mapLead(dto as Dto)
  const exists = leads.some((row) => row.id === lead.id)
  return exists ? leads.map((row) => (row.id === lead.id ? { ...row, ...lead } : row)) : [lead, ...leads]
}

function upsertCall(calls: ReturnType<typeof useStore.getState>['calls'], dto: unknown) {
  const call = mapCall(dto as Dto)
  return [call, ...calls.filter((row) => row.id !== call.id)]
}

function upsertFollowup(followups: ReturnType<typeof useStore.getState>['followups'], dto: unknown) {
  const followup = mapFollowup(dto as Dto)
  const exists = followups.some((row) => row.id === followup.id)
  return exists
    ? followups.map((row) => (row.id === followup.id ? followup : row))
    : [followup, ...followups]
}

function upsertSale(sales: ReturnType<typeof useStore.getState>['sales'], dto: unknown) {
  const sale = mapSale(dto as Dto)
  const exists = sales.some((row) => row.id === sale.id)
  return exists ? sales.map((row) => (row.id === sale.id ? sale : row)) : [sale, ...sales]
}

/** Merge call-start response into local store — avoids a full syncAppData round-trip. */
export function patchCallStartData(data: { call?: unknown; lead?: unknown }): void {
  const state = useStore.getState()
  const patch: Partial<typeof state> = {}

  if (data.lead) patch.leads = upsertLead(state.leads, data.lead)
  if (data.call) patch.calls = upsertCall(state.calls, data.call)

  if (Object.keys(patch).length > 0) useStore.setState(patch)
}

/** Merge call-result response into local store — avoids a full syncAppData round-trip. */
export function patchCallResultData(data: {
  call?: unknown
  lead?: unknown
  follow_up?: unknown | null
  sale?: unknown | null
}): void {
  const state = useStore.getState()
  const patch: Partial<typeof state> = {}

  if (data.lead) patch.leads = upsertLead(state.leads, data.lead)
  if (data.call) patch.calls = upsertCall(state.calls, data.call)
  if (data.follow_up) patch.followups = upsertFollowup(state.followups, data.follow_up)
  if (data.sale) patch.sales = upsertSale(state.sales, data.sale)

  if (Object.keys(patch).length > 0) useStore.setState(patch)
}
