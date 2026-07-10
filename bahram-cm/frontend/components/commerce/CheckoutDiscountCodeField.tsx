"use client";

import { useEffect, useId, useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { readDiscountCode, readDiscountViaLink, setDiscountCode } from "@/lib/discount/capture";
import { useCheckoutDiscountOptional } from "@/lib/discount/context";
import { validateDiscountCode } from "@/lib/discount/validate";

type Props = {
  productId: number;
  customerPhone?: string | null;
};

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function CheckoutDiscountCodeField({ productId, customerPhone }: Props) {
  const inputId = useId();
  const discountCtx = useCheckoutDiscountOptional();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const stored = readDiscountCode();
    if (stored) {
      setApplied(normalizeCode(stored));
      setDraft(stored);
      void validateStoredCode(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function validateStoredCode(code: string) {
    const result = await validateDiscountCode({
      code,
      product_id: productId,
      via_link: readDiscountViaLink(),
      customer_phone: customerPhone ?? undefined,
    });

    if (result.ok) {
      discountCtx?.setPreview(result.data);
      setApplied(result.data.code);
      setError(null);
    } else {
      discountCtx?.clearPreview();
    }
  }

  async function applyCode() {
    const next = normalizeCode(draft);
    setError(null);

    if (!next) {
      setDiscountCode("");
      setApplied(null);
      discountCtx?.clearPreview();
      return;
    }

    setPending(true);
    const result = await validateDiscountCode({
      code: next,
      product_id: productId,
      via_link: readDiscountViaLink(),
      customer_phone: customerPhone ?? undefined,
    });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      discountCtx?.clearPreview();
      return;
    }

    setDiscountCode(next, readDiscountViaLink());
    setApplied(result.data.code);
    setDraft(result.data.code);
    discountCtx?.setPreview(result.data);
  }

  function handleToggle() {
    setOpen((prev) => !prev);
  }

  const preview = discountCtx?.preview;

  return (
    <div className="mt-4 border-t border-bone/10 pt-4">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-sm text-bone transition-colors hover:text-emerald-glow"
      >
        <span className="flex items-center gap-2">
          <span>کد تخفیف</span>
          {applied && !open ? (
            <span className="rounded-pill border border-emerald/25 bg-emerald/10 px-2 py-0.5 text-[11px] font-medium text-emerald-glow num-latin">
              {applied}
            </span>
          ) : null}
        </span>
        <ChevronDown
          size={16}
          className={cn("shrink-0 text-mist transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-3 space-y-2">
            <label htmlFor={inputId} className="sr-only">
              کد تخفیف
            </label>
            <div className="flex gap-2">
              <input
                id={inputId}
                type="text"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void applyCode();
                  }
                }}
                placeholder="مثلاً SUMMER20"
                dir="ltr"
                className="min-w-0 flex-1 rounded-tile border border-bone/12 bg-ink/60 px-3 py-2.5 text-sm text-bone placeholder:text-mist focus:border-emerald/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/30"
              />
              <button
                type="button"
                onClick={() => void applyCode()}
                disabled={pending}
                className="shrink-0 rounded-tile border border-emerald/30 bg-emerald/10 px-3 py-2.5 text-xs font-semibold text-emerald-glow transition hover:bg-emerald/15 disabled:opacity-60"
              >
                {pending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : "ثبت"}
              </button>
            </div>
            {error ? (
              <p role="alert" className="text-xs text-gold">
                {error}
              </p>
            ) : applied && preview ? (
              <p className="flex items-center gap-1.5 text-xs text-emerald-glow">
                <Check size={14} aria-hidden />
                کد تخفیف اعمال شد
                {preview.coupon_discount > 0 ? (
                  <span className="text-mist">
                    (−<span className="num-latin">{preview.coupon_discount.toLocaleString("en-US")}</span> تومان)
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="text-xs leading-relaxed text-mist">
                اگر کد تخفیف داری، اینجا وارد کن.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
