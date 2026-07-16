import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { AdminPage } from '../ui';
import { AdminPageHeader } from '@/components/admin/layout/AdminPageHeader';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import Link from 'next/link';

export default async function TelegramAdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.view')) {
    redirect('/admin');
  }

  const links = [
    { href: '/admin/telegram/users', label: 'کاربران متصل' },
    { href: '/admin/telegram/settings', label: 'تنظیمات ربات' },
    { href: '/admin/telegram/health', label: 'سلامت سیستم' },
    { href: '/admin/telegram/broadcasts', label: 'پیام‌های همگانی' },
    { href: '/admin/telegram/required-chats', label: 'کانال‌های اجباری' },
    { href: '/admin/telegram/destinations', label: 'مقاصد و گروه‌ها' },
    { href: '/admin/telegram/support', label: 'پشتیبانی' },
    { href: '/admin/telegram/logs', label: 'لاگ‌ها' },
  ];

  return (
    <AdminPage>
      <AdminPageHeader title="ربات تلگرام آکادمی" description="مدیریت ربات دانشجویی، وب‌هوک، پشتیبانی و پیام‌های همگانی" />
      <AdminContentPanel>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="btn btn-secondary block w-full text-center">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </AdminContentPanel>
    </AdminPage>
  );
}
