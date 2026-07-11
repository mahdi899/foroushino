import { toPersianDigits } from '@/lib/persian';
import type { StudentUser } from '@/lib/student/session';

export type ProfileFormSnapshot = Record<string, string>;

function toLatinDigits(input: string): string {
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  return input.replace(/[۰-۹]/g, (d) => String(fa.indexOf(d)));
}

function fieldValue(value: FormDataEntryValue | null): string {
  if (value === null) return '';
  return String(value).trim();
}

function normalizeIncomeGoal(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const match = toLatinDigits(trimmed).match(/(\d+)/);
  if (!match) return trimmed;
  const amount = Number.parseInt(match[1], 10);
  if (!amount || amount <= 0) return '';
  return `${toPersianDigits(amount)} میلیون تومان`;
}

export function buildProfileFormSnapshot(user: StudentUser): ProfileFormSnapshot {
  const profile = user.profile;

  return {
    name: user.name?.trim() ?? '',
    email: profile?.email?.trim() ?? '',
    age: profile?.age != null ? String(profile.age) : '',
    current_job: profile?.current_job?.trim() ?? '',
    experience_level: profile?.experience_level?.trim() ?? '',
    instagram: profile?.instagram?.trim() ?? '',
    telegram: profile?.telegram?.trim() ?? '',
    income_goal: normalizeIncomeGoal(profile?.income_goal ?? ''),
    password: '',
    password_confirmation: '',
  };
}

export function readProfileFormSnapshot(formData: FormData): ProfileFormSnapshot {
  return {
    name: fieldValue(formData.get('name')),
    email: fieldValue(formData.get('email')),
    age: fieldValue(formData.get('age')),
    current_job: fieldValue(formData.get('current_job')),
    experience_level: fieldValue(formData.get('experience_level')),
    instagram: fieldValue(formData.get('instagram')),
    telegram: fieldValue(formData.get('telegram')),
    income_goal: normalizeIncomeGoal(fieldValue(formData.get('income_goal'))),
    password: fieldValue(formData.get('password')),
    password_confirmation: fieldValue(formData.get('password_confirmation')),
  };
}

export function isProfileFormDirty(initial: ProfileFormSnapshot, current: ProfileFormSnapshot): boolean {
  const keys = new Set([...Object.keys(initial), ...Object.keys(current)]);

  for (const key of keys) {
    if ((initial[key] ?? '') !== (current[key] ?? '')) {
      return true;
    }
  }

  return false;
}
