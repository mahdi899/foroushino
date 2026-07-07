'use client';

import type { ChatbotPublicConfig } from '@/lib/chatbot/types';

interface ChatbotLauncherProps {
  config: ChatbotPublicConfig;
  onActivate: () => void;
  loading?: boolean;
}

function ChatIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 8.25h9m-9 3.75h5.25M6 20.25v-1.5A2.25 2.25 0 0 1 8.25 16.5h9A2.25 2.25 0 0 0 19.5 14.25V6A2.25 2.25 0 0 0 17.25 3.75H6.75A2.25 2.25 0 0 0 4.5 6v8.25A2.25 2.25 0 0 0 6.75 16.5H8.25L6 20.25Z"
      />
    </svg>
  );
}

/** Minimal floating launcher — no heavy deps; paints on first frame. */
export function ChatbotLauncher({ config, onActivate, loading = false }: ChatbotLauncherProps) {
  const label = config.assistant_name?.trim() || 'از من بپرس!';

  return (
    <div className="pointer-events-none fixed bottom-[5.25rem] right-4 z-40 flex flex-col items-end gap-2.5 lg:bottom-6 lg:right-6">
      <div className="pointer-events-auto flex items-center gap-2.5" dir="ltr">
        <button
          type="button"
          onClick={onActivate}
          dir="rtl"
          className="rounded-pill border border-border bg-surface/95 px-3.5 py-2 text-[11px] font-bold text-primary shadow-floating backdrop-blur-sm transition-transform hover:scale-105 active:scale-95"
        >
          {label}
        </button>
        <button
          type="button"
          onClick={onActivate}
          aria-label="پشتیبانی و تماس"
          aria-busy={loading}
          className="relative grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-premium ring-4 ring-primary/20 transition-transform hover:scale-105 active:scale-95"
        >
          {loading ? (
            <span
              className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden
            />
          ) : (
            <ChatIcon />
          )}
        </button>
      </div>
    </div>
  );
}
