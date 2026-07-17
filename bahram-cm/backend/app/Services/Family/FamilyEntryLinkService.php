<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyEntryEventType;
use App\Enums\Family\FamilyEntrySource;
use App\Models\FamilyEntryEvent;
use App\Models\FamilyEntryLink;
use App\Models\FamilyMembership;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class FamilyEntryLinkService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, ?User $creator = null): FamilyEntryLink
    {
        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            throw ValidationException::withMessages([
                'name' => ['نام لینک ورود الزامی است.'],
            ]);
        }

        $source = FamilyEntrySource::tryFrom(strtolower(trim((string) ($data['source'] ?? ''))));
        if (! $source) {
            throw ValidationException::withMessages([
                'source' => ['منبع ورود معتبر نیست.'],
            ]);
        }

        $campaign = isset($data['campaign']) ? $this->sanitize($data['campaign'], 120) : null;
        $topic = isset($data['topic']) ? $this->sanitize($data['topic'], 120) : null;
        $externalReference = isset($data['external_reference'])
            ? $this->sanitize($data['external_reference'], 120)
            : null;
        $familyId = isset($data['family_id']) && is_numeric($data['family_id'])
            ? (int) $data['family_id']
            : null;

        return DB::transaction(function () use ($name, $source, $campaign, $topic, $externalReference, $familyId, $creator) {
            $slug = $this->uniqueSlug($name);

            $event = FamilyEntryEvent::query()->create([
                'name' => $name,
                'type' => $this->eventTypeFromSource($source),
                'external_reference' => $externalReference ?? $slug,
                'topic' => $topic,
                'started_at' => now(),
                'metadata' => [
                    'source' => $source->value,
                    'campaign' => $campaign,
                    'created_via' => 'entry_link',
                ],
            ]);

            $link = FamilyEntryLink::query()->create([
                'name' => $name,
                'slug' => $slug,
                'source' => $source,
                'entry_event_id' => $event->id,
                'family_id' => $familyId,
                'campaign' => $campaign,
                'topic' => $topic,
                'created_by' => $creator?->id,
                'is_active' => true,
            ]);

            if ($familyId !== null) {
                \App\Models\Family::query()
                    ->whereKey($familyId)
                    ->update([
                        'entry_event_id' => $event->id,
                        'primary_source' => $source->value,
                    ]);
            }

            return $link;
        });
    }

    public function buildUrl(FamilyEntryLink $link): string
    {
        $base = rtrim((string) config('family.entry.base_url', config('app.frontend_url', 'http://localhost:3000')), '/');
        $path = '/'.trim((string) config('family.entry.path', 'family'), '/');

        $params = array_filter([
            'src' => $link->source?->value ?? $link->source,
            'entry_event' => (string) $link->entry_event_id,
            'family_id' => $link->family_id ? (string) $link->family_id : null,
            'utm_source' => $link->source?->value ?? $link->source,
            'utm_campaign' => $link->campaign ?? $link->slug,
            'utm_content' => $link->topic,
        ], fn ($value) => $value !== null && $value !== '');

        return $base.$path.'?'.http_build_query($params);
    }

    public function joinCount(FamilyEntryLink $link, ?int $days = null): int
    {
        $query = FamilyMembership::query()->where('entry_event_id', $link->entry_event_id);

        if ($days !== null && $days > 0) {
            $query->where('joined_at', '>=', now()->subDays($days)->startOfDay());
        }

        return (int) $query->count();
    }

    public function deactivate(FamilyEntryLink $link): void
    {
        $link->update(['is_active' => false]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(FamilyEntryLink $link, array $data): FamilyEntryLink
    {
        return DB::transaction(function () use ($link, $data) {
            $updates = [];
            $eventUpdates = [];

            if (array_key_exists('name', $data)) {
                $name = trim((string) $data['name']);
                if ($name === '') {
                    throw ValidationException::withMessages([
                        'name' => ['نام لینک ورود الزامی است.'],
                    ]);
                }
                $updates['name'] = $name;
                $eventUpdates['name'] = $name;
            }

            if (array_key_exists('campaign', $data)) {
                $updates['campaign'] = $this->sanitize($data['campaign'], 120);
            }

            if (array_key_exists('topic', $data)) {
                $topic = $this->sanitize($data['topic'], 120);
                $updates['topic'] = $topic;
                $eventUpdates['topic'] = $topic;
            }

            if (array_key_exists('family_id', $data) && is_numeric($data['family_id'])) {
                $familyId = (int) $data['family_id'];
                $updates['family_id'] = $familyId;

                \App\Models\Family::query()
                    ->whereKey($familyId)
                    ->update([
                        'entry_event_id' => $link->entry_event_id,
                        'primary_source' => $link->source?->value ?? $link->source,
                    ]);
            }

            if (array_key_exists('is_active', $data)) {
                $updates['is_active'] = filter_var($data['is_active'], FILTER_VALIDATE_BOOL);
            }

            if ($eventUpdates !== [] && $link->entryEvent) {
                $link->entryEvent->update($eventUpdates);
            }

            if ($updates !== []) {
                $link->update($updates);
            }

            return $link->fresh(['entryEvent', 'family']);
        });
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name, '-');
        if ($base === '') {
            $base = 'link';
        }

        $base = mb_substr($base, 0, 40);
        $candidate = $base;
        $suffix = 1;

        while (FamilyEntryLink::query()->where('slug', $candidate)->exists()) {
            $candidate = $base.'-'.$suffix;
            $suffix++;
        }

        return $candidate;
    }

    private function eventTypeFromSource(FamilyEntrySource $source): FamilyEntryEventType
    {
        return match ($source) {
            FamilyEntrySource::InstagramReel => FamilyEntryEventType::InstagramReel,
            FamilyEntrySource::InstagramStory => FamilyEntryEventType::InstagramStory,
            FamilyEntrySource::Seminar => FamilyEntryEventType::Seminar,
            FamilyEntrySource::Article => FamilyEntryEventType::Article,
            FamilyEntrySource::Campaign => FamilyEntryEventType::Campaign,
            default => FamilyEntryEventType::Other,
        };
    }

    private function sanitize(mixed $value, int $max): ?string
    {
        if (! is_string($value) && ! is_numeric($value)) {
            return null;
        }

        $clean = trim(strip_tags((string) $value));

        return $clean === '' ? null : mb_substr($clean, 0, $max);
    }
}
