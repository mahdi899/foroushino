<?php

namespace App\Casts;

use App\Enums\Family\FamilyLifecycle;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/** @implements CastsAttributes<FamilyLifecycle, string> */
class FamilyLifecycleCast implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): FamilyLifecycle
    {
        if ($value instanceof FamilyLifecycle) {
            return $value;
        }

        return FamilyLifecycle::fromStored(is_string($value) ? $value : null);
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): string
    {
        if ($value instanceof FamilyLifecycle) {
            return $value->value;
        }

        return FamilyLifecycle::fromStored(is_string($value) ? $value : null)->value;
    }
}
