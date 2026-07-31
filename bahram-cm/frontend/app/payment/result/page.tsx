import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, Radio, RotateCcw, XCircle } from "lucide-react";
import { ClearCartOnPurchase } from "@/components/commerce/ClearCartOnPurchase";
import { PaymentResultCard } from "@/components/commerce/PaymentResultCard";
import { PaymentResultPanelButton } from "@/components/commerce/PaymentResultPanelButton";
import { ReferenceChannelIdentityGate } from "@/components/commerce/ReferenceChannelIdentityGate";
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
  pending: {
    eyebrow: "در حال تأیید",
    title: "پرداخت در حال بررسی است",
    body: "ارتباط لحظه‌ای با درگاه قطع شد، اما سفارش هنوز در صف تأیید است. اگر در ربات تلگرام پیام تأیید دیدی، پرداخت موفق بوده — چند لحظه بعد این صفحه را رفرش کن یا از پنل وضعیت را ببین.",
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
                eyebrow="توجه"
                title="نتیجه پرداخت در دسترس نیست"
                body="این لینک منقضی یا ناقص است. اگر همین الان از درگاه برگشتی و در ربات تلگرام تأیید پرداخت را دیدی، سفارش ثبت شده — از پنل یا کانال مرجع ادامه بده. در غیر این صورت دوباره پرداخت کن."
                icon={XCircle}
              >
                <LinkButton href="/panel" variant="primary" size="lg" className="payment-result-card__primary">
                  ورود به پنل
                </LinkButton>
                <LinkButton href="/panel/reference-channel" variant="ghost" size="lg" className="payment-result-card__secondary">
                  کانال مرجع
                </LinkButton>
                <LinkButton href="/cart" variant="ghost" size="lg" className="payment-result-card__secondary">
                  بازگشت به سبد خرید
                </LinkButton>
              </PaymentResultCard>
            ) : (
              <PaymentResultCard
                tone={COPY[verified.status].tone}
                eyebrow={COPY[verified.status].eyebrow}
                title={COPY[verified.status].title}
                body={
                  verified.status === "success" && verified.is_reference_channel
                    ? verified.identity_verified
                      ? "پرداخت ثبت شد و احراز هویت شما تأیید شده است. برای دریافت دسترسی، وارد ربات تلگرام شوید."
                      : "پرداخت ثبت شد؛ اما برای عضویت در کانال مرجع باید احراز هویت را کامل کنید."
                    : COPY[verified.status].body
                }
                icon={COPY[verified.status].icon}
                orderNumber={verified.order_number}
              >
                {verified.status === "success" ? (
                  <div className="flex w-full flex-col items-center gap-3">
                    {verified.is_reference_channel && !verified.identity_verified ? (
                      <ReferenceChannelIdentityGate
                        receiptToken={token!}
                        isLoggedIn={Boolean(student)}
                      />
                    ) : null}

                    {verified.is_reference_channel && verified.identity_verified ? (
                      <>
                        {verified.bot_start_url ? (
                          <a
                            href={verified.bot_start_url}
                            target="_blank"
                            rel="noreferrer"
                            className="payment-result-card__primary neon-btn-primary inline-flex h-12 min-h-12 items-center justify-center gap-2 rounded-pill px-7 text-sm font-semibold md:text-body"
                          >
                            <Radio className="h-4 w-4" aria-hidden />
                            ورود به ربات تلگرام
                          </a>
                        ) : null}
                        <PaymentResultPanelButton
                          receiptToken={token!}
                          isLoggedIn={Boolean(student)}
                          href="/panel/reference-channel"
                          label="عضویت در مرجع"
                          variant={verified.bot_start_url ? "secondary" : "primary"}
                        />
                      </>
                    ) : null}
                    {!verified.is_reference_channel ? (
                      <PaymentResultPanelButton
                        receiptToken={token!}
                        isLoggedIn={Boolean(student)}
                        href="/panel"
                        label="ورود به پنل کاربری"
                        variant="primary"
                      />
                    ) : null}
                  </div>
                ) : verified.status === "pending" ? (
                  <>
                    <LinkButton href="/panel" variant="primary" size="lg" className="payment-result-card__primary">
                      بررسی در پنل
                    </LinkButton>
                    <LinkButton href="/panel/reference-channel" variant="ghost" size="lg" className="payment-result-card__secondary">
                      کانال مرجع
                    </LinkButton>
                  </>
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
