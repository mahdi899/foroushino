import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Wallet, Check, Clock } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { LeadAvatar } from '@/components/domain/LeadAvatar'
import { Button } from '@/components/ui/Button'
import { SuccessScreen } from '@/components/ui/SuccessScreen'
import { EmptyState } from '@/components/ui/States'
import { PaymentSubmitSheet } from '@/components/domain/PaymentSubmitSheet'
import { formatMoney, relativeDayTime, toFa } from '@/lib/format'
import { isSaleDisplayable, saleCustomerName, saleProductName } from '@/lib/saleDisplay'
import { haptic } from '@/lib/telegram'
import type { PaymentMethod, Sale } from '@/types'

export function PendingPaymentsScreen() {
  const currentAgentId = useStore((s) => s.currentAgentId)
  const sales = useStore((s) => s.sales.filter((s2) => s2.agentId === currentAgentId && s2.status === 'payment_pending'))
  const leads = useStore((s) => s.leads)
  const products = useStore((s) => s.products)
  const submitPayment = useStore((s) => s.submitPayment)

  const [paySheet, setPaySheet] = useState<Sale | null>(null)
  const [success, setSuccess] = useState(false)

  const leadOf = (id: string) => leads.find((l) => l.id === id)
  const productOf = (id: string) => products.find((p) => p.id === id)

  return (
    <Page withNav={false}>
      <TopBar title="پرداخت‌های در انتظار" subtitle={`${toFa(sales.length)} فروش منتظر ثبت پرداخت`} />

      <div className="space-y-3 px-4">
        {sales.length === 0 ? (
          <EmptyState
            title="پرداخت در انتظاری نداری"
            description="وقتی نتیجه تماس «پرداخت در انتظار» ثبت شود، اینجا نمایش داده می‌شود."
          />
        ) : (
          sales
            .filter((sale) => {
              const lead = leadOf(sale.leadId)
              const product = productOf(sale.productId)
              return isSaleDisplayable(sale, lead, product)
            })
            .map((sale) => {
            const lead = leadOf(sale.leadId)
            const product = productOf(sale.productId)
            const customerName = saleCustomerName(sale, lead)!
            const productName = saleProductName(sale, product)!
            return (
              <div key={sale.id} className="rounded-2xl border border-warning-200/70 bg-warning-50/40 p-3.5 shadow-card">
                <div className="flex items-center gap-3">
                  {lead ? <LeadAvatar lead={lead} size={44} /> : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-extrabold text-neutral-900">
                      {customerName}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-bold text-warning-600">
                      <Clock size={11} />
                      {relativeDayTime(sale.createdAt)}
                    </p>
                  </div>
                  <p className="shrink-0 text-[13px] font-black tabular-nums text-neutral-900">
                    {formatMoney(sale.amount)} <span className="text-[10px] font-bold text-neutral-400">تومان</span>
                  </p>
                </div>
                <p className="mt-2 truncate text-[11px] font-bold text-neutral-400">{productName}</p>
                <Button full size="sm" className="mt-3" icon={<Wallet size={14} />} onClick={() => setPaySheet(sale)}>
                  ثبت پرداخت این فروش
                </Button>
              </div>
            )
          })
        )}
      </div>

      <PaymentSubmitSheet
        sale={paySheet}
        open={!!paySheet}
        onClose={() => setPaySheet(null)}
        onSubmit={(method: PaymentMethod, reference: string) => {
          if (!paySheet) return
          haptic('success')
          submitPayment(paySheet.id, method, reference)
          setPaySheet(null)
          setSuccess(true)
        }}
      />

      <AnimatePresence>
        {success && (
          <SuccessScreen
            title="پرداخت ثبت شد"
            description="این فروش برای تایید سوپروایزر ارسال شد."
            icon={Check}
            primaryLabel="باشه"
            onPrimary={() => setSuccess(false)}
          />
        )}
      </AnimatePresence>
    </Page>
  )
}
