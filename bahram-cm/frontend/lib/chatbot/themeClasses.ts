import type { DataTheme } from '@/lib/useDataTheme';
import { cn } from '@/lib/utils';
import type { ChatbotCta } from './types';

/** Theme-aware surface tokens for the public site chatbot (matches Bahram dark/light). */
export function chatbotThemeClasses(theme: DataTheme) {
  const light = theme === 'light';

  return {
    panel: light
      ? 'border-bone/12 bg-white text-bone shadow-frame ring-1 ring-bone/8'
      : 'border-bone/10 bg-charcoal text-bone shadow-[0_28px_56px_-36px_rgba(0,0,0,0.75)] ring-1 ring-bone/5',
    dock: light ? 'border-bone/10 bg-charcoal/20' : 'border-bone/10 bg-charcoal/90',
    thread: light ? 'bg-charcoal/[0.06]' : 'bg-ink/50',
    tabBar: light ? 'bg-charcoal/[0.04]' : 'bg-ink/50',
    headerDefault: 'bg-gradient-ai text-white',
    headerOperator: 'bg-gradient-operator text-white',
    bubbleUser: 'rounded-br-sm bg-gradient-ai text-white',
    bubbleBot: light
      ? 'rounded-bl-sm border border-bone/12 bg-white text-bone ring-1 ring-bone/10'
      : 'rounded-bl-sm border border-bone/10 bg-charcoal-2/80 text-bone ring-1 ring-bone/10',
    bubbleError: light
      ? 'rounded-bl-sm border border-error/25 bg-red-50/90 text-error'
      : 'rounded-bl-sm border border-red-400/30 bg-red-950/40 text-red-200',
    bubbleOperator: light
      ? 'rounded-bl-sm border border-gold/35 bg-gold/[0.08] text-bone shadow-[inset_3px_0_0_0_var(--color-gold)]'
      : 'rounded-bl-sm border border-gold/30 bg-gold/[0.1] text-bone shadow-[inset_3px_0_0_0_var(--color-gold)]',
    operatorLabel: light ? 'text-gold' : 'text-gold-soft',
    operatorAvatar: 'bg-gradient-operator text-white',
    operatorAvatarRing: 'bg-gradient-operator ring-2 ring-gold-soft/35 text-white',
    operatorDot: 'bg-gold',
    operatorQuoteIcon: light ? 'text-gold/80' : 'text-gold-soft/90',
    operatorQuoteText: light ? 'text-bone/75' : 'text-bone/70',
    operatorQuote: light
      ? 'border-gold/25 bg-white/80 text-bone hover:border-gold/40 hover:bg-white'
      : 'border-gold/25 bg-charcoal/50 text-bone/90 hover:border-gold/35 hover:bg-charcoal/70',
    muted: 'text-mist',
    body: 'text-bone',
    sectionTitle: 'font-bold text-emerald',
    accentLink: 'font-medium text-emerald hover:underline',
    quickChip: light
      ? 'border-emerald/20 bg-white text-emerald hover:border-emerald/35 hover:bg-emerald/5'
      : 'border-bone/15 bg-charcoal-2/60 text-bone hover:border-emerald/30 hover:bg-emerald/10',
    tabActive: light
      ? 'bg-white text-emerald shadow-sm ring-1 ring-bone/10'
      : 'bg-charcoal-2 text-emerald shadow-sm ring-1 ring-bone/10',
    tabIdle: light ? 'text-mist hover:bg-white/60 hover:text-bone' : 'text-mist hover:bg-bone/5 hover:text-bone',
    tabIconActive: 'text-emerald',
    composer: light
      ? 'border-bone/12 bg-white/90 shadow-sm ring-1 ring-bone/8'
      : 'border-bone/10 bg-charcoal-2/70 shadow-sm ring-1 ring-bone/8',
    composerInput: light
      ? 'border border-bone/12 bg-white/95 shadow-sm ring-1 ring-bone/8'
      : 'border border-bone/10 bg-charcoal-2/85 shadow-sm ring-1 ring-bone/8',
    composerPanel: light
      ? 'border border-bone/12 bg-white/95 shadow-floating backdrop-blur-xl'
      : 'border border-bone/10 bg-charcoal-2/95 shadow-floating backdrop-blur-xl',
    composerEmojiBtn: light
      ? 'text-bone/45 hover:bg-charcoal/[0.06] hover:text-bone/80'
      : 'text-mist hover:bg-bone/8 hover:text-bone',
    composerEmojiBtnActive: light
      ? 'bg-emerald/12 text-emerald'
      : 'bg-emerald/15 text-emerald-glow',
    composerEmojiCell: light
      ? 'bg-charcoal/[0.04] hover:bg-charcoal/[0.08] active:bg-charcoal/[0.12]'
      : 'bg-bone/[0.05] hover:bg-bone/10 active:bg-bone/[0.14]',
    composerToolbarIcon: light ? 'text-bone/50' : 'text-mist/90',
    composerSendActive:
      'bg-emerald text-white shadow-[0_1px_4px_rgba(0,140,150,0.35)] hover:bg-emerald-glow active:scale-95',
    composerSendIdle: light ? 'bg-charcoal/[0.06] text-bone/30' : 'bg-bone/[0.04] text-mist/50',
    composerPlaceholder: 'placeholder:text-mist',
    launcherPill: light
      ? 'border-bone/12 bg-white/95 text-bone shadow-floating'
      : 'border-bone/15 bg-charcoal/95 text-bone shadow-floating',
    launcherRing: light ? 'ring-white/90' : 'ring-charcoal/90',
    ctaCard: light
      ? 'border-bone/15 bg-white text-bone shadow-sm ring-1 ring-bone/8 hover:border-emerald/25 hover:bg-emerald/[0.03]'
      : 'border-bone/10 bg-charcoal-2/50 text-bone hover:border-emerald/25',
    errorHint: light
      ? 'border-error/15 bg-red-50/95 text-error'
      : 'border-red-400/25 bg-red-950/40 text-red-200',
    spinner: 'text-emerald',
  };
}

