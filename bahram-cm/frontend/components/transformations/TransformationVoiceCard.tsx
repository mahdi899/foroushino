import { SiteImage } from '@/components/ui/SiteImage';
import { cn } from '@/lib/cn';
import { studentVoiceQuote } from '@/lib/transformations/studentVoiceQuote';

export type TransformationVoiceCardItem = {
  slug: string;
  name: string;
  role: string;
  summary: string;
  body: string;
  metricLabel?: string;
  metricValue?: string;
  portraitSrc: string;
};

type Props = {
  item: TransformationVoiceCardItem;
  className?: string;
  priority?: boolean;
};

export function TransformationVoiceCard({ item, className, priority = false }: Props) {
  const quote = studentVoiceQuote(item);

  return (
    <article
      className={cn(
        'transformation-voice-card relative block h-full overflow-hidden rounded-card-lg border',
        className,
      )}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden sm:aspect-[4/5]">
        <SiteImage
          src={item.portraitSrc}
          alt={`${item.name} — دانشجوی آکادمی`}
          fallbackAlt={`پرتره ${item.name}`}
          fill
          priority={priority}
          className="object-cover object-top"
          sizes="(max-width: 640px) 88vw, (max-width: 1024px) 46vw, 320px"
        />

        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/5"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-l from-ink/25 via-transparent to-transparent"
        />

        {item.metricValue && item.metricLabel ? (
          <div className="absolute top-3 start-3 z-10 rounded-pill border border-bone/15 bg-ink/75 px-3 py-1.5 backdrop-blur-sm">
            <p className="font-display text-sm font-semibold text-gold num-latin">
              {item.metricValue}
              <span className="me-1 font-normal text-mist"> {item.metricLabel}</span>
            </p>
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 z-10 flex min-h-[52%] flex-col justify-end p-4 sm:p-5 md:p-6">
          <span
            aria-hidden
            className="transformation-voice-quote-mark pointer-events-none font-display leading-none"
          >
            «
          </span>
          <blockquote className="mt-1 font-display text-[1.05rem] font-normal leading-[1.72] text-bone text-pretty sm:text-lg md:text-[1.125rem]">
            {quote}
          </blockquote>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-t border-bone/12 pt-4">
            <p className="font-display text-sm font-semibold text-bone sm:text-base">{item.name}</p>
            <span className="text-mist" aria-hidden>
              ·
            </span>
            <p className="text-caption text-gold">{item.role}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
