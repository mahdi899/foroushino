import { useNavigate, useParams } from 'react-router-dom'
import { Percent, Calendar, Package, User, BadgeCheck, CircleAlert } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/States'
import { commissionStatusLabels } from '@/data/labels'
import { formatMoney, formatJalaliDate, relativeDayTime } from '@/lib/format'

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

      <div className="space-y-4 px-4">
        <div className="rounded-3xl bg-gradient-to-br from-success-600 to-success-500 p-5 text-center text-white shadow-float">
          <p className="text-[12px] font-bold text-white/80">مبلغ پورسانت</p>
          <p className="mt-1.5 text-3xl font-black tabular-nums">
            {formatMoney(commission.commissionAmount)} <span className="text-sm font-bold">تومان</span>
          </p>
          <Badge tone="neutral" className="mt-3 !bg-white/20 !text-white">
            {commissionStatusLabels[commission.status]}
          </Badge>
        </div>

        {lead && (
          <button
            onClick={() => navigate(`/leads/${lead.id}`)}
            className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3.5 text-right shadow-card"
          >
            <Avatar id={lead.id} first={lead.firstName} last={lead.lastName} src={lead.avatar} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-extrabold text-neutral-900">
                {lead.firstName} {lead.lastName}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-bold text-neutral-400">
                فروش به مبلغ {formatMoney(commission.saleAmount)} تومان
              </p>
            </div>
          </button>
        )}

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-card">
          {rows.map((r, i) => (
            <div
              key={r.label}
              className={
                'flex items-center gap-3 px-4 py-3.5 ' + (i < rows.length - 1 ? 'border-b border-border/60' : '')
              }
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                <r.icon size={15} />
              </span>
              <span className="flex-1 text-[12.5px] font-bold text-neutral-500">{r.label}</span>
              <span className="text-[13px] font-extrabold text-neutral-900">{r.value}</span>
            </div>
          ))}
        </div>

        {commission.status === 'pending' && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-warning-50 p-3.5">
            <CircleAlert size={16} className="mt-0.5 shrink-0 text-warning-600" />
            <p className="text-[12px] font-bold leading-6 text-warning-700">
              این پورسانت هنوز معلق است و پس از بازه انتظار (سه روز) به‌صورت خودکار قابل برداشت می‌شود.
            </p>
          </div>
        )}
        {commission.status === 'available' && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-success-50 p-3.5">
            <BadgeCheck size={16} className="mt-0.5 shrink-0 text-success-600" />
            <p className="text-[12px] font-bold leading-6 text-success-700">
              این پورسانت قابل برداشت است و می‌توانی برای آن درخواست تسویه ثبت کنی.
            </p>
          </div>
        )}
        {commission.status === 'rejected' && commission.rejectionReason && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-error-50 p-3.5">
            <CircleAlert size={16} className="mt-0.5 shrink-0 text-error-600" />
            <p className="text-[12px] font-bold leading-6 text-error-700">{commission.rejectionReason}</p>
          </div>
        )}

        {sale && (
          <button
            onClick={() => navigate('/sales')}
            className="w-full rounded-2xl border border-dashed border-border py-3 text-center text-[12px] font-extrabold text-primary-600"
          >
            مشاهده فروش مرتبط
          </button>
        )}
      </div>
    </Page>
  )
}
