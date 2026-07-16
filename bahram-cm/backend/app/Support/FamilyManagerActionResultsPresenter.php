<?php

namespace App\Support;

use App\Enums\Family\FamilyActionType;
use App\Models\FamilyAction;
use App\Models\FamilyActionResponse;
use App\Models\FamilyPost;
use App\Services\Family\ActionResultStatsBuilder;
use Illuminate\Support\Collection;

/** Admin-facing action / poll results with responder identity. */
final class FamilyManagerActionResultsPresenter
{
    public function __construct(
        private readonly ActionResultStatsBuilder $statsBuilder,
    ) {}

    /** @return list<array<string, mixed>> */
    public function forPost(FamilyPost $post): array
    {
        $post->loadMissing(['actions.options']);

        return $post->actions
            ->map(fn (FamilyAction $action) => $this->presentAction($action))
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    private function presentAction(FamilyAction $action): array
    {
        $action->loadMissing('options');

        /** @var Collection<int, FamilyActionResponse> $responses */
        $responses = FamilyActionResponse::query()
            ->where('action_id', $action->id)
            ->with([
                'user:id,name,mobile',
                'family:id,internal_name',
            ])
            ->orderByDesc('created_at')
            ->get();

        $stats = $this->statsBuilder->build($action, $responses);

        return [
            'id' => $action->id,
            'type' => $action->type?->value ?? $action->type,
            'prompt' => $action->prompt,
            'options' => $action->options->map(fn ($opt) => [
                'label' => $opt->label,
                'value' => $opt->value,
                'position' => (int) $opt->position,
            ])->values()->all(),
            'response_count' => $responses->count(),
            'stats' => $stats,
            'summary' => $this->summarize($action, $responses),
            'responses' => $responses->map(fn (FamilyActionResponse $response) => [
                'id' => $response->id,
                'user_id' => $response->user_id,
                'name' => $response->user?->name,
                'mobile' => $response->user?->mobile,
                'mobile_masked' => SensitiveData::maskMobile($response->user?->mobile),
                'family_id' => $response->family_id,
                'family_name' => $response->family?->internal_name,
                'value' => $response->value,
                'value_label' => self::valueLabel($action, $response->value),
                'responded_at' => $response->created_at?->toIso8601String(),
            ])->values()->all(),
        ];
    }

    /** @return array<string, mixed>|null */
    private function summarize(FamilyAction $action, Collection $responses): ?array
    {
        $type = $action->type instanceof FamilyActionType
            ? $action->type
            : FamilyActionType::tryFrom((string) $action->type);

        if ($responses->isEmpty() || ! $type) {
            return null;
        }

        return match ($type) {
            FamilyActionType::Commitment => [
                'committed_count' => $responses->count(),
            ],
            FamilyActionType::Scale => [
                'average' => round($responses->avg(fn ($r) => (float) ($r->value['score'] ?? 0)), 1),
                'min' => $responses->min(fn ($r) => (int) ($r->value['score'] ?? 0)),
                'max' => $responses->max(fn ($r) => (int) ($r->value['score'] ?? 0)),
            ],
            FamilyActionType::ShortText => [
                'text_responses' => $responses->count(),
            ],
            FamilyActionType::Number => [
                'numeric_responses' => $responses->count(),
            ],
            default => null,
        };
    }

    /** @param  array<string, mixed>|null  $value */
    public static function valueLabel(FamilyAction $action, ?array $value): string
    {
        if ($value === null || $value === []) {
            return '—';
        }

        $type = $action->type instanceof FamilyActionType
            ? $action->type
            : FamilyActionType::from((string) $action->type);

        return match ($type) {
            FamilyActionType::Commitment => 'تعهد ثبت شد',
            FamilyActionType::Confirmation => ($value['confirmed'] ?? false) === true
                ? 'انجام دادم ✅'
                : 'هنوز نه',
            FamilyActionType::SingleChoice, FamilyActionType::Number => self::optionLabel(
                $action,
                (string) ($value['option'] ?? ''),
            ),
            FamilyActionType::MultiChoice => collect($value['options'] ?? [])
                ->map(fn ($item) => self::optionLabel($action, (string) $item))
                ->filter()
                ->implode('، '),
            FamilyActionType::ShortText => (string) ($value['text'] ?? ''),
            FamilyActionType::Scale => 'امتیاز '.(string) ($value['score'] ?? '—'),
        };
    }

    private static function optionLabel(FamilyAction $action, string $value): string
    {
        if ($value === '') {
            return '';
        }

        $option = $action->options->firstWhere('value', $value);

        return $option?->label ?? $value;
    }
}
