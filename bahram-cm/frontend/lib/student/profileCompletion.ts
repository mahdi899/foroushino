import type { StudentUser } from '@/lib/student/session';

export const PROFILE_VERIFIED_THRESHOLD = 80;

export function profileCompletion(user: StudentUser): number {
  const profile = user.profile;

  let score = 25; // verified account (mobile)
  if (profile?.avatar_url || profile?.avatar) score += 20;
  if (user.name?.trim()) score += 12;
  if (profile?.first_name?.trim()) score += 8;
  if (profile?.last_name?.trim()) score += 8;
  if (profile?.email?.trim()) score += 12;
  if (profile?.city?.trim()) score += 5;
  if (profile?.age) score += 3;
  if (profile?.current_job?.trim()) score += 3;
  if (profile?.experience_level?.trim()) score += 2;
  if (profile?.instagram?.trim()) score += 1;
  if (profile?.telegram?.trim()) score += 1;
  if (profile?.income_goal?.trim()) score += 1;

  return Math.min(100, score);
}

export function isProfileVerified(user: StudentUser): boolean {
  return profileCompletion(user) >= PROFILE_VERIFIED_THRESHOLD;
}
