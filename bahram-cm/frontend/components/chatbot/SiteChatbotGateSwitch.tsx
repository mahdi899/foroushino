'use client';

import dynamic from 'next/dynamic';
import type { ChatbotPublicConfig } from '@/lib/chatbot/types';
import type { FaqGroup } from '@/lib/data/chatbotFaq';
import { SiteChatbotGate } from './SiteChatbotGate';

const SiteChatbotGateLazy = dynamic(
  () => import('./SiteChatbotGateLazy').then((m) => m.SiteChatbotGateLazy),
  { ssr: false },
);

interface SiteChatbotGateSwitchProps {
  config: ChatbotPublicConfig;
  aiAvailable: boolean;
  faqGroups: FaqGroup[];
  lazyLoad: boolean;
}

export function SiteChatbotGateSwitch({
  config,
  aiAvailable,
  faqGroups,
  lazyLoad,
}: SiteChatbotGateSwitchProps) {
  if (lazyLoad) {
    return <SiteChatbotGateLazy config={config} aiAvailable={aiAvailable} faqGroups={faqGroups} />;
  }

  return <SiteChatbotGate config={config} aiAvailable={aiAvailable} faqGroups={faqGroups} />;
}
