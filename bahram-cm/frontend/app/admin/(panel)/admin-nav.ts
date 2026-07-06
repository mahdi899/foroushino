// Admin navigation — single Bahram panel at /admin
import { commerceModules } from '@/lib/admin/commerce';

export const adminNav: {
  group: string;
  items: { href: string; label: string; icon: string; matchPrefix?: boolean }[];
}[] = [
  {
    group: 'پیشخوان',
    items: [
      { href: '/admin', label: 'داشبورد', icon: 'LayoutDashboard' },
      { href: '/admin/chatbot', label: 'چت‌بات هوشمند', icon: 'MessageSquare', matchPrefix: true },
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
    group: 'سئو و تنظیمات',
    items: [
      { href: '/admin/seo', label: 'سئو و تحلیل', icon: 'Search', matchPrefix: true },
      { href: '/admin/cache', label: 'کش و بهینه‌سازی', icon: 'Zap', matchPrefix: true },
      { href: '/admin/ai/settings', label: 'هوش مصنوعی', icon: 'Bot', matchPrefix: true },
      { href: '/admin/settings', label: 'تنظیمات سایت', icon: 'Settings' },
    ],
  },
];

export function isAdminNavActive(pathname: string, href: string, matchPrefix?: boolean): boolean {
  if (pathname === href) return true;
  if (href === '/admin/blog/new') {
    return pathname === '/admin/blog/new' || /^\/admin\/blog\/\d+/.test(pathname);
  }
  if (href === '/admin/blog') {
    return pathname === '/admin/blog';
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
  if (href.startsWith('/admin/commerce/')) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (!matchPrefix) return false;
  return pathname.startsWith(`${href}/`);
}
