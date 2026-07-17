export interface PayoutSettings {
  minAmount: number
  stepAmount: number
}

export const DEFAULT_PAYOUT_SETTINGS: PayoutSettings = {
  minAmount: 100_000,
  stepAmount: 1_000,
}

/** 0.01% of amount + fixed portion, rounded to nearest 100, clamped between min and max (tomans). */
export const BANK_FEE_RATE = 0.0001
export const BANK_FEE_FIXED = 400
export const BANK_FEE_ROUND = 100
export const BANK_FEE_MIN = 500
export const BANK_FEE_MAX = 10_000

export function calculateBankFee(amount: number): number {
  if (amount <= 0) return 0
  const raw = amount * BANK_FEE_RATE + BANK_FEE_FIXED
  const rounded = Math.round(raw / BANK_FEE_ROUND) * BANK_FEE_ROUND
  return Math.min(BANK_FEE_MAX, Math.max(BANK_FEE_MIN, rounded))
}

export function snapPayoutAmount(amount: number, step = DEFAULT_PAYOUT_SETTINGS.stepAmount): number {
  if (amount <= 0) return 0
  return Math.floor(amount / step) * step
}

export function payoutNetAmount(amount: number): number {
  return Math.max(0, amount - calculateBankFee(amount))
}

export function maxPayoutAmount(balance: number, settings: PayoutSettings = DEFAULT_PAYOUT_SETTINGS): number {
  if (validatePayoutAmount(balance, balance, settings).ok) return balance
  const snapped = snapPayoutAmount(balance, settings.stepAmount)
  return validatePayoutAmount(snapped, balance, settings).ok ? snapped : 0
}

/** Exact available balance when a full-balance withdrawal is allowed (step rule waived). */
export function fullBalancePayoutAmount(
  balance: number,
  settings: PayoutSettings = DEFAULT_PAYOUT_SETTINGS,
): number {
  return validatePayoutAmount(balance, balance, settings).ok ? balance : 0
}

export function presetPayoutAmount(
  ratio: number,
  balance: number,
  settings: PayoutSettings = DEFAULT_PAYOUT_SETTINGS,
): number {
  if (ratio >= 1) {
    return maxPayoutAmount(balance, settings)
  }
  const raw = Math.floor(balance * ratio)
  let amount = snapPayoutAmount(raw, settings.stepAmount)
  if (amount > balance) amount = snapPayoutAmount(balance, settings.stepAmount)
  if (amount < settings.minAmount) return 0
  return amount
}

export function validatePayoutAmount(
  amount: number,
  balanceAvailable: number,
  settings: PayoutSettings = DEFAULT_PAYOUT_SETTINGS,
): { ok: true } | { ok: false; message: string } {
  if (amount <= 0) {
    return { ok: false, message: 'مبلغ نامعتبر است.' }
  }
  if (amount > balanceAvailable) {
    return { ok: false, message: 'مبلغ درخواستی بیشتر از موجودی قابل برداشت است.' }
  }
  if (amount < settings.minAmount) {
    return { ok: false, message: `حداقل مبلغ برداشت ${settings.minAmount.toLocaleString('fa-IR')} تومان است.` }
  }
  const isFullBalance = amount === balanceAvailable
  if (!isFullBalance && amount % settings.stepAmount !== 0) {
    return { ok: false, message: `مبلغ برداشت باید مضربی از ${settings.stepAmount.toLocaleString('fa-IR')} تومان باشد.` }
  }
  const fee = calculateBankFee(amount)
  if (amount <= fee) {
    return { ok: false, message: 'مبلغ باید بیشتر از کارمزد بانکی باشد.' }
  }
  return { ok: true }
}

export function amountFromPercent(
  percent: number,
  balance: number,
  settings: PayoutSettings = DEFAULT_PAYOUT_SETTINGS,
): number {
  if (percent <= 0 || balance <= 0) return 0
  if (percent >= 100) return maxPayoutAmount(balance, settings)

  const raw = Math.floor(balance * (percent / 100))
  let snapped = snapPayoutAmount(raw, settings.stepAmount)
  const minPct = Math.ceil((settings.minAmount / balance) * 100)
  if (percent < minPct) return 0
  if (snapped < settings.minAmount) snapped = settings.minAmount
  if (snapped > balance) {
    snapped = snapPayoutAmount(balance, settings.stepAmount)
  }
  const validation = validatePayoutAmount(snapped, balance, settings)
  return validation.ok ? snapped : 0
}

export function percentFromAmount(amount: number, balance: number): number {
  if (amount <= 0 || balance <= 0) return 0
  return Math.min(100, Math.round((amount / balance) * 100))
}

export function canRequestPayout(
  balanceAvailable: number,
  settings: PayoutSettings = DEFAULT_PAYOUT_SETTINGS,
): boolean {
  if (balanceAvailable <= 0) return false
  return maxPayoutAmount(balanceAvailable, settings) > 0
}
