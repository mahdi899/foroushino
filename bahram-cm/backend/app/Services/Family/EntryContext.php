<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyEntrySource;
use App\Models\FamilyEntryLink;

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
        public readonly ?string $entryEventRef = null,
        public readonly ?int $familyId = null,
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

        $entryEventRef = null;
        if (isset($input['entry_event_ref'])) {
            $entryEventRef = self::sanitize($input['entry_event_ref'], 120);
        } elseif (isset($input['reel']) && is_numeric($input['reel'])) {
            $entryEventRef = 'reel-'.(int) $input['reel'];
        }

        $familyId = null;
        if (isset($input['family_id']) && is_numeric($input['family_id'])) {
            $familyId = (int) $input['family_id'];
        } elseif (isset($input['family']) && is_numeric($input['family'])) {
            $familyId = (int) $input['family'];
        }

        $context = new self(
            source: $source ?? FamilyEntrySource::Direct,
            campaign: $campaign,
            content: $content,
            referrer: $referrer,
            entryEventId: $entryEventId,
            entryEventRef: $entryEventRef,
            familyId: $familyId,
        );

        return $context->withResolvedEntryEvent()->withResolvedFamily();
    }

    public function withResolvedFamily(): self
    {
        if ($this->familyId !== null) {
            return $this;
        }

        if ($this->entryEventId === null) {
            return $this;
        }

        $familyId = FamilyEntryLink::query()
            ->where('entry_event_id', $this->entryEventId)
            ->where('is_active', true)
            ->whereNotNull('family_id')
            ->value('family_id');

        if ($familyId === null) {
            return $this;
        }

        return new self(
            source: $this->source,
            campaign: $this->campaign,
            content: $this->content,
            referrer: $this->referrer,
            entryEventId: $this->entryEventId,
            entryEventRef: $this->entryEventRef,
            familyId: (int) $familyId,
        );
    }

    public function withResolvedEntryEvent(): self
    {
        if ($this->entryEventId !== null) {
            return $this;
        }

        $resolver = app(EntryEventResolver::class);
        $resolvedId = $resolver->resolve(
            $this->entryEventId,
            $this->entryEventRef,
            $this->campaign,
            $this->content,
            $this->source,
        );

        if ($resolvedId === null) {
            return $this;
        }

        return new self(
            source: $this->source,
            campaign: $this->campaign,
            content: $this->content,
            referrer: $this->referrer,
            entryEventId: $resolvedId,
            entryEventRef: $this->entryEventRef,
            familyId: $this->familyId,
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
            'entry_event_ref' => $this->entryEventRef,
            'family_id' => $this->familyId,
        ];
    }
}
