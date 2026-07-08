// Admin navigation — single Bahram panel at /admin
import { commerceModules } from '@/lib/admin/commerce';

export const adminNav: {
  group: string;
  items: { href: string; label: string; icon: string; matchPrefix?: boolean; emphasis?: boolean }[];
}[] = [
  {
    group: 'پیشخوان',
    items: [
      { href: '/admin', label: 'داشبورد', icon: 'LayoutDashboard' },
      { href: '/admin/chatbot', label: 'چت‌بات هوشمند', icon: 'MessageSquare', matchPrefix: true },
      { href: '/admin/academy/tickets', label: 'تیکت‌های پشتیبانی', icon: 'LifeBuoy', matchPrefix: true },
      { href: '/admin/academy/sms', label: 'مرکز پیامک', icon: 'MessageCircle', matchPrefix: true },
    ],
  },
  {
    group: 'محتوا و رسانه',
    items: [
      { href: '/admin/gallery', label: 'کتابخانه رسانه', icon: 'Image' },
      { href: '/admin/blog/new', label: 'افزودن مقاله', icon: 'PenLine', matchPrefix: true },
      { href: '/admin/blog', label: 'مقالات', icon: 'Newspaper', matchPrefix: true },
    ],
  },
  {
    group: 'فروش و عملیات',
    items: [
      { href: '/admin/leads', label: 'لیدها و فرم‌ها', icon: 'Inbox' },
      ...commerceModules.map((m) => ({
        href: m.href,
        label: m.label,
        icon: m.icon,
        matchPrefix: true,
      })),
    ],
  },
  {
    group: 'آکادمی و باشگاه مشتریان',
    items: [
      { href: '/admin/academy/students', label: 'دانشجویان', icon: 'Users', matchPrefix: true },
      { href: '/admin/academy/course-accesses', label: 'دسترسی دوره‌ها', icon: 'KeyRound' },
      { href: '/admin/academy/seminars', label: 'سمینارها', icon: 'CalendarDays', matchPrefix: true },
      { href: '/admin/academy/referrals', label: 'معرفی و کش‌بک', icon: 'Gift' },
      { href: '/admin/academy/cashback-payouts', label: 'واریز کش‌بک', icon: 'Wallet' },
      { href: '/admin/academy/sat-applications', label: 'درخواست‌های سات', icon: 'GraduationCap' },
      { href: '/admin/academy/notifications', label: 'اعلان‌ها', icon: 'Bell' },
      { href: '/admin/academy/imports', label: 'ورود اطلاعات', icon: 'FileUp' },
    ],
  },
  {
    group: 'سئو و تنظیمات',
    items: [
      { href: '/admin/seo', label: 'سئو و تحلیل', icon: 'Search', matchPrefix: true },
      { href: '/admin/cache', label: 'کش و بهینه‌سازی', icon: 'Zap', matchPrefix: true },
      { href: '/admin/ai/settings', label: 'هوش مصنوعی', icon: 'Bot', matchPrefix: true },
      { href: '/admin/settings', label: 'تنظیمات سایت', icon: 'Settings', emphasis: true },
    ],
  },
];

export function isAdminNavActive(pathname: string, href: string, matchPrefix?: boolean): boolean {
  if (pathname === href) return true;
  if (href === '/admin/blog/new') {
    return pathname === '/admin/blog/new';
  }
  if (href === '/admin/blog') {
    return pathname === '/admin/blog' || /^\/admin\/blog\/\d+/.test(pathname);
  }
  if (href === '/admin/chatbot') {
    return pathname === '/admin/chatbot' || pathname.startsWith('/admin/chatbot/');
  }
  if (href === '/admin/cache') {
    return pathname === '/admin/cache' || pathname.startsWith('/admin/cache/');
  }
  if (href === '/admin/ai/settings') {
    return pathname === '/admin/ai/settings' || pathname === '/admin/ai';
  }
  if (href === '/admin/seo') {
    return pathname === '/admin/seo' || pathname.startsWith('/admin/seo/');
  }
  if (href === '/admin/commerce/orders') {
    return pathname === '/admin/commerce/orders' || /^\/admin\/commerce\/orders\/\d+/.test(pathname);
  }
  if (href.startsWith('/admin/commerce/')) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (!matchPrefix) return false;
  return pathname.startsWith(`${href}/`);
}
