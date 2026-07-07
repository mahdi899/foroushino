'use client';

import { usePathname } from 'next/navigation';
import { ChatbotWidgetClient } from './ChatbotWidgetClient';
import type { ChatbotPublicConfig } from '@/lib/chatbot/types';
import type { FaqGroup } from '@/lib/data/chatbotFaq';

interface SiteChatbotEntryProps {
  config: ChatbotPublicConfig;
  aiAvailable: boolean;
  faqGroups: FaqGroup[];
  /** When true, mount FloatingChatbot after window load (+ idle when lazy). Launcher shows until ready. */
  deferWidget: boolean;
}

/**
 * Lightweight launcher paints immediately; the full FloatingChatbot chunk
 * auto-loads after the page finishes loading (not on first click).
 */
export function SiteChatbotEntry({
  config,
  aiAvailable,
  faqGroups,
  deferWidget,
}: SiteChatbotEntryProps) {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;
  if (!config.enabled) return null;

  return (
    <ChatbotWidgetClient
      config={config}
      aiAvailable={aiAvailable}
      faqGroups={faqGroups}
      lazyLoad={deferWidget}
    />
  );
}
