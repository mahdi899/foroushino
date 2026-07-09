import {
  BookOpen,
  Briefcase,
  CalendarDays,
  Gift,
  Home,
  LifeBuoy,
  Bell,
  User as UserIcon,
  Receipt,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PanelNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const PANEL_NAV_ITEMS: PanelNavItem[] = [
  { href: '/panel', label: 'خانه', icon: Home, exact: true },
  { href: '/panel/courses', label: 'دوره کمپین‌نویسی', icon: BookOpen },
  { href: '/panel/seminars', label: 'سمینارهای من', icon: CalendarDays },
  { href: '/panel/referrals', label: 'باشگاه مشتریان', icon: Gift },
  { href: '/panel/sat', label: 'سات', icon: Briefcase },
  { href: '/panel/support', label: 'پشتیبانی', icon: LifeBuoy },
  { href: '/panel/notifications', label: 'اعلان‌ها', icon: Bell },
  { href: '/panel/profile', label: 'پروفایل', icon: UserIcon },
  { href: '/panel/orders', label: 'سفارش‌های من', icon: Receipt },
];

export const PANEL_BOTTOM_NAV_ITEMS: PanelNavItem[] = [
  { href: '/panel', label: 'خانه', icon: Home, exact: true },
  { href: '/panel/courses', label: 'دوره کمپین‌نویسی', icon: BookOpen },
  { href: '/panel/notifications', label: 'اعلان‌ها', icon: Bell },
  { href: '/panel/support', label: 'پشتیبانی', icon: LifeBuoy },
];
