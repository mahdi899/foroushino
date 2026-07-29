import "server-only";

type TelegramPayResolve = {
  status: string;
  message: string;
  payment_url: string | null;
  bot_url: string | null;
  product_title: string | null;
};

export async function resolveTelegramPaymentToken(token: string): Promise<TelegramPayResolve> {
  const backend = (process.env.BACKEND_PROXY_URL ?? "http://127.0.0.1:8010").replace(/\/+$/, "");
  const safe = encodeURIComponent(token);

  try {
    const res = await fetch(`${backend}/api/payments/telegram/${safe}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    const data = (await res.json().catch(() => ({}))) as Partial<TelegramPayResolve> & {
      payment_url?: string | null;
      bot_url?: string | null;
      product_title?: string | null;
      message?: string;
      status?: string;
    };

    return {
      status: typeof data.status === "string" ? data.status : "expired",
      message:
        typeof data.message === "string" && data.message
          ? data.message
          : "لینک پرداخت شما منقضی شده — لطفاً مجدد از ربات اقدام کنید.",
      payment_url: typeof data.payment_url === "string" ? data.payment_url : null,
      bot_url: typeof data.bot_url === "string" ? data.bot_url : null,
      product_title: typeof data.product_title === "string" ? data.product_title : null,
    };
  } catch {
    return {
      status: "unavailable",
      message: "بررسی پرداخت ناموفق بود. لطفاً دوباره از ربات اقدام کنید.",
      payment_url: null,
      bot_url: null,
      product_title: null,
    };
  }
}
