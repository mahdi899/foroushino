import { getStudentDisplayName, splitDisplayName } from '@/lib/student/displayName';
import type { StudentUser } from '@/lib/student/session';

export type StudentFormPrefill = {
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

export function buildStudentFormPrefill(user: StudentUser | null | undefined): StudentFormPrefill | null {
  if (!user) return null;

  const name = getStudentDisplayName(user);
  const split = splitDisplayName(name);
  const firstName = user.profile?.first_name?.trim() || user.identity?.first_name?.trim() || split.first_name || name;
  const lastName = user.profile?.last_name?.trim() || user.identity?.last_name?.trim() || split.last_name;

  return {
    name,
    firstName,
    lastName,
    phone: user.mobile?.trim() || '',
    email: user.profile?.email?.trim() || '',
  };
}
