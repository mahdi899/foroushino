import type { StudentUser } from '@/lib/student/session';
import { getStudentDisplayName } from '@/lib/student/displayName';
import type { ContentCommentAuthor } from '@/lib/services/contentComments.types';

export function buildCommentAuthorFromStudent(user: StudentUser | null): ContentCommentAuthor | null {
  if (!user) return null;

  const profile = user.profile;

  return {
    displayName: getStudentDisplayName(user),
    email: profile?.email ?? null,
    avatarUrl: profile?.avatar_url ?? profile?.default_avatar_url ?? null,
  };
}
