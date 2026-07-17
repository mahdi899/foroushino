<?php

namespace App\Services\Family;

use App\Models\FamilyAction;
use Carbon\Carbon;

final class FamilyActionAvailability
{
    public function __construct(
        private readonly FamilyAiSettingsService $aiSettings,
    ) {}

    public function isOpen(FamilyAction $action): bool
    {
        if (! $action->is_active) {
            return false;
        }

        if ($action->active_until && Carbon::parse($action->active_until)->isPast()) {
            return false;
        }

        return true;
    }

    public function deactivateIfExpired(FamilyAction $action): void
    {
        if ($action->active_until && Carbon::parse($action->active_until)->isPast() && $action->is_active) {
            $action->update(['is_active' => false]);
        }
    }

    public function defaultActiveUntil(): Carbon
    {
        return now()->addDays($this->aiSettings->defaultActionDays());
    }
}
