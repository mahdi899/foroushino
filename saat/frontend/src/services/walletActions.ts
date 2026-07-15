import { apiMode } from '@/services'
import { http } from '@/services/http'
import { mapCommission, mapPayoutRequest, mapWallet, mapWalletTransaction, mapBankAccountReview, mapAgentFromAdmin } from '@/services/mappers'
import { useStore } from '@/store/useStore'
import type { Agent, BankAccountReview, Commission, PayoutRequest, Wallet } from '@/types'

type Dto = Record<string, unknown>

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export async function refreshWallet(): Promise<Wallet> {
  const raw = await http.get<Dto>('/wallet')
  const wallet = mapWallet(raw)
  useStore.getState().setWalletMeta(wallet)
  return wallet
}

/** Reload wallet balances, commissions, transactions, and payout history for the current agent. */
export async function refreshWalletBundle(): Promise<void> {
  if (apiMode !== 'http') return

  const agentId = useStore.getState().currentAgentId
  const [walletRaw, commissionsRaw, txRaw, payoutsRaw] = await Promise.all([
    http.get<Dto>('/wallet'),
    http.get<Dto[]>('/wallet/commissions?per_page=50'),
    http.get<Dto[]>('/wallet/transactions?per_page=50'),
    http.get<Dto[]>('/wallet/payout-requests'),
  ])

  const commissions = asArray<Dto>(commissionsRaw).map(mapCommission)
  const walletTx = asArray<Dto>(txRaw).map(mapWalletTransaction)
  const payouts = asArray<Dto>(payoutsRaw).map(mapPayoutRequest)
  const ownCommissions = commissions.filter((row) => !row.agentId || row.agentId === agentId)
  const ownPayouts = payouts.filter((row) => !row.agentId || row.agentId === agentId)

  useStore.getState().applyWalletData({
    wallet: mapWallet(walletRaw),
    commissions: ownCommissions,
    walletTx,
    payouts: ownPayouts,
  })
}

export async function fetchCommissionQueue(): Promise<Commission[]> {
  const raw = await http.get<Dto[]>('/wallet/commissions/queue')
  return asArray<Dto>(raw).map(mapCommission)
}

export async function approveCommissionAsLeader(commissionId: string): Promise<void> {
  if (apiMode !== 'http') {
    useStore.getState().releaseCommission(commissionId)
    return
  }
  await http.post(`/wallet/commissions/${commissionId}/approve-leader`)
}

export async function approveCommissionAsSupervisor(commissionId: string): Promise<void> {
  if (apiMode !== 'http') {
    useStore.getState().releaseCommission(commissionId)
    return
  }
  await http.post(`/wallet/commissions/${commissionId}/approve-supervisor`)
  await refreshWalletBundle()
}

export async function rejectCommission(commissionId: string, reason: string): Promise<void> {
  await http.post(`/wallet/commissions/${commissionId}/reject`, { reason })
}

export async function fetchPayoutQueue(): Promise<PayoutRequest[]> {
  const raw = await http.get<Dto[]>('/wallet/payout-queue')
  return asArray<Dto>(raw).map(mapPayoutRequest)
}

export async function fetchBankAccountQueue(): Promise<BankAccountReview[]> {
  const raw = await http.get<Dto[]>('/wallet/bank-accounts/queue')
  return asArray<Dto>(raw).map(mapBankAccountReview)
}

export async function confirmBankAccount(userId: string): Promise<Agent> {
  const raw = await http.post<Dto>(`/wallet/bank-accounts/${userId}/confirm`)
  return mapAgentFromAdmin(raw)
}

export async function clearBankAccount(userId: string): Promise<Agent> {
  const raw = await http.post<Dto>(`/wallet/bank-accounts/${userId}/clear`)
  return mapAgentFromAdmin(raw)
}

export async function approvePayout(payoutId: string): Promise<void> {
  await http.post(`/wallet/payout-requests/${payoutId}/approve`)
}

export async function rejectPayout(payoutId: string, reason: string): Promise<void> {
  await http.post(`/wallet/payout-requests/${payoutId}/reject`, { reason })
}

export async function requestPayoutAmount(amount: number): Promise<void> {
  if (apiMode !== 'http') {
    const res = useStore.getState().requestPayout(amount)
    if (!res.ok) throw new Error(res.message ?? 'درخواست ناموفق بود')
    return
  }
  await http.post('/wallet/payout-requests', { amount })
  await refreshWalletBundle()
}

export async function saveBankAccount(bankCard: string, bankSheba: string): Promise<void> {
  const sheba = bankSheba.replace(/\D/g, '').replace(/^IR/i, '')
  await http.patch('/wallet/bank-card', {
    bank_card: bankCard.replace(/\D/g, ''),
    bank_sheba: sheba,
  })
  await refreshWalletBundle()
}

/** @deprecated use saveBankAccount */
export async function saveBankCard(bankCard: string): Promise<void> {
  const wallet = useStore.getState().wallet
  if (!wallet.bankShebaRegistered) {
    throw new Error('شماره شبا الزامی است.')
  }
  await http.patch('/wallet/bank-card', { bank_card: bankCard.replace(/\D/g, '') })
  await refreshWallet()
}