export type ChatbotTheme = ReturnType<typeof chatbotThemeClasses>;

const CTA_INLINE_BASE =
  'inline-flex w-full min-w-0 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-semibold shadow-sm transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98]';

const CTA_CARD_BASE =
  'group flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-right shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0';

export function chatbotCtaButtonClass(
  theme: ChatbotTheme,
  type: ChatbotCta['type'],
  card = false,
): string {
  if (card) {
    const base = cn(
      CTA_CARD_BASE,
      theme.ctaCard,
      'hover:shadow-soft hover:border-emerald/25',
    );
    switch (type) {
      case 'whatsapp':
        return cn(base, 'hover:border-success/30');
      case 'phone':
        return cn(base, 'hover:border-emerald/30');
      case 'pricing':
        return cn(base, 'hover:border-emerald/35');
      default:
        return base;
    }
  }

  switch (type) {
    case 'consultation':
      return cn(CTA_INLINE_BASE, 'bg-gradient-ai text-white shadow-glow');
    case 'whatsapp':
      return cn(CTA_INLINE_BASE, 'bg-success text-white');
    case 'phone':
      return cn(
        CTA_INLINE_BASE,
        'bg-emerald/15 text-emerald ring-1 ring-emerald/25 hover:bg-emerald/25',
      );
    case 'register_phone':
      return cn(
        CTA_INLINE_BASE,
        'bg-emerald/10 text-emerald ring-1 ring-emerald/20 hover:bg-emerald/15',
      );
    case 'pricing':
      return cn(CTA_INLINE_BASE, 'bg-emerald/15 text-emerald hover:bg-emerald/25');
    default:
      return cn(CTA_INLINE_BASE, 'bg-emerald/10 text-emerald hover:bg-emerald/15');
  }
}
