'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  Heart,
  Image as ImageIcon,
  Lock,
  MessageCircle,
  PencilLine,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { FamilyBrandLogo } from '@/components/family/FamilyBrandLogo';
import { FamilyGlassCtaButton } from '@/components/family/FamilyGlassCtaButton';
import { useFamilyGuestAccessOptional } from '@/components/family/FamilyGuestAccess';
import {
  FAMILY_GATE_COPY,
  FAMILY_GATE_FEATURES,
  FAMILY_GATE_JOIN_CTA,
  FAMILY_GATE_TRUST,
  GUEST_BLURRED_POST_COUNT,
  GUEST_PREVIEW_POST_COUNT,
} from '@/lib/family/guest-access';
import { useIsMobileMotion } from '@/hooks/useIsMobileMotion';
import { useFamilyBranding } from '@/lib/family/hooks/useFamilyBranding';
import { FAMILY_EASE, familyMotion } from '@/lib/family/motion';
import { cn } from '@/lib/cn';

const gateRoot = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

const gatePanel = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      ...familyMotion.tween,
      when: 'beforeChildren',
      staggerChildren: 0.045,
      delayChildren: 0.05,
    },
  },
};

const gateTab = {
  hidden: { opacity: 0, y: -6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { ...familyMotion.tweenFast, delay: 0.1 },
  },
};

const gateItem = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: familyMotion.tweenFast,
  },
};

const featureGrid = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.14 },
  },
};

const featureItem = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: familyMotion.tweenFast,
  },
};

const gateInstant = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

const gatePanelLite = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.24, ease: FAMILY_EASE },
  },
};

const GUEST_FEATURES: {
  icon: LucideIcon;
  tone: 'violet' | 'emerald' | 'amber' | 'rose';
  label: string;
}[] = [
  { icon: ImageIcon, tone: 'violet', label: FAMILY_GATE_FEATURES[0] },
  { icon: MessageCircle, tone: 'emerald', label: FAMILY_GATE_FEATURES[1] },
  { icon: PencilLine, tone: 'amber', label: FAMILY_GATE_FEATURES[2] },
  { icon: Heart, tone: 'rose', label: FAMILY_GATE_FEATURES[3] },
];

export function FeedPreviewIntro({ mode }: { mode: 'guest' | 'join' }) {
  const { branding } = useFamilyBranding();

  return (
    <div className="family-preview-intro mx-3 mb-1 px-4 py-4 sm:mx-4 lg:mx-5">
      <div className="flex items-start gap-3">
        <FamilyBrandLogo className="shrink-0" size="sm" />
        <div className="min-w-0 flex-1 text-start">
          <p className="text-sm font-bold text-bone">{branding.display_name}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-bone/55">
            {mode === 'guest'
              ? `پیش‌نمایش ${GUEST_PREVIEW_POST_COUNT.toLocaleString('fa-IR')} پست اخیر — ${GUEST_BLURRED_POST_COUNT.toLocaleString('fa-IR')} پست اول با عضویت قابل مشاهده است.`
              : `نمونه‌ای از پیام‌های اخیر ${branding.profile_name}. برای دسترسی کامل، به خانواده بپیوندید.`}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FeedPreviewGate({ mode }: { mode: 'guest' | 'join' }) {
  const guestAccess = useFamilyGuestAccessOptional();
  const isGuest = mode === 'guest';
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobileMotion();
  const lite = isMobile && !reduceMotion;
  const motionVariants = reduceMotion
    ? {
        root: gateInstant,
        panel: gateInstant,
        tab: gateInstant,
        item: gateInstant,
        grid: gateInstant,
        feature: gateInstant,
      }
    : lite
      ? {
          root: gateInstant,
          panel: gatePanelLite,
          tab: gateInstant,
          item: gateInstant,
          grid: gateInstant,
          feature: gateInstant,
        }
      : {
          root: gateRoot,
          panel: gatePanel,
          tab: gateTab,
          item: gateItem,
          grid: featureGrid,
          feature: featureItem,
        };

  const handlePrimary = () => {
    if (isGuest) {
      guestAccess?.openLogin();
      return;
    }
    document.getElementById('family-join-cta')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <motion.div
      className={cn('family-preview-gate', lite && 'family-preview-gate--lite')}
      initial="hidden"
      whileInView="visible"
      viewport={lite ? { once: true, amount: 0.14 } : { once: true, amount: 0.22 }}
      variants={motionVariants.root}
    >
      <div className="family-preview-gate__tab-slot" aria-hidden>
        <motion.div className="family-preview-gate__tab" variants={motionVariants.tab}>
          <span className="family-preview-gate__tab-pulse" aria-hidden />
          <Lock className="family-preview-gate__tab-icon" strokeWidth={2} />
        </motion.div>
      </div>

      <motion.div className="family-preview-gate__panel" variants={motionVariants.panel}>
        <span className="family-preview-gate__panel-sheen" aria-hidden />
        <span className="family-preview-gate__panel-shimmer" aria-hidden />

        <div className="family-preview-gate__body">
          <motion.div className="family-preview-gate__story" variants={motionVariants.item}>
            <h3 className="family-preview-gate__headline">
              {isGuest ? (
                <>
                  {FAMILY_GATE_COPY.guest.headlineBefore}
                  <span className="family-preview-gate__headline-accent">
                    {FAMILY_GATE_COPY.guest.headlineAccent}
                  </span>
                </>
              ) : (
                <>
                  {FAMILY_GATE_COPY.join.headlineBefore}
                  <span className="family-preview-gate__headline-accent">
                    {FAMILY_GATE_COPY.join.headlineAccent}
                  </span>
                </>
              )}
            </h3>
            <p className="family-preview-gate__lede">
              {isGuest ? FAMILY_GATE_COPY.guest.lede : FAMILY_GATE_COPY.join.lede}
            </p>
          </motion.div>

          <span className="family-preview-gate__divider" aria-hidden />

          <motion.ul className="family-preview-gate__features" variants={motionVariants.grid}>
            {GUEST_FEATURES.map(({ icon: Icon, tone, label }) => (
              <motion.li key={label} className="family-preview-gate__feature" variants={motionVariants.feature}>
                <span
                  className={`family-preview-gate__feature-icon family-preview-gate__feature-icon--${tone}`}
                >
                  <Icon strokeWidth={1.9} aria-hidden />
                </span>
                <span className="family-preview-gate__feature-label">{label}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <motion.div className="family-preview-gate__footer" variants={motionVariants.item}>
          <FamilyGlassCtaButton className="family-preview-gate__cta" onClick={handlePrimary}>
            <Users className="family-preview-gate__cta-icon" strokeWidth={2} aria-hidden />
            {isGuest ? FAMILY_GATE_JOIN_CTA : 'پیوستن به خانواده'}
          </FamilyGlassCtaButton>

          <p className="family-preview-gate__trust">
            {FAMILY_GATE_TRUST}
            <ShieldCheck className="family-preview-gate__trust-icon" strokeWidth={1.9} aria-hidden />
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
