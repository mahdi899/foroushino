// Admin navigation — single Bahram panel at /admin
import { commerceModules } from '@/lib/admin/commerce';

export type AdminNavItem = {
  href: string;
  label: string;
  icon: string;
  matchPrefix?: boolean;
  emphasis?: boolean;
  /** Spatie permission required to show this item. Super-admin always sees all. */
  permission?: string;
  /** Only visible to super-admin (مدیر کل). */
  superAdminOnly?: boolean;
};

export const adminNav: {
  group: string;
  items: AdminNavItem[];
}[] = [
  {
    group: 'پیشخوان',
    items: [
      { href: '/admin', label: 'داشبورد', icon: 'LayoutDashboard' },
      { href: '/admin/chatbot', label: 'چت‌بات هوشمند', icon: 'MessageSquare', matchPrefix: true },
      { href: '/admin/academy/tickets', label: 'تیکت‌های پشتیبانی', icon: 'LifeBuoy', matchPrefix: true, permission: 'tickets.view' },
      { href: '/admin/academy/sms', label: 'مرکز پیامک', icon: 'MessageCircle', matchPrefix: true, permission: 'sms.view' },
      { href: '/admin/academy/notifications', label: 'اعلان‌ها', icon: 'Bell' },
    ],
  },
  {
    group: 'محتوا و رسانه',
    items: [
      { href: '/admin/gallery', label: 'کتابخانه رسانه', icon: 'Image', permission: 'content.view' },
      { href: '/admin/blog/new', label: 'افزودن مقاله', icon: 'PenLine', matchPrefix: true, permission: 'content.manage' },
      { href: '/admin/blog', label: 'مقالات', icon: 'Newspaper', matchPrefix: true, permission: 'content.view' },
      { href: '/admin/content/comments', label: 'نظرات محتوا', icon: 'MessageSquareQuote', matchPrefix: true, permission: 'content.view' },
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
        permission: 'orders.view' as string | undefined,
      })),
      { href: '/admin/installments', label: 'اقساط', icon: 'CalendarClock', matchPrefix: true, permission: 'finance.view' },
    ],
  },
  {
    group: 'آکادمی و باشگاه مشتریان',
    items: [
      { href: '/admin/academy/students', label: 'دانشجویان', icon: 'Users', matchPrefix: true, permission: 'students.view' },
      {
        href: '/admin/academy/identity-verifications',
        label: 'احراز هویت',
        icon: 'ShieldCheck',
        matchPrefix: true,
        permission: 'identity.view',
      },
      { href: '/admin/academy/course-accesses', label: 'دسترسی دوره‌ها', icon: 'KeyRound', permission: 'students.manage' },
      { href: '/admin/academy/seminars', label: 'سمینارها', icon: 'CalendarDays', matchPrefix: true },
      { href: '/admin/academy/mini-courses', label: 'مینی‌دوره‌ها', icon: 'PlayCircle', matchPrefix: true, permission: 'content.view' },
      { href: '/admin/academy/referrals', label: 'معرفی و کش‌بک', icon: 'Gift', permission: 'finance.view' },
      { href: '/admin/academy/cashback-payouts', label: 'واریز کش‌بک', icon: 'Wallet', permission: 'finance.view' },
      { href: '/admin/academy/sat-applications', label: 'درخواست‌های سات', icon: 'GraduationCap', permission: 'sat.view' },
      { href: '/admin/academy/imports', label: 'ورود اطلاعات', icon: 'FileUp', permission: 'students.manage' },
    ],
  },
  {
    group: 'سئو و تنظیمات',
    items: [
      { href: '/admin/seo', label: 'سئو و تحلیل', icon: 'Search', matchPrefix: true },
      { href: '/admin/audit', label: 'گزارش فعالیت', icon: 'ClipboardList', matchPrefix: true, permission: 'audit.view' },
      { href: '/admin/cache', label: 'کش و بهینه‌سازی', icon: 'Zap', matchPrefix: true, permission: 'settings.manage' },
      { href: '/admin/ai/settings', label: 'هوش مصنوعی', icon: 'Bot', matchPrefix: true, permission: 'settings.manage' },
      { href: '/admin/users', label: 'مدیران', icon: 'Shield', matchPrefix: true, permission: 'roles.view' },
      {
        href: '/admin/access/roles',
        label: 'نقش‌ها و دسترسی‌ها',
        icon: 'KeyRound',
        matchPrefix: true,
        superAdminOnly: true,
      },
      {
        href: '/admin/settings/identity-providers',
        label: 'سرویس‌های احراز هویت',
        icon: 'Cable',
        matchPrefix: true,
        permission: 'identity_provider.view',
      },
      { href: '/admin/settings', label: 'تنظیمات سایت', icon: 'Settings', emphasis: true, superAdminOnly: true },
    ],
  },
];

export function filterAdminNav(
  nav: typeof adminNav,
  opts: { permissions: string[]; isSuperAdmin: boolean },
): typeof adminNav {
  if (opts.isSuperAdmin) return nav;

  return nav
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.superAdminOnly && !opts.isSuperAdmin) return false;
        if (!item.permission) return true;
        return opts.permissions.includes(item.permission);
      }),
    }))
    .filter((group) => group.items.length > 0);
}

export function isAdminNavActive(pathname: string, href: string, matchPrefix?: boolean): boolean {
  if (pathname === href) return true;
  if (href === '/admin/blog/new') {
    return pathname === '/admin/blog/new';
  }
  if (href === '/admin/blog') {
    return pathname === '/admin/blog' || /^\/admin\/blog\/\d+/.test(pathname);
  }
  if (href === '/admin/content/comments') {
    return pathname === href || pathname.startsWith(`${href}/`);
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
    return pathname === '/admin/seo' || pathname.startsWith('/admin/seo/google');
  }
  if (href === '/admin/commerce/orders') {
    return pathname === '/admin/commerce/orders' || /^\/admin\/commerce\/orders\/\d+/.test(pathname);
  }
  if (href.startsWith('/admin/commerce/')) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href === '/admin/academy/mini-courses') {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href === '/admin/academy/identity-verifications') {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href === '/admin/access/roles') {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href === '/admin/settings/identity-providers') {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (!matchPrefix) return false;
  return pathname.startsWith(`${href}/`);
}
