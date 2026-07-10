import {
  Briefcase,
  GraduationCap,
  MessageCircle,
  Newspaper,
  PenLine,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { site } from "@/content/site";

export const SITE_NAV_ICONS: Record<string, LucideIcon> = {
  "/course/campaign-writing": PenLine,
  "/courses": GraduationCap,
  "/saat": Briefcase,
  "/transformations": Sparkles,
  "/insights": Newspaper,
  "/founder": UserRound,
  "/contact": MessageCircle,
};

export const SITE_MOBILE_MENU_ITEMS = site.nav.map((link) => ({
  ...link,
  icon: SITE_NAV_ICONS[link.href] ?? Newspaper,
}));
