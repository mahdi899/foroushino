import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { ClearCartOnPurchase } from "@/components/commerce/ClearCartOnPurchase";
import { PaymentCompleteForm } from "@/components/forms/PaymentCompleteForm";
import { Reveal } from "@/components/motion/Reveal";
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

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      {profile && token ? <ClearCartOnPurchase productSlug={profile.product_slug} /> : null}
      <section className="py-section">
        <div className="container-luxe flex justify-center">
          <Reveal>
            <div className="neon-surface-static max-w-xl rounded-card border border-bone/10 bg-charcoal/45 p-8 md:p-12">
              {profile && token ? (
                <>
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-glow" strokeWidth={1.4} aria-hidden />
                  <h1 className="mt-6 text-h2 text-balance text-center text-bone">پرداخت موفق بود</h1>
                  <p className="mt-3 text-center text-bone-dim">
                    {loggedInWithProfile
                      ? "دسترسی‌ات در حال فعال‌سازی است. اطلاعات حسابت را پایین می‌بینی."
                      : student
                        ? "فقط نام خود را وارد کن تا دسترسی‌ات فعال شود."
                        : "برای فعال‌سازی دسترسی، نام خود را وارد کن."}
                  </p>
                  <div className="mt-8">
                    <PaymentCompleteForm
                      completionToken={token}
                      orderNumber={profile.order_number}
                      phoneMasked={profile.customer_phone_masked}
                      initialEmail={profile.customer_email}
                      student={student}
                    />
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-h2 text-balance text-bone">لینک نامعتبر یا منقضی شده</h1>
                  <p className="mt-3 text-bone-dim">
                    این صفحه فقط از طریق بازگشت موفق از درگاه پرداخت در دسترس است. اگر تازه پرداخت کرده‌ای،
                    دوباره از لینک پیامک یا ایمیل استفاده کن؛ در غیر این صورت وارد پنل شو.
                  </p>
                  <div className="mt-8 flex justify-center">
                    <Link
                      href="/"
                      className="neon-btn-primary inline-flex h-11 items-center justify-center rounded-pill bg-emerald px-6 font-semibold"
                    >
                      بازگشت به سایت
                    </Link>
                  </div>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
