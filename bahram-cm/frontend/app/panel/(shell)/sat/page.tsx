import type { Metadata } from 'next';
import { PanelComingSoon } from '@/components/student-panel/ui/PanelComingSoon';

export const metadata: Metadata = { title: 'سات | پنل کاربری', robots: { index: false, follow: false } };

export default function PanelSatPage() {
  return (
    <PanelComingSoon
      title="سات — به زودی"
      description="ثبت درخواست همکاری در سات فعلاً غیرفعال است و به‌زودی فعال می‌شود."
    />
  );
}
