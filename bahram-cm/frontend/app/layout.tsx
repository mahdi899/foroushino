import type { Metadata, Viewport } from "next";
import { unstable_noStore } from "next/cache";
import { headers } from "next/headers";
import { fontClassName, fontVariable } from "@/lib/fonts";
import { defaultMetadata } from "@/lib/seo";
import {
  courseJsonLd,
  organizationJsonLd,
  personJsonLd,
  websiteJsonLd,
} from "@/lib/jsonld";
import { AdminAwareChrome } from "@/components/layout/AdminAwareChrome";
import { SiteChatbotEntry } from "@/components/chatbot/SiteChatbotEntry";
import { MediaPreconnect } from "@/components/performance/MediaPreconnect";
import { PerformanceProvider } from "@/components/performance/PerformanceProvider";
import { getPublicChatbotConfig } from "@/lib/chatbot/public";
import { EMPTY_CHATBOT_PUBLIC } from "@/lib/chatbot/types";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const ld = [personJsonLd(), organizationJsonLd(), courseJsonLd(), websiteJsonLd()];
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isAdminRoute = pathname.startsWith("/admin");
  const isBareShellRoute = isAdminRoute || pathname.startsWith("/panel");

  const [chatbotConfig, perfConfig] = await Promise.all([
    isBareShellRoute ? Promise.resolve(EMPTY_CHATBOT_PUBLIC) : getPublicChatbotConfig(),
    getPublicPerfConfig(),
  ]);
  const chatbotAiAvailable = chatbotConfig.enabled && (chatbotConfig.ai_available ?? false);

  if (!isBareShellRoute && (perfConfig.developer_mode || perfConfig.page_cache === false)) {
    unstable_noStore();
  }

  return (
    <html
      lang="fa"
      dir="rtl"
      data-scroll-behavior="smooth"
      className={fontVariable}
      suppressHydrationWarning
    >
      <head>
        <script
          id="theme-boot"
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
        <MediaPreconnect />
      </head>
      <body className={`${fontClassName} min-w-0 overflow-x-clip antialiased`} suppressHydrationWarning>
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
        {!isBareShellRoute && chatbotConfig.enabled ? (
          <SiteChatbotEntry
            config={chatbotConfig}
            aiAvailable={chatbotAiAvailable}
            faqGroups={[]}
            deferWidget={perfConfig.lazy_load_chatbot !== false}
          />
        ) : null}
        <script
          id="jsonld-site"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      </body>
    </html>
  );
}
