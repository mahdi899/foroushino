import { Briefcase, GraduationCap, Home, PenLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SiteBottomNavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const SITE_BOTTOM_NAV_ITEMS: SiteBottomNavItem[] = [
  { href: "/", label: "خانه", icon: Home, exact: true },
  {
    href: "/course/campaign-writing",
    label: "کمپین‌نویسی",
    shortLabel: "کمپین",
    icon: PenLine,
  },
  { href: "/courses", label: "دوره‌ها", shortLabel: "دوره", icon: GraduationCap },
  { href: "/saat", label: "سات", icon: Briefcase },
];
