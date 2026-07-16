<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyEntrySource;
use App\Enums\Family\FamilyLifecycle;
use App\Models\Family;
use App\Models\FamilyMembership;
use App\Models\User;
use App\Support\Mobile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FamilyMembershipManagementService
{
    public function __construct(
        private readonly FamilyMemberCountService $memberCounts,
    ) {}

    public function addMember(Family $family, User $user, ?string $name = null): FamilyMembership
    {
        if ($name !== null && trim($name) !== '' && trim((string) $user->name) === '') {
            $user->update(['name' => trim($name)]);
        }

        $existing = FamilyMembership::query()
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            if ((int) $existing->family_id === (int) $family->id) {
                throw ValidationException::withMessages([
                    'mobile' => ['این کاربر از قبل عضو این خانواده است.'],
                ]);
            }

            $this->removeMember($existing);
        }

        $family->refresh();

        if (! $family->hasCapacity()) {
            throw ValidationException::withMessages([
                'family' => ['ظرفیت این خانواده تکمیل شده است.'],
            ]);
        }

        return DB::transaction(function () use ($family, $user) {
            $membership = FamilyMembership::query()->create([
                'user_id' => $user->id,
                'family_id' => $family->id,
                'entry_source' => FamilyEntrySource::Direct->value,
                'joined_at' => now(),
            ]);

            Family::query()
                ->whereKey($family->id)
                ->lockForUpdate()
                ->increment('member_count');

            $this->memberCounts->bump();

            $family->refresh();

            if ($family->lifecycle === FamilyLifecycle::Forming
                && $family->member_count >= (int) ($family->capacity_min * 0.5)) {
                $family->update(['lifecycle' => FamilyLifecycle::Active]);
            }

            return $membership->fresh(['user:id,name,mobile', 'family:id,internal_name']);
        });
    }

    public function addMemberByMobile(Family $family, string $mobile, ?string $name = null): FamilyMembership
    {
        $normalized = Mobile::normalize($mobile);

        if (! $normalized) {
            throw ValidationException::withMessages([
                'mobile' => ['شماره موبایل معتبر نیست.'],
            ]);
        }

        $user = User::query()->where('mobile', $normalized)->first();

        if (! $user) {
            $trimmedName = trim((string) $name);
            if ($trimmedName === '') {
                throw ValidationException::withMessages([
                    'name' => ['کاربری با این شماره یافت نشد. برای ساخت کاربر جدید، نام را هم وارد کنید.'],
                ]);
            }

            $user = User::query()->create([
                'name' => $trimmedName,
                'mobile' => $normalized,
                'is_admin' => false,
                'status' => 'active',
            ]);
        }

        return $this->addMember($family, $user, $name);
    }

    public function removeMember(FamilyMembership $membership): void
    {
        DB::transaction(function () use ($membership) {
            $familyId = (int) $membership->family_id;
            $membership->delete();

            Family::query()
                ->whereKey($familyId)
                ->where('member_count', '>', 0)
                ->lockForUpdate()
                ->decrement('member_count');

            $this->memberCounts->bump(-1);
        });
    }
}
