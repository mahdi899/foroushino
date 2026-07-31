<?php

namespace App\Services;

use App\Enums\SeminarAttendanceStatus;
use App\Models\Seminar;
use App\Models\SeminarAttendee;
use App\Models\User;
use App\Support\Mobile;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Replace seminar attendees from the durable JSON roster in database/data.
 * Safe to re-run on every deploy — does not depend on frontend build.
 */
class SeminarAttendeeRosterSyncService
{
    public const DEFAULT_JSON = 'database/data/seminar_zaferaniyeh_attendees.json';

    /**
     * @return array{
     *     seminar_id: int,
     *     seminar_slug: string,
     *     roster_count: int,
     *     deleted: int,
     *     users_created: int,
     *     users_updated: int,
     *     attendees_created: int,
     *     skipped_invalid_phone: int,
     *     final_count: int,
     * }
     */
    public function syncFromJson(string $jsonPath, ?string $seminarSlug = null, bool $dryRun = false): array
    {
        if (! is_file($jsonPath)) {
            throw new RuntimeException("Roster JSON not found: {$jsonPath}");
        }

        /** @var array{seminar_slug?: string, attendees?: list<array{name?: string, mobile?: string}>} $payload */
        $payload = json_decode((string) file_get_contents($jsonPath), true, 512, JSON_THROW_ON_ERROR);
        $slug = $seminarSlug ?: (string) ($payload['seminar_slug'] ?? 'smynar-zaafranyh-thran');
        $rows = is_array($payload['attendees'] ?? null) ? $payload['attendees'] : [];

        $seminar = Seminar::query()->where('slug', $slug)->first();
        if (! $seminar) {
            throw new RuntimeException("Seminar not found for slug: {$slug}");
        }

        $stats = [
            'seminar_id' => (int) $seminar->id,
            'seminar_slug' => $slug,
            'roster_count' => count($rows),
            'deleted' => 0,
            'users_created' => 0,
            'users_updated' => 0,
            'attendees_created' => 0,
            'skipped_invalid_phone' => 0,
            'final_count' => 0,
        ];

        $normalized = [];
        foreach ($rows as $row) {
            $mobile = Mobile::normalize(isset($row['mobile']) ? (string) $row['mobile'] : null);
            if (! $mobile) {
                $stats['skipped_invalid_phone']++;

                continue;
            }
            $name = trim((string) ($row['name'] ?? ''));
            $normalized[$mobile] = $name !== '' ? $name : 'شرکت‌کننده سمینار';
        }

        $work = function () use ($seminar, $normalized, &$stats, $dryRun): void {
            if (! $dryRun) {
                $stats['deleted'] = SeminarAttendee::query()
                    ->where('seminar_id', $seminar->id)
                    ->delete();
            } else {
                $stats['deleted'] = SeminarAttendee::query()
                    ->where('seminar_id', $seminar->id)
                    ->count();
            }

            // Bulk roster replace must not fire UserTelegramDisplayNameObserver
            // (per-row Telegram host pushes make ~1k updates take many minutes).
            User::withoutEvents(function () use ($normalized, $seminar, &$stats, $dryRun): void {
                $attendeeRows = [];
                $now = now();

                foreach ($normalized as $mobile => $name) {
                    if ($dryRun) {
                        $exists = User::query()->where('mobile', $mobile)->exists();
                        $stats['users_created'] += $exists ? 0 : 1;
                        $stats['users_updated'] += $exists ? 1 : 0;
                        $stats['attendees_created']++;

                        continue;
                    }

                    $user = User::query()->where('mobile', $mobile)->first();
                    if ($user) {
                        if (filled($name) && $user->name !== $name) {
                            $user->update(['name' => $name]);
                            $stats['users_updated']++;
                        }
                    } else {
                        $user = User::query()->create([
                            'mobile' => $mobile,
                            'name' => $name,
                            'status' => 'active',
                        ]);
                        $stats['users_created']++;
                    }

                    $attendeeRows[] = [
                        'seminar_id' => $seminar->id,
                        'user_id' => $user->id,
                        'attendance_status' => SeminarAttendanceStatus::Registered->value,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                    $stats['attendees_created']++;
                }

                if (! $dryRun && $attendeeRows !== []) {
                    foreach (array_chunk($attendeeRows, 200) as $chunk) {
                        SeminarAttendee::query()->insert($chunk);
                    }
                }
            });

            if (! $dryRun) {
                $final = SeminarAttendee::query()
                    ->where('seminar_id', $seminar->id)
                    ->where('attendance_status', '!=', SeminarAttendanceStatus::Absent->value)
                    ->count();
                // Keep capacity high enough so roster never trips isFull().
                if ((int) $seminar->capacity < $final) {
                    $seminar->update(['capacity' => max($final, 1000)]);
                }
                $stats['final_count'] = $final;
            } else {
                $stats['final_count'] = count($normalized);
            }
        };

        if ($dryRun) {
            $work();
        } else {
            DB::transaction($work);
            // Mass delete/insert skip model observers — one cache/host refresh after commit.
            app(ContentPublishService::class)->revalidateSeminars($seminar->slug);
            app(TelegramHostCatalogRevision::class)->bump(scope: 'catalog');
        }

        return $stats;
    }
}
