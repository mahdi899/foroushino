<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyEntryEventType;
use App\Enums\Family\FamilyEntrySource;
use App\Models\FamilyEntryEvent;

class EntryEventResolver
{
    /**
     * Resolve an entry event id from explicit id, external ref, or campaign/content hints.
     */
    public function resolve(
        ?int $entryEventId,
        ?string $externalReference,
        ?string $campaign,
        ?string $content,
        ?FamilyEntrySource $source,
    ): ?int {
        if ($entryEventId !== null && $entryEventId > 0) {
            return $entryEventId;
        }

        $reference = $this->normalizeReference($externalReference)
            ?? $this->normalizeReference($campaign)
            ?? $this->normalizeReference($content);

        if ($reference === null) {
            return null;
        }

        $existing = FamilyEntryEvent::query()
            ->where('external_reference', $reference)
            ->first();

        if ($existing) {
            return (int) $existing->id;
        }

        $event = FamilyEntryEvent::query()->create([
            'name' => $this->buildName($reference, $campaign, $content),
            'type' => $this->inferType($source, $campaign, $content),
            'external_reference' => $reference,
            'topic' => $content ? mb_substr($content, 0, 120) : null,
            'started_at' => now(),
        ]);

        return (int) $event->id;
    }

    private function normalizeReference(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $clean = trim(strip_tags($value));
        if ($clean === '') {
            return null;
        }

        if (preg_match('/reel[\s_-]*(\d+)/iu', $clean, $match)) {
            return 'reel-'.$match[1];
        }

        if (preg_match('/^\d+$/', $clean)) {
            return 'reel-'.$clean;
        }

        return mb_substr($clean, 0, 120);
    }

    private function buildName(string $reference, ?string $campaign, ?string $content): string
    {
        if ($campaign) {
            return mb_substr(trim($campaign), 0, 120);
        }

        if ($content) {
            return mb_substr(trim($content), 0, 120);
        }

        return $reference;
    }

    private function inferType(?FamilyEntrySource $source, ?string $campaign, ?string $content): FamilyEntryEventType
    {
        $haystack = mb_strtolower(trim(($campaign ?? '').' '.($content ?? '')));

        if (str_contains($haystack, 'reel') || $source === FamilyEntrySource::InstagramReel) {
            return FamilyEntryEventType::InstagramReel;
        }

        if (str_contains($haystack, 'story') || $source === FamilyEntrySource::InstagramStory) {
            return FamilyEntryEventType::InstagramStory;
        }

        if ($source === FamilyEntrySource::Seminar) {
            return FamilyEntryEventType::Seminar;
        }

        if ($source === FamilyEntrySource::Article) {
            return FamilyEntryEventType::Article;
        }

        if ($source === FamilyEntrySource::Campaign) {
            return FamilyEntryEventType::Campaign;
        }

        return FamilyEntryEventType::Other;
    }
}
