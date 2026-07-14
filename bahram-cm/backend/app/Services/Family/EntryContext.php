<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyEntrySource;

/**
 * Validated entry attribution context for Family join.
 */
final class EntryContext
{
    public function __construct(
        public readonly ?FamilyEntrySource $source = null,
        public readonly ?string $campaign = null,
        public readonly ?string $content = null,
        public readonly ?string $referrer = null,
        public readonly ?int $entryEventId = null,
    ) {}

    /**
     * @param  array<string, mixed>  $input
     */
    public static function fromArray(array $input): self
    {
        $sourceRaw = isset($input['source']) ? strtolower(trim((string) $input['source'])) : null;
        $source = $sourceRaw ? FamilyEntrySource::tryFrom($sourceRaw) : null;

        $campaign = isset($input['campaign']) ? self::sanitize($input['campaign'], 120) : null;
        $content = isset($input['content']) ? self::sanitize($input['content'], 120) : null;
        $referrer = isset($input['referrer']) ? self::sanitize($input['referrer'], 255) : null;

        $entryEventId = null;
        if (isset($input['entry_event']) && is_numeric($input['entry_event'])) {
            $entryEventId = (int) $input['entry_event'];
        } elseif (isset($input['entry_event_id']) && is_numeric($input['entry_event_id'])) {
            $entryEventId = (int) $input['entry_event_id'];
        }

        return new self(
            source: $source ?? FamilyEntrySource::Direct,
            campaign: $campaign,
            content: $content,
            referrer: $referrer,
            entryEventId: $entryEventId,
        );
    }

    private static function sanitize(mixed $value, int $max): ?string
    {
        if (! is_string($value) && ! is_numeric($value)) {
            return null;
        }

        $clean = trim(strip_tags((string) $value));
        if ($clean === '') {
            return null;
        }

        return mb_substr($clean, 0, $max);
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'source' => $this->source?->value,
            'campaign' => $this->campaign,
            'content' => $this->content,
            'referrer' => $this->referrer,
            'entry_event_id' => $this->entryEventId,
        ];
    }
}
