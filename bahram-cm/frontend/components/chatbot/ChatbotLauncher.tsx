'use client';

import { useMemo } from 'react';
import { MessagesSquare } from 'lucide-react';
import { chatbotThemeClasses } from '@/lib/chatbot/themeClasses';
import type { ChatbotPublicConfig } from '@/lib/chatbot/types';
import { useDataTheme } from '@/lib/useDataTheme';
import { cn } from '@/lib/utils';

interface ChatbotLauncherProps {
  config: ChatbotPublicConfig;
  onActivate: () => void;
}

export function ChatbotLauncher({ config, onActivate }: ChatbotLauncherProps) {
  const theme = useDataTheme();
  const chatTheme = useMemo(() => chatbotThemeClasses(theme), [theme]);
  const label = config.assistant_name?.trim() || 'از من بپرس!';

  return (
    <div className="pointer-events-none fixed bottom-[5.25rem] right-4 z-40 flex flex-col items-end gap-2.5 lg:bottom-6 lg:right-6">
      <div className="pointer-events-auto flex items-center gap-2.5" dir="ltr">
        <button
          type="button"
          onClick={onActivate}
          dir="rtl"
          className={cn(
            'rounded-pill border px-3.5 py-2 text-[11px] font-bold shadow-floating backdrop-blur-sm transition-transform hover:scale-105 active:scale-95',
            chatTheme.launcherPill,
          )}
        >
          {label}
        </button>
        <button
          type="button"
          onClick={onActivate}
          aria-label="پشتیبانی و تماس"
          className={cn(
            'relative grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-premium ring-4 transition-transform hover:scale-105 active:scale-95',
            chatTheme.launcherRing,
          )}
        >
          <MessagesSquare className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
