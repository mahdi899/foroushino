import type { StudentUser } from '@/lib/student/session';

export const MIN_IDENTITY_AGE = 10;
export const MAX_IDENTITY_AGE = 120;

function parseDateOfBirth(dateOfBirth: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateOfBirth ?? '').trim());
  if (!match) return null;

  const birth = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(birth.getTime()) ? null : birth;
}

/** Latest allowed birth date so the person is at least `minAge` years old today. */
export function maxBirthDateForMinAge(minAge = MIN_IDENTITY_AGE, from = new Date()): Date {
  return new Date(from.getFullYear() - minAge, from.getMonth(), from.getDate());
}

/** Approximate age from API date string `YYYY-MM-DD`. */
export function ageFromDateOfBirth(dateOfBirth: string | null | undefined): number | null {
  const birth = parseDateOfBirth(dateOfBirth);
  if (!birth) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age >= MIN_IDENTITY_AGE && age <= MAX_IDENTITY_AGE ? age : null;
}

export function isIdentityBirthDateAllowed(dateOfBirth: string): boolean {
  const birth = parseDateOfBirth(dateOfBirth);
  if (!birth) return false;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age >= MIN_IDENTITY_AGE && age <= MAX_IDENTITY_AGE;
}

/** Age is collected in identity verification once date of birth exists. */
export function shouldCollectProfileAge(user: StudentUser): boolean {
  return !user.identity?.date_of_birth;
}

export function resolveProfileAge(user: StudentUser): number | null {
  if (user.profile?.age) return user.profile.age;
  return ageFromDateOfBirth(user.identity?.date_of_birth);
}
