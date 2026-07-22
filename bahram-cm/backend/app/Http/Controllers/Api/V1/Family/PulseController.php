<?php

namespace App\Http\Controllers\Api\V1\Family;

use App\Http\Controllers\Controller;
use App\Models\StudentTestimonial;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class PulseController extends Controller
{
    public function index(): JsonResponse
    {
        $items = Cache::remember(
            'family:pulse',
            config('family.cache.pulse_ttl', 60),
            function () {
                return StudentTestimonial::query()
                    ->active()
                    ->where('show_in_family_pulse', true)
                    ->ordered()
                    ->limit(12)
                    ->get()
                    ->map(fn (StudentTestimonial $t) => [
                        'id' => $t->id,
                        'body' => trim((string) ($t->family_pulse_quote ?: $t->summary)),
                        'name' => $t->name,
                        'at' => $t->updated_at?->toIso8601String(),
                    ])
                    ->filter(fn (array $item) => $item['body'] !== '')
                    ->values()
                    ->all();
            },
        );

        return ApiResponse::success($items);
    }
}
