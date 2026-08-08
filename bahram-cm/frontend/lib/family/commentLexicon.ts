/**
 * Family comment lexicon matching (mirrors backend FamilyCommentBodyGuard).
 * Source of truth for terms: commentLexicon.generated.json
 * Regenerate: `php backend/scripts/export-family-comment-lexicon.php`
 */
import { toLatinDigits } from '@/lib/persian';
import lexiconJson from './commentLexicon.generated.json';

export type CommentSeverity = 'yellow' | 'orange' | 'red';

export type LexiconEntry = {
  term: string;
  severity: CommentSeverity;
  category: string;
  signal: string;
  bounded: boolean;
};

export type LexiconHit = {
  term: string;
  severity: CommentSeverity;
  category: string;
  signal: string;
};

export type CommentScreening = {
  signals: string[];
  minRisk: number;
  requiresManualReview: boolean;
  severity: CommentSeverity | null;
  categories: string[];
};

const ENTRIES = lexiconJson as LexiconEntry[];

const SEVERITY_ORDER: CommentSeverity[] = ['yellow', 'orange', 'red'];

const RISK: Record<CommentSeverity, number> = {
  yellow: 0.5,
  orange: 0.65,
  red: 0.85,
};

const MANUAL_REVIEW_SIGNALS = new Set([
  'phone_number',
  'external_link',
  'contact',
  'insult',
  'abuse',
  'advertising',
  'spam',
  'scam',
  'threat',
  'hate',
  'sexual',
]);

const ARABIC_TO_PERSIAN: Record<string, string> = {
  ي: 'ی',
  ك: 'ک',
  ة: 'ه',
  ۀ: 'ه',
  ؤ: 'و',
  إ: 'ا',
  أ: 'ا',
  آ: 'ا',
  ٱ: 'ا',
  ء: '',
};

/** Normalize text the same way as FamilyCommentBodyGuard::normalizeForLexicon. */
export function normalizeForLexicon(body: string): string {
  let text = toLatinDigits(body);
  text = [...text].map((ch) => ARABIC_TO_PERSIAN[ch] ?? ch).join('');
  text = text.replace(/[\u200B-\u200D\uFEFF\u0640\u0610-\u061A\u064B-\u065F\u0670*·•._\-]+/gu, '');
  text = text.replace(/(.)\1{2,}/gu, '$1$1');
  text = text.replace(/(.)\1+/gu, '$1');
  text = text.replace(/\s+/gu, ' ').trim().toLowerCase();
  return text;
}

export function compactForLexicon(normalized: string): string {
  return normalized.replace(/[^\u0600-\u06FF\u0750-\u077FA-Za-z0-9]+/gu, '');
}

const BOUNDARY_CLASS = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFA-Za-z0-9]/;

function containsBounded(
  normalized: string,
  compact: string,
  termNorm: string,
  termCompact: string,
): boolean {
  if (!termCompact) return false;

  if (termNorm) {
    let from = 0;
    while (from <= normalized.length) {
      const idx = normalized.indexOf(termNorm, from);
      if (idx < 0) break;
      const before = idx > 0 ? normalized[idx - 1] : '';
      const after = normalized[idx + termNorm.length] ?? '';
      if (!BOUNDARY_CLASS.test(before) && !BOUNDARY_CLASS.test(after)) return true;
      from = idx + 1;
    }
  }

  let from = 0;
  while (from <= compact.length) {
    const idx = compact.indexOf(termCompact, from);
    if (idx < 0) break;
    const before = idx > 0 ? compact[idx - 1] : '';
    const after = compact[idx + termCompact.length] ?? '';
    if (!BOUNDARY_CLASS.test(before) && !BOUNDARY_CLASS.test(after)) return true;
    from = idx + 1;
  }

  return false;
}

export function matchCommentLexicon(body: string): LexiconHit[] {
  const normalized = normalizeForLexicon(body);
  const compact = compactForLexicon(normalized);
  if (!normalized && !compact) return [];

  const hits: LexiconHit[] = [];
  const seen = new Set<string>();

  for (const entry of ENTRIES) {
    const termNorm = normalizeForLexicon(entry.term);
    const termCompact = compactForLexicon(termNorm);
    if (!termCompact) continue;

    const found = entry.bounded
      ? containsBounded(normalized, compact, termNorm, termCompact)
      : normalized.includes(termNorm) || compact.includes(termCompact);

    if (!found) continue;

    const key = `${entry.severity}|${entry.category}|${termCompact}`;
    if (seen.has(key)) continue;
    seen.add(key);

    hits.push({
      term: entry.term,
      severity: entry.severity,
      category: entry.category,
      signal: entry.signal,
    });
  }

  return hits;
}

export function maxCommentSeverity(body: string): CommentSeverity | null {
  let max: CommentSeverity | null = null;
  for (const hit of matchCommentLexicon(body)) {
    if (max === null || SEVERITY_ORDER.indexOf(hit.severity) > SEVERITY_ORDER.indexOf(max)) {
      max = hit.severity;
    }
  }
  return max;
}

export function analyzeCommentLexicon(body: string): Pick<
  CommentScreening,
  'signals' | 'minRisk' | 'severity' | 'categories'
> {
  const signals: string[] = [];
  const categories: string[] = [];
  let severity: CommentSeverity | null = null;
  let minRisk = 0;

  for (const hit of matchCommentLexicon(body)) {
    signals.push(hit.signal);
    categories.push(hit.category);
    if (severity === null || SEVERITY_ORDER.indexOf(hit.severity) > SEVERITY_ORDER.indexOf(severity)) {
      severity = hit.severity;
    }
    minRisk = Math.max(minRisk, RISK[hit.severity]);
  }

  return {
    signals: [...new Set(signals)],
    categories: [...new Set(categories)],
    severity,
    minRisk,
  };
}

export function lexiconNeedsManualReview(signals: string[]): boolean {
  return signals.some((s) => MANUAL_REVIEW_SIGNALS.has(s));
}

export function commentContainsNegativeLanguage(body: string): boolean {
  return matchCommentLexicon(body).some((h) => h.severity === 'red' || h.severity === 'orange');
}

export function commentContainsAdSpam(body: string): boolean {
  return matchCommentLexicon(body).some((h) => h.severity === 'yellow');
}
