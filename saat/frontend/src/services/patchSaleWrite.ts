import { useStore } from '@/store/useStore'
import { mapCommission, mapLeadFromSaleEmbed, mapSale } from '@/services/mappers'
import { deriveWalletFromCommissions } from '@/lib/walletBalance'

type Dto = Record<string, unknown>

function upsertSale(sales: ReturnType<typeof useStore.getState>['sales'], dto: unknown) {
  const sale = mapSale(dto as Dto)
  const exists = sales.some((row) => row.id === sale.id)
  return exists ? sales.map((row) => (row.id === sale.id ? sale : row)) : [sale, ...sales]
}

function upsertCommission(
  commissions: ReturnType<typeof useStore.getState>['commissions'],
  dto: unknown,
) {
  const commission = mapCommission(dto as Dto)
  const exists = commissions.some((row) => row.id === commission.id)
  return exists
    ? commissions.map((row) => (row.id === commission.id ? commission : row))
    : [commission, ...commissions]
}

/** Merge sale-confirm API response into local store. */
export function patchSaleConfirmData(data: { sale?: unknown; commission?: unknown }): void {
  const state = useStore.getState()
  const patch: Partial<typeof state> = {}

  if (data.sale) {
    patch.sales = upsertSale(state.sales, data.sale)
    const embeddedLead = (data.sale as Dto).lead
    if (embeddedLead && typeof embeddedLead === 'object') {
      const lead = mapLeadFromSaleEmbed(embeddedLead as Dto)
      if (lead) {
        const exists = state.leads.some((row) => row.id === lead.id)
        patch.leads = exists
          ? state.leads.map((row) => (row.id === lead.id ? { ...row, ...lead, stage: 'won' as const } : row))
          : [{ ...lead, stage: 'won' as const }, ...state.leads]
      }
    }
  }

  if (data.commission) {
    patch.commissions = upsertCommission(state.commissions, data.commission)
  }

  if (Object.keys(patch).length === 0) return

  useStore.setState(patch)

  const next = useStore.getState()
  const ownCommissions = next.commissions.filter((c) => c.agentId === next.currentAgentId)
  if (ownCommissions.length > 0) {
    useStore.setState({
      wallet: deriveWalletFromCommissions(next.wallet, ownCommissions),
    })
  }
}

/** Merge sale-reject API response into local store. */
export function patchSaleRejectData(data: { sale?: unknown } | unknown): void {
  const saleDto = data && typeof data === 'object' && 'sale' in (data as object)
    ? (data as { sale?: unknown }).sale
    : data
  if (!saleDto) return

  const state = useStore.getState()
  useStore.setState({
    sales: upsertSale(state.sales, saleDto),
  })
}
