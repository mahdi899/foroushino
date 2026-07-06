import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import {
  WalletCards,
  ArrowUpRight,
  Clock,
  Lock,
  TrendingUp,
  CheckCheck,
  ChevronLeft,
  ScrollText,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { Chip } from '@/components/ui/Chip'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SuccessScreen } from '@/components/ui/SuccessScreen'
import { EmptyState } from '@/components/ui/States'
import { PayoutRequestSheet } from '@/components/domain/PayoutRequestSheet'
import { walletTxIcon, walletTxTone } from '@/components/domain/icons'
import {
  commissionStatusLabels,
  commissionStatusTone,
  payoutStatusLabels,
  payoutStatusTone,
  walletTxLabels,
} from '@/data/labels'
import { formatMoney, relativeDayTime, toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

type Tab = 'commissions' | 'transactions' | 'payouts'

export function WalletScreen() {
  const navigate = useNavigate()
  const wallet = useStore((s) => s.wallet)
  const commissions = useStore((s) => s.commissions.filter((c) => c.agentId === s.currentAgentId))
  const walletTx = useStore((s) => s.walletTx)
  const payouts = useStore((s) => s.payouts)
  const leads = useStore((s) => s.leads)
  const requestPayout = useStore((s) => s.requestPayout)
  const pushToast = useStore((s) => s.pushToast)

  const [tab, setTab] = useState<Tab>('commissions')
  const [payoutOpen, setPayoutOpen] = useState(false)
  const [success, setSuccess] = useState(false)

  const leadOf = (id: string) => leads.find((l) => l.id === id)

  return (
    <Page withNav={false}>
      <TopBar
        title="درآمد من"
        subtitle="پورسانت و تسویه حساب"
        action={
          <button onClick={() => navigate('/wallet/rules')} className="text-neutral-400">
            <ScrollText size={19} />
          </button>
        }
      />

      <div className="space-y-4 px-4">
        <div className="rounded-3xl bg-gradient-to-br from-success-600 to-success-500 p-5 text-white shadow-float">
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-white/80">
            <WalletCards size={14} />
            موجودی قابل برداشت
          </p>
          <p className="mt-1.5 text-[28px] font-black tabular-nums">
            {formatMoney(wallet.balanceAvailable)} <span className="text-sm font-bold">تومان</span>
          </p>
          <Button
            size="sm"
            className="mt-3 !bg-white !text-success-700"
            icon={<ArrowUpRight size={14} />}
            onClick={() => setPayoutOpen(true)}
            disabled={wallet.balanceAvailable <= 0}
          >
            درخواست تسویه
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <StatTile icon={Clock} tone="warning" label="پورسانت معلق" value={wallet.balancePending} />
          <StatTile icon={Lock} tone="primary" label="در حال تسویه" value={wallet.balanceLocked} />
          <StatTile icon={TrendingUp} tone="success" label="کل درآمد" value={wallet.totalEarned} />
        </div>

        <div className="flex gap-2">
          <Chip active={tab === 'commissions'} tone="primary" onClick={() => setTab('commissions')}>
            پورسانت‌ها
          </Chip>
          <Chip active={tab === 'transactions'} tone="primary" onClick={() => setTab('transactions')}>
            تراکنش‌ها
          </Chip>
          <Chip active={tab === 'payouts'} tone="primary" onClick={() => setTab('payouts')}>
            تسویه‌ها
          </Chip>
        </div>

        {tab === 'commissions' && (
          <div className="space-y-2.5">
            {commissions.length === 0 ? (
              <EmptyState title="هنوز پورسانتی ثبت نشده" description="بعد از تایید فروش، پورسانت اینجا نمایش داده می‌شود." />
            ) : (
              commissions.map((c) => {
                const lead = leadOf(c.leadId)
                return (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/wallet/commissions/${c.id}`)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3.5 text-right shadow-card"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-extrabold text-neutral-900">
                        {lead ? `${lead.firstName} ${lead.lastName}` : 'فروش'}
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold text-neutral-400">
                        {relativeDayTime(c.createdAt)} · نرخ {toFa(c.commissionRate)}٪
                      </p>
                    </div>
                    <div className="shrink-0 text-left">
                      <p className="text-[13px] font-black tabular-nums text-success-600">
                        +{formatMoney(c.commissionAmount)}
                      </p>
                      <Badge tone={commissionStatusTone[c.status]} size="sm" className="mt-1">
                        {commissionStatusLabels[c.status]}
                      </Badge>
                    </div>
                    <ChevronLeft size={16} className="shrink-0 text-neutral-300" />
                  </button>
                )
              })
            )}
          </div>
        )}

        {tab === 'transactions' && (
          <div className="space-y-2.5">
            {walletTx.length === 0 ? (
              <EmptyState title="تراکنشی ثبت نشده" />
            ) : (
              walletTx.map((tx) => {
                const Icon = walletTxIcon[tx.type]
                const tone = walletTxTone[tx.type]
                const negative = tx.type === 'payout_requested' || tx.type === 'reversal'
                return (
                  <div key={tx.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3.5 shadow-card">
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                        tone === 'success' && 'bg-success-50 text-success-600',
                        tone === 'warning' && 'bg-warning-50 text-warning-600',
                        tone === 'primary' && 'bg-primary-50 text-primary-600',
                        tone === 'error' && 'bg-error-50 text-error-600',
                        tone === 'neutral' && 'bg-neutral-100 text-neutral-500',
                      )}
                    >
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-extrabold text-neutral-900">{tx.description}</p>
                      <p className="mt-0.5 text-[11px] font-bold text-neutral-400">
                        {walletTxLabels[tx.type]} · {relativeDayTime(tx.createdAt)}
                      </p>
                    </div>
                    <p
                      className={cn(
                        'shrink-0 text-[13px] font-black tabular-nums',
                        negative ? 'text-neutral-500' : 'text-success-600',
                      )}
                    >
                      {negative ? '' : '+'}
                      {formatMoney(tx.amount)}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        )}

        {tab === 'payouts' && (
          <div className="space-y-2.5">
            {payouts.length === 0 ? (
              <EmptyState
                title="درخواست تسویه‌ای ثبت نشده"
                description="با رسیدن موجودی به بالای صفر می‌توانی درخواست تسویه بدهی."
              />
            ) : (
              payouts.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3.5 shadow-card">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <CheckCheck size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-extrabold tabular-nums text-neutral-900">
                      {formatMoney(p.amount)} تومان
                    </p>
                    <p className="mt-0.5 text-[11px] font-bold text-neutral-400">{relativeDayTime(p.requestedAt)}</p>
                  </div>
                  <Badge tone={payoutStatusTone[p.status]} size="sm">
                    {payoutStatusLabels[p.status]}
                  </Badge>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <PayoutRequestSheet
        open={payoutOpen}
        onClose={() => setPayoutOpen(false)}
        balanceAvailable={wallet.balanceAvailable}
        onSubmit={(amount) => {
          const res = requestPayout(amount)
          if (res.ok) {
            haptic('success')
            setPayoutOpen(false)
            setSuccess(true)
          } else {
            haptic('error')
            pushToast(res.message ?? 'خطا در ثبت درخواست')
          }
        }}
      />

      <AnimatePresence>
        {success && (
          <SuccessScreen
            title="درخواست تسویه ثبت شد"
            description="درخواست شما برای پرداخت به تیم مالی ارسال شد."
            icon={CheckCheck}
            primaryLabel="باشه"
            onPrimary={() => setSuccess(false)}
          />
        )}
      </AnimatePresence>
    </Page>
  )
}

function StatTile({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof Clock
  tone: 'warning' | 'primary' | 'success'
  label: string
  value: number
}) {
  const toneClass = {
    warning: 'bg-warning-50 text-warning-600',
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
  }[tone]
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-3 text-center shadow-card">
      <span className={cn('mx-auto flex h-8 w-8 items-center justify-center rounded-lg', toneClass)}>
        <Icon size={15} />
      </span>
      <p className="mt-1.5 text-[12.5px] font-black tabular-nums text-neutral-900">{formatMoney(value)}</p>
      <p className="mt-0.5 text-[10px] font-bold text-neutral-400">{label}</p>
    </div>
  )
}
