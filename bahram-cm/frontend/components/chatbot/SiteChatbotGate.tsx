'use client';

import { usePathname } from 'next/navigation';
import { ChatbotWidgetClient } from './ChatbotWidgetClient';
import type { ChatbotPublicConfig } from '@/lib/chatbot/types';

interface SiteChatbotGateProps {
  config: ChatbotPublicConfig;
  aiAvailable: boolean;
}

export function SiteChatbotGate({ config, aiAvailable }: SiteChatbotGateProps) {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/manage')) return null;
  if (!config.enabled) return null;

  return <ChatbotWidgetClient config={config} aiAvailable={aiAvailable} />;
}
