import type { Commission, Wallet } from '@/types'

export function sumCommissionAmount(
  commissions: Commission[],
  statuses: Commission['status'][],
): number {
  return commissions
    .filter((c) => statuses.includes(c.status))
    .reduce((sum, c) => sum + c.commissionAmount, 0)
}

/**
 * Withdrawable balance for the current agent.
 * Wallet API balance is authoritative once payouts have moved funds to locked.
 * Otherwise fall back to available commissions (handles mock drift and missed wallet credits).
 */
export function resolveWithdrawableBalance(wallet: Wallet, commissions: Commission[]): number {
  const fromWallet = wallet.balanceAvailable
  const fromCommissions = sumCommissionAmount(commissions, ['available'])

  if (fromWallet > 0 || wallet.balanceLocked > 0) {
    return fromWallet
  }

  return fromCommissions
}

/** Align mock wallet balances with commission rows for the logged-in agent. */
export function deriveWalletFromCommissions(
  wallet: Wallet,
  commissions: Commission[],
): Wallet {
  const available = sumCommissionAmount(commissions, ['available'])
  const pending = sumCommissionAmount(commissions, ['pending', 'approved'])
  const earned = sumCommissionAmount(commissions, ['available', 'paid'])

  if (wallet.balanceLocked > 0) {
    return {
      ...wallet,
      balancePending: pending,
      totalEarned: Math.max(wallet.totalEarned, earned),
    }
  }

  return {
    ...wallet,
    balanceAvailable: Math.max(wallet.balanceAvailable, available),
    balancePending: pending,
    totalEarned: Math.max(wallet.totalEarned, earned),
  }
}
