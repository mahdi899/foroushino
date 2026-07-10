<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MiniCourse;
use App\Services\ContentPublishService;
use App\Services\MiniCourseProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class MiniCourseController extends Controller
{
    public function __construct(
        private readonly ContentPublishService $publish,
        private readonly MiniCourseProductService $products,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = MiniCourse::query()->ordered();

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $items = $query->paginate((int) $request->input('per_page', 100));

        return response()->json([
            'data' => $items->getCollection()->map(fn (MiniCourse $c) => $this->payload($c)),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function show(MiniCourse $miniCourse): JsonResponse
    {
        return response()->json(['data' => $this->payload($miniCourse)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateCourse($request);
        $item = MiniCourse::create($data);
        $this->products->syncProduct($item);
        $item = $item->fresh();
        $this->publish->revalidateMiniCourses($item->slug);

        return response()->json(['data' => $this->payload($item)], 201);
    }

    public function update(Request $request, MiniCourse $miniCourse): JsonResponse
    {
        $previousSlug = $miniCourse->slug;
        $miniCourse->update($this->validateCourse($request, true, $miniCourse->id));
        $fresh = $miniCourse->fresh();
        if ($fresh) {
            $this->products->syncProduct($fresh);
            $fresh = $fresh->fresh();
        }
        $this->publish->revalidateMiniCourses(
            $fresh?->slug,
            $previousSlug !== $fresh?->slug ? $previousSlug : null,
        );

        return response()->json(['data' => $this->payload($fresh)]);
    }

    public function destroy(MiniCourse $miniCourse): JsonResponse
    {
        $slug = $miniCourse->slug;
        $miniCourse->delete();
        $this->publish->revalidateMiniCourses($slug);

        return response()->json(null, 204);
    }

    /** @return array<string, mixed> */
    private function payload(MiniCourse $item): array
    {
        return [
            'id' => $item->id,
            'slug' => $item->slug,
            'title' => $item->title,
            'subtitle' => $item->subtitle,
            'summary' => $item->summary,
            'description' => $item->description,
            'thumbnail' => $item->thumbnail,
            'aparat_hash' => $item->aparat_hash,
            'aparat_url' => $item->aparat_hash ? 'https://www.aparat.com/v/'.$item->aparat_hash : null,
            'level' => $item->level,
            'duration' => $item->duration,
            'sort_order' => $item->sort_order,
            'is_active' => $item->is_active,
            'comments_enabled' => $item->comments_enabled,
            'meta_title' => $item->meta_title,
            'meta_description' => $item->meta_description,
            'created_at' => $item->created_at?->toIso8601String(),
            'updated_at' => $item->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function validateCourse(Request $request, bool $partial = false, ?int $ignoreId = null): array
    {
        $validated = $request->validate([
            'slug' => [
                $partial ? 'sometimes' : 'required',
                'string',
                'max:120',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('mini_courses', 'slug')->ignore($ignoreId),
            ],
            'title' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'subtitle' => ['sometimes', 'nullable', 'string', 'max:500'],
            'summary' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'description' => ['sometimes', 'nullable', 'string'],
            'thumbnail' => ['sometimes', 'nullable', 'string', 'max:500'],
            'aparat_hash' => [$partial ? 'sometimes' : 'required', 'string', 'max:64', 'regex:/^[a-zA-Z0-9]+$/'],
            'level' => ['sometimes', 'nullable', 'string', 'max:120'],
            'duration' => ['sometimes', 'nullable', 'string', 'max:120'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'comments_enabled' => ['sometimes', 'boolean'],
            'meta_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'meta_description' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        if (! $partial && empty($validated['slug']) && ! empty($validated['title'])) {
            $validated['slug'] = Str::slug($validated['title']);
        }

        return $validated;
    }
}
