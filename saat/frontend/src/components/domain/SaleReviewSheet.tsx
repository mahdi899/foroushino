import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BadgeDollarSign,
  Check,
  Clock,
  Phone,
  Users,
  X,
  ListTree,
  UserRound,
} from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Avatar } from '@/components/ui/Avatar'
import { apiMode } from '@/services'
import { fetchLeadTimeline } from '@/services/leadTimeline'
import {
  buildSaleReviewDossier,
  buildTimelineFromStore,
  type SaleReviewDossier,
  type SaleReviewTimelineItem,
} from '@/lib/saleReview'
import { formatDuration, formatMoney, relativeDayTime, toFa } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Agent, Call, Commission, Followup, Lead, Payment, Product, Sale, Team } from '@/types'

const TG = 'text-[#3390EC] dark:text-[#8774E1]'

const timelineDot: Record<SaleReviewTimelineItem['kind'], string> = {
  call: 'bg-[#3390EC] dark:bg-[#8774E1]',
  status: 'bg-neutral-500',
  followup: 'bg-amber-500',
  sale: 'bg-emerald-500',
  payment: 'bg-violet-500',
}

interface SaleReviewSheetProps {
  sale: Sale | null
  lead?: Lead
  product?: Product
  agents: Agent[]
  teams: Team[]
  calls: Call[]
  followups: Followup[]
  sales: Sale[]
  payments: Payment[]
  open: boolean
  onClose: () => void
  onConfirm: () => void
  onReject: () => void
  /** Commission approval context — shows payout breakdown above the dossier. */
  commission?: Commission
  title?: string
  confirmLabel?: string
  rejectLabel?: string
  loadingExternal?: boolean
}

