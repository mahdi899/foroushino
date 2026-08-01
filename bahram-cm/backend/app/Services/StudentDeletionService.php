<?php

namespace App\Services;

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

        $mobile = trim((string) $student->mobile);
        $telegramUserIds = $this->captureTelegramUserIds($student);

        DB::transaction(function () use ($actor, $student, $mobile, $telegramUserIds): void {
            StudentAccess::revokeTokens($student);

            TelegramAccount::query()
                ->where('user_id', $student->id)
                ->update(['user_id' => null]);

            $this->audit->log($actor, 'student.deleted', $student, [
                'student_id' => $student->id,
                'mobile' => $mobile !== '' ? $mobile : null,
                'telegram_user_ids' => $telegramUserIds,
            ]);

            $student->delete();
        });

        $this->telegramSync->syncAccessAfterDeletion(null, $mobile !== '' ? $mobile : null, $telegramUserIds, 'student_deleted');
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
