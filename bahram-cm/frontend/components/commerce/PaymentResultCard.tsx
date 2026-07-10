import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PaymentResultCardTone = "success" | "failed" | "cancelled" | "invalid";

type PaymentResultCardProps = {
  tone: PaymentResultCardTone;
  eyebrow: string;
  title: string;
  body: string;
  icon: LucideIcon;
  orderNumber?: string | null;
  slot?: "actions" | "form";
  children: ReactNode;
};

export function PaymentResultCard({
  tone,
  eyebrow,
  title,
  body,
  icon: Icon,
  orderNumber,
  slot = "actions",
  children,
}: PaymentResultCardProps) {
  return (
    <div className={cn("payment-result-card", `payment-result-card--${tone}`)}>
      <div className="payment-result-card__surface">
        <div aria-hidden className="payment-result-card__ambient" />
        <div className="payment-result-card__content">
          <div className="payment-result-card__icon-wrap" aria-hidden>
            <Icon className="payment-result-card__icon" strokeWidth={1.65} />
          </div>

          <p className="payment-result-card__eyebrow">{eyebrow}</p>
          <h1 className="payment-result-card__title">{title}</h1>
          <p className="payment-result-card__body">{body}</p>

          {orderNumber ? (
            <div className="payment-result-card__order">
              <span className="payment-result-card__order-label">شماره سفارش</span>
              <span className="payment-result-card__order-value num-latin">{orderNumber}</span>
            </div>
          ) : null}

          <div
            className={cn(
              slot === "form" ? "payment-result-card__form" : "payment-result-card__actions",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
