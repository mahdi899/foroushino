<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Faq;
use App\Services\ContentPublishService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FaqController extends Controller
{
    public function __construct(private readonly ContentPublishService $publish) {}
    public function index(Request $request): JsonResponse
    {
        $query = Faq::query()->ordered();

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($category = $request->string('category')->trim()->toString()) {
            $query->where('category', $category);
        }

        $faqs = $query->paginate((int) $request->input('per_page', 100));

        return response()->json([
            'data' => $faqs->getCollection()->map(fn (Faq $f) => $this->payload($f)),
            'meta' => [
                'current_page' => $faqs->currentPage(),
                'last_page' => $faqs->lastPage(),
                'per_page' => $faqs->perPage(),
                'total' => $faqs->total(),
            ],
        ]);
    }

    public function show(Faq $faq): JsonResponse
    {
        return response()->json(['data' => $this->payload($faq)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateFaq($request);
        $faq = Faq::create($data);
        $this->forgetPublicFaqCache();

        return response()->json(['data' => $this->payload($faq)], 201);
    }

    public function update(Request $request, Faq $faq): JsonResponse
    {
        $faq->update($this->validateFaq($request, true));
        $this->forgetPublicFaqCache();

        return response()->json(['data' => $this->payload($faq->fresh())]);
    }

    public function destroy(Faq $faq): JsonResponse
    {
        $faq->delete();
        $this->forgetPublicFaqCache();

        return response()->json(null, 204);
    }

    /** @return array<string, mixed> */
    private function payload(Faq $faq): array
    {
        return [
            'id' => $faq->id,
            'question' => $faq->question,
            'answer' => $faq->answer,
            'category' => $faq->category,
            'sort_order' => $faq->sort_order,
            'is_active' => $faq->is_active,
            'created_at' => $faq->created_at?->toIso8601String(),
            'updated_at' => $faq->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function validateFaq(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'question' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'answer' => [$partial ? 'sometimes' : 'required', 'string'],
            'category' => ['sometimes', 'nullable', 'string', 'max:255'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }

    private function forgetPublicFaqCache(): void
    {
        $this->publish->revalidateFaqs();
    }
}
