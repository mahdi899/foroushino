'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bot, User, X } from 'lucide-react';

export type ChatbotReplyMode = 'ai' | 'operator';

interface ChatbotReplyModeModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (mode: ChatbotReplyMode) => void;
  aiAvailable: boolean;
}

export function ChatbotReplyModeModal({
  open,
  onClose,
  onSelect,
  aiAvailable,
}: ChatbotReplyModeModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-50 flex items-end justify-center p-3 sm:items-center">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            aria-label="بستن"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="chatbot-reply-mode-title"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[19rem] overflow-hidden rounded-xl border border-border/60 bg-white shadow-premium ring-1 ring-black/[0.06]"
            dir="rtl"
          >
            <div className="flex items-start justify-between gap-2 border-b border-border/50 bg-gradient-ai px-4 py-3 text-white">
              <div>
                <p id="chatbot-reply-mode-title" className="text-[13px] font-bold">
                  ادامه گفتگو
                </p>
                <p className="mt-0.5 text-[10px] opacity-90">پیام‌های بعدی را با چه کسی ادامه دهید؟</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md transition hover:bg-white/15"
                aria-label="بستن"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 p-4">
              <p className="text-[12px] leading-relaxed text-text-muted">
                بازخورد شما ثبت شد. برای سؤالات بعدی یکی از گزینه‌ها را انتخاب کنید.
              </p>

              {aiAvailable && (
                <button
                  type="button"
                  onClick={() => onSelect('ai')}
                  className="flex w-full items-center gap-3 rounded-lg border border-primary/20 bg-primary-soft/30 px-3 py-3 text-right transition hover:border-primary/35 hover:bg-primary-soft/50 active:scale-[0.99]"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-ai text-white shadow-sm">
                    <Bot className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-primary-dark">دستیار هوشمند</span>
                    <span className="mt-0.5 block text-[11px] text-text-muted">پاسخ سریع با AI آکادمی بهرام</span>
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onSelect('operator')}
                className="flex w-full items-center gap-3 rounded-lg border border-amber-300/60 bg-amber-50/80 px-3 py-3 text-right transition hover:border-amber-400/70 hover:bg-amber-50 active:scale-[0.99]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-l from-amber-600 to-amber-500 text-white shadow-sm">
                  <User className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-amber-950">اپراتور تیم بهرام</span>
                  <span className="mt-0.5 block text-[11px] text-text-muted">پیام شما به کارشناس انسانی می‌رسد</span>
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
