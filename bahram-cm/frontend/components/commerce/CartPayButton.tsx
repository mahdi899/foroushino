"use client";

import { Loader2 } from "lucide-react";
import { Suspense, useCallback, useState } from "react";
import { track } from "@/lib/analytics";
import { useCheckoutAutopay, useCheckoutLoginGate } from "@/lib/checkout/checkoutLogin";
import { startLoggedInCheckoutAction } from "@/lib/checkout/actions";
import { captureReferralCode } from "@/lib/referral/capture";
import { captureDiscountCode } from "@/lib/discount/capture";
import {
  prefillExtraFields,
  productCheckoutFields,
  productNeedsExtraForm,
} from "@/lib/checkout/productFields";
import type { ProductDetail } from "@/lib/services/products";
import type { StudentUser } from "@/lib/student/session";

type Props = {
  product: ProductDetail;
  student: StudentUser | null;
};

function CartPayButtonInner({ product, student }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { requireLoginOr } = useCheckoutLoginGate({ isLoggedIn: Boolean(student) });

  const goToGateway = useCallback(async () => {
    if (busy || !student) return;
    setBusy(true);
    setError(null);
    track("checkout_start", { product: product.slug });

    const extraFields = productCheckoutFields(product);
    const extraPayload = productNeedsExtraForm(product)
      ? prefillExtraFields(extraFields, student.profile)
      : undefined;

    const discount = captureDiscountCode();

    const result = await startLoggedInCheckoutAction({
      product_id: product.id,
      ref: captureReferralCode(),
      coupon: discount.code,
      coupon_via_link: discount.viaLink,
      customer_extra_data: extraPayload && Object.keys(extraPayload).length ? extraPayload : undefined,
    });

    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      track("checkout_error", { product: product.slug });
      return;
    }

    track("checkout_success", { product: product.slug, order: result.order_number });
    window.location.href = result.payment_url;
  }, [busy, product, student]);

  useCheckoutAutopay(Boolean(student), goToGateway);

  function handlePay() {
    requireLoginOr(goToGateway);
  }

  return (
    <div className="w-full min-w-0">
      <button
        type="button"
        onClick={handlePay}
        disabled={busy}
        className="neon-btn-primary inline-flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-emerald px-7 text-base font-semibold transition-[background-color,transform,box-shadow] duration-300 ease-[var(--ease-luxe)] hover:-translate-y-px hover:bg-emerald-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald/50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            در حال انتقال به درگاه…
          </>
        ) : (
          "پرداخت امن"
        )}
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-center text-sm text-gold">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CartPayButton(props: Props) {
  return (
    <Suspense
      fallback={
        <button
          type="button"
          disabled
          className="neon-btn-primary inline-flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-emerald px-7 text-base font-semibold opacity-60"
        >
          پرداخت امن
        </button>
      }
    >
      <CartPayButtonInner {...props} />
    </Suspense>
  );
}
