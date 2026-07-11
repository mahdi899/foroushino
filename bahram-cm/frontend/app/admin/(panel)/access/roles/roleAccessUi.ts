import type { LucideIcon } from 'lucide-react';
import {
  CircleDollarSign,
  ClipboardList,
  Eye,
  GraduationCap,
  KeyRound,
  LifeBuoy,
  Newspaper,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Users,
} from 'lucide-react';

export type AccessTone = 'teal' | 'gold' | 'blue' | 'green' | 'amber' | 'violet' | 'rose' | 'slate';

export type ModuleUiConfig = {
  icon: LucideIcon;
  tone: AccessTone;
  gradient: string;
  border: string;
  soft: string;
};

export type RoleUiConfig = {
  icon: LucideIcon;
  tone: AccessTone;
  gradient: string;
};

const MODULE_UI: Record<string, ModuleUiConfig> = {
  Students: {
    icon: Users,
    tone: 'teal',
    gradient: 'from-teal-500 to-emerald-600',
    border: 'border-teal-500/30',
    soft: 'bg-teal-500/8',
  },
  'Identity Verification': {
    icon: ShieldCheck,
    tone: 'violet',
    gradient: 'from-violet-500 to-purple-600',
    border: 'border-violet-500/30',
    soft: 'bg-violet-500/8',
  },
  'Identity Providers': {
    icon: Shield,
    tone: 'blue',
    gradient: 'from-blue-500 to-cyan-600',
    border: 'border-blue-500/30',
    soft: 'bg-blue-500/8',
  },
  SAT: {
    icon: GraduationCap,
    tone: 'amber',
    gradient: 'from-amber-500 to-orange-500',
    border: 'border-amber-500/30',
    soft: 'bg-amber-500/8',
  },
  Finance: {
    icon: CircleDollarSign,
    tone: 'gold',
    gradient: 'from-yellow-500 to-amber-600',
    border: 'border-yellow-500/30',
    soft: 'bg-yellow-500/10',
  },
  Content: {
    icon: Newspaper,
    tone: 'green',
    gradient: 'from-emerald-500 to-green-600',
    border: 'border-emerald-500/30',
    soft: 'bg-emerald-500/8',
  },
  SMS: {
    icon: Smartphone,
    tone: 'blue',
    gradient: 'from-sky-500 to-blue-600',
    border: 'border-sky-500/30',
    soft: 'bg-sky-500/8',
  },
  Audit: {
    icon: ClipboardList,
    tone: 'slate',
    gradient: 'from-slate-500 to-slate-700',
    border: 'border-slate-500/25',
    soft: 'bg-slate-500/8',
  },
  'Roles & Permissions': {
    icon: KeyRound,
    tone: 'rose',
    gradient: 'from-rose-500 to-pink-600',
    border: 'border-rose-500/30',
    soft: 'bg-rose-500/8',
  },
  Admins: {
    icon: Shield,
    tone: 'violet',
    gradient: 'from-indigo-500 to-violet-600',
    border: 'border-indigo-500/30',
    soft: 'bg-indigo-500/8',
  },
  Support: {
    icon: LifeBuoy,
    tone: 'teal',
    gradient: 'from-cyan-500 to-teal-600',
    border: 'border-cyan-500/30',
    soft: 'bg-cyan-500/8',
  },
  Orders: {
    icon: ShoppingCart,
    tone: 'gold',
    gradient: 'from-orange-400 to-amber-500',
    border: 'border-orange-500/30',
    soft: 'bg-orange-500/8',
  },
  Settings: {
    icon: Settings,
    tone: 'slate',
    gradient: 'from-zinc-500 to-neutral-600',
    border: 'border-zinc-500/25',
    soft: 'bg-zinc-500/8',
  },
};

const DEFAULT_MODULE_UI: ModuleUiConfig = {
  icon: Settings,
  tone: 'slate',
  gradient: 'from-zinc-500 to-neutral-600',
  border: 'border-border',
  soft: 'bg-surface-soft',
};

const ROLE_UI: Record<string, RoleUiConfig> = {
  'super-admin': { icon: Shield, tone: 'gold', gradient: 'from-yellow-500 to-amber-600' },
  admin: { icon: Settings, tone: 'blue', gradient: 'from-blue-500 to-cyan-600' },
  'student-manager': { icon: Users, tone: 'teal', gradient: 'from-teal-500 to-emerald-600' },
  'kyc-operator': { icon: ShieldCheck, tone: 'violet', gradient: 'from-violet-500 to-purple-600' },
  support: { icon: LifeBuoy, tone: 'blue', gradient: 'from-sky-500 to-blue-600' },
  'content-manager': { icon: Newspaper, tone: 'green', gradient: 'from-emerald-500 to-green-600' },
  finance: { icon: CircleDollarSign, tone: 'gold', gradient: 'from-yellow-500 to-amber-600' },
  'read-only': { icon: Eye, tone: 'slate', gradient: 'from-slate-500 to-slate-700' },
};

const DEFAULT_ROLE_UI: RoleUiConfig = {
  icon: KeyRound,
  tone: 'slate',
  gradient: 'from-zinc-500 to-neutral-600',
};

export function getModuleUi(module: string): ModuleUiConfig {
  return MODULE_UI[module] ?? DEFAULT_MODULE_UI;
}

export function getRoleUi(roleName: string): RoleUiConfig {
  return ROLE_UI[roleName] ?? DEFAULT_ROLE_UI;
}

export function moduleAnchorId(module: string): string {
  return `module-${module.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`;
}
