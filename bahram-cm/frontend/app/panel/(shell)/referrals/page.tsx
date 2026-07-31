import type { Metadata } from 'next';
import { PanelComingSoon } from '@/components/student-panel/ui/PanelComingSoon';

export const metadata: Metadata = { title: 'باشگاه مشتریان | پنل کاربری', robots: { index: false, follow: false } };

export default function PanelReferralsPage() {
  return (
    <PanelComingSoon
      title="باشگاه مشتریان — به زودی"
      description="باشگاه مشتریان و کش‌بک معرفی در حال آماده‌سازی است و به‌زودی در دسترس قرار می‌گیرد."
    />
  );
}
