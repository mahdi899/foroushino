import type { StudentIdentity, StudentProfile, StudentUser } from '@/lib/student/session';

type NameSource = {
  name: string;
  profile?: StudentProfile | null;
  identity?: StudentIdentity | null;
};

export function getStudentLegalName(user: NameSource): string {
  const fromIdentity = [user.identity?.first_name, user.identity?.last_name].filter(Boolean).join(' ').trim();
  if (fromIdentity) return fromIdentity;

  return [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(' ').trim();
}

export function getStudentDisplayName(user: NameSource): string {
  return getStudentLegalName(user) || user.name.trim() || 'دانشجو';
}

export function hasIdentityLegalFields(user: Pick<StudentUser, 'identity'>): boolean {
  return Boolean(user.identity?.first_name?.trim() && user.identity?.last_name?.trim());
}

export function splitDisplayName(name: string): { first_name: string; last_name: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };

  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}
