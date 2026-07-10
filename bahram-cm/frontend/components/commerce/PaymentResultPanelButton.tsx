"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStudentAuthOptional } from "@/components/student-panel/auth/StudentAuthContext";
import { loginFromPaymentReceiptAction } from "@/lib/checkout/actions";

type Props = {
  receiptToken: string;
  isLoggedIn: boolean;
};

export function PaymentResultPanelButton({ receiptToken, isLoggedIn }: Props) {
  const router = useRouter();
  const auth = useStudentAuthOptional();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadyLoggedIn = isLoggedIn || (auth?.isLoggedIn ?? false);

  async function enterPanel() {
    if (alreadyLoggedIn) {
      router.push("/panel");
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
    router.push("/panel");
  }

  if (alreadyLoggedIn) {
    return (
      <Link
        href="/panel"
        className="neon-btn-primary inline-flex h-11 items-center justify-center rounded-pill bg-emerald px-6 font-semibold hover:bg-emerald-glow"
      >
        ورود به پنل کاربری
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => void enterPanel()}
        disabled={busy}
        className="neon-btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-emerald px-6 font-semibold hover:bg-emerald-glow disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            در حال ورود به پنل…
          </>
        ) : (
          "ورود به پنل کاربری"
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
