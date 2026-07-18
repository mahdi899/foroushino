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
import { BahramUpdateBanner } from "@/components/pwa/BahramUpdateBanner";
import { SiteInstallCard } from "@/components/pwa/SiteInstallCard";
import { SitePwaRegistrar } from "@/components/pwa/SitePwaRegistrar";
import { MediaPreconnect } from "@/components/performance/MediaPreconnect";
import { PerformanceProvider } from "@/components/performance/PerformanceProvider";
import { getPublicChatbotConfig } from "@/lib/chatbot/public";
import { EMPTY_CHATBOT_PUBLIC } from "@/lib/chatbot/types";
import { getPublicPerfConfig } from "@/lib/cache/public";
import { getActiveSeminarPromo } from "@/lib/services/seminarPromo";
import { getStudentDisplayName } from "@/lib/student/displayName";
import { buildStudentFormPrefill } from "@/lib/student/formPrefill";
import { getCurrentStudent } from "@/lib/student/session";
import { StudentAuthRoot } from "@/components/student-panel/auth/StudentAuthRoot";
import { ReferralCapture } from "@/components/commerce/ReferralCapture";
import { DiscountCapture } from "@/components/commerce/DiscountCapture";
import { GrainOverlay } from "@/components/motion/GrainOverlay";
import { SiteBootLoader } from "@/components/layout/SiteBootLoader";
import { cookies } from "next/headers";
import { ThemeBoot } from "@/components/theme/ThemeBoot";
import { ServerInsertedJsonLd } from "@/components/bootstrap/ServerInsertedJsonLd";
import {
  DEFAULT_SITE_THEME,
  SITE_THEME_COOKIE_KEY,
  parseSiteTheme,
} from "@/lib/site-theme";
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
  const isBareShellRoute = isAdminRoute || pathname.startsWith("/panel") || pathname.startsWith("/family");
  const hidePromoRoute = pathname.startsWith("/seminars/") || pathname.startsWith("/purchase/");

  const [chatbotConfig, perfConfig, seminarPromo] = await Promise.all([
    isBareShellRoute ? Promise.resolve(EMPTY_CHATBOT_PUBLIC) : getPublicChatbotConfig(),
    getPublicPerfConfig(),
    isBareShellRoute || hidePromoRoute ? Promise.resolve(null) : getActiveSeminarPromo(),
  ]);
  const chatbotAiAvailable = chatbotConfig.enabled && (chatbotConfig.ai_available ?? false);
  const studentUser = !isAdminRoute ? await getCurrentStudent() : null;
  const studentLoggedIn = Boolean(studentUser);
  const studentDisplayName = studentUser ? getStudentDisplayName(studentUser) : null;
  const studentPrefill = studentUser ? buildStudentFormPrefill(studentUser) : null;

  if (!isBareShellRoute && (perfConfig.developer_mode || perfConfig.page_cache === false)) {
    unstable_noStore();
  }

  const initialTheme =
    parseSiteTheme((await cookies()).get(SITE_THEME_COOKIE_KEY)?.value) ?? DEFAULT_SITE_THEME;

  return (
    <html
      lang="fa"
      dir="rtl"
      data-theme={initialTheme}
      data-scroll-behavior="smooth"
      className={fontVariable}
      suppressHydrationWarning
    >
      <head>
        <MediaPreconnect />
      </head>
      <body className={`${fontClassName} min-w-0 overflow-x-clip antialiased`} suppressHydrationWarning>
        {!isBareShellRoute ? <ServerInsertedJsonLd id="jsonld-site" data={ld} /> : null}
        <ThemeBoot />
        {!isBareShellRoute ? <SiteBootLoader /> : null}
        {!isBareShellRoute ? <GrainOverlay /> : null}
        {!isBareShellRoute ? <ReferralCapture /> : null}
        {!isBareShellRoute ? <DiscountCapture /> : null}
        {!isBareShellRoute ? <SitePwaRegistrar /> : null}
        <StudentAuthRoot
          initialLoggedIn={studentLoggedIn}
          initialDisplayName={studentDisplayName}
          initialPrefill={studentPrefill}
        >
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
          {!isBareShellRoute ? <SiteInstallCard /> : null}
          {!isBareShellRoute ? <BahramUpdateBanner variant="site" /> : null}
        </StudentAuthRoot>
      </body>
    </html>
  );
}
