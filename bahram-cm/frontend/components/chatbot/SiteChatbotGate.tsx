'use client';

import { usePathname } from 'next/navigation';
import { ChatbotWidgetClient } from './ChatbotWidgetClient';
import type { ChatbotPublicConfig } from '@/lib/chatbot/types';
import type { FaqGroup } from '@/lib/data/chatbotFaq';

interface SiteChatbotGateProps {
  config: ChatbotPublicConfig;
  aiAvailable: boolean;
  faqGroups: FaqGroup[];
}

export function SiteChatbotGate({ config, aiAvailable, faqGroups }: SiteChatbotGateProps) {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;
  if (pathname?.startsWith('/panel')) return null;
  if (!config.enabled) return null;

  return <ChatbotWidgetClient config={config} aiAvailable={aiAvailable} faqGroups={faqGroups} />;
}