export function SaleReviewSheet({
  sale,
  lead,
  product,
  agents,
  teams,
  calls,
  followups,
  sales,
  payments,
  open,
  onClose,
  onConfirm,
  onReject,
  commission,
  title = 'گزارش پرونده فروش',
  confirmLabel = 'تایید نهایی فروش',
  rejectLabel = 'رد فروش',
  loadingExternal = false,
}: SaleReviewSheetProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dossier, setDossier] = useState<SaleReviewDossier | null>(null)

  useEffect(() => {
    if (!open || !sale) {
      setDossier(null)
      setError(null)
      return
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const timeline =
          apiMode === 'http'
            ? await fetchLeadTimeline(sale.leadId)
            : buildTimelineFromStore({
                leadId: sale.leadId,
                calls,
                followups,
                sales,
                lead,
              })

        if (cancelled) return

        setDossier(
          buildSaleReviewDossier({
            sale,
            lead,
            product,
            agents,
            teams,
            payments,
            timeline,
          }),
        )
      } catch {
        if (!cancelled) {
          setError('بارگذاری پرونده فروش ناموفق بود.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [open, sale, lead, product, agents, teams, calls, followups, sales, payments])

  const saleAgent = useMemo(
    () => (sale ? agents.find((agent) => agent.id === sale.agentId) : undefined),
    [agents, sale],
  )

  if (!open) return null

  return (
    <BottomSheet open={open} onClose={onClose} title={title} className="pb-0">
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-[calc(12px+var(--safe-bottom))]">
        {sale && (
          <div className="glass-card mb-4 rounded-[20px] border border-white/55 p-4 dark:border-white/10">
            <div className="flex items-start gap-3">
              <span className="icon-3d icon-3d-primary flex h-12 w-12 shrink-0 items-center justify-center">
                <BadgeDollarSign size={20} className="text-white" strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-black text-text">
                  {dossier?.customerName ?? lead?.firstName ?? sale.leadName ?? 'مشتری'}
                </p>
                <p className="mt-0.5 truncate text-[12px] font-semibold text-text-soft">
                  {dossier?.productName ?? product?.name ?? sale.productName ?? 'محصول'}
                </p>
                <p className={cn('mt-2 text-[18px] font-black tabular-nums', TG)}>
                  {formatMoney(dossier?.amount ?? sale.amount)}
                  <span className="mr-1 text-[11px] font-bold text-text-soft">تومان</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {commission && (
          <div className="glass-inset mb-4 rounded-[18px] border border-emerald-500/20 bg-emerald-500/6 p-3.5 dark:border-emerald-400/18">
            <p className="text-[11px] font-bold text-text-soft">جزئیات پورسانت</p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
              <div>
                <p className="font-semibold text-text-soft">کارشناس</p>
                <p className="font-bold text-text">{commission.agentName ?? '—'}</p>
              </div>
              <div>
                <p className="font-semibold text-text-soft">نرخ پورسانت</p>
                <p className="font-bold text-text">{commission.commissionRate}٪</p>
              </div>
              <div>
                <p className="font-semibold text-text-soft">مبلغ فروش</p>
                <p className="font-black tabular-nums text-text">{formatMoney(commission.saleAmount)}</p>
              </div>
              <div>
                <p className="font-semibold text-text-soft">مبلغ پورسانت</p>
                <p className="font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatMoney(commission.commissionAmount)}
                </p>
              </div>
            </div>
          </div>
        )}

        {(loading || loadingExternal) && (
          <div className="flex flex-col items-center py-10">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            <p className="mt-3 text-[13px] font-semibold text-text-muted">در حال آماده‌سازی گزارش…</p>
          </div>
        )}

        {error && (
          <div className="rounded-[16px] border border-red-500/20 bg-red-500/8 px-4 py-3 text-[12px] font-semibold text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && !loadingExternal && dossier && (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto no-scrollbar">
            <section className="grid grid-cols-2 gap-2">
              <SummaryTile
                icon={UserRound}
                label="کارشناس فروش"
                value={dossier.primaryAgentName}
                sub={dossier.primaryTeamName}
              />
              <SummaryTile
                icon={Clock}
                label="زمان صرف‌شده"
                value={formatDuration(dossier.totalCallSeconds)}
                sub={`${toFa(dossier.totalCalls)} تماس`}
              />
              <SummaryTile
                icon={Phone}
                label="پیگیری‌ها"
                value={toFa(dossier.followupsCount)}
                sub="برنامه‌ریزی‌شده"
              />
              <SummaryTile
                icon={Users}
                label="تیم"
                value={dossier.primaryTeamName}
                sub={`${toFa(dossier.agentStats.length)} کارشناس درگیر`}
              />
            </section>

            {dossier.agentStats.length > 0 && (
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-extrabold text-text">
                  <Users size={14} className={TG} />
                  مشارکت کارشناسان
                </h3>
                <div className="space-y-2">
                  {dossier.agentStats.map((row) => (
                    <div
                      key={row.agentId}
                      className="glass-inset flex items-center gap-3 rounded-[16px] border border-white/55 px-3 py-2.5 dark:border-white/10"
                    >
                      <Avatar
                        id={row.agentId}
                        first={row.agentName.split(' ')[0] ?? ''}
                        last={row.agentName.split(' ').slice(1).join(' ')}
                        size={40}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-text">{row.agentName}</p>
                        <p className="truncate text-[11px] font-semibold text-text-soft">{row.teamName}</p>
                      </div>
                      <div className="shrink-0 text-left">
                        <p className="text-[12px] font-black tabular-nums text-text">
                          {formatDuration(row.totalCallSeconds)}
                        </p>
                        <p className="text-[10px] font-bold text-text-soft">
                          {toFa(row.callsCount)} تماس · {toFa(row.successfulCalls)} موفق
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-extrabold text-text">
                <ListTree size={14} className={TG} />
                مسیر کامل پرونده
              </h3>
              <div className="relative space-y-3 pr-2">
                <div className="absolute bottom-1 right-[15px] top-1 w-px bg-gradient-to-b from-[#3390EC]/30 via-[#3390EC]/15 to-transparent" />
                {dossier.timeline.length === 0 ? (
                  <p className="text-[12px] font-semibold text-text-soft">رویدادی ثبت نشده است.</p>
                ) : (
                  dossier.timeline.map((item) => (
                    <div key={item.id} className="relative flex items-start gap-3">
                      <span
                        className={cn(
                          'relative z-10 mt-0.5 h-[13px] w-[13px] shrink-0 rounded-full ring-2 ring-white/80 dark:ring-black/30',
                          timelineDot[item.kind],
                        )}
                      />
                      <div className="min-w-0 flex-1 pb-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12px] font-extrabold text-text">{item.title}</p>
                          <span className="shrink-0 text-[10px] font-bold tabular-nums text-text-soft">
                            {relativeDayTime(item.at)}
                          </span>
                        </div>
                        {(item.agentName || item.meta) && (
                          <p className="mt-0.5 text-[11px] font-semibold text-text-soft">
                            {[item.agentName, item.meta].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        {item.note && (
                          <p className="mt-1 text-[11px] font-medium leading-5 text-text-muted">{item.note}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {!loading && !loadingExternal && dossier && (
          <div className="mt-4 flex gap-2 border-t border-white/40 pt-4 dark:border-white/10">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                onClose()
                onReject()
              }}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[14px] border border-red-500/25 bg-red-500/10 text-[13px] font-bold text-red-600 dark:text-red-400"
            >
              <X size={15} />
              {rejectLabel}
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onConfirm}
              className={cn(
                'inline-flex h-11 flex-[1.4] items-center justify-center gap-1.5 rounded-[14px]',
                'bg-[#3390EC] text-[13px] font-bold text-white shadow-[0_6px_20px_rgba(51,144,236,0.28)]',
                'dark:bg-[#8774E1]',
              )}
            >
              <Check size={15} />
              {confirmLabel}
            </motion.button>
          </div>
        )}

        {saleAgent && !loading && !loadingExternal && (
          <p className="mt-2 text-center text-[10px] font-semibold text-text-soft">
            ثبت‌کننده فروش: {saleAgent.firstName} {saleAgent.lastName}
          </p>
        )}
      </div>
    </BottomSheet>
  )
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Clock
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="glass-inset rounded-[16px] border border-white/55 p-3 dark:border-white/10">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-text-soft">
        <Icon size={12} className={TG} />
        {label}
      </div>
      <p className="text-[14px] font-black text-text">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] font-semibold text-text-soft">{sub}</p>}
    </div>
  )
}
