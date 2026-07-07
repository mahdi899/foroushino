'use client';

import dynamic from 'next/dynamic';
import type { ChatbotPublicConfig } from '@/lib/chatbot/types';
import type { FaqGroup } from '@/lib/data/chatbotFaq';

const SiteChatbotGate = dynamic(
  () => import('./SiteChatbotGate').then((m) => m.SiteChatbotGate),
  { ssr: false },
);

interface SiteChatbotGateLazyProps {
  config: ChatbotPublicConfig;
  aiAvailable: boolean;
  faqGroups: FaqGroup[];
}

/** Defers chatbot JS until after first paint — keeps public pages lighter. */
export function SiteChatbotGateLazy(props: SiteChatbotGateLazyProps) {
  return <SiteChatbotGate {...props} />;
}
