<?php

namespace App\Http\Controllers\Api\V1\Family;

use App\Enums\Family\FamilyActionType;
use App\Http\Controllers\Controller;
use App\Jobs\Family\ProcessActionFollowUpJob;
use App\Models\FamilyAction;
use App\Models\FamilyActionResponse;
use App\Services\Family\FamilyAccessService;
use App\Services\Family\FamilyActionAvailability;
use App\Services\Family\FamilyActionStatsService;
use App\Services\Family\FamilyStatsService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ActionController extends Controller
{
    public function __construct(
        private readonly FamilyAccessService $access,
        private readonly FamilyStatsService $stats,
        private readonly FamilyActionStatsService $actionStats,
        private readonly FamilyActionAvailability $actionAvailability,
    ) {}

    public function respond(Request $request, FamilyAction $action): JsonResponse
    {
        $membership = $this->access->requireMembership($request->user());
        $action->load('options');

        $this->actionAvailability->deactivateIfExpired($action);
        abort_unless($this->actionAvailability->isOpen($action->fresh() ?? $action), 422, 'مهلت این نظرسنجی یا اکشن به پایان رسیده است.');

        $value = $this->validateValue($request, $action);

        $created = false;

        $response = DB::transaction(function () use ($action, $membership, $request, $value, &$created) {
            $existing = FamilyActionResponse::query()
                ->where('action_id', $action->id)
                ->where('user_id', $request->user()->id)
                ->first();

            if ($existing) {
                return $existing;
            }

            $created = true;

            return FamilyActionResponse::query()->create([
                'action_id' => $action->id,
                'user_id' => $request->user()->id,
                'family_id' => $membership->family_id,
                'value' => $value,
            ]);
        });

        if ($created) {
            $this->stats->incrementActionResponses((int) $action->post_id, (int) $membership->family_id);
            $this->actionStats->forget((int) $membership->family_id, (int) $action->id);

            if ($action->follow_up_after_minutes) {
                ProcessActionFollowUpJob::dispatch($response->id)
                    ->delay(now()->addMinutes((int) $action->follow_up_after_minutes))
                    ->onQueue(config('family.queues.notifications', 'family-notifications'));
            }
        }

        return ApiResponse::success([
            'id' => $response->id,
            'value' => $response->value,
            'already_responded' => ! $created,
        ], $created ? 201 : 200);
    }

    /** @return array<string, mixed> */
    private function validateValue(Request $request, FamilyAction $action): array
    {
        $type = $action->type instanceof FamilyActionType
            ? $action->type
            : FamilyActionType::from((string) $action->type);

        $maxShort = (int) config('family.comment.short_text_max_length', 200);

        return match ($type) {
            FamilyActionType::Commitment => ['committed' => true],
            FamilyActionType::Confirmation => [
                'confirmed' => $request->validate([
                    'confirmed' => ['required', 'boolean'],
                ])['confirmed'],
            ],
            FamilyActionType::Number, FamilyActionType::SingleChoice => [
                'option' => $request->validate([
                    'option' => ['required', 'string'],
                ])['option'],
            ],
            FamilyActionType::MultiChoice => [
                'options' => $request->validate([
                    'options' => ['required', 'array', 'min:1'],
                    'options.*' => ['string'],
                ])['options'],
            ],
            FamilyActionType::ShortText => [
                'text' => $request->validate([
                    'text' => ['required', 'string', 'min:1', "max:{$maxShort}"],
                ])['text'],
            ],
            FamilyActionType::Scale => [
                'score' => $request->validate([
                    'score' => [
                        'required',
                        'integer',
                        'min:'.(int) ($action->config['min'] ?? 1),
                        'max:'.(int) ($action->config['max'] ?? 10),
                    ],
                ])['score'],
            ],
        };
    }
}
