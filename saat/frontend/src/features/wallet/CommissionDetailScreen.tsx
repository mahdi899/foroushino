import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Percent,
  Calendar,
  Package,
  User,
  BadgeCheck,
  CircleAlert,
  Sparkles,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/States'
import { commissionStatusLabels, commissionStatusTone } from '@/data/labels'
import { formatMoney, formatJalaliDate, relativeDayTime } from '@/lib/format'
import { cn } from '@/lib/cn'

const OK = 'text-emerald-600 dark:text-emerald-400'
const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: spring },
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

function DetailRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="icon-3d icon-3d-primary flex h-8 w-8 shrink-0 items-center justify-center">
        <Icon size={14} className="text-white" strokeWidth={2.35} />
      </span>
      <span className="flex-1 text-[12.5px] font-semibold text-text-soft">{label}</span>
      <span className="text-[13px] font-bold text-text">{value}</span>
    </div>
  )
}

function InfoBanner({
  icon: Icon,
  tone,
  children,
}: {
  icon: LucideIcon
  tone: 'warning' | 'success' | 'error'
  children: React.ReactNode
}) {
  const styles = {
    warning: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    error: 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400',
  }
  const iconClass = {
    warning: 'text-amber-500',
    success: OK,
    error: 'text-red-500',
  }

  return (
    <motion.div
      variants={fadeUp}
      className={cn('flex items-start gap-2.5 rounded-[18px] border p-3.5', styles[tone])}
    >
      <Icon size={16} className={cn('mt-0.5 shrink-0', iconClass[tone])} strokeWidth={2.35} />
      <p className="text-[12px] font-semibold leading-6">{children}</p>
    </motion.div>
  )
}

export function CommissionDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const commission = useStore((s) => s.commissions.find((c) => c.id === id))
  const lead = useStore((s) => s.leads.find((l) => l.id === commission?.leadId))
  const product = useStore((s) => s.products.find((p) => p.id === commission?.productId))
  const sale = useStore((s) => s.sales.find((sl) => sl.id === commission?.saleId))

  if (!commission) {
    return (
      <Page withNav={false}>
        <TopBar title="جزئیات پورسانت" />
        <EmptyState title="پورسانت پیدا نشد" />
      </Page>
    )
  }

  const rows = [
    { icon: Package, label: 'محصول', value: product?.name ?? '—' },
    { icon: User, label: 'مشتری', value: lead ? `${lead.firstName} ${lead.lastName}` : '—' },
    { icon: Percent, label: 'نرخ پورسانت', value: `${commission.commissionRate}٪` },
    { icon: Calendar, label: 'تاریخ ثبت', value: formatJalaliDate(new Date(commission.createdAt)) },
  ]

  return (
    <Page withNav={false}>
      <TopBar title="جزئیات پورسانت" subtitle={relativeDayTime(commission.createdAt)} />

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4 px-4 pb-6">
        <motion.div
          variants={fadeUp}
          className="glass-hero glass-hero-success relative overflow-hidden rounded-[26px] p-5 text-center"
        >
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -left-14 -top-16 h-48 w-48 rounded-full bg-emerald-400/22 blur-3xl"
            />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/75 to-transparent dark:via-white/12" />
          </div>

          <p className="relative flex items-center justify-center gap-1.5 text-[12px] font-semibold text-text-soft">
            <Sparkles size={13} className={OK} strokeWidth={2.25} />
            مبلغ پورسانت
          </p>
          <p className="relative mt-1.5 text-[32px] font-black tabular-nums leading-none text-text">
            {formatMoney(commission.commissionAmount)}{' '}
            <span className="text-[14px] font-bold text-text-muted">تومان</span>
          </p>
          <Badge tone={commissionStatusTone[commission.status]} className="relative mt-3">
            {commissionStatusLabels[commission.status]}
          </Badge>
        </motion.div>

        {lead && (
          <motion.button
            variants={fadeUp}
            type="button"
            whileTap={{ scale: 0.985 }}
            onClick={() => navigate(`/leads/${lead.id}`)}
            className={cn(
              'glass-card flex w-full items-center gap-3 rounded-[22px] border border-white/55 p-4 text-right',
              'dark:border-white/10',
            )}
          >
            <Avatar id={lead.id} first={lead.firstName} last={lead.lastName} src={lead.avatar} size={48} ring />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-text">
                {lead.firstName} {lead.lastName}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-text-soft">
                فروش به مبلغ {formatMoney(commission.saleAmount)} تومان
              </p>
            </div>
            <ChevronLeft size={16} className="shrink-0 text-text-soft opacity-40" strokeWidth={2.25} />
          </motion.button>
        )}

        <motion.div
          variants={fadeUp}
          className="glass-card overflow-hidden rounded-[22px] border border-white/55 dark:border-white/10"
        >
          {rows.map((r, i) => (
            <div key={r.label} className={i < rows.length - 1 ? 'border-b border-white/40 dark:border-white/8' : ''}>
              <DetailRow icon={r.icon} label={r.label} value={r.value} />
            </div>
          ))}
        </motion.div>

        {commission.status === 'pending' && (
          <InfoBanner icon={CircleAlert} tone="warning">
            این پورسانت هنوز معلق است و پس از بازه انتظار (سه روز) به‌صورت خودکار قابل برداشت می‌شود.
          </InfoBanner>
        )}
        {commission.status === 'available' && (
          <InfoBanner icon={BadgeCheck} tone="success">
            این پورسانت قابل برداشت است و می‌توانی برای آن درخواست تسویه ثبت کنی.
          </InfoBanner>
        )}
        {commission.status === 'rejected' && commission.rejectionReason && (
          <InfoBanner icon={CircleAlert} tone="error">
            {commission.rejectionReason}
          </InfoBanner>
        )}

        {sale && (
          <motion.button
            variants={fadeUp}
            type="button"
            whileTap={{ scale: 0.985 }}
            onClick={() => navigate('/sales')}
            className={cn(
              'glass-inset w-full rounded-[18px] border border-dashed border-white/55 py-3',
              'text-center text-[12px] font-bold text-[#3390EC] dark:border-white/10 dark:text-[#8774E1]',
            )}
          >
            مشاهده فروش مرتبط
          </motion.button>
        )}
      </motion.div>
    </Page>
  )
}
