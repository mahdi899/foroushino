type StudentNameParts = {
  name: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
};

export function getStudentDisplayName(user: StudentNameParts): string {
  const fullName = [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(' ').trim();
  return fullName || user.name.trim() || 'دانشجو';
}
