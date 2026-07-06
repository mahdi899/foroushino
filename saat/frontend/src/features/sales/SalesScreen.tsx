import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import {
  BadgeDollarSign,
  Wallet,
  Check,
  X,
  ChevronLeft,
  Ban,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Chip, type ChipTone } from '@/components/ui/Chip'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { SuccessScreen } from '@/components/ui/SuccessScreen'
import { EmptyState } from '@/components/ui/States'
import { PaymentSubmitSheet } from '@/components/domain/PaymentSubmitSheet'
import { saleStatusLabels, saleStatusTone } from '@/data/labels'
import { formatMoney, relativeDayTime, toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import type { PaymentMethod, Sale, SaleStatus } from '@/types'
import { cn } from '@/lib/cn'

type Filter = 'all' | SaleStatus

const MANAGER_ROLES = ['leader', 'supervisor', 'manager']

const filters: { id: Filter; label: string; tone: ChipTone }[] = [
  { id: 'all', label: 'همه', tone: 'neutral' },
  { id: 'payment_pending', label: 'در انتظار پرداخت', tone: 'warm' },
  { id: 'pending_confirmation', label: 'در انتظار تایید', tone: 'primary' },
  { id: 'confirmed', label: 'تایید شده', tone: 'primary' },
  { id: 'rejected', label: 'رد شده', tone: 'error' },
  { id: 'cancelled', label: 'کنسل شده', tone: 'neutral' },
]

export function SalesScreen() {
  const navigate = useNavigate()
  const role = useStore((s) => s.role)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const sales = useStore((s) => s.sales)
  const leads = useStore((s) => s.leads)
  const products = useStore((s) => s.products)
  const submitPayment = useStore((s) => s.submitPayment)
  const confirmSale = useStore((s) => s.confirmSale)
  const rejectSale = useStore((s) => s.rejectSale)
  const cancelSale = useStore((s) => s.cancelSale)
  const pushToast = useStore((s) => s.pushToast)

  const isManager = MANAGER_ROLES.includes(role)
  const [filter, setFilter] = useState<Filter>('all')
  const [paySheet, setPaySheet] = useState<Sale | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<Sale | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Sale | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [cancelTarget, setCancelTarget] = useState<Sale | null>(null)
  const [success, setSuccess] = useState<'payment' | 'confirmed' | null>(null)

  const visible = isManager ? sales : sales.filter((s) => s.agentId === currentAgentId)
  const filtered = filter === 'all' ? visible : visible.filter((s) => s.status === filter)

  const counts: Record<Filter, number> = {
    all: visible.length,
    draft: 0,
    payment_pending: visible.filter((s) => s.status === 'payment_pending').length,
    payment_submitted: 0,
    pending_confirmation: visible.filter((s) => s.status === 'pending_confirmation').length,
    confirmed: visible.filter((s) => s.status === 'confirmed').length,
    rejected: visible.filter((s) => s.status === 'rejected').length,
    cancelled: visible.filter((s) => s.status === 'cancelled').length,
    refunded: 0,
  }

  const leadOf = (id: string) => leads.find((l) => l.id === id)
  const productOf = (id: string) => products.find((p) => p.id === id)

  return (
    <Page withNav={false}>
      <ScreenHeader
        sticky
        title="فروش‌های من"
        subtitle={`${toFa(visible.length)} فروش`}
        icon={BadgeDollarSign}
        iconTone="success"
        className="pb-2"
        action={
          !isManager && (
            <button
              onClick={() => navigate('/sales/pending-payments')}
              className="flex h-10 items-center gap-1.5 rounded-full bg-warning-50 px-3 text-[11px] font-extrabold text-warning-700"
            >
              <Wallet size={13} />
              پرداخت‌های در انتظار
            </button>
          )
        }
      >
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto overflow-y-visible px-1 py-1.5 no-scrollbar">
          {filters.map((f) => (
            <Chip key={f.id} active={filter === f.id} tone={f.tone} onClick={() => setFilter(f.id)}>
              {f.label}
              {counts[f.id] > 0 && (
                <span
                  className={cn(
                    'mr-0.5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                    filter === f.id ? 'bg-white/25' : 'bg-black/5',
                  )}
                >
                  {toFa(counts[f.id])}
                </span>
              )}
            </Chip>
          ))}
        </div>
      </ScreenHeader>

      <div className="space-y-3 px-4 pt-3">
        {filtered.length === 0 ? (
          <EmptyState title="فروشی پیدا نشد" description="فیلتر را تغییر بده." />
        ) : (
          filtered.map((sale) => {
            const lead = leadOf(sale.leadId)
            const product = productOf(sale.productId)
            return (
              <div key={sale.id} className="rounded-2xl border border-border/60 bg-surface p-3.5 shadow-card">
                <button
                  onClick={() => lead && navigate(`/leads/${lead.id}`)}
                  className="flex w-full items-center gap-3 text-right"
                >
                  {lead && (
                    <Avatar id={lead.id} first={lead.firstName} last={lead.lastName} src={lead.avatar} size={44} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-extrabold text-neutral-900">
                      {lead ? `${lead.firstName} ${lead.lastName}` : 'سرنخ نامشخص'}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-bold text-neutral-400">
                      {product?.name ?? 'محصول'} · {relativeDayTime(sale.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-left">
                    <p className="text-[13px] font-black tabular-nums text-neutral-900">
                      {formatMoney(sale.amount)}
                    </p>
                    <Badge tone={saleStatusTone[sale.status]} size="sm" className="mt-1">
                      {saleStatusLabels[sale.status]}
                    </Badge>
                  </div>
                </button>

                {sale.status === 'rejected' && sale.rejectionReason && (
                  <p className="mt-2.5 rounded-lg bg-error-50 px-2.5 py-1.5 text-[11px] font-bold text-error-600">
                    دلیل رد: {sale.rejectionReason}
                  </p>
                )}

                {!isManager && sale.status === 'payment_pending' && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="soft"
                      size="sm"
                      className="!bg-error-50 !text-error-600"
                      icon={<Ban size={14} />}
                      onClick={() => setCancelTarget(sale)}
                    >
                      لغو فروش
                    </Button>
                    <Button size="sm" className="flex-1" icon={<Wallet size={14} />} onClick={() => setPaySheet(sale)}>
                      ثبت پرداخت
                    </Button>
                  </div>
                )}

                {!isManager && sale.status === 'pending_confirmation' && (
                  <p className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-primary-50 px-2.5 py-1.5 text-[11px] font-extrabold text-primary-600">
                    <Clock size={12} />
                    در انتظار تایید سوپروایزر است
                  </p>
                )}

                {isManager && sale.status === 'pending_confirmation' && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="soft"
                      size="sm"
                      className="flex-1 !bg-error-50 !text-error-600"
                      icon={<X size={14} />}
                      onClick={() => setRejectTarget(sale)}
                    >
                      رد فروش
                    </Button>
                    <Button size="sm" className="flex-1" icon={<Check size={14} />} onClick={() => setConfirmTarget(sale)}>
                      تایید فروش
                    </Button>
                  </div>
                )}
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
          setSuccess('payment')
        }}
      />

      <ConfirmModal
        open={!!confirmTarget}
        title="تایید فروش"
        description="با تایید این فروش، پورسانت به‌صورت معلق برای فروشنده ثبت می‌شود."
        icon={ShieldCheck}
        tone="success"
        confirmLabel="تایید فروش"
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (!confirmTarget) return
          haptic('success')
          confirmSale(confirmTarget.id)
          setConfirmTarget(null)
          setSuccess('confirmed')
        }}
      />

      <BottomSheet open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="دلیل رد فروش">
        <div className="space-y-3 pt-1">
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="دلیل رد فروش را بنویس..."
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-neutral-50 p-3 text-[13px] font-bold text-neutral-800 outline-none focus:border-primary-400"
          />
          <Button
            full
            size="lg"
            className="!bg-error-600"
            disabled={!rejectReason.trim()}
            onClick={() => {
              if (!rejectTarget) return
              haptic('warning')
              rejectSale(rejectTarget.id, rejectReason.trim())
              pushToast('فروش رد شد')
              setRejectTarget(null)
              setRejectReason('')
            }}
          >
            ثبت رد فروش
          </Button>
        </div>
      </BottomSheet>

      <ConfirmModal
        open={!!cancelTarget}
        title="لغو این فروش؟"
        description="این فروش به‌طور کامل لغو می‌شود و قابل بازگشت نیست."
        icon={Ban}
        tone="error"
        confirmLabel="بله، لغو کن"
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => {
          if (!cancelTarget) return
          haptic('warning')
          cancelSale(cancelTarget.id)
          pushToast('فروش لغو شد')
          setCancelTarget(null)
        }}
      />

      <AnimatePresence>
        {success === 'payment' && (
          <SuccessScreen
            title="پرداخت ثبت شد"
            description="فروش برای تایید سوپروایزر ارسال شد. به‌محض تایید، پورسانت تو به‌صورت معلق ثبت می‌شود."
            icon={Check}
            primaryLabel="بازگشت به فروش‌ها"
            onPrimary={() => setSuccess(null)}
          />
        )}
        {success === 'confirmed' && (
          <SuccessScreen
            title="فروش تایید شد"
            description="پورسانت این فروش به‌صورت معلق در کیف پول فروشنده ثبت شد."
            icon={ShieldCheck}
            primaryLabel="باشه"
            onPrimary={() => setSuccess(null)}
          />
        )}
      </AnimatePresence>

      {!isManager && (
        <button
          onClick={() => navigate('/wallet')}
          className="fixed inset-x-4 bottom-[calc(16px+var(--safe-bottom))] z-30 mx-auto flex h-12 max-w-[200px] items-center justify-center gap-1.5 rounded-2xl bg-neutral-900 text-[12.5px] font-extrabold text-white shadow-float"
        >
          <Wallet size={15} />
          مشاهده کیف پول
          <ChevronLeft size={14} />
        </button>
      )}
    </Page>
  )
}
