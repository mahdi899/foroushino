import type { StudentUser } from '@/lib/student/session';

export const PROFILE_VERIFIED_THRESHOLD = 80;

export function profileCompletion(user: StudentUser): number {
  const profile = user.profile;
  const identity = user.identity;

  const firstName = identity?.first_name?.trim() || profile?.first_name?.trim();
  const lastName = identity?.last_name?.trim() || profile?.last_name?.trim();
  const city = identity?.city?.trim() || profile?.city?.trim();

  let score = 25; // verified account (mobile)
  if (profile?.avatar_url || profile?.avatar) score += 20;
  if (user.name?.trim()) score += 12;
  if (firstName) score += 8;
  if (lastName) score += 8;
  if (profile?.email?.trim()) score += 12;
  if (city) score += 5;
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
