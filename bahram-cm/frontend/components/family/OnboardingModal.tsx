'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { completeOnboarding } from '@/lib/family/api';

export function OnboardingModal({ onDone }: { onDone: () => void }) {
  const [pending, setPending] = useState(false);

  const handleClose = async () => {
    if (pending) return;
    setPending(true);
    try {
      await completeOnboarding();
    } finally {
      setPending(false);
      onDone();
    }
  };

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-3xl bg-charcoal p-6 text-center shadow-2xl"
      >
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-xl font-bold text-charcoal">
          🎉
        </span>
        <h2 className="text-lg font-bold text-bone">خوش اومدی به خانواده!</h2>
        <p className="mt-2 text-sm text-bone/65">
          از این به بعد پست‌های داداش بهرام رو همین‌جا می‌بینی. می‌تونی واکنش بدی، نظر بگذاری و توی اکشن‌ها شرکت کنی.
        </p>
        <button
          type="button"
          onClick={handleClose}
          disabled={pending}
          className="family-btn-primary mt-5 w-full rounded-full py-3 text-sm font-bold transition disabled:opacity-60"
        >
          بریم شروع کنیم
        </button>
      </motion.div>
    </div>
  );
}
