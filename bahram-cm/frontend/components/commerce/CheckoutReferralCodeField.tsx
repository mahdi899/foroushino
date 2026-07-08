"use client";

import { useEffect, useId, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { readReferralCode, setReferralCode } from "@/lib/referral/capture";

type Props = {
  ownReferralCode?: string | null;
};

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function CheckoutReferralCodeField({ ownReferralCode }: Props) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = readReferralCode();
    if (stored) {
      setApplied(normalizeCode(stored));
      setDraft(stored);
    }
  }, []);

  function applyCode() {
    const next = normalizeCode(draft);
    setError(null);

    if (!next) {
      setReferralCode("");
      setApplied(null);
      return;
    }

    if (ownReferralCode && next === normalizeCode(ownReferralCode)) {
      setError("نمی‌توانید از کد معرف خودتان استفاده کنید.");
      return;
    }

    setReferralCode(next);
    setApplied(next);
    setDraft(next);
  }

  function handleToggle() {
    setOpen((prev) => !prev);
  }

  return (
    <div className="mt-4 border-t border-bone/10 pt-4">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-sm text-bone transition-colors hover:text-emerald-glow"
      >
        <span className="flex items-center gap-2">
          <span>کد معرف</span>
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
              کد معرف
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
                    applyCode();
                  }
                }}
                placeholder="مثلاً BRM-36363"
                dir="ltr"
                className="min-w-0 flex-1 rounded-tile border border-bone/12 bg-ink/60 px-3 py-2.5 text-sm text-bone placeholder:text-mist focus:border-emerald/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/30"
              />
              <button
                type="button"
                onClick={applyCode}
                className="shrink-0 rounded-tile border border-emerald/30 bg-emerald/10 px-3 py-2.5 text-xs font-semibold text-emerald-glow transition hover:bg-emerald/15"
              >
                ثبت
              </button>
            </div>
            {error ? (
              <p role="alert" className="text-xs text-gold">
                {error}
              </p>
            ) : applied ? (
              <p className="flex items-center gap-1.5 text-xs text-emerald-glow">
                <Check size={14} aria-hidden />
                کد معرف ثبت شد.
              </p>
            ) : (
              <p className="text-xs leading-relaxed text-mist">
                اگر دوستی شما را معرفی کرده، کد او را وارد کن.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
