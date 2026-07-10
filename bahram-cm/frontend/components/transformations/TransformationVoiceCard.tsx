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
  showMetric?: boolean;
  scrim?: 'portrait' | 'bottom-half';
};

export function TransformationVoiceCard({
  item,
  className,
  priority = false,
  showMetric = true,
  scrim = 'portrait',
}: Props) {
  const quote = studentVoiceQuote(item);
  const scrimClass = scrim === 'bottom-half' ? 'photo-scrim-bottom-half' : 'photo-scrim-portrait';

  return (
    <article
      className={cn(
        'transformation-voice-card relative block h-full overflow-hidden rounded-card-lg border',
        className,
      )}
    >
      <div className="relative aspect-[9/16] w-full overflow-hidden">
        <SiteImage
          src={item.portraitSrc}
          alt={`${item.name} — دانشجوی آکادمی`}
          fallbackAlt={`پرتره ${item.name}`}
          fill
          priority={priority}
          className="object-cover object-top"
          sizes="(max-width: 640px) 88vw, (max-width: 1024px) 46vw, 320px"
        />

        <div aria-hidden className={scrimClass} />

        {showMetric && item.metricValue && item.metricLabel ? (
          <div className="absolute top-3 start-3 z-10 rounded-pill border border-bone/15 bg-ink/75 px-3 py-1.5 backdrop-blur-sm">
            <p className="font-display text-sm font-semibold text-gold num-latin">
              {item.metricValue}
              <span className="me-1 font-normal text-mist"> {item.metricLabel}</span>
            </p>
          </div>
        ) : null}

        <div
          className={cn(
            'absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end p-4 sm:p-5',
            scrim === 'bottom-half' ? 'min-h-0' : 'min-h-[52%] md:p-6',
          )}
        >
          {scrim !== 'bottom-half' ? (
            <span
              aria-hidden
              className="transformation-voice-quote-mark pointer-events-none font-display leading-none"
            >
              «
            </span>
          ) : null}
          <blockquote
            className={cn(
              'font-display font-normal text-bone text-pretty',
              scrim === 'bottom-half'
                ? 'text-sm leading-[1.65] sm:text-[0.9375rem]'
                : 'mt-1 text-[1.05rem] leading-[1.72] sm:text-lg md:text-[1.125rem]',
            )}
          >
            {scrim === 'bottom-half' ? `«${quote}»` : quote}
          </blockquote>

          <div
            className={cn(
              'flex flex-wrap items-baseline gap-x-2 gap-y-0.5',
              scrim === 'bottom-half'
                ? 'mt-3 border-t border-bone/12 pt-3'
                : 'mt-4 border-t border-bone/12 pt-4',
            )}
          >
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
