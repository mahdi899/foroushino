import type { LucideIcon } from 'lucide-react';
import {
  ClipboardList,
  Eye,
  PlayCircle,
  ScanFace,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from 'lucide-react';

export type ProviderTone = 'teal' | 'blue' | 'violet' | 'green' | 'amber' | 'slate';

export type ProviderUiConfig = {
  icon: LucideIcon;
  gradient: string;
  border: string;
  soft: string;
};

export type CapabilityUiConfig = {
  icon: LucideIcon;
  gradient: string;
  soft: string;
};

const PROVIDER_UI: Record<string, ProviderUiConfig> = {
  'manual-review': {
    icon: ClipboardList,
    gradient: 'from-teal-500 to-emerald-600',
    border: 'border-teal-500/30',
    soft: 'bg-teal-500/8',
  },
  'uid-shahkar': {
    icon: Smartphone,
    gradient: 'from-blue-500 to-cyan-600',
    border: 'border-blue-500/30',
    soft: 'bg-blue-500/8',
  },
  'api-ir-shahkar': {
    icon: ShieldCheck,
    gradient: 'from-violet-500 to-purple-600',
    border: 'border-violet-500/30',
    soft: 'bg-violet-500/8',
  },
  'uid-ekyc': {
    icon: ScanFace,
    gradient: 'from-emerald-500 to-green-600',
    border: 'border-emerald-500/30',
    soft: 'bg-emerald-500/8',
  },
  hoda: {
    icon: Sparkles,
    gradient: 'from-amber-500 to-orange-500',
    border: 'border-amber-500/30',
    soft: 'bg-amber-500/8',
  },
};

const CAPABILITY_UI: Record<string, CapabilityUiConfig> = {
  IDENTITY_MANUAL_REVIEW: {
    icon: ClipboardList,
    gradient: 'from-teal-500 to-emerald-600',
    soft: 'bg-teal-500/8',
  },
  DOCUMENT_REVIEW: {
    icon: Eye,
    gradient: 'from-blue-500 to-cyan-600',
    soft: 'bg-blue-500/8',
  },
  SELFIE_VIDEO_VERIFICATION: {
    icon: PlayCircle,
    gradient: 'from-violet-500 to-purple-600',
    soft: 'bg-violet-500/8',
  },
  FACE_LIVENESS: {
    icon: ScanFace,
    gradient: 'from-emerald-500 to-green-600',
    soft: 'bg-emerald-500/8',
  },
  FACE_MATCH: {
    icon: Users,
    gradient: 'from-sky-500 to-blue-600',
    soft: 'bg-sky-500/8',
  },
  MOBILE_NATIONAL_CODE_MATCH: {
    icon: Smartphone,
    gradient: 'from-amber-500 to-orange-500',
    soft: 'bg-amber-500/8',
  },
};

const DEFAULT_PROVIDER_UI: ProviderUiConfig = {
  icon: Shield,
  gradient: 'from-zinc-500 to-neutral-600',
  border: 'border-border',
  soft: 'bg-surface-soft',
};

const DEFAULT_CAPABILITY_UI: CapabilityUiConfig = {
  icon: ShieldCheck,
  gradient: 'from-zinc-500 to-neutral-600',
  soft: 'bg-surface-soft',
};

export function getProviderUi(slug: string): ProviderUiConfig {
  return PROVIDER_UI[slug] ?? DEFAULT_PROVIDER_UI;
}

export function getCapabilityUi(capability: string): CapabilityUiConfig {
  return CAPABILITY_UI[capability] ?? DEFAULT_CAPABILITY_UI;
}
