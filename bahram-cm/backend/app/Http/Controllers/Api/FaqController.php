<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\FaqResource;
use App\Models\Faq;
use App\Services\CacheService;
use App\Services\RevalidationService;
use App\Support\RuntimeCache;
use Illuminate\Http\Request;

class FaqController extends Controller
{
    public function __construct(
        private readonly RevalidationService $revalidation,
        private readonly CacheService $cacheService,
    ) {}

    /**
     * List active FAQs ordered for public display.
     */
    public function index(Request $request)
    {
        $category = $request->filled('category') ? $request->string('category')->toString() : null;
        $cacheKey = 'public.faqs'.($category ? ".{$category}" : '');

        $faqs = RuntimeCache::remember($cacheKey, 3600, function () use ($category) {
            return Faq::query()
                ->active()
                ->ordered()
                ->when($category, fn ($q) => $q->where('category', $category))
                ->get();
        }, 'faqs');

        return FaqResource::collection($faqs)
            ->response()
            ->header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    }
}
