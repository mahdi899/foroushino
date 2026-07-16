<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyEntrySource;
use App\Enums\Family\FamilyLifecycle;
use App\Models\Family;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FamilyManagementService
{
    public function __construct(
        private readonly FamilyCreationService $creation,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Family
    {
        $internalName = trim((string) ($data['internal_name'] ?? ''));

        if ($internalName === '') {
            $internalName = $this->creation->nextInternalName();
        }

        return Family::query()->create([
            'internal_name' => $internalName,
            'lifecycle' => FamilyLifecycle::tryFrom((string) ($data['lifecycle'] ?? '')) ?? FamilyLifecycle::Forming,
            'member_count' => 0,
            'capacity_target' => (int) ($data['capacity_target'] ?? config('family.capacity.target', 5000)),
            'capacity_min' => (int) ($data['capacity_min'] ?? config('family.capacity.min', 4500)),
            'capacity_max' => (int) ($data['capacity_max'] ?? config('family.capacity.max', 5200)),
            'primary_source' => $this->normalizeSource($data['primary_source'] ?? null),
            'entry_event_id' => isset($data['entry_event_id']) ? (int) $data['entry_event_id'] : null,
            'accepting_members' => array_key_exists('accepting_members', $data)
                ? (bool) $data['accepting_members']
                : true,
            'metadata' => $this->buildMetadata($data),
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Family $family, array $data): Family
    {
        $payload = [];

        if (array_key_exists('internal_name', $data)) {
            $name = trim((string) $data['internal_name']);
            if ($name === '') {
                throw ValidationException::withMessages([
                    'internal_name' => ['نام داخلی خانواده الزامی است.'],
                ]);
            }
            $payload['internal_name'] = $name;
        }

        if (array_key_exists('lifecycle', $data)) {
            $lifecycle = FamilyLifecycle::tryFrom((string) $data['lifecycle']);
            if ($lifecycle) {
                $payload['lifecycle'] = $lifecycle;
            }
        }

        foreach (['capacity_target', 'capacity_min', 'capacity_max'] as $field) {
            if (array_key_exists($field, $data)) {
                $payload[$field] = (int) $data[$field];
            }
        }

        if (array_key_exists('primary_source', $data)) {
            $payload['primary_source'] = $this->normalizeSource($data['primary_source']);
        }

        if (array_key_exists('entry_event_id', $data)) {
            $payload['entry_event_id'] = $data['entry_event_id'] !== null
                ? (int) $data['entry_event_id']
                : null;
        }

        if (array_key_exists('accepting_members', $data)) {
            $payload['accepting_members'] = (bool) $data['accepting_members'];
        }

        if ($this->hasProfileInput($data)) {
            $metadata = $family->metadata ?? [];
            $metadata['profile'] = array_merge(
                $metadata['profile'] ?? [],
                array_filter([
                    'description' => isset($data['profile_description'])
                        ? $this->sanitizeText($data['profile_description'], 500)
                        : null,
                    'notes' => isset($data['profile_notes'])
                        ? $this->sanitizeText($data['profile_notes'], 1000)
                        : null,
                ], fn ($value) => $value !== null),
            );
            $payload['metadata'] = $metadata;
        }

        if ($payload !== []) {
            $family->update($payload);
        }

        return $family->fresh(['entryEvent']);
    }

    public function delete(Family $family): void
    {
        if ($family->member_count > 0) {
            throw ValidationException::withMessages([
                'family' => ['فقط خانواده‌های بدون عضو قابل حذف هستند.'],
            ]);
        }

        DB::transaction(function () use ($family) {
            $family->delete();
        });
    }

    private function normalizeSource(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $source = FamilyEntrySource::tryFrom(strtolower(trim((string) $value)));

        return $source?->value;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>|null
     */
    private function buildMetadata(array $data): ?array
    {
        if (! $this->hasProfileInput($data)) {
            return null;
        }

        return [
            'profile' => array_filter([
                'description' => isset($data['profile_description'])
                    ? $this->sanitizeText($data['profile_description'], 500)
                    : null,
                'notes' => isset($data['profile_notes'])
                    ? $this->sanitizeText($data['profile_notes'], 500)
                    : null,
            ]),
        ];
    }

    /** @param  array<string, mixed>  $data */
    private function hasProfileInput(array $data): bool
    {
        return array_key_exists('profile_description', $data)
            || array_key_exists('profile_notes', $data);
    }

    private function sanitizeText(mixed $value, int $max): ?string
    {
        if (! is_string($value) && ! is_numeric($value)) {
            return null;
        }

        $clean = trim(strip_tags((string) $value));

        return $clean === '' ? null : mb_substr($clean, 0, $max);
    }
}
