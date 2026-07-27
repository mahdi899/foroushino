"use client";

import { Loader2, Radio } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStudentAuthOptional } from "@/components/student-panel/auth/StudentAuthContext";
import { loginFromPaymentReceiptAction } from "@/lib/checkout/actions";

type Props = {
  receiptToken: string;
  isLoggedIn: boolean;
  href?: string;
  label?: string;
  variant?: "primary" | "secondary";
};

export function PaymentResultPanelButton({
  receiptToken,
  isLoggedIn,
  href = "/panel",
  label = "ورود به پنل کاربری",
  variant = "primary",
}: Props) {
  const router = useRouter();
  const auth = useStudentAuthOptional();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadyLoggedIn = isLoggedIn || (auth?.isLoggedIn ?? false);
  const className =
    variant === "primary"
      ? "payment-result-card__primary neon-btn-primary inline-flex h-12 min-h-12 items-center justify-center gap-2 rounded-pill px-7 text-sm font-semibold md:text-body"
      : "payment-result-card__secondary inline-flex h-12 min-h-12 items-center justify-center gap-2 rounded-pill border px-7 text-sm font-semibold md:text-body";

  async function enterPanel() {
    if (alreadyLoggedIn) {
      router.push(href);
      return;
    }

    setBusy(true);
    setError(null);

    const result = await loginFromPaymentReceiptAction(receiptToken);
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }

    if (result.needsProfileCompletion) {
      router.push(`/payment/complete?token=${encodeURIComponent(result.completionToken)}`);
      return;
    }

    auth?.markLoggedIn();
    router.push(href);
  }

  if (alreadyLoggedIn) {
    return (
      <Link href={href} className={className}>
        {href.includes("reference-channel") ? <Radio className="h-4 w-4" aria-hidden /> : null}
        {label}
      </Link>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => void enterPanel()}
        disabled={busy}
        className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            در حال ورود…
          </>
        ) : (
          <>
            {href.includes("reference-channel") ? <Radio className="h-4 w-4" aria-hidden /> : null}
            {label}
          </>
        )}
      </button>
      {error ? (
        <p role="alert" className="max-w-sm text-sm text-gold">
          {error}
        </p>
      ) : null}
    </div>
  );
}
