<?php

namespace App\Services;

use App\Models\CourseAccess;
use App\Models\Order;
use App\Models\ReferralConversion;
use App\Models\SpotplayerLicense;
use App\Models\StudentRecoveryArchive;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Support\StudentAccess;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StudentDeletionService
{
    public function __construct(
        private readonly AdminAuditLogger $audit,
        private readonly TelegramHostAccountSync $telegramSync,
    ) {}

    public function delete(User $actor, User $student): void
    {
        if ($student->is_admin) {
            throw ValidationException::withMessages([
                'student' => ['حذف حساب مدیر از این مسیر مجاز نیست.'],
            ]);
        }

        $student->load([
            'profile',
            'identityProfile',
            'satMembership',
            'referralCode',
            'familyMembership',
            'orders.payments',
            'orders.items',
            'courseAccesses',
            'tickets.messages',
            'spotplayerLicenses',
            'satApplications',
            'miniCourseEnrollments',
            'cashbackPayouts',
            'verifiedBankAccounts',
            'seminarAttendances',
            'referralConversionsAsReferrer',
            'referralConversionsAsBuyer',
            'referenceChannelEntitlements',
            'notificationRecipients',
            'pushSubscriptions',
        ]);

        $mobile = trim((string) $student->mobile);
        $telegramUserIds = $this->captureTelegramUserIds($student);
        $displayName = $this->displayName($student);
        $snapshot = $this->buildSnapshot($student);
        $retentionDays = max(1, (int) config('bahram.students.recovery_retention_days', 30));
        $purgeAt = now()->addDays($retentionDays);
        $orderIds = $student->orders->pluck('id')->all();

        DB::transaction(function () use ($actor, $student, $mobile, $telegramUserIds, $displayName, $snapshot, $purgeAt, $orderIds): void {
            StudentAccess::revokeTokens($student);

            TelegramAccount::query()
                ->where('user_id', $student->id)
                ->update(['user_id' => null]);

            foreach ($student->orders as $order) {
                $this->deleteOrderData($order);
            }

            StudentRecoveryArchive::query()->create([
                'original_user_id' => $student->id,
                'deleted_by_user_id' => $actor->id,
                'display_name' => $displayName,
                'mobile' => $mobile !== '' ? $mobile : null,
                'snapshot' => $snapshot,
                'purge_at' => $purgeAt,
            ]);

            $this->audit->log($actor, 'student.deleted', $student, [
                'student_id' => $student->id,
                'mobile' => $mobile !== '' ? $mobile : null,
                'telegram_user_ids' => $telegramUserIds,
                'orders_deleted' => count($orderIds),
                'recovery_purge_at' => $purgeAt->toIso8601String(),
            ]);

            $student->delete();
        });

        $this->telegramSync->syncAccessAfterDeletion(null, $mobile !== '' ? $mobile : null, $telegramUserIds, 'student_deleted');
    }

    private function deleteOrderData(Order $order): void
    {
        ReferralConversion::query()->where('order_id', $order->id)->delete();
        CourseAccess::query()->where('order_id', $order->id)->delete();
        SpotplayerLicense::query()->where('order_id', $order->id)->delete();
        $order->items()->delete();
        $order->payments()->delete();
        $order->delete();
    }

    /** @return array<string, mixed> */
    private function buildSnapshot(User $student): array
    {
        return [
            'meta' => [
                'archived_at' => now()->toIso8601String(),
                'orders_count' => $student->orders->count(),
                'retention_days' => (int) config('bahram.students.recovery_retention_days', 30),
            ],
            'user' => $student->makeHidden(['password', 'remember_token', 'spotplayer_x'])->toArray(),
            'profile' => $student->profile?->toArray(),
            'identity_profile' => $student->identityProfile?->toArray(),
            'sat_membership' => $student->satMembership?->toArray(),
            'referral_code' => $student->referralCode?->toArray(),
            'family_membership' => $student->familyMembership?->toArray(),
            'orders' => $student->orders->map(fn (Order $order) => [
                'order' => $order->toArray(),
                'payments' => $order->payments->toArray(),
                'items' => $order->items->toArray(),
            ])->values()->all(),
            'course_accesses' => $student->courseAccesses->toArray(),
            'tickets' => $student->tickets->map(fn ($ticket) => [
                'ticket' => $ticket->toArray(),
                'messages' => $ticket->messages->toArray(),
            ])->values()->all(),
            'spotplayer_licenses' => $student->spotplayerLicenses->toArray(),
            'sat_applications' => $student->satApplications->toArray(),
            'mini_course_enrollments' => $student->miniCourseEnrollments->toArray(),
            'cashback_payouts' => $student->cashbackPayouts->toArray(),
            'verified_bank_accounts' => $student->verifiedBankAccounts->toArray(),
            'seminar_attendances' => $student->seminarAttendances->toArray(),
            'referral_conversions_as_referrer' => $student->referralConversionsAsReferrer->toArray(),
            'referral_conversions_as_buyer' => $student->referralConversionsAsBuyer->toArray(),
            'reference_channel_entitlements' => $student->referenceChannelEntitlements->toArray(),
            'notification_recipients' => $student->notificationRecipients->toArray(),
            'push_subscriptions' => $student->pushSubscriptions->toArray(),
        ];
    }

    private function displayName(User $student): string
    {
        $profile = $student->profile;
        if ($profile) {
            $full = trim(implode(' ', array_filter([$profile->first_name, $profile->last_name])));
            if ($full !== '') {
                return $full;
            }
        }

        return (string) ($student->name ?: 'دانشجو');
    }

    /** @return list<int> */
    private function captureTelegramUserIds(User $student): array
    {
        $bot = TelegramBot::query()->where('key', 'production')->first();
        if ($bot === null) {
            return [];
        }

        return TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('user_id', $student->id)
            ->pluck('telegram_user_id')
            ->map(fn ($id) => (int) $id)
            ->filter(fn (int $id) => $id > 0)
            ->values()
            ->all();
    }
}
