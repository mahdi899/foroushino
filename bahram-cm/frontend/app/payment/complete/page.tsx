import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { ClearCartOnPurchase } from "@/components/commerce/ClearCartOnPurchase";
import { PaymentResultCard } from "@/components/commerce/PaymentResultCard";
import { PaymentCompleteForm } from "@/components/forms/PaymentCompleteForm";
import { Reveal } from "@/components/motion/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { buildCustomerName, isCompleteCustomerName } from "@/lib/checkout/productFields";
import { getOrderCompleteProfile } from "@/lib/checkout/orderComplete";
import { getCurrentStudent } from "@/lib/student/session";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "تکمیل اطلاعات خرید",
  description: "تکمیل اطلاعات پس از پرداخت موفق.",
  path: "/payment/complete",
  noIndex: true,
});

export default async function PaymentCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const [profile, student] = await Promise.all([
    token ? getOrderCompleteProfile(token) : Promise.resolve(null),
    getCurrentStudent(),
  ]);

  const studentName = student ? buildCustomerName(student.profile, student.name) : "";
  const loggedInWithProfile = Boolean(student && isCompleteCustomerName(studentName));
  const validProfile = profile && token ? profile : null;
  const hasValidProfile = validProfile !== null;

  const body = !hasValidProfile
    ? "این صفحه فقط از طریق بازگشت موفق از درگاه پرداخت در دسترس است."
    : loggedInWithProfile
      ? "دسترسی‌ات در حال فعال‌سازی است. در صورت نیاز اطلاعات حسابت را بررسی کن."
      : student
        ? "نام خود را وارد کن تا دسترسی دوره فعال شود."
        : "برای فعال‌سازی دسترسی، نام خود را وارد کن.";

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      {validProfile ? <ClearCartOnPurchase productSlug={validProfile.product_slug} /> : null}

      <section className="payment-result-section py-12 md:py-16 lg:py-20">
        <div className="container-luxe flex justify-center">
          <Reveal className="w-full max-w-lg">
            <PaymentResultCard
              tone={hasValidProfile ? "success" : "invalid"}
              eyebrow={hasValidProfile ? "تبریک" : "خطا"}
              title={hasValidProfile ? "پرداخت موفق بود" : "لینک نامعتبر یا منقضی شده"}
              body={body}
              icon={hasValidProfile ? CheckCircle2 : XCircle}
              orderNumber={validProfile ? validProfile.order_number : null}
              slot="form"
            >
              {validProfile ? (
                <PaymentCompleteForm
                  embedded
                  completionToken={token!}
                  orderNumber={validProfile.order_number}
                  phoneMasked={validProfile.customer_phone_masked}
                  initialEmail={validProfile.customer_email}
                  student={student}
                />
              ) : (
                <LinkButton href="/" variant="primary" size="lg" className="payment-result-card__primary">
                  بازگشت به سایت
                </LinkButton>
              )}
            </PaymentResultCard>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
