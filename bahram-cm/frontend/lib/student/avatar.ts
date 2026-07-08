export function studentDefaultAvatarUrl(userId: number, size = 80): string {
  return `https://api.dicebear.com/9.x/lorelei/png?seed=${encodeURIComponent(String(userId))}&size=${size}`;
}
