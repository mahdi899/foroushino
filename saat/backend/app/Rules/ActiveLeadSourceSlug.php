<?php

namespace App\Rules;

use App\Enums\LeadSource;
use App\Models\LeadSourceCatalog;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ActiveLeadSourceSlug implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        $slug = (string) $value;

        $existsInCatalog = LeadSourceCatalog::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->exists();

        if ($existsInCatalog || LeadSource::tryFrom($slug) !== null) {
            return;
        }

        $fail('منبع ورود نامعتبر است.');
    }
}
