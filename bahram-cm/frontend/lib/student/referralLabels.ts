export const REFERRAL_INVITE_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار بررسی',
  approved: 'تأیید شده',
  rejected: 'رد شده',
};

export const REFERRAL_INVITE_STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export const CASHBACK_PAYOUT_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار بررسی',
  approved: 'تأیید شده',
  paid: 'پرداخت‌شده',
  rejected: 'رد شده',
};

export const CASHBACK_PAYOUT_STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  pending: 'warning',
  approved: 'neutral',
  paid: 'success',
  rejected: 'danger',
};

export function referralInviteStatusLabel(status: string): string {
  return REFERRAL_INVITE_STATUS_LABELS[status] ?? status;
}

export function cashbackPayoutStatusLabel(status: string): string {
  return CASHBACK_PAYOUT_STATUS_LABELS[status] ?? status;
}
