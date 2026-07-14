import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  WalletCards,
  ArrowUpRight,
  Lock,
  TrendingUp,
  CheckCheck,
  ChevronLeft,
  ScrollText,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { Chip } from '@/components/ui/Chip'
import { Badge } from '@/components/ui/Badge'
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
import { canRequestPayout } from '@/lib/payoutRules'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'
import { DataGate } from '@/components/pwa/DataGate'
import { apiMode } from '@/services'
import { refreshWalletBundle, requestPayoutAmount } from '@/services/walletActions'
import { WalletBankAccountSection } from '@/features/wallet/WalletBankAccountSection'

type Tab = 'commissions' | 'transactions' | 'payouts'

const TG = 'text-[#3390EC] dark:text-[#8774E1]'
const OK = 'text-emerald-600 dark:text-emerald-400'
const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }

const listStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}

const cardFadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: spring },
}

const txIconWrap: Record<string, string> = {
  success: 'icon-3d-success',
  warning: 'icon-3d-warning',
  primary: 'icon-3d-primary',
  error: 'icon-3d-warning',
  neutral: 'icon-3d-primary',
}

function BalanceStat({
  icon: Icon,
  iconWrap,
  label,
  value,
}: {
  icon: LucideIcon
  iconWrap: string
  label: string
  value: number
}) {
  return (
    <motion.div
      variants={cardFadeUp}
      className={cn(
        'glass-card relative overflow-hidden rounded-[18px] border border-white/55 p-3 text-center',
        'dark:border-white/10',
      )}
    >
      <span className={cn('icon-3d mx-auto flex h-8 w-8 items-center justify-center', iconWrap)}>
        <Icon size={14} className="text-white" strokeWidth={2.35} />
      </span>
      <p className="mt-2 text-[12px] font-black tabular-nums leading-none text-text">{formatMoney(value)}</p>
      <p className="mt-1 text-[10px] font-semibold text-text-soft">{label}</p>
    </motion.div>
  )
}

