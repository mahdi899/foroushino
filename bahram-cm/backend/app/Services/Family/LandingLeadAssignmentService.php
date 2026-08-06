<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyEntrySource;
use App\Models\Family;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LandingLeadAssignmentService
{
    public function __construct(
        private readonly FamilyMembershipManagementService $memberships,
    ) {}

    /**
     * Adds the lead as a family member and marks the lead as assigned.
     *
     * @return array{lead: Lead, membership: \App\Models\FamilyMembership}
     */
    public function assign(Lead $lead, Family $family, ?User $actor = null): array
    {
        $this->assertAssignable($lead);

        return DB::transaction(function () use ($lead, $family, $actor) {
            $membership = $this->memberships->addMemberByMobile(
                $family,
                (string) $lead->phone,
                $lead->name,
                FamilyEntrySource::Landings,
            );

            $meta = is_array($lead->meta) ? $lead->meta : [];
            if ($actor) {
                $meta['assigned_by'] = $actor->id;
            }

            $lead->update([
                'family_id' => $family->id,
                'assigned_at' => now(),
                'status' => 'converted',
                'meta' => $meta,
            ]);

            return [
                'lead' => $lead->fresh(['landingPage', 'family:id,internal_name']),
                'membership' => $membership,
            ];
        });
    }

    private function assertAssignable(Lead $lead): void
    {
        if ($lead->family_id) {
            throw ValidationException::withMessages([
                'lead' => ['این ثبت‌نام قبلاً به خانواده‌ای اختصاص داده شده است.'],
            ]);
        }

        if (! $lead->landing_page_id) {
            throw ValidationException::withMessages([
                'lead' => ['این لید مربوط به فرم لندینگ نیست.'],
            ]);
        }

        if (blank($lead->phone)) {
            throw ValidationException::withMessages([
                'phone' => ['شماره موبایل این ثبت‌نام موجود نیست.'],
            ]);
        }
    }
}
