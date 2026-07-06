'use client';

import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import type { DataTheme } from '@/lib/useDataTheme';
import { cn } from '@/lib/utils';

function AiSparkleIcon() {
  return (
    <div className="relative h-7 w-7 shrink-0">
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald/15 via-emerald-glow/10 to-emerald/5"
        animate={{ opacity: [0.45, 0.85, 0.45], scale: [0.96, 1.04, 0.96] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.svg
        viewBox="0 0 24 24"
        className="relative h-7 w-7 text-emerald"
        fill="currentColor"
        aria-hidden
        animate={{ opacity: [0.55, 1, 0.55], rotate: [0, 6, -6, 0], scale: [0.92, 1.06, 0.92] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M12 2.5l1.35 4.65L18 8.5l-4.65 1.35L12 14.5l-1.35-4.65L6 8.5l4.65-1.35L12 2.5z" />
        <motion.path
          d="M18.5 14l.75 2.5 2.5.75-2.5.75-.75 2.5-.75-2.5-2.5-.75 2.5-.75.75-2.5z"
          animate={{ opacity: [0.2, 0.85, 0.2], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: 0.25 }}
        />
      </motion.svg>
    </div>
  );
}

function OperatorWaitIcon({ light }: { light: boolean }) {
  return (
    <div
      className={cn(
        'relative grid h-7 w-7 shrink-0 place-items-center rounded-full text-white',
        light ? 'bg-gradient-operator ring-1 ring-gold/25' : 'bg-gradient-operator-dark text-bone ring-1 ring-gold/15',
      )}
    >
      <motion.div
        className="absolute inset-0 rounded-full bg-gold/25"
        animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.92, 1.08, 0.92] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <User className="relative h-4 w-4" aria-hidden />
    </div>
  );
}

export function ThinkingIndicator({
  variant = 'ai',
  theme = 'dark',
}: {
  variant?: 'ai' | 'operator';
  theme?: DataTheme;
}) {
  const light = theme === 'light';

  if (variant === 'operator') {
    return (
      <div className="flex min-w-0 max-w-full items-center gap-2.5 py-0.5" aria-label="در حال ارسال به اپراتور">
        <OperatorWaitIcon light={light} />
        <div className="min-w-0">
          <motion.p
            className={cn('text-[12px] font-medium', light ? 'text-gold' : 'text-gold-soft')}
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            در حال ارسال به اپراتور
            <motion.span
              aria-hidden
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              …
            </motion.span>
          </motion.p>
          <p className={cn('text-[10px]', light ? 'text-mist' : 'text-bone/60')}>
            پاسخ هوشمند در این حالت فعال نیست
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 max-w-full items-center gap-2.5 py-0.5" aria-label="در حال پاسخگویی">
      <AiSparkleIcon />
      <div className="min-w-0">
        <motion.p
          className={cn('text-[12px] font-medium', light ? 'text-bone/85' : 'text-bone/80')}
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          در حال نوشتن پاسخ
          <motion.span
            aria-hidden
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            …
          </motion.span>
        </motion.p>
        <motion.p
          className={cn('text-[10px]', light ? 'text-mist' : 'text-bone/55')}
          animate={{ opacity: [0.4, 0.85, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
        >
          لطفاً چند لحظه صبر کنید
        </motion.p>
      </div>
    </div>
  );
}