export function WalletScreen() {
  const navigate = useNavigate()
  const wallet = useStore((s) => s.wallet)
  const commissions = useStore((s) => s.commissions.filter((c) => c.agentId === s.currentAgentId))
  const walletTx = useStore((s) => s.walletTx)
  const payouts = useStore((s) => s.payouts)
  const leads = useStore((s) => s.leads)
  const pushToast = useStore((s) => s.pushToast)

  const [tab, setTab] = useState<Tab>('commissions')
  const [payoutOpen, setPayoutOpen] = useState(false)
  const [success, setSuccess] = useState(false)

  const leadOf = (id: string) => leads.find((l) => l.id === id)
  const payoutReady = canRequestPayout(wallet.balanceAvailable) && !!wallet.bankCardConfirmed && !!wallet.bankShebaRegistered

  const pipelineAmount = useMemo(
    () =>
      commissions
        .filter((c) => c.status === 'pending' || c.status === 'approved')
        .reduce((sum, c) => sum + c.commissionAmount, 0),
    [commissions],
  )

  useEffect(() => {
    if (apiMode !== 'http') return

    const refresh = () => {
      void refreshWalletBundle().catch(() => {
        pushToast('بارگذاری کیف پول ناموفق بود', 'error')
      })
    }

    refresh()

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [pushToast])

  return (
    <Page withNav={false}>
      <TopBar
        title="درآمد من"
        subtitle="پورسانت و تسویه حساب"
        action={
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/wallet/rules')}
            className="glass-inset flex h-9 w-9 items-center justify-center rounded-full"
            aria-label="قوانین پورسانت"
          >
            <ScrollText size={18} className={TG} strokeWidth={2.25} />
          </motion.button>
        }
      />

      <DataGate mode="placeholder">
      <div className="space-y-5 px-4 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="glass-hero glass-hero-success relative overflow-hidden rounded-[26px] p-5"
        >
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -left-14 -top-16 h-48 w-48 rounded-full bg-emerald-400/24 blur-3xl"
            />
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.6, 0.9, 0.6] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
              className="absolute -bottom-16 -right-12 h-44 w-44 rounded-full bg-[#3390EC]/14 blur-3xl"
            />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/75 to-transparent dark:via-white/12" />
          </div>

          <p className="relative flex items-center gap-1.5 text-[12px] font-semibold text-text-soft">
            <WalletCards size={14} className={OK} strokeWidth={2.35} />
            موجودی قابل برداشت
          </p>
          <p className="relative mt-1.5 text-[32px] font-black tabular-nums leading-none text-text">
            {formatMoney(wallet.balanceAvailable)}{' '}
            <span className="text-[14px] font-bold text-text-muted">تومان</span>
          </p>
          {pipelineAmount > 0 && (
            <p className="relative mt-2 text-[11px] font-semibold text-text-soft">
              {formatMoney(pipelineAmount)} تومان در فرایند تایید پورسانت
              {wallet.balanceAvailable === 0 ? ' (بعد از تایید لیدر و ناظر به موجودی اضافه می‌شود)' : ''}
            </p>
          )}
          <motion.button
            type="button"
            whileTap={{ scale: payoutReady ? 0.97 : 1 }}
            disabled={!canRequestPayout(wallet.balanceAvailable)}
            onClick={() => {
              if (!wallet.bankCardConfirmed || !wallet.bankShebaRegistered) {
                pushToast('ابتدا کارت و شبا را در همین صفحه ثبت کن و منتظر تایید ناظر باش.', 'error')
                return
              }
              setPayoutOpen(true)
            }}
            className={cn(
              'relative mt-4 inline-flex h-10 items-center gap-2 overflow-hidden rounded-[14px] px-5',
              'text-[13px] font-bold text-white',
              'bg-emerald-500 shadow-[0_6px_20px_rgba(16,163,127,0.32)]',
              'disabled:pointer-events-none disabled:opacity-45',
            )}
          >
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/10" />
            <ArrowUpRight size={15} strokeWidth={2.35} className="relative" />
            <span className="relative">درخواست تسویه</span>
          </motion.button>
        </motion.div>

        {!wallet.bankCardConfirmed && (
          <p className="rounded-[14px] border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
            {wallet.bankCardMasked
              ? 'اطلاعات بانکی ثبت شده و منتظر تایید ناظر است.'
              : 'برای تسویه، کارت و شبا را در بخش زیر ثبت کن.'}
          </p>
        )}

        <WalletBankAccountSection />

        <motion.div variants={listStagger} initial="hidden" animate="show" className="grid grid-cols-2 gap-2.5">
          <BalanceStat icon={Lock} iconWrap="icon-3d-primary" label="در حال تسویه" value={wallet.balanceLocked} />
          <BalanceStat icon={TrendingUp} iconWrap="icon-3d-success" label="کل درآمد" value={wallet.totalEarned} />
        </motion.div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
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

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="space-y-3"
          >
            {tab === 'commissions' && (
              <>
                {commissions.length === 0 ? (
                  <EmptyState title="هنوز پورسانتی ثبت نشده" description="بعد از تایید فروش، پورسانت اینجا نمایش داده می‌شود." />
                ) : (
                  commissions.map((c) => {
                    const lead = leadOf(c.leadId)
                    return (
                      <motion.button
                        key={c.id}
                        variants={cardFadeUp}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => navigate(`/wallet/commissions/${c.id}`)}
                        className={cn(
                          'glass-card flex w-full items-center gap-3 rounded-[22px] border border-white/55 p-4 text-right',
                          'dark:border-white/10',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-bold text-text">
                            {lead ? `${lead.firstName} ${lead.lastName}` : 'فروش'}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-text-soft">
                            {relativeDayTime(c.createdAt)} · نرخ {toFa(c.commissionRate)}٪
                          </p>
                        </div>
                        <div className="shrink-0 text-left">
                          <p className={cn('text-[14px] font-black tabular-nums', OK)}>+{formatMoney(c.commissionAmount)}</p>
                          <Badge tone={commissionStatusTone[c.status]} size="sm" className="mt-1">
                            {commissionStatusLabels[c.status]}
                          </Badge>
                        </div>
                        <ChevronLeft size={16} className="shrink-0 text-text-soft opacity-40" strokeWidth={2.25} />
                      </motion.button>
                    )
                  })
                )}
              </>
            )}

            {tab === 'transactions' && (
              <>
                {walletTx.length === 0 ? (
                  <EmptyState title="تراکنشی ثبت نشده" />
                ) : (
                  walletTx.map((tx) => {
                    const Icon = walletTxIcon[tx.type]
                    const tone = walletTxTone[tx.type]
                    const negative = tx.type === 'payout_requested' || tx.type === 'reversal'
                    return (
                      <motion.div
                        key={tx.id}
                        variants={cardFadeUp}
                        className={cn(
                          'glass-card flex items-center gap-3 rounded-[22px] border border-white/55 p-4',
                          'dark:border-white/10',
                        )}
                      >
                        <span className={cn('icon-3d flex h-10 w-10 shrink-0 items-center justify-center', txIconWrap[tone])}>
                          <Icon size={17} className="text-white" strokeWidth={2.25} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-bold text-text">{tx.description}</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-text-soft">
                            {walletTxLabels[tx.type]} · {relativeDayTime(tx.createdAt)}
                          </p>
                        </div>
                        <p className={cn('shrink-0 text-[14px] font-black tabular-nums', negative ? 'text-text-soft' : OK)}>
                          {negative ? '' : '+'}
                          {formatMoney(tx.amount)}
                        </p>
                      </motion.div>
                    )
                  })
                )}
              </>
            )}

            {tab === 'payouts' && (
              <>
                {payouts.length === 0 ? (
                  <EmptyState
                    title="درخواست تسویه‌ای ثبت نشده"
                    description="با رسیدن موجودی به بالای صفر می‌توانی درخواست تسویه بدهی."
                  />
                ) : (
                  payouts.map((p) => (
                    <motion.div
                      key={p.id}
                      variants={cardFadeUp}
                      className={cn(
                        'glass-card flex items-center gap-3 rounded-[22px] border border-white/55 p-4',
                        'dark:border-white/10',
                      )}
                    >
                      <span className="icon-3d icon-3d-primary flex h-10 w-10 shrink-0 items-center justify-center">
                        <CheckCheck size={17} className="text-white" strokeWidth={2.25} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-black tabular-nums text-text">{formatMoney(p.amount)} تومان</p>
                        {(p.netAmount != null && (p.bankFee ?? 0) > 0) && (
                          <p className="mt-0.5 text-[11px] font-semibold text-text-soft">
                            واریز: {formatMoney(p.netAmount)} · کارمزد: {formatMoney(p.bankFee ?? 0)}
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] font-semibold text-text-soft">{relativeDayTime(p.requestedAt)}</p>
                      </div>
                      <Badge tone={payoutStatusTone[p.status]} size="sm">
                        {payoutStatusLabels[p.status]}
                      </Badge>
                    </motion.div>
                  ))
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      </DataGate>

      <PayoutRequestSheet
        open={payoutOpen}
        onClose={() => setPayoutOpen(false)}
        balanceAvailable={wallet.balanceAvailable}
        savedCardMasked={wallet.bankCardMasked}
        bankCardConfirmed={!!wallet.bankCardConfirmed}
        onSubmit={(amount) => {
          void requestPayoutAmount(amount)
            .then(() => {
              haptic('success')
              setPayoutOpen(false)
              setSuccess(true)
            })
            .catch((e: Error) => {
              haptic('error')
              pushToast(e.message ?? 'خطا در ثبت درخواست', 'error')
            })
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
