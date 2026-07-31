import {
  Briefcase,
  CalendarDays,
  GraduationCap,
  MessageCircle,
  Newspaper,
  PenLine,
  Radio,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { site } from "@/content/site";

export const SITE_NAV_ICONS: Record<string, LucideIcon> = {
  "/course/campaign-writing": PenLine,
  "/reference-channels/kanal-mrgf": Radio,
  "/saat": Briefcase,
  "/courses": GraduationCap,
  "/seminars/smynar-zaafranyh-thran": CalendarDays,
  "/transformations": Sparkles,
  "/insights": Newspaper,
  "/founder": UserRound,
  "/contact": MessageCircle,
};

export const SITE_MOBILE_MENU_ITEMS = site.nav.map((link) => ({
  ...link,
  icon: SITE_NAV_ICONS[link.href] ?? Newspaper,
}));
