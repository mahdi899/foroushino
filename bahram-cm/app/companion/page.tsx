"use client";

import { AlertCircle, KeyRound, Loader2, LogOut } from "lucide-react";
import { useMemo, useState } from "react";
import { track } from "@/lib/analytics";
import {
  fetchCompanionOverview,
  isPlausibleToken,
  type CompanionOverview,
} from "@/lib/services/companion";

type Status = "idle" | "loading" | "error" | "ready";

export default function CompanionPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CompanionOverview | null>(null);

  const canSubmit = useMemo(
    () => isPlausibleToken(token) && status !== "loading",
    [token, status],
  );

  async function load() {
    if (!isPlausibleToken(token)) {
      setStatus("error");
      setError("توکن خیلی کوتاه است؛ توکن کامل را وارد کن.");
      return;
    }
    setStatus("loading");
    setError(null);
    setData(null);

    const result = await fetchCompanionOverview(token);
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      track("companion_access", { result: "error" });
      return;
    }
    setData(result.data);
    setStatus("ready");
    track("companion_access", { result: "success" });
  }

  function reset() {
    setToken("");
    setData(null);
    setError(null);
    setStatus("idle");
  }

  return (
    <main id="main-content" className="container-luxe relative min-w-0 max-w-full py-16 md:py-24">
      <section className="mx-auto max-w-3xl min-w-0">
        <div className="hairline-gold mb-6" />
        <h1 className="text-h2 font-display text-bone">Academy Companion</h1>
        <p className="mt-3 text-body text-mist">
          نمایش سریع دفتر و آرشیو روی وب — فقط خواندنی.
        </p>

        {status !== "ready" ? (
          <div className="glass neon-surface-static mt-8 rounded-card p-5 md:p-6">
            <label htmlFor="token" className="flex items-center gap-2 text-caption text-gold-soft">
              <KeyRound className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
              Companion Token
            </label>
            <textarea
              id="token"
              className="mt-2 min-h-24 w-full rounded-tile border border-white/10 bg-charcoal-2 px-3 py-2 text-body text-bone outline-none focus:border-emerald-glow"
              placeholder="توکن را اینجا وارد کن..."
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                if (status === "error") {
                  setStatus("idle");
                  setError(null);
                }
              }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
                  e.preventDefault();
                  void load();
                }
              }}
              aria-invalid={status === "error"}
              aria-describedby={status === "error" ? "token-error" : undefined}
            />
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 rounded-pill bg-emerald px-5 py-2.5 text-sm font-semibold text-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void load()}
              disabled={!canSubmit}
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  در حال بارگذاری...
                </>
              ) : (
                "نمایش داشبورد"
              )}
            </button>
            {status === "error" && error ? (
              <p
                id="token-error"
                role="alert"
                className="mt-3 flex items-start gap-2 text-sm text-red-300"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.6} aria-hidden />
                {error}
              </p>
            ) : null}
          </div>
        ) : null}

        {status === "ready" && data ? (
          <div className="mt-8 space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-caption text-mist">دسترسی فقط‌خواندنی فعال است.</p>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-pill border border-bone/15 px-3 py-1.5 text-caption text-bone-dim transition-colors hover:border-bone/30 hover:text-bone"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                خروج
              </button>
            </div>

            <div className="glass neon-surface-static rounded-card p-5">
              <p className="text-caption text-gold-soft">عضو</p>
              <h2 className="mt-1 text-h3 font-display">{data.user_name ?? "کاربر آکادمی"}</h2>
              <p className="mt-2 text-sm text-mist num-latin">
                Tier {data.tier} · {data.ledger_count} ثبت در دفتر
              </p>
            </div>

            <div className="glass neon-surface-static rounded-card p-5">
              <p className="text-caption text-gold-soft">آرشیو پیام‌ها</p>
              {data.recent_voices.length ? (
                <div className="mt-3 space-y-3">
                  {data.recent_voices.map((v) => (
                    <article
                      key={v.id}
                      className="rounded-tile border border-white/10 bg-charcoal/70 p-4"
                    >
                      <p className="text-xs text-mist num-latin">{v.publish_date}</p>
                      <h3 className="mt-1 text-base font-semibold text-bone">
                        {v.title_fa ?? "بدون عنوان"}
                      </h3>
                      {v.body_preview_fa ? (
                        <p className="mt-2 text-sm text-bone-dim">{v.body_preview_fa}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-mist">هنوز پیامی در آرشیو ثبت نشده است.</p>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
