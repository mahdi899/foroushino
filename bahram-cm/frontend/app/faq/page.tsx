import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { DynamicFAQ } from "@/components/sections/DynamicFAQ";

export const metadata: Metadata = buildMetadata({
  title: "سوالات متداول",
  description: "پاسخ‌های کوتاه پیش از ورود به مسیر؛ درباره‌ی دوره‌ها، آکادمی و فرایند ارزیابی.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <DynamicFAQ />
    </main>
  );
}
