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
import { getActiveSeminarPromo } from "@/lib/services/seminarPromo";
import { getCurrentStudent } from "@/lib/student/session";
import { StudentAuthRoot } from "@/components/student-panel/auth/StudentAuthRoot";
import { ReferralCapture } from "@/components/commerce/ReferralCapture";
import { GrainOverlay } from "@/components/motion/GrainOverlay";
import { ThemeBootScript } from "@/components/theme/ThemeBootScript";
import "@/styles/globals.css";

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
  const hidePromoRoute = pathname.startsWith("/seminars/") || pathname.startsWith("/purchase/");

  const [chatbotConfig, perfConfig, seminarPromo] = await Promise.all([
    isBareShellRoute ? Promise.resolve(EMPTY_CHATBOT_PUBLIC) : getPublicChatbotConfig(),
    getPublicPerfConfig(),
    isBareShellRoute || hidePromoRoute ? Promise.resolve(null) : getActiveSeminarPromo(),
  ]);
  const chatbotAiAvailable = chatbotConfig.enabled && (chatbotConfig.ai_available ?? false);
  const studentUser = !isAdminRoute ? await getCurrentStudent() : null;
  const studentLoggedIn = Boolean(studentUser);

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
          id="jsonld-site"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
        <MediaPreconnect />
      </head>
      <body className={`${fontClassName} min-w-0 overflow-x-clip antialiased`} suppressHydrationWarning>
        <ThemeBootScript />
        {!isBareShellRoute ? <GrainOverlay /> : null}
        {!isBareShellRoute ? <ReferralCapture /> : null}
        <StudentAuthRoot initialLoggedIn={studentLoggedIn}>
          <PerformanceProvider config={perfConfig}>
            <AdminAwareChrome promo={seminarPromo}>{children}</AdminAwareChrome>
          </PerformanceProvider>
          {!isBareShellRoute && chatbotConfig.enabled ? (
            <SiteChatbotEntry
              config={chatbotConfig}
              aiAvailable={chatbotAiAvailable}
              faqGroups={[]}
              deferWidget={perfConfig.lazy_load_chatbot !== false}
            />
          ) : null}
        </StudentAuthRoot>
      </body>
    </html>
  );
}
