<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\StudentTestimonial;
use App\Services\ContentPublishService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StudentTestimonialController extends Controller
{
    public function __construct(private readonly ContentPublishService $publish) {}

    public function index(Request $request): JsonResponse
    {
        $query = StudentTestimonial::query()->ordered();

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $items = $query->paginate((int) $request->input('per_page', 100));

        return response()->json([
            'data' => $items->getCollection()->map(fn (StudentTestimonial $t) => $this->payload($t)),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function show(StudentTestimonial $studentTestimonial): JsonResponse
    {
        return response()->json(['data' => $this->payload($studentTestimonial)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateTestimonial($request);
        $item = StudentTestimonial::create($data);
        $this->publish->revalidateTestimonials($item->slug);

        return response()->json(['data' => $this->payload($item)], 201);
    }

    public function update(Request $request, StudentTestimonial $studentTestimonial): JsonResponse
    {
        $previousSlug = $studentTestimonial->slug;
        $studentTestimonial->update($this->validateTestimonial($request, true, $studentTestimonial->id));
        $fresh = $studentTestimonial->fresh();
        $this->publish->revalidateTestimonials(
            $fresh?->slug,
            $previousSlug !== $fresh?->slug ? $previousSlug : null,
        );

        return response()->json(['data' => $this->payload($fresh)]);
    }

    public function destroy(StudentTestimonial $studentTestimonial): JsonResponse
    {
        $slug = $studentTestimonial->slug;
        $studentTestimonial->delete();
        $this->publish->revalidateTestimonials($slug);

        return response()->json(null, 204);
    }

    /** @return array<string, mixed> */
    private function payload(StudentTestimonial $item): array
    {
        return [
            'id' => $item->id,
            'slug' => $item->slug,
            'name' => $item->name,
            'role' => $item->role,
            'before_text' => $item->before_text,
            'after_text' => $item->after_text,
            'summary' => $item->summary,
            'meta_title' => $item->meta_title,
            'meta_description' => $item->meta_description,
            'metric_label' => $item->metric_label,
            'metric_value' => $item->metric_value,
            'body' => $item->body,
            'portrait_image' => $item->portrait_image,
            'sort_order' => $item->sort_order,
            'is_active' => $item->is_active,
            'created_at' => $item->created_at?->toIso8601String(),
            'updated_at' => $item->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function validateTestimonial(Request $request, bool $partial = false, ?int $ignoreId = null): array
    {
        $validated = $request->validate([
            'slug' => [
                $partial ? 'sometimes' : 'required',
                'string',
                'max:120',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('student_testimonials', 'slug')->ignore($ignoreId),
            ],
            'name' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'role' => ['sometimes', 'string', 'max:255'],
            'before_text' => [$partial ? 'sometimes' : 'required', 'string', 'max:500'],
            'after_text' => [$partial ? 'sometimes' : 'required', 'string', 'max:500'],
            'summary' => [$partial ? 'sometimes' : 'required', 'string'],
            'meta_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'meta_description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'metric_label' => ['sometimes', 'nullable', 'string', 'max:255'],
            'metric_value' => ['sometimes', 'nullable', 'string', 'max:255'],
            'body' => [$partial ? 'sometimes' : 'required', 'string'],
            'portrait_image' => ['sometimes', 'nullable', 'string', 'max:500'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (! $partial && empty($validated['slug']) && ! empty($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        if (isset($validated['role']) && trim($validated['role']) === '') {
            $validated['role'] = 'دانشجو';
        }

        return $validated;
    }
}
