import { useEffect, useMemo, useState } from 'react'
import { SaleReviewSheet } from '@/components/domain/SaleReviewSheet'
import { apiMode } from '@/services'
import { fetchSaleById } from '@/services/saleActions'
import { useStore } from '@/store/useStore'
import type { Commission, Sale } from '@/types'

type ApprovalMode = 'leader' | 'supervisor'

interface CommissionReviewSheetProps {
  commission: Commission | null
  mode: ApprovalMode
  open: boolean
  onClose: () => void
  onApprove: (commission: Commission) => Promise<void>
  onReject: (commission: Commission) => void
}

function saleFromCommission(commission: Commission): Sale {
  return {
    id: commission.saleId,
    leadId: commission.leadId,
    agentId: commission.agentId,
    teamId: '',
    productId: commission.productId,
    amount: commission.saleAmount,
    status: 'confirmed',
    createdAt: commission.createdAt,
  }
}

export function CommissionReviewSheet({
  commission,
  mode,
  open,
  onClose,
  onApprove,
  onReject,
}: CommissionReviewSheetProps) {
  const agents = useStore((s) => s.agents)
  const teams = useStore((s) => s.teams)
  const calls = useStore((s) => s.calls)
  const followups = useStore((s) => s.followups)
  const sales = useStore((s) => s.sales)
  const payments = useStore((s) => s.payments)
  const leads = useStore((s) => s.leads)
  const products = useStore((s) => s.products)

  const [sale, setSale] = useState<Sale | null>(null)
  const [loadingSale, setLoadingSale] = useState(false)

  useEffect(() => {
    if (!open || !commission) {
      setSale(null)
      return
    }

    const fromStore = sales.find((row) => row.id === commission.saleId)
    if (fromStore) {
      setSale(fromStore)
      return
    }

    if (apiMode !== 'http') {
      setSale(saleFromCommission(commission))
      return
    }

    let cancelled = false
    setLoadingSale(true)

    void fetchSaleById(commission.saleId)
      .then((loaded) => {
        if (!cancelled) setSale(loaded)
      })
      .catch(() => {
        if (!cancelled) setSale(saleFromCommission(commission))
      })
      .finally(() => {
        if (!cancelled) setLoadingSale(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, commission, sales])

  const lead = useMemo(() => {
    if (!commission) return undefined
    return leads.find((row) => row.id === commission.leadId)
  }, [commission, leads])

  const product = useMemo(() => {
    if (!commission) return undefined
    return products.find((row) => row.id === commission.productId)
  }, [commission, products])

  const title = mode === 'leader' ? 'بررسی پورسانت (لیدر)' : 'بررسی پورسانت (تایید نهایی)'
  const confirmLabel = mode === 'leader' ? 'تایید لیدر' : 'تایید نهایی'

  if (!commission) return null

  return (
    <SaleReviewSheet
      open={open}
      sale={sale}
      lead={lead}
      product={product}
      agents={agents}
      teams={teams}
      calls={calls}
      followups={followups}
      sales={sales}
      payments={payments}
      commission={commission}
      title={title}
      confirmLabel={confirmLabel}
      rejectLabel="رد پورسانت"
      loadingExternal={loadingSale}
      onClose={onClose}
      onConfirm={() => {
        void onApprove(commission)
          .then(() => onClose())
          .catch(() => undefined)
      }}
      onReject={() => {
        onClose()
        onReject(commission)
      }}
    />
  )
}
