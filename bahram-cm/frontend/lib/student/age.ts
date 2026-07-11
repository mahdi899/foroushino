import type { StudentUser } from '@/lib/student/session';

/** Approximate age from API date string `YYYY-MM-DD`. */
export function ageFromDateOfBirth(dateOfBirth: string | null | undefined): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateOfBirth ?? '').trim());
  if (!match) return null;

  const birth = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age >= 10 && age <= 120 ? age : null;
}

/** Age is collected in identity verification once date of birth exists. */
export function shouldCollectProfileAge(user: StudentUser): boolean {
  return !user.identity?.date_of_birth;
}

export function resolveProfileAge(user: StudentUser): number | null {
  if (user.profile?.age) return user.profile.age;
  return ageFromDateOfBirth(user.identity?.date_of_birth);
}
