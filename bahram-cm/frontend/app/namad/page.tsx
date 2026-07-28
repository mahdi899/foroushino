import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { TrustSeals } from "@/components/namad/TrustSeals";

export const metadata: Metadata = buildMetadata({
  title: "نمادهای اعتماد",
  description: "نماد اعتماد الکترونیکی، زرین‌پال و ساماندهی — تأیید هویت و درگاه امن پرداخت.",
  path: "/namad",
});

export default function NamadPage() {
  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <header className="mb-10 text-center">
          <h1 className="text-2xl font-semibold text-bone sm:text-3xl">نمادهای اعتماد</h1>
          <p className="mt-3 text-sm text-mist sm:text-base">
            نمادهای رسمی اعتماد الکترونیکی و درگاه پرداخت این سایت.
          </p>
        </header>
        <TrustSeals />
      </section>
    </main>
  );
}
