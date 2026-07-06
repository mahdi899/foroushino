import type { Metadata } from "next";
import Script from "next/script";
import { fontClassName, fontVariable } from "@/lib/fonts";
import { defaultMetadata } from "@/lib/seo";
import {
  courseJsonLd,
  organizationJsonLd,
  personJsonLd,
  websiteJsonLd,
} from "@/lib/jsonld";
import { AdminAwareChrome } from "@/components/layout/AdminAwareChrome";
import { SiteChatbotGate } from "@/components/chatbot/SiteChatbotGate";
import { PerformanceProvider } from "@/components/performance/PerformanceProvider";
import { loadChatbotFaqGroupsServer } from "@/lib/chatbot/faqLoader";
import { getPublicChatbotConfig } from "@/lib/chatbot/public";
import { getPublicPerfConfig } from "@/lib/cache/public";
import { GrainOverlay } from "@/components/motion/GrainOverlay";
import "@/styles/globals.css";

const THEME_BOOT_SCRIPT = `(() => {
  try {
    var s = localStorage.getItem('bahram-theme');
    var t = s === 'light' || s === 'dark' ? s : 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch (_) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();`;

export const metadata: Metadata = defaultMetadata;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const ld = [personJsonLd(), organizationJsonLd(), courseJsonLd(), websiteJsonLd()];
  const [chatbotConfig, perfConfig, chatbotFaqs] = await Promise.all([
    getPublicChatbotConfig(),
    getPublicPerfConfig(),
    loadChatbotFaqGroupsServer(),
  ]);
  const chatbotAiAvailable = chatbotConfig.enabled && (chatbotConfig.ai_available ?? false);

  return (
    <html
      lang="fa"
      dir="rtl"
      data-scroll-behavior="smooth"
      className={fontVariable}
      suppressHydrationWarning
    >
      <head>
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className={`${fontClassName} antialiased`} suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-pill focus:bg-emerald focus:px-4 focus:py-2 focus:text-bone"
        >
          پرش به محتوای اصلی
        </a>
        <GrainOverlay />
        <PerformanceProvider config={perfConfig}>
          <AdminAwareChrome>{children}</AdminAwareChrome>
        </PerformanceProvider>
        <SiteChatbotGate config={chatbotConfig} aiAvailable={chatbotAiAvailable} faqGroups={chatbotFaqs} />
        <Script id="jsonld-site" type="application/ld+json">
          {JSON.stringify(ld)}
        </Script>
      </body>
    </html>
  );
}
