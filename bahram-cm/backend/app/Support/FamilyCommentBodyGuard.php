<?php

namespace App\Support;

/**
 * Deterministic comment screening — phone, links, and hostile/scam language.
 * Used to raise risk and force manual review before comments appear publicly.
 */
class FamilyCommentBodyGuard
{
    /** Risk floor when a phone number is present (above default auto-approve). */
    public const RISK_PHONE = 0.55;

    /** Risk floor when an external link / contact handle is present. */
    public const RISK_LINK = 0.55;

    /** Risk floor for insult / scam accusations. */
    public const RISK_INSULT = 0.6;

    /** Risk floor for ad/spam wording. */
    public const RISK_ADS = 0.5;

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

    public static function containsNegativeLanguage(string $body): bool
    {
        $text = self::normalizeForLexicon($body);

        $patterns = [
            'کلاهبردار',
            'کلاه برداری',
            'کلاهبرداری',
            'کلاه\s*بردار',
            'scammer',
            'scam',
            'fraud',
            'شیاد',
            'دغل',
            'بی\s*شرف',
            'بیشرف',
            'حرومزاده',
            'حرامزاده',
            'مادرجنده',
            'جنده',
            'گوه',
            'گوه\s*خور',
            'کثافت',
            'آشغال',
            'خائن',
            'دزد',
            'پول\s*شویی',
            'پانزی',
            'هرمی',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match('/'.$pattern.'/iu', $text)) {
                return true;
            }
        }

        return false;
    }

    public static function containsAdSpam(string $body): bool
    {
        $text = self::normalizeForLexicon($body);

        return (bool) preg_match('/خرید\s*و\s*فروش|فروش\s*ویژه|تبلیغ|تخفیف\s*ویژه|ثبت\s*نام\s*کنید|ویزیت\s*رایگان/u', $text);
    }

    /**
     * @return array{signals: list<string>, min_risk: float, requires_manual_review: bool}
     */
    public static function analyze(string $body): array
    {
        $signals = [];
        $minRisk = 0.0;

        if (self::containsPhoneNumber($body)) {
            $signals[] = 'phone_number';
            $signals[] = 'contact';
            $minRisk = max($minRisk, self::RISK_PHONE);
        }

        if (self::containsLink($body)) {
            $signals[] = 'external_link';
            $minRisk = max($minRisk, self::RISK_LINK);
        }

        if (self::containsNegativeLanguage($body)) {
            $signals[] = 'insult';
            $minRisk = max($minRisk, self::RISK_INSULT);
        }

        if (self::containsAdSpam($body)) {
            $signals[] = 'advertising';
            $signals[] = 'spam';
            $minRisk = max($minRisk, self::RISK_ADS);
        }

        $signals = array_values(array_unique($signals));

        return [
            'signals' => $signals,
            'min_risk' => $minRisk,
            'requires_manual_review' => self::requiresManualReview($signals),
        ];
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

    private static function normalizeForLexicon(string $body): string
    {
        $text = self::toLatinDigits($body);
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;

        return mb_strtolower($text);
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
