import { AlertCircle, BookOpen, Sparkles, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { cn } from '@/lib/cn';
import { sanitizeRichHtml } from '@/lib/sanitize';

type SeminarAboutSectionProps = {
  title: string;
  description: string | null;
  ended?: boolean;
};

type AboutBlock = {
  heading: string | null;
  html: string;
  kind: 'lead' | 'list' | 'note';
};

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function splitDescriptionBlocks(raw: string): AboutBlock[] {
  const safe = sanitizeRichHtml(raw).trim();
  if (!safe) return [];

  const headingRe = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const headings: { title: string; start: number; end: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingRe.exec(safe)) !== null) {
    headings.push({
      title: stripTags(match[1]),
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  const chunks: { heading: string | null; html: string }[] = [];

  if (headings.length === 0) {
    chunks.push({ heading: null, html: safe });
  } else {
    if (headings[0].start > 0) {
      const preamble = safe.slice(0, headings[0].start).trim();
      if (preamble) chunks.push({ heading: null, html: preamble });
    }

    for (let i = 0; i < headings.length; i++) {
      const bodyStart = headings[i].end;
      const bodyEnd = i + 1 < headings.length ? headings[i + 1].start : safe.length;
      const html = safe.slice(bodyStart, bodyEnd).trim();
      if (!html && !headings[i].title) continue;
      chunks.push({ heading: headings[i].title || null, html });
    }
  }

  return chunks.map((chunk, index) => {
    const hasList = /<(ul|ol)\b/i.test(chunk.html);
    const noteHint = /ظرفیت|نکته|مهم|توجه|چرا/i.test(chunk.heading ?? '');

    let kind: AboutBlock['kind'] = 'note';
    if (hasList) kind = 'list';
    else if (index === 0 && !noteHint) kind = 'lead';

    return { ...chunk, kind };
  });
}

function iconForHeading(heading: string | null, index: number): LucideIcon {
  const text = heading ?? '';
  if (/چه کسانی|مخاطب/i.test(text)) return Users;
  if (/ظرفیت|نکته|مهم/i.test(text)) return AlertCircle;
  if (/اتفاق|سرفصل|چه می‌شود|چه اتفاقی/i.test(text)) return Sparkles;
  if (index === 0) return BookOpen;
  return Sparkles;
}

export function SeminarAboutSection({ title, description, ended = false }: SeminarAboutSectionProps) {
  const blocks = description ? splitDescriptionBlocks(description) : [];
  const lead = blocks.find((block) => block.kind === 'lead') ?? blocks[0] ?? null;
  const rest = lead ? blocks.filter((block) => block !== lead) : blocks;
  const listBlocks = rest.filter((block) => block.kind === 'list');
  const noteBlocks = rest.filter((block) => block.kind !== 'list');

  return (
    <section id="seminar-about" className="relative scroll-mt-20 overflow-hidden bg-ink py-12 sm:py-16 md:py-20 lg:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-bone/12 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -start-20 top-10 h-64 w-64 rounded-full bg-gold/[0.05] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -end-16 bottom-8 h-52 w-52 rounded-full bg-emerald/[0.04] blur-3xl"
      />

      <div className="container-luxe relative min-w-0">
        <Reveal>
          <header className="mx-auto max-w-3xl text-center">
            <p className="text-[0.7rem] font-medium tracking-[0.18em] text-gold sm:text-caption">
              {ended ? 'مرور رویداد' : 'معرفی'}
            </p>
            <h2 className="mt-2 text-balance text-2xl font-semibold leading-snug text-bone sm:text-h3">
              {ended ? 'مرور سمینار' : 'درباره سمینار'}
            </h2>
            <p className="mt-2 text-sm text-bone-dim sm:text-[0.95rem]">{title}</p>
          </header>
        </Reveal>

        {!description ? (
          <Reveal>
            <p className="mx-auto mt-8 max-w-xl text-center text-sm leading-relaxed text-bone-dim sm:mt-10 sm:text-base">
              جزئیات این سمینار به‌زودی منتشر می‌شود.
            </p>
          </Reveal>
        ) : (
          <div className="mx-auto mt-8 max-w-5xl space-y-4 sm:mt-10 sm:space-y-5 md:mt-12 md:space-y-6">
            {lead ? (
              <Reveal>
                <article className="relative overflow-hidden rounded-[1.35rem] border border-gold/20 bg-gradient-to-br from-charcoal/70 via-charcoal/45 to-ink/80 p-5 shadow-[0_24px_80px_-48px_rgba(0,0,0,0.9)] sm:p-7 md:p-8">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-y-5 start-0 w-px bg-gradient-to-b from-transparent via-gold/55 to-transparent"
                  />
                  <div className="flex items-start gap-3 sm:gap-4">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold sm:h-10 sm:w-10">
                      <BookOpen className="h-4 w-4 sm:h-[1.1rem] sm:w-[1.1rem]" strokeWidth={1.6} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      {lead.heading ? (
                        <h3 className="text-base font-semibold text-bone sm:text-lg">{lead.heading}</h3>
                      ) : null}
                      <div
                        className={cn(
                          'seminar-about-prose prose-luxe text-[0.9375rem] leading-[1.85] text-bone-dim sm:text-base sm:leading-[1.9]',
                          lead.heading && 'mt-3',
                        )}
                        dangerouslySetInnerHTML={{ __html: lead.html }}
                      />
                    </div>
                  </div>
                </article>
              </Reveal>
            ) : null}

            {listBlocks.length > 0 ? (
              <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                {listBlocks.map((block, index) => {
                  const Icon = iconForHeading(block.heading, index + 1);
                  return (
                    <Reveal key={`list-${block.heading ?? index}`}>
                      <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-bone/12 bg-charcoal/40 p-5 transition duration-500 ease-[var(--ease-luxe)] hover:border-gold/25 hover:bg-charcoal/55 sm:p-6">
                        <div className="mb-4 flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-bone/12 bg-ink/40 text-gold transition group-hover:border-gold/30 group-hover:bg-gold/10">
                            <Icon className="h-4 w-4" strokeWidth={1.6} aria-hidden />
                          </span>
                          {block.heading ? (
                            <h3 className="text-balance text-[0.98rem] font-semibold leading-snug text-bone sm:text-base">
                              {block.heading}
                            </h3>
                          ) : null}
                        </div>
                        <div
                          className="seminar-about-prose seminar-about-prose--panel prose-luxe flex-1 text-[0.9rem] leading-[1.8] text-bone-dim sm:text-[0.95rem]"
                          dangerouslySetInnerHTML={{ __html: block.html }}
                        />
                      </article>
                    </Reveal>
                  );
                })}
              </div>
            ) : null}

            {noteBlocks.length > 0 ? (
              <div className="grid gap-4 sm:gap-5">
                {noteBlocks.map((block, index) => {
                  const Icon = iconForHeading(block.heading, index + 2);
                  const emphasis = /ظرفیت|نکته|مهم/i.test(block.heading ?? '');
                  return (
                    <Reveal key={`note-${block.heading ?? index}`}>
                      <article
                        className={cn(
                          'relative overflow-hidden rounded-[1.25rem] border p-5 sm:p-6',
                          emphasis
                            ? 'border-gold/22 bg-gold/[0.06]'
                            : 'border-bone/12 bg-charcoal/35',
                        )}
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          <span
                            className={cn(
                              'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                              emphasis
                                ? 'border-gold/30 bg-gold/10 text-gold'
                                : 'border-bone/12 bg-ink/35 text-gold',
                            )}
                          >
                            <Icon className="h-4 w-4" strokeWidth={1.6} aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            {block.heading ? (
                              <h3 className="text-[0.98rem] font-semibold text-bone sm:text-base">
                                {block.heading}
                              </h3>
                            ) : null}
                            <div
                              className={cn(
                                'seminar-about-prose prose-luxe text-[0.9rem] leading-[1.8] text-bone-dim sm:text-[0.95rem]',
                                block.heading && 'mt-2.5',
                              )}
                              dangerouslySetInnerHTML={{ __html: block.html }}
                            />
                          </div>
                        </div>
                      </article>
                    </Reveal>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
