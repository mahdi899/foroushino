<?php

namespace App\Support;

/**
 * Deterministic comment screening — phone, links, lexicon (severity tiers), ads.
 * Used to raise risk and force manual review before comments appear publicly.
 */
class FamilyCommentBodyGuard
{
    /** Risk floor when a phone number is present (above default auto-approve). */
    public const RISK_PHONE = 0.55;

    /** Risk floor when an external link / contact handle is present. */
    public const RISK_LINK = 0.55;

    /** Risk floor for yellow lexicon (ads / spam / competitor). */
    public const RISK_YELLOW = 0.5;

    /** Risk floor for orange lexicon (scam / insult / brand attack). */
    public const RISK_ORANGE = 0.65;

    /** Risk floor for red lexicon (threat / hate / sexual / honor abuse). */
    public const RISK_RED = 0.85;

    /** @deprecated Use RISK_ORANGE */
    public const RISK_INSULT = self::RISK_ORANGE;

    /** @deprecated Use RISK_YELLOW */
    public const RISK_ADS = self::RISK_YELLOW;

    /**
     * Signals that must never auto-approve or auto-reject — admin reviews first.
     *
     * @var list<string>
     */
    public const MANUAL_REVIEW_SIGNALS = [
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
    ];

    public static function containsPhoneNumber(string $body): bool
    {
        $text = self::toLatinDigits($body);
        $compact = preg_replace('/\D+/', '', $text) ?? '';

        if ($compact !== '' && preg_match_all('/0?9\d{9}/', $compact, $matches)) {
            foreach ($matches[0] as $candidate) {
                if (Mobile::isValid($candidate)) {
                    return true;
                }
            }
        }

        if (preg_match('/(?:\+|00)?98[\s\-.]?\d{2}[\s\-.]?\d{3}[\s\-.]?\d{4}/u', $text)) {
            return true;
        }

        if (preg_match('/(?<![\d.])0?9[\s\-.]?\d{2}[\s\-.]?\d{3}[\s\-.]?\d{4}(?![\d.])/u', $text)) {
            return true;
        }

        if (preg_match('/(?<![\d.])0\d{2,3}[\s\-.]?\d{7,8}(?![\d.])/u', $text)) {
            return true;
        }

        return false;
    }

    public static function containsLink(string $body): bool
    {
        $text = self::toLatinDigits($body);

        if (preg_match('/https?:\/\/[^\s<>\'")\]]+/iu', $text)) {
            return true;
        }

        if (preg_match('/\bwww\.[a-z0-9][a-z0-9\-.]+\.[a-z]{2,}(?:\/\S*)?/iu', $text)) {
            return true;
        }

        // Common invite / contact short links without scheme.
        if (preg_match('/(?:^|[\s(])(?:t\.me|telegram\.me|instagram\.com|instagr\.am|wa\.me|chat\.whatsapp\.com|bit\.ly|rb\.gy|cutt\.ly|lnk\.to|eitaa\.com|ble\.ir)\/\S+/iu', $text)) {
            return true;
        }

        if (preg_match('/(?:^|[\s])@[a-zA-Z][a-zA-Z0-9_]{3,}\b/u', $text)) {
            return true;
        }

        return false;
    }

    /** True when red/orange lexicon terms are present (insults, scams, threats, …). */
    public static function containsNegativeLanguage(string $body): bool
    {
        foreach (self::matchLexicon($body) as $hit) {
            if ($hit['severity'] === FamilyCommentLexicon::SEVERITY_RED
                || $hit['severity'] === FamilyCommentLexicon::SEVERITY_ORANGE) {
                return true;
            }
        }

        return false;
    }

