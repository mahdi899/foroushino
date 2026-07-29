import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, XCircle } from "lucide-react";
import { resolveTelegramPaymentToken } from "@/lib/checkout/telegramPayToken";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/cn";

export const metadata: Metadata = buildMetadata({
  title: "بررسی پرداخت",
  description: "بررسی لینک پرداخت تلگرام و انتقال به درگاه.",
  path: "/pay/telegram",
  noIndex: true,
});

export const dynamic = "force-dynamic";

const ctaClass =
  "group inline-flex items-center justify-center gap-2 font-medium select-none whitespace-nowrap transition-[background,color,transform,box-shadow] duration-300 ease-[var(--ease-luxe)] neon-btn-primary brand-cta rounded-pill font-semibold hover:-translate-y-px active:translate-y-0 h-14 min-h-14 px-7 text-base";

export default async function TelegramPayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await resolveTelegramPaymentToken(token);

  if (result.status === "ok" && result.payment_url) {
    redirect(result.payment_url);
  }

  const alreadyPaid = result.status === "already_paid";
  const Icon = alreadyPaid ? Clock : XCircle;

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <Icon className="h-12 w-12 text-text-muted" aria-hidden />
        <div className="max-w-md space-y-3">
          <h1 className="text-xl font-semibold text-ink">
            {alreadyPaid ? "پرداخت انجام شده" : "لینک پرداخت منقضی شده"}
          </h1>
          {result.product_title ? (
            <p className="text-sm text-text-muted">{result.product_title}</p>
          ) : null}
          <p className="text-text-muted">{result.message}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {result.bot_url ? (
            <a href={result.bot_url} className={cn(ctaClass)}>
              بازگشت به ربات
            </a>
          ) : null}
          <Link href="/" className="text-sm text-text-muted underline-offset-4 hover:underline">
            صفحه اصلی سایت
          </Link>
        </div>
      </div>
    </main>
  );
}
