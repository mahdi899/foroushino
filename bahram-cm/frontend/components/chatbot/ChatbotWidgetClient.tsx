'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ChatbotPublicConfig } from '@/lib/chatbot/types';
import type { FaqGroup } from '@/lib/data/chatbotFaq';
import { ChatbotLauncher } from './ChatbotLauncher';

const FloatingChatbot = dynamic(
  () => import('./FloatingChatbot').then((m) => m.FloatingChatbot),
  { ssr: false },
);

interface ChatbotWidgetClientProps {
  config: ChatbotPublicConfig;
  aiAvailable: boolean;
  faqGroups?: FaqGroup[];
  lazyLoad?: boolean;
}

export function ChatbotWidgetClient({
  config,
  aiAvailable,
  faqGroups = [],
  lazyLoad = true,
}: ChatbotWidgetClientProps) {
  const [activated, setActivated] = useState(!lazyLoad);

  const activate = useCallback(() => {
    setActivated(true);
  }, []);

  if (!activated) {
    return <ChatbotLauncher config={config} onActivate={activate} />;
  }

  return (
    <FloatingChatbot
      config={config}
      faqGroups={faqGroups}
      aiAvailable={aiAvailable}
      lazyLoadFaqs={faqGroups.length === 0}
    />
  );
}
