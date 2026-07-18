<?php

namespace App\Observers;

use App\Models\Seminar;
use App\Services\ContentPublishService;

/** Purges the public seminar detail/promo cache whenever a seminar is saved or removed. */
class SeminarObserver
{
    /** @var array<int, string|null> Previous slug per model id, captured before the slug itself changes. */
    private static array $previousSlugs = [];

    public function __construct(private readonly ContentPublishService $publish) {}

    public function updating(Seminar $seminar): void
    {
        if ($seminar->isDirty('slug')) {
            self::$previousSlugs[$seminar->getKey()] = $seminar->getOriginal('slug');
        }
    }

    public function saved(Seminar $seminar): void
    {
        $previousSlug = self::$previousSlugs[$seminar->getKey()] ?? null;
        unset(self::$previousSlugs[$seminar->getKey()]);

        $this->publish->revalidateSeminars($seminar->slug, $previousSlug);
    }

    public function deleted(Seminar $seminar): void
    {
        $this->publish->revalidateSeminars($seminar->slug);
    }
}
