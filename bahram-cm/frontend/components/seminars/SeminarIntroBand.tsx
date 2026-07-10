import { Calendar, MapPin, Users } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { SeminarRegisterCta } from "@/components/seminars/SeminarRegisterCta";
import { formatDateFa, formatFa } from "@/lib/persian";
import type { PublicSeminar } from "@/lib/services/seminars";

function capacityLabel(seminar: PublicSeminar): string {
  if (seminar.remaining_seats != null) {
    return `${formatFa(seminar.remaining_seats)} جای خالی`;
  }
  if (seminar.capacity != null) {
    return `ظرفیت ${formatFa(seminar.capacity)} نفر`;
  }
  return "ظرفیت نامحدود";
}

export function SeminarIntroBand({ seminar }: { seminar: PublicSeminar }) {
  const hasDiscount =
    seminar.price != null &&
    seminar.sale_price != null &&
    seminar.effective_price != null &&
    seminar.effective_price < seminar.price;

  return (
    <section
      id="seminar-register"
      className="relative scroll-mt-20 border-b border-bone/8 bg-ink py-8 sm:py-10 md:py-12"
    >
      <div className="container-luxe min-w-0">
        <Reveal>
          <div className="mx-auto flex max-w-3xl flex-col gap-6 sm:gap-8">
            <ul className="flex flex-wrap items-center justify-center gap-2 sm:justify-start sm:gap-3">
              {seminar.date ? (
                <li className="inline-flex min-w-0 items-center gap-2 rounded-pill border border-bone/12 bg-charcoal/45 px-3.5 py-2 text-sm text-bone-dim sm:px-4">
                  <Calendar className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} aria-hidden />
                  <span className="min-w-0">{formatDateFa(seminar.date)}</span>
                </li>
              ) : null}
              {seminar.location ? (
                <li className="inline-flex min-w-0 items-center gap-2 rounded-pill border border-bone/12 bg-charcoal/45 px-3.5 py-2 text-sm text-bone-dim sm:px-4">
                  <MapPin className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} aria-hidden />
                  <span className="min-w-0">{seminar.location}</span>
                </li>
              ) : null}
              {!seminar.is_full ? (
                <li className="inline-flex min-w-0 items-center gap-2 rounded-pill border border-bone/12 bg-charcoal/45 px-3.5 py-2 text-sm text-bone-dim sm:px-4">
                  <Users className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} aria-hidden />
                  <span className="min-w-0">{capacityLabel(seminar)}</span>
                </li>
              ) : null}
            </ul>

            <div className="flex flex-col items-center gap-6 border-t border-bone/10 pt-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8 sm:pt-8">
              <div className="text-center sm:text-start">
                <p className="text-xs text-mist sm:text-caption">هزینه شرکت در سمینار</p>
                <div className="mt-2 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 sm:justify-start sm:gap-3">
                  <span className="text-3xl font-semibold leading-none text-bone num-latin sm:text-4xl">
                    {formatFa(seminar.effective_price ?? seminar.price ?? 0)}
                  </span>
                  <span className="text-sm text-mist">تومان</span>
                  {hasDiscount && seminar.price != null ? (
                    <span className="text-sm text-mist line-through num-latin">{formatFa(seminar.price)}</span>
                  ) : null}
                </div>
                {seminar.capacity != null && !seminar.is_full ? (
                  <p className="mt-2 text-xs text-bone-dim sm:text-sm">
                    {formatFa(seminar.attendees_count)} نفر ثبت‌نام کرده‌اند
                    {seminar.remaining_seats != null
                      ? ` · ${formatFa(seminar.remaining_seats)} جای خالی باقی مانده`
                      : null}
                  </p>
                ) : null}
              </div>

              <div className="w-full shrink-0 sm:max-w-xs">
                <SeminarRegisterCta
                  variant="intro"
                  productSlug={seminar.product_slug}
                  isPurchasable={seminar.is_purchasable}
                  isFull={seminar.is_full}
                  alreadyPurchased={seminar.already_purchased ?? false}
                  price={seminar.price}
                  salePrice={seminar.sale_price}
                  effectivePrice={seminar.effective_price}
                  remainingSeats={seminar.remaining_seats}
                />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
