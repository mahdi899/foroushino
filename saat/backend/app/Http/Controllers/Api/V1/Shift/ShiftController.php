<?php

namespace App\Http\Controllers\Api\V1\Shift;

use App\Enums\ActivityKind;
use App\Enums\Availability;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Shift\SetAvailabilityRequest;
use App\Http\Requests\V1\Shift\StartShiftRequest;
use App\Http\Resources\V1\UserResource;
use App\Http\Resources\V1\WorkSessionResource;
use App\Models\UserWorkSession;
use App\Services\ActivityLogService;
use App\Services\Shift\ShiftTimeTracker;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ShiftController extends Controller
{
    public function __construct(
        private readonly ActivityLogService $activity,
        private readonly ShiftTimeTracker $tracker,
    ) {}

    public function current(Request $request): JsonResponse
    {
        $user = $request->user();
        $session = $this->tracker->openSession($user);

        return ApiResponse::success([
            'session' => $session
                ? new WorkSessionResource(
                    $session,
                    $this->tracker->liveProductiveSeconds($user, $session),
                    $this->tracker->liveBreakSeconds($user, $session),
                )
                : null,
            'availability' => $user->availability?->value,
            'availability_changed_at' => $user->availability_changed_at?->toIso8601String(),
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        $user = $request->user();
        $days = min(366, max(7, (int) $request->query('days', 14)));
        $since = today()->subDays($days - 1)->startOfDay();

        $sessions = UserWorkSession::query()
            ->where('user_id', $user->id)
            ->where('started_at', '>=', $since)
            ->orderByDesc('started_at')
            ->get();

        $openSession = $this->tracker->openSession($user);
        $grouped = [];

        foreach ($sessions as $session) {
            $date = $session->started_at->toDateString();
            if (! isset($grouped[$date])) {
                $grouped[$date] = [
                    'date' => $date,
                    'sessions_count' => 0,
                    'total_productive_seconds' => 0,
                    'total_break_seconds' => 0,
                    'total_call_seconds' => 0,
                    'first_started_at' => $session->started_at->toIso8601String(),
                    'last_ended_at' => null,
                    'is_open' => false,
                ];
            }

            $productive = (int) $session->total_productive_seconds;
            $break = (int) $session->total_break_seconds;

            if ($openSession && $openSession->id === $session->id) {
                $productive = $this->tracker->liveProductiveSeconds($user, $session);
                $break = $this->tracker->liveBreakSeconds($user, $session);
                $grouped[$date]['is_open'] = true;
            }

            $grouped[$date]['sessions_count']++;
            $grouped[$date]['total_productive_seconds'] += $productive;
            $grouped[$date]['total_break_seconds'] += $break;
            $grouped[$date]['total_call_seconds'] += (int) $session->total_call_seconds;

            if ($session->ended_at) {
                $grouped[$date]['last_ended_at'] = $session->ended_at->toIso8601String();
            }
        }

        $daysList = collect(range(0, $days - 1))
            ->map(fn (int $offset) => today()->subDays($offset)->toDateString());

        $summary = $daysList
            ->map(fn (string $date) => $grouped[$date] ?? [
                'date' => $date,
                'sessions_count' => 0,
                'total_productive_seconds' => 0,
                'total_break_seconds' => 0,
                'total_call_seconds' => 0,
                'first_started_at' => null,
                'last_ended_at' => null,
                'is_open' => false,
            ])
            ->values()
            ->all();

        return ApiResponse::success($summary);
    }

    public function start(StartShiftRequest $request): JsonResponse
    {
        $user = $request->user();
        $nextAvailability = Availability::from(
            $request->string('availability', Availability::Available->value)->toString(),
        );

        $openSession = $this->tracker->openSession($user);
        if (! $openSession) {
            UserWorkSession::query()->create([
                'user_id' => $user->id,
                'started_at' => now(),
            ]);
            $this->bumpStreak($user);
        }

        $this->tracker->changeAvailability($user, $nextAvailability);

        $this->activity->log($user, ActivityKind::Shift, 'شروع شیفت کاری');

        $session = $this->tracker->openSession($user);

        return ApiResponse::success([
            'user' => new UserResource($user->fresh()),
            'session' => $session
                ? new WorkSessionResource(
                    $session,
                    $this->tracker->liveProductiveSeconds($user, $session),
                    $this->tracker->liveBreakSeconds($user, $session),
                )
                : null,
        ], 'شیفت شروع شد');
    }

    public function end(Request $request): JsonResponse
    {
        $user = $request->user();

        $session = $this->tracker->openSession($user);
        if ($session) {
            $this->tracker->flushSegment($user);
            $session->refresh();
            $session->ended_at = now();
            $session->save();
        }

        $this->tracker->changeAvailability($user, Availability::Offline);

        $this->activity->log($user, ActivityKind::Shift, 'پایان شیفت کاری');

        return ApiResponse::success([
            'user' => new UserResource($user->fresh()),
            'session' => $session
                ? new WorkSessionResource($session)
                : null,
        ], 'شیفت پایان یافت');
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

        $previous = $previousShiftDate ? Carbon::parse($previousShiftDate) : null;

        $user->streak = $previous && $previous->isYesterday()
            ? $user->streak + 1
            : 1;
        $user->save();
    }

    public function setAvailability(SetAvailabilityRequest $request): JsonResponse
    {
        $user = $request->user();
        $next = Availability::from($request->string('availability')->toString());

        $this->tracker->changeAvailability($user, $next);

        $session = $this->tracker->openSession($user);

        return ApiResponse::success([
            'user' => new UserResource($user->fresh()),
            'session' => $session
                ? new WorkSessionResource(
                    $session,
                    $this->tracker->liveProductiveSeconds($user, $session),
                    $this->tracker->liveBreakSeconds($user, $session),
                )
                : null,
        ], 'وضعیت به‌روزرسانی شد');
    }
}