    /** True when yellow advertising / spam / competitor lexicon hits. */
    public static function containsAdSpam(string $body): bool
    {
        foreach (self::matchLexicon($body) as $hit) {
            if ($hit['severity'] === FamilyCommentLexicon::SEVERITY_YELLOW) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return list<array{term: string, severity: string, category: string, signal: string}>
     */
    public static function matchLexicon(string $body): array
    {
        $normalized = self::normalizeForLexicon($body);
        $compact = self::compactForLexicon($normalized);
        if ($normalized === '' && $compact === '') {
            return [];
        }

        $hits = [];
        $seen = [];

        foreach (FamilyCommentLexicon::entries() as $entry) {
            $term = (string) $entry['term'];
            $termNorm = self::normalizeForLexicon($term);
            $termCompact = self::compactForLexicon($termNorm);
            if ($termCompact === '') {
                continue;
            }

            $bounded = (bool) ($entry['bounded'] ?? false);
            $found = $bounded
                ? self::containsBounded($normalized, $compact, $termNorm, $termCompact)
                : (str_contains($normalized, $termNorm) || str_contains($compact, $termCompact));

            if (! $found) {
                continue;
            }

            $key = $entry['severity'].'|'.$entry['category'].'|'.$termCompact;
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;

            $hits[] = [
                'term' => $term,
                'severity' => (string) $entry['severity'],
                'category' => (string) $entry['category'],
                'signal' => (string) $entry['signal'],
            ];
        }

        return $hits;
    }

    /**
     * Highest severity among lexicon hits, or null.
     *
     * @return null|'yellow'|'orange'|'red'
     */
    public static function maxSeverity(string $body): ?string
    {
        $max = null;
        $rank = array_flip(FamilyCommentLexicon::SEVERITY_ORDER);

        foreach (self::matchLexicon($body) as $hit) {
            $sev = $hit['severity'];
            if ($max === null || ($rank[$sev] ?? -1) > ($rank[$max] ?? -1)) {
                $max = $sev;
            }
        }

        return $max;
    }

    /**
     * @return array{
     *   signals: list<string>,
     *   min_risk: float,
     *   requires_manual_review: bool,
     *   severity: null|string,
     *   categories: list<string>
     * }
     */
    public static function analyze(string $body): array
    {
        $signals = [];
        $minRisk = 0.0;
        $categories = [];
        $severity = null;
        $rank = array_flip(FamilyCommentLexicon::SEVERITY_ORDER);

        if (self::containsPhoneNumber($body)) {
            $signals[] = 'phone_number';
            $signals[] = 'contact';
            $minRisk = max($minRisk, self::RISK_PHONE);
        }

        if (self::containsLink($body)) {
            $signals[] = 'external_link';
            $minRisk = max($minRisk, self::RISK_LINK);
        }

        foreach (self::matchLexicon($body) as $hit) {
            $signals[] = $hit['signal'];
            $categories[] = $hit['category'];
            $sev = $hit['severity'];
            if ($severity === null || ($rank[$sev] ?? -1) > ($rank[$severity] ?? -1)) {
                $severity = $sev;
            }
            $minRisk = max($minRisk, self::riskForSeverity($sev));
        }

        $signals = array_values(array_unique($signals));
        $categories = array_values(array_unique($categories));

        return [
            'signals' => $signals,
            'min_risk' => $minRisk,
            'requires_manual_review' => self::requiresManualReview($signals),
            'severity' => $severity,
            'categories' => $categories,
        ];
    }

    public static function riskForSeverity(string $severity): float
    {
        return match ($severity) {
            FamilyCommentLexicon::SEVERITY_RED => self::RISK_RED,
            FamilyCommentLexicon::SEVERITY_ORANGE => self::RISK_ORANGE,
            FamilyCommentLexicon::SEVERITY_YELLOW => self::RISK_YELLOW,
            default => 0.0,
        };
    }

    /** @param  list<string>  $signals */
    public static function requiresManualReview(array $signals): bool
    {
        return array_intersect(self::MANUAL_REVIEW_SIGNALS, array_values($signals)) !== [];
    }

    /**
     * Merge LLM/heuristic result with deterministic rules (rules win on risk floor + signals).
     *
     * @param  array{risk_score?: float, sentiment?: string, topic?: string, signals?: list<string>}  $result
     * @return array{risk_score: float, sentiment: string, topic: string, signals: list<string>}
     */
    public static function enrichAnalysis(string $body, array $result): array
    {
        $rules = self::analyze($body);
        $signals = array_values(array_unique(array_merge(
            array_values((array) ($result['signals'] ?? [])),
            $rules['signals'],
        )));

        // Drop lone "safe" when anything risky is present.
        if ($signals !== ['safe'] && in_array('safe', $signals, true) && count($signals) > 1) {
            $signals = array_values(array_filter($signals, fn ($s) => $s !== 'safe'));
        }

        if ($signals === []) {
            $signals = ['safe'];
        }

        $risk = max((float) ($result['risk_score'] ?? 0), $rules['min_risk']);

        return [
            'risk_score' => $risk,
            'sentiment' => (string) ($result['sentiment'] ?? 'neutral'),
            'topic' => (string) ($result['topic'] ?? ''),
            'signals' => $signals,
        ];
    }

    private static function containsBounded(string $normalized, string $compact, string $termNorm, string $termCompact): bool
    {
        if ($termCompact === '') {
            return false;
        }

        // Word-ish boundaries: not preceded/followed by Persian/Arabic letter or Latin letter/digit.
        $boundary = '[\x{0600}-\x{06FF}\x{0750}-\x{077F}\x{08A0}-\x{08FF}A-Za-z0-9]';
        $quoted = preg_quote($termNorm, '/');
        if ($termNorm !== '' && preg_match('/(?<!'.$boundary.')'.$quoted.'(?!'.$boundary.')/u', $normalized)) {
            return true;
        }

        $quotedCompact = preg_quote($termCompact, '/');

        return (bool) preg_match('/(?<!'.$boundary.')'.$quotedCompact.'(?!'.$boundary.')/u', $compact);
    }

    public static function normalizeForLexicon(string $body): string
    {
        $text = self::toLatinDigits($body);

        // Arabic presentation forms / common variants → Persian.
        $text = strtr($text, [
            'ي' => 'ی', 'ك' => 'ک', 'ة' => 'ه', 'ۀ' => 'ه', 'ؤ' => 'و', 'إ' => 'ا', 'أ' => 'ا', 'آ' => 'ا',
            'ٱ' => 'ا', 'ء' => '', 'ٔ' => '', 'ٰ' => '',
        ]);

        // Strip zero-width, tatweel, combining marks, asterisk obfuscation.
        $text = preg_replace('/[\x{200B}-\x{200D}\x{FEFF}\x{0640}\x{0610}-\x{061A}\x{064B}-\x{065F}\x{0670}*·•._\-]+/u', '', $text) ?? $text;

        // Collapse repeated letters (کلااااهبردار → کلااهبردار → … keep 1).
        $text = preg_replace('/(.)\1{2,}/u', '$1$1', $text) ?? $text;
        $text = preg_replace('/(.)\1+/u', '$1', $text) ?? $text;

        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
        $text = mb_strtolower(trim($text));

        return $text;
    }

    public static function compactForLexicon(string $normalized): string
    {
        // Keep Persian/Arabic letters + Latin letters + digits only.
        return preg_replace('/[^\x{0600}-\x{06FF}\x{0750}-\x{077F}A-Za-z0-9]+/u', '', $normalized) ?? '';
    }

    private static function toLatinDigits(string $value): string
    {
        return strtr($value, [
            '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
            '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        ]);
    }
}
