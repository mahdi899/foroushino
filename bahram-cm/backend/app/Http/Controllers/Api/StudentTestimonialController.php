<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StudentTestimonialResource;
use App\Models\StudentTestimonial;
use App\Support\RuntimeCache;
use Illuminate\Http\Request;

class StudentTestimonialController extends Controller
{
    public function index(Request $request)
    {
        $page = max(1, (int) $request->integer('page', 1));
        $perPage = min(max((int) $request->integer('per_page', 9), 1), 100);
        $slugFilter = $request->filled('slug') ? $request->string('slug')->toString() : '';
        $cacheKey = 'public_transformations:index:'.$page.':'.$perPage.':'.md5($slugFilter);

        return RuntimeCache::remember($cacheKey, 3600, function () use ($request, $perPage) {
            $items = StudentTestimonial::query()
                ->active()
                ->ordered()
                ->when($request->filled('slug'), fn ($q) => $q->where('slug', $request->string('slug')))
                ->paginate($perPage);

            return StudentTestimonialResource::collection($items);
        }, 'testimonials');
    }

    public function show(string $slug)
    {
        $cacheKey = 'public_transformations:show:'.$slug;

        return RuntimeCache::remember($cacheKey, 3600, function () use ($slug) {
            $item = StudentTestimonial::query()
                ->active()
                ->where('slug', $slug)
                ->firstOrFail();

            return new StudentTestimonialResource($item);
        }, 'testimonials');
    }
}
