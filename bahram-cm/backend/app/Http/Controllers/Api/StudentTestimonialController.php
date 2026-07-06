<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StudentTestimonialResource;
use App\Models\StudentTestimonial;
use Illuminate\Http\Request;

class StudentTestimonialController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min(max((int) $request->integer('per_page', 9), 1), 100);

        $items = StudentTestimonial::query()
            ->active()
            ->ordered()
            ->when($request->filled('slug'), fn ($q) => $q->where('slug', $request->string('slug')))
            ->paginate($perPage);

        return StudentTestimonialResource::collection($items);
    }

    public function show(string $slug)
    {
        $item = StudentTestimonial::query()
            ->active()
            ->where('slug', $slug)
            ->firstOrFail();

        return new StudentTestimonialResource($item);
    }
}
