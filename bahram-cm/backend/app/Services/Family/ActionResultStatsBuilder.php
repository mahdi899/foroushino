<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyActionType;
use App\Models\FamilyAction;
use Illuminate\Support\Collection;

final class ActionResultStatsBuilder
{
    /**
     * @param  Collection<int, \App\Models\FamilyActionResponse>  $responses
     * @return array{total: int, options: list<array{value: string, label: string, count: int, percent: int}>}|null
     */
    public function build(FamilyAction $action, Collection $responses): ?array
    {
        $type = $action->type instanceof FamilyActionType
            ? $action->type
            : FamilyActionType::from((string) $action->type);

        return match ($type) {
            FamilyActionType::SingleChoice => $this->singleChoice($action, $responses),
            FamilyActionType::MultiChoice => $this->multiChoice($action, $responses),
            FamilyActionType::Confirmation => $this->confirmation($responses),
            default => null,
        };
    }

    /**
     * @param  Collection<int, \App\Models\FamilyActionResponse>  $responses
     * @return array{total: int, options: list<array{value: string, label: string, count: int, percent: int}>}
     */
    private function singleChoice(FamilyAction $action, Collection $responses): array
    {
        $counts = [];
        foreach ($responses as $response) {
            $value = (string) ($response->value['option'] ?? '');
            if ($value === '') {
                continue;
            }
            $counts[$value] = ($counts[$value] ?? 0) + 1;
        }

        $options = $action->options->map(fn ($option) => [
            'value' => (string) $option->value,
            'label' => (string) $option->label,
            'count' => (int) ($counts[$option->value] ?? 0),
        ])->values()->all();

        return $this->withPercents($options, $responses->count());
    }

    /**
     * @param  Collection<int, \App\Models\FamilyActionResponse>  $responses
     * @return array{total: int, options: list<array{value: string, label: string, count: int, percent: int}>}
     */
    private function multiChoice(FamilyAction $action, Collection $responses): array
    {
        $counts = [];
        foreach ($responses as $response) {
            $selected = $response->value['options'] ?? [];
            if (! is_array($selected)) {
                continue;
            }
            foreach ($selected as $value) {
                $value = (string) $value;
                if ($value === '') {
                    continue;
                }
                $counts[$value] = ($counts[$value] ?? 0) + 1;
            }
        }

        $options = $action->options->map(fn ($option) => [
            'value' => (string) $option->value,
            'label' => (string) $option->label,
            'count' => (int) ($counts[$option->value] ?? 0),
        ])->values()->all();

        return $this->withPercents($options, $responses->count());
    }

    /**
     * @param  Collection<int, \App\Models\FamilyActionResponse>  $responses
     * @return array{total: int, options: list<array{value: string, label: string, count: int, percent: int}>}
     */
    private function confirmation(Collection $responses): array
    {
        $yes = 0;
        $no = 0;
        foreach ($responses as $response) {
            if (($response->value['confirmed'] ?? false) === true) {
                $yes++;
            } else {
                $no++;
            }
        }

        $options = [
            ['value' => 'yes', 'label' => 'انجام دادم ✅', 'count' => $yes],
            ['value' => 'no', 'label' => 'هنوز نه', 'count' => $no],
        ];

        return $this->withPercents($options, $responses->count());
    }

    /**
     * @param  list<array{value: string, label: string, count: int}>  $options
     * @return array{total: int, options: list<array{value: string, label: string, count: int, percent: int}>}
     */
    private function withPercents(array $options, int $total): array
    {
        $options = array_map(function (array $option) use ($total) {
            $count = (int) $option['count'];

            return [
                ...$option,
                'percent' => $total > 0 ? (int) round(($count / $total) * 100) : 0,
            ];
        }, $options);

        return [
            'total' => $total,
            'options' => $options,
        ];
    }
}
