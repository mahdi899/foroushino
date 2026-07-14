import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BadgeDollarSign,
  Wallet,
  Check,
  X,
  ChevronLeft,
  Ban,
  Clock,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Chip, type ChipTone } from '@/components/ui/Chip'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { SuccessScreen } from '@/components/ui/SuccessScreen'
import { EmptyState } from '@/components/ui/States'
import { PaymentSubmitSheet } from '@/components/domain/PaymentSubmitSheet'
import { saleStatusLabels, saleStatusTone } from '@/data/labels'
import { formatMoney, relativeDayTime, toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import type { Lead, PaymentMethod, Product, Sale, SaleStatus } from '@/types'
import { cn } from '@/lib/cn'
import { DataGate } from '@/components/pwa/DataGate'

type Filter = 'all' | SaleStatus

import { isManagementRole } from '@/lib/roles'
import { hasPermission } from '@/lib/permissions'
const TG = 'text-[#3390EC] dark:text-[#8774E1]'
const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }

const filters: { id: Filter; label: string; tone: ChipTone }[] = [
  { id: 'all', label: 'همه', tone: 'neutral' },
  { id: 'payment_pending', label: 'در انتظار پرداخت', tone: 'warm' },
  { id: 'pending_confirmation', label: 'در انتظار تایید', tone: 'primary' },
  { id: 'confirmed', label: 'تایید شده', tone: 'primary' },
  { id: 'rejected', label: 'رد شده', tone: 'error' },
  { id: 'cancelled', label: 'کنسل شده', tone: 'neutral' },
]

const statusGlow: Partial<Record<SaleStatus, string>> = {
  confirmed: 'bg-emerald-400/16 dark:bg-emerald-400/12',
  payment_pending: 'bg-amber-400/18 dark:bg-amber-400/12',
  pending_confirmation: 'bg-[#3390EC]/14 dark:bg-[#8774E1]/14',
  rejected: 'bg-red-400/14 dark:bg-red-400/10',
  cancelled: 'bg-neutral-400/10',
}

const listStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}

const cardFadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: spring },
}

function GlassActionBtn({
  label,
  icon: Icon,
  variant = 'primary',
  className,
  disabled,
  onClick,
}: {
  label: string
  icon: LucideIcon
  variant?: 'primary' | 'danger' | 'soft'
  className?: string
  disabled?: boolean
  onClick: () => void
}) {
  const styles = {
    primary: cn(
      'bg-[#3390EC] text-white shadow-[0_6px_20px_rgba(51,144,236,0.28)]',
      'dark:bg-[#8774E1] dark:shadow-[0_6px_20px_rgba(135,116,225,0.24)]',
    ),
    danger: cn(
      'border border-red-500/25 bg-red-500/10 text-red-600',
      'dark:border-red-400/20 dark:text-red-400 dark:bg-red-500/12',
    ),
    soft: cn(
      'glass-inset border border-white/55 text-text-muted',
      'dark:border-white/10',
    ),
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        disabled && 'pointer-events-none opacity-45',
        'relative inline-flex h-9 flex-1 items-center justify-center gap-1.5 overflow-hidden',
        'rounded-[13px] text-[12px] font-bold',
        styles[variant],
        className,
      )}
    >
      {variant === 'primary' && (
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/10" />
      )}
      <Icon size={14} strokeWidth={2.35} className="relative shrink-0" />
      <span className="relative">{label}</span>
    </motion.button>
  )
}

