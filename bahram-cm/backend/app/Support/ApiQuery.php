<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ApiQuery
{
    public static function apply(
        Builder $query,
        Request $request,
        array $filterable = [],
        array $searchable = [],
        array $sortable = [],
        array $filterMap = [],
    ): Builder {
        $filters = (array) $request->input('filter', []);
        foreach ($filters as $field => $value) {
            if ($value === null || $value === '' || ! in_array($field, $filterable, true)) {
                continue;
            }
            $column = $filterMap[$field] ?? $field;
            if (is_callable($column)) {
                $column($query, $value);
            } else {
                $query->where($column, $value);
            }
        }

        if (($term = trim((string) $request->input('search', ''))) !== '' && $searchable) {
            $query->where(function (Builder $q) use ($searchable, $term) {
                foreach ($searchable as $col) {
                    $q->orWhere($col, 'like', "%{$term}%");
                }
            });
        }

        if ($sort = $request->input('sort')) {
            foreach (explode(',', $sort) as $field) {
                $direction = str_starts_with($field, '-') ? 'desc' : 'asc';
                $col = ltrim($field, '-');
                if (in_array($col, $sortable, true)) {
                    $query->orderBy($col, $direction);
                }
            }
        }

        return $query;
    }

    public static function perPage(Request $request, int $default = 15, int $max = 100): int
    {
        return min((int) $request->input('per_page', $default), $max);
    }
}
