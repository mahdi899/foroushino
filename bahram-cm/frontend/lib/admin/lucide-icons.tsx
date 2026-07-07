import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Bell,
  Bot,
  Circle,
  CreditCard,
  ExternalLink,
  Eye,
  HelpCircle,
  Image,
  Inbox,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  MessageSquareQuote,
  Minimize2,
  Newspaper,
  PanelRightClose,
  PanelRightOpen,
  PenLine,
  Pencil,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  Smartphone,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/** Tree-shaken icon map for admin UI — avoids `import * as Icons from 'lucide-react'`. */
export const adminLucideIcons: Record<string, LucideIcon> = {
  Activity,
  Bell,
  Bot,
  Circle,
  CreditCard,
  ExternalLink,
  Eye,
  HelpCircle,
  Image,
  Inbox,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  MessageSquareQuote,
  Minimize2,
  Newspaper,
  PanelRightClose,
  PanelRightOpen,
  PenLine,
  Pencil,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  Smartphone,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
};

export function AdminLucideIcon({
  name,
  className,
  strokeWidth = 1.6,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  const Cmp = adminLucideIcons[name] ?? Circle;
  return <Cmp className={cn(className)} strokeWidth={strokeWidth} />;
}