function SaleCard({
  sale,
  lead,
  product,
  isTeamViewer,
  canConfirmSales,
  onLeadClick,
  onPay,
  onCancel,
  onConfirm,
  onReject,
}: {
  sale: Sale
  lead?: Lead
  product?: Product
  isTeamViewer: boolean
  canConfirmSales: boolean
  onLeadClick: () => void
  onPay: () => void
  onCancel: () => void
  onConfirm: () => void
  onReject: () => void
}) {
  const glow = statusGlow[sale.status]

  return (
    <motion.div
      variants={cardFadeUp}
      layout
      className={cn(
        'glass-card relative overflow-hidden rounded-[22px] border border-white/55 p-4',
        'dark:border-white/10',
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        {glow && (
          <div className={cn('absolute -left-8 -top-8 h-28 w-28 rounded-full blur-3xl', glow)} />
        )}
        <div className="absolute -bottom-10 -right-8 h-24 w-24 rounded-full bg-[#8774E1]/8 blur-3xl" />
        <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/85 to-transparent dark:via-white/12" />
      </div>

      <button type="button" onClick={onLeadClick} className="relative flex w-full items-center gap-3 text-right">
        {lead ? (
          <Avatar id={lead.id} first={lead.firstName} last={lead.lastName} src={lead.avatar} size={48} ring />
        ) : (
          <span className="icon-3d icon-3d-primary flex h-12 w-12 shrink-0 items-center justify-center">
            <BadgeDollarSign size={20} className="text-white" strokeWidth={2.25} />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-text">
            {lead ? `${lead.firstName} ${lead.lastName}` : 'سرنخ نامشخص'}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-text-soft">
            {product?.name ?? 'محصول'} · {relativeDayTime(sale.createdAt)}
          </p>
        </div>

        <div className="shrink-0 text-left">
          <p className={cn('text-[14px] font-black tabular-nums leading-none', TG)}>{formatMoney(sale.amount)}</p>
          <Badge tone={saleStatusTone[sale.status]} size="sm" className="mt-1.5">
            {saleStatusLabels[sale.status]}
          </Badge>
        </div>
      </button>

      {sale.status === 'rejected' && sale.rejectionReason && (
        <div
          className={cn(
            'relative mt-3 rounded-[14px] border border-red-500/20 px-3 py-2',
            'bg-red-500/8 text-[11px] font-semibold text-red-600 dark:text-red-400',
          )}
        >
          دلیل رد: {sale.rejectionReason}
        </div>
      )}

      {!isTeamViewer && sale.status === 'payment_pending' && (
        <div className="relative mt-3 flex gap-2">
          <GlassActionBtn label="لغو فروش" icon={Ban} variant="danger" onClick={onCancel} />
          <GlassActionBtn label="ثبت پرداخت" icon={Wallet} variant="primary" onClick={onPay} />
        </div>
      )}

      {!isTeamViewer && sale.status === 'pending_confirmation' && (
        <div
          className={cn(
            'relative mt-3 flex items-center gap-2 rounded-[14px] border px-3 py-2',
            'border-[#3390EC]/20 bg-[#3390EC]/8 dark:border-[#8774E1]/22 dark:bg-[#8774E1]/10',
          )}
        >
          <Clock size={13} className={cn('shrink-0', TG)} strokeWidth={2.35} />
          <p className={cn('text-[11px] font-bold', TG)}>در انتظار تایید سوپروایزر است</p>
        </div>
      )}

      {isTeamViewer && !canConfirmSales && sale.status === 'pending_confirmation' && (
        <div
          className={cn(
            'relative mt-3 flex items-center gap-2 rounded-[14px] border px-3 py-2',
            'border-[#3390EC]/20 bg-[#3390EC]/8 dark:border-[#8774E1]/22 dark:bg-[#8774E1]/10',
          )}
        >
          <Clock size={13} className={cn('shrink-0', TG)} strokeWidth={2.35} />
          <p className={cn('text-[11px] font-bold', TG)}>در انتظار تایید سوپروایزر است</p>
        </div>
      )}

      {canConfirmSales && sale.status === 'pending_confirmation' && (
        <div className="relative mt-3 flex gap-2">
          <GlassActionBtn label="رد فروش" icon={X} variant="danger" onClick={onReject} />
          <GlassActionBtn label="تایید فروش" icon={Check} variant="primary" onClick={onConfirm} />
        </div>
      )}
    </motion.div>
  )
}

export function SalesScreen() {
  const navigate = useNavigate()
  const role = useStore((s) => s.role)
  const permissions = useStore((s) => s.permissions)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const sales = useStore((s) => s.sales)
  const leads = useStore((s) => s.leads)
  const products = useStore((s) => s.products)
  const submitPayment = useStore((s) => s.submitPayment)
  const confirmSale = useStore((s) => s.confirmSale)
  const rejectSale = useStore((s) => s.rejectSale)
  const cancelSale = useStore((s) => s.cancelSale)
  const pushToast = useStore((s) => s.pushToast)

  const isTeamViewer = isManagementRole(role)
  const canConfirmSales = hasPermission(permissions, 'sales.confirm')
  const [filter, setFilter] = useState<Filter>('all')
  const [paySheet, setPaySheet] = useState<Sale | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<Sale | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Sale | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [cancelTarget, setCancelTarget] = useState<Sale | null>(null)
  const [success, setSuccess] = useState<'payment' | 'confirmed' | null>(null)

  const visible = isTeamViewer ? sales : sales.filter((s) => s.agentId === currentAgentId)
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

  const pendingPayCount = counts.payment_pending

  const leadOf = (id: string) => leads.find((l) => l.id === id)
  const productOf = (id: string) => products.find((p) => p.id === id)

  return (
    <Page withNav={false}>
      <ScreenHeader
        sticky
        showBack
        title={isTeamViewer ? 'فروش‌ها' : 'فروش‌های من'}
        subtitle={`${toFa(visible.length)} فروش`}
        icon={BadgeDollarSign}
        iconTone="success"
        className="pb-2"
        action={
          !isTeamViewer && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/sales/pending-payments')}
              className={cn(
                'glass-inset relative flex h-10 items-center gap-1.5 overflow-hidden rounded-full',
                'border border-amber-500/25 px-3 text-[11px] font-bold text-amber-700',
                'dark:border-amber-400/22 dark:text-amber-300',
              )}
            >
              <Wallet size={14} strokeWidth={2.35} />
              <span>پرداخت‌های در انتظار</span>
              {pendingPayCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black tabular-nums text-white">
                  {toFa(pendingPayCount)}
                </span>
              )}
            </motion.button>
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
                    'mr-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                    filter === f.id ? 'bg-white/25' : 'bg-black/[0.06] dark:bg-white/10',
                  )}
                >
                  {toFa(counts[f.id])}
                </span>
              )}
            </Chip>
          ))}
        </div>
      </ScreenHeader>

      <DataGate mode="placeholder">
      <motion.div
        variants={listStagger}
        initial="hidden"
        animate="show"
        className="space-y-3 px-4 pt-3 pb-24"
      >
        {filtered.length === 0 ? (
          <EmptyState title="فروشی پیدا نشد" description="فیلتر را تغییر بده." />
        ) : (
          filtered.map((sale) => {
            const lead = leadOf(sale.leadId)
            const product = productOf(sale.productId)
            return (
              <SaleCard
                key={sale.id}
                sale={sale}
                lead={lead}
                product={product}
                isTeamViewer={isTeamViewer}
                canConfirmSales={canConfirmSales}
                onLeadClick={() => lead && navigate(`/leads/${lead.id}`)}
                onPay={() => setPaySheet(sale)}
                onCancel={() => setCancelTarget(sale)}
                onConfirm={() => setConfirmTarget(sale)}
                onReject={() => setRejectTarget(sale)}
              />
            )
          })
        )}
      </motion.div>
      </DataGate>

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
            className={cn(
              'w-full resize-none rounded-[16px] border border-white/55 bg-white/40 p-3',
              'text-[13px] font-semibold text-text outline-none backdrop-blur-xl',
              'focus:border-[#3390EC]/40 dark:border-white/10 dark:bg-white/[0.06]',
              'dark:focus:border-[#8774E1]/40',
            )}
          />
          <GlassActionBtn
            label="ثبت رد فروش"
            icon={X}
            variant="danger"
            disabled={!rejectReason.trim()}
            className="!h-12 !w-full !flex-none !text-[14px]"
            onClick={() => {
              if (!rejectTarget || !rejectReason.trim()) return
              haptic('warning')
              rejectSale(rejectTarget.id, rejectReason.trim())
              pushToast('فروش رد شد')
              setRejectTarget(null)
              setRejectReason('')
            }}
          />
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

      {!isTeamViewer && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/wallet')}
          className={cn(
            'glass-fab fixed inset-x-4 bottom-[calc(16px+var(--safe-bottom))] z-30 mx-auto',
            'flex h-[52px] max-w-[220px] items-center justify-center gap-2 rounded-[18px]',
            'text-[13px] font-bold text-text',
          )}
        >
          <span className="icon-3d icon-3d-primary flex h-8 w-8 items-center justify-center">
            <Wallet size={15} className="text-white" strokeWidth={2.35} />
          </span>
          مشاهده کیف پول
          <ChevronLeft size={15} className="opacity-45" strokeWidth={2.35} />
        </motion.button>
      )}
    </Page>
  )
}
