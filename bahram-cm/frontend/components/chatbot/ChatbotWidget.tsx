import { getPublicChatbotConfig } from '@/lib/chatbot/public';
import { loadChatbotFaqGroupsServer } from '@/lib/chatbot/faqLoader';
import { ChatbotWidgetClient } from './ChatbotWidgetClient';

export async function ChatbotWidget({ lazyLoad = true }: { lazyLoad?: boolean }) {
  const [config, faqGroups] = await Promise.all([
    getPublicChatbotConfig(),
    loadChatbotFaqGroupsServer(),
  ]);
  if (!config.enabled) return null;

  const aiAvailable = config.enabled && (config.ai_available ?? false);
  return (
    <ChatbotWidgetClient
      config={config}
      aiAvailable={aiAvailable}
      faqGroups={faqGroups}
      lazyLoad={lazyLoad}
    />
  );
}
