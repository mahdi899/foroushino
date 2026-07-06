<?php

namespace App\Http\Controllers\Api\V1\Shift;

use App\Enums\ActivityKind;
use App\Enums\Availability;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Shift\SetAvailabilityRequest;
use App\Http\Resources\V1\UserResource;
use App\Models\UserWorkSession;
use App\Services\ActivityLogService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    public function __construct(private readonly ActivityLogService $activity) {}

    public function start(Request $request): JsonResponse
    {
        $user = $request->user();

        $openSession = UserWorkSession::query()->where('user_id', $user->id)->whereNull('ended_at')->first();
        if (! $openSession) {
            UserWorkSession::query()->create(['user_id' => $user->id, 'started_at' => now()]);
            $this->bumpStreak($user);
        }

        $user->availability = Availability::Available;
        $user->availability_changed_at = now();
        $user->save();

        $this->activity->log($user, ActivityKind::Shift, 'شروع شیفت کاری');

        return ApiResponse::success(new UserResource($user), 'شیفت شروع شد');
    }

    public function end(Request $request): JsonResponse
    {
        $user = $request->user();

        $session = UserWorkSession::query()->where('user_id', $user->id)->whereNull('ended_at')->latest('started_at')->first();
        if ($session) {
            $session->ended_at = now();
            $session->save();
        }

        $user->availability = Availability::Offline;
        $user->availability_changed_at = now();
        $user->save();

        $this->activity->log($user, ActivityKind::Shift, 'پایان شیفت کاری');

        return ApiResponse::success(new UserResource($user), 'شیفت پایان یافت');
    }

    /**
     * A new shift on the very next calendar day after the previous one
     * extends the streak; a gap of 2+ days (or a first-ever shift) resets it.
     */
    private function bumpStreak(\App\Models\User $user): void
    {
        $previousShiftDate = UserWorkSession::query()
            ->where('user_id', $user->id)
            ->whereDate('started_at', '<', today())
            ->latest('started_at')
            ->value('started_at');

        $user->streak = $previousShiftDate && $previousShiftDate->isYesterday()
            ? $user->streak + 1
            : 1;
        $user->save();
    }

    public function setAvailability(SetAvailabilityRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->availability = Availability::from($request->string('availability')->toString());
        $user->availability_changed_at = now();
        $user->save();

        return ApiResponse::success(new UserResource($user), 'وضعیت به‌روزرسانی شد');
    }
}
