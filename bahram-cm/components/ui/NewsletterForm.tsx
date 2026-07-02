"use client";

import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { isValidEmail, subscribeNewsletter } from "@/lib/services/newsletter";

type Status = "idle" | "loading" | "ok" | "err";

export function NewsletterForm({
  className,
  density = "default",
  source = "web_newsletter",
}: {
  className?: string;
  /** `compact`: یک ردیف فشرده، مناسب فوتر موبایل */
  density?: "default" | "compact";
  source?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setStatus("err");
      setMessage("ایمیل را درست وارد کن.");
      return;
    }
    setStatus("loading");
    setMessage("");
    const result = await subscribeNewsletter(email, source);
    if (result.ok) {
      setStatus("ok");
      setMessage("ثبت شد. مراقب صندوق ایمیل باش.");
      setEmail("");
      track("newsletter_signup", { source, status: result.data.status });
    } else {
      setStatus("err");
      setMessage(result.error);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "relative flex w-full min-w-0 rounded-2xl border border-bone/12 bg-charcoal/55",
        density === "compact"
          ? "flex-row flex-wrap items-center gap-1.5 rounded-pill p-1"
          : "flex-col gap-2.5 p-2 sm:flex-row sm:items-center sm:gap-2 sm:rounded-pill sm:p-1.5",
        className,
      )}
    >
      <label htmlFor="newsletter-email" className="sr-only">
        ایمیل
      </label>
      <div className="relative min-w-0 flex-1">
        <span className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-mist">
          <Mail className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </span>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status !== "idle") setStatus("idle");
          }}
          disabled={status === "loading"}
          placeholder="ایمیل تو"
          className={cn(
            "w-full min-w-0 bg-transparent ps-11 pe-3 text-body text-bone placeholder:text-mist focus:outline-none",
            density === "compact" ? "h-10 min-h-10 text-sm" : "h-12 min-h-12",
          )}
        />
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        aria-busy={status === "loading"}
        className={cn(
          "group neon-btn-primary inline-flex shrink-0 touch-manipulation items-center justify-center gap-1.5 rounded-pill bg-emerald transition-[background-color,color,transform,box-shadow] duration-300 ease-[var(--ease-luxe)] hover:bg-emerald-glow hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70",
          density === "compact"
            ? "h-10 min-h-10 w-auto px-3 text-sm"
            : "h-12 min-h-12 w-full px-5 sm:w-auto",
        )}
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <>
            <span>عضو می‌شوم</span>
            <ArrowLeft
              className="rtl-flip h-4 w-4 transition-transform group-hover:-translate-x-0.5"
              aria-hidden
            />
          </>
        )}
      </button>
      <p
        role="status"
        aria-live="polite"
        className={cn(
          "relative mt-1 text-caption transition-opacity",
          density === "compact"
            ? "w-full basis-full"
            : "sm:absolute sm:mt-0 sm:-bottom-7 sm:end-2",
          status === "idle" &&
            (density === "compact" ? "hidden" : "hidden sm:block sm:opacity-0"),
          status === "ok" && "text-emerald-glow",
          status === "err" && "text-gold",
        )}
      >
        {message}
      </p>
    </form>
  );
}
