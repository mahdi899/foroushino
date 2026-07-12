'use server';

import { revalidatePath } from 'next/cache';
import { studentFetch } from '@/lib/student/session';
import { extractError, type SimpleFormState } from '@/lib/student/panelFormUtils';

export type VerifiedBankAccount = {
  id: number;
  masked_card_number: string | null;
  masked_iban: string | null;
  bank_name: string | null;
  holder_name: string | null;
  is_default: boolean;
  verified_at: string | null;
};

export type BankAccountRules = {
  min_balance_for_verification: number;
  verification_fee: number;
};

export async function getVerifiedBankAccountsAction(): Promise<{
  items: VerifiedBankAccount[];
  error: string | null;
}> {
  try {
    const res = await studentFetch<{ data: VerifiedBankAccount[] }>('/verified-bank-accounts');
    return { items: res.data, error: null };
  } catch (err) {
    return { items: [], error: extractError(err, 'دریافت کارت‌های بانکی ناموفق بود.') };
  }
}

export async function getBankAccountRulesAction(): Promise<BankAccountRules> {
  try {
    const res = await studentFetch<{ data: BankAccountRules }>('/verified-bank-accounts/rules');
    return res.data;
  } catch {
    return { min_balance_for_verification: 100_000, verification_fee: 7_000 };
  }
}

export async function addVerifiedBankAccountAction(
  _prev: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const cardNumber = String(formData.get('card_number') ?? '').replace(/\D/g, '');
  const iban = String(formData.get('iban') ?? '').replace(/\s+/g, '').toUpperCase();
  const holderName = String(formData.get('holder_name') ?? '').trim();

  const payload: Record<string, string> = {};
  if (cardNumber) payload.card_number = cardNumber;
  if (iban) payload.iban = iban;
  if (holderName) payload.holder_name = holderName;

  try {
    await studentFetch('/verified-bank-accounts', { method: 'POST', body: payload });
  } catch (err) {
    return { error: extractError(err, 'احراز کارت بانکی ناموفق بود.') };
  }

  revalidatePath('/panel/referrals');
  return { success: 'کارت بانکی با موفقیت تأیید و ثبت شد.' };
}

export async function deleteVerifiedBankAccountAction(id: number): Promise<SimpleFormState> {
  try {
    await studentFetch(`/verified-bank-accounts/${id}`, {
      method: 'DELETE',
      body: { confirmed: true },
    });
  } catch (err) {
    return { error: extractError(err, 'حذف کارت بانکی ناموفق بود.') };
  }

  revalidatePath('/panel/referrals');
  return { success: 'کارت بانکی حذف شد.' };
}
