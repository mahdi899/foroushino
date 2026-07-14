import type { Commission, Wallet } from '@/types'

export function sumCommissionAmount(
  commissions: Commission[],
  statuses: Commission['status'][],
): number {
  return commissions
    .filter((c) => statuses.includes(c.status))
    .reduce((sum, c) => sum + c.commissionAmount, 0)
}

/** Withdrawable balance — prefers API wallet, falls back to available commissions when drifted. */
export function resolveWithdrawableBalance(wallet: Wallet, commissions: Commission[]): number {
  const fromWallet = wallet.balanceAvailable
  if (fromWallet > 0) return fromWallet

  // Funds already requested for payout stay in balance_locked; don't infer from commissions.
  if (wallet.balanceLocked > 0) return 0

  return sumCommissionAmount(commissions, ['available'])
}
