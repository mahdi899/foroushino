import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { DynamicFAQ } from "@/components/sections/DynamicFAQ";
import { FAQ } from "@/components/sections/FAQ";

export const metadata: Metadata = buildMetadata({
  title: "سوالات متداول",
  description: "پاسخ‌های کوتاه پیش از ورود به مسیر؛ درباره‌ی دوره‌ها، آکادمی و فرایند ارزیابی.",
  path: "/faq",
});

export const revalidate = 300;

export default function FaqPage() {
  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <FAQ />
      <DynamicFAQ />
    </main>
  );
}
