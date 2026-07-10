import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, RotateCcw, XCircle } from "lucide-react";
import { ClearCartOnPurchase } from "@/components/commerce/ClearCartOnPurchase";
import { PaymentResultCard } from "@/components/commerce/PaymentResultCard";
import { PaymentResultPanelButton } from "@/components/commerce/PaymentResultPanelButton";
import { Reveal } from "@/components/motion/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { getVerifiedPaymentResult, type PaymentResultStatus } from "@/lib/checkout/paymentResult";
import { getCurrentStudent } from "@/lib/student/session";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "نتیجه‌ی پرداخت",
  description: "وضعیت پرداخت سفارش شما.",
  path: "/payment/result",
  noIndex: true,
});

const COPY: Record<
  PaymentResultStatus,
  {
    eyebrow: string;
    title: string;
    body: string;
    icon: typeof CheckCircle2;
    tone: "success" | "failed" | "cancelled";
  }
> = {
  success: {
    eyebrow: "تبریک",
    title: "پرداخت با موفقیت انجام شد",
    body: "سفارش شما ثبت شد. اطلاعات دسترسی و پیامک تأیید به‌زودی برایت ارسال می‌شود.",
    icon: CheckCircle2,
    tone: "success",
  },
  failed: {
    eyebrow: "متأسفیم",
    title: "پرداخت ناموفق بود",
    body: "تراکنش از سمت بانک تأیید نشد. می‌توانی دوباره تلاش کنی یا با پشتیبانی تماس بگیری.",
    icon: XCircle,
    tone: "failed",
  },
  cancelled: {
    eyebrow: "انصراف",
    title: "پرداخت لغو شد",
    body: "از درگاه برگشتی و پرداخت انجام نشد. سفارش هنوز باز است — هر زمان آماده بودی می‌توانی دوباره پرداخت کنی.",
    icon: Clock,
    tone: "cancelled",
  },
};

function retryHref(product?: string | null): string {
  if (product) return `/purchase/${product}`;
  return "/cart";
}

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const [verified, student] = await Promise.all([
    token ? getVerifiedPaymentResult(token) : Promise.resolve(null),
    getCurrentStudent(),
  ]);

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      {verified?.status === "success" ? (
        <ClearCartOnPurchase productSlug={verified.product_slug} />
      ) : null}

      <section className="payment-result-section py-12 md:py-16 lg:py-20">
        <div className="container-luxe flex justify-center">
          <Reveal className="w-full max-w-lg">
            {!verified ? (
              <PaymentResultCard
                tone="invalid"
                eyebrow="خطا"
                title="لینک نامعتبر یا منقضی شده"
                body="این صفحه فقط از طریق بازگشت از درگاه پرداخت در دسترس است. اگر تازه پرداخت کرده‌ای از لینک درگاه استفاده کن؛ در غیر این صورت می‌توانی دوباره پرداخت کنی."
                icon={XCircle}
              >
                <LinkButton href="/cart" variant="primary" size="lg" className="payment-result-card__primary">
                  بازگشت به سبد خرید
                </LinkButton>
                <LinkButton href="/panel" variant="ghost" size="lg" className="payment-result-card__secondary">
                  ورود به پنل
                </LinkButton>
              </PaymentResultCard>
            ) : (
              <PaymentResultCard
                tone={COPY[verified.status].tone}
                eyebrow={COPY[verified.status].eyebrow}
                title={COPY[verified.status].title}
                body={COPY[verified.status].body}
                icon={COPY[verified.status].icon}
                orderNumber={verified.order_number}
              >
                {verified.status === "success" ? (
                  <PaymentResultPanelButton receiptToken={token!} isLoggedIn={Boolean(student)} />
                ) : (
                  <>
                    <Link
                      href={retryHref(verified.product_slug)}
                      className="payment-result-card__primary neon-btn-primary inline-flex h-12 min-h-12 items-center justify-center gap-2 rounded-pill px-7 text-sm font-semibold md:text-body"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden />
                      پرداخت مجدد
                    </Link>
                    <LinkButton href="/" variant="ghost" size="lg" className="payment-result-card__secondary">
                      بازگشت به خانه
                    </LinkButton>
                    <Link
                      href="mailto:hello@bahramrostami.com"
                      className="payment-result-card__secondary inline-flex h-12 min-h-12 items-center justify-center rounded-pill border px-7 text-sm font-semibold md:text-body"
                    >
                      تماس با پشتیبانی
                    </Link>
                  </>
                )}
              </PaymentResultCard>
            )}
          </Reveal>
        </div>
      </section>
    </main>
  );
}
