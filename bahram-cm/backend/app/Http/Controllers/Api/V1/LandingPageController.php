<?php

namespace App\Http\Controllers\Api\V1;

use App\Exports\LandingPageSubmissionsExport;
use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LandingPage;
use App\Support\Csv;
use App\Support\MediaUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LandingPageController extends Controller
{
    public function index(): JsonResponse
    {
        $pages = LandingPage::query()
            ->withCount('leads')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'data' => $pages->map(fn (LandingPage $page) => $this->payload($page)),
        ]);
    }

    public function show(LandingPage $landingPage): JsonResponse
    {
        $landingPage->loadCount('leads');

        return response()->json(['data' => $this->payload($landingPage)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePage($request);
        if (blank($data['slug'] ?? null)) {
            $data['slug'] = Str::slug($data['title']);
        }
        $data = $this->normalizeFormFields($data);
        if (! empty($data['is_published']) && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        $page = LandingPage::create($data);
        $page->loadCount('leads');

        return response()->json(['data' => $this->payload($page)], 201);
    }

    public function update(Request $request, LandingPage $landingPage): JsonResponse
    {
        $wasPublished = $landingPage->is_published;
        $data = $this->validatePage($request, $landingPage);
        $data = $this->normalizeFormFields($data);

        if (array_key_exists('is_published', $data) && $data['is_published'] && ! $wasPublished) {
            $data['published_at'] = now();
        }

        $landingPage->update($data);
        $fresh = $landingPage->fresh();
        $fresh->loadCount('leads');

        return response()->json(['data' => $this->payload($fresh)]);
    }

    public function destroy(LandingPage $landingPage): JsonResponse
    {
        $landingPage->delete();

        return response()->json(null, 204);
    }

    public function submissions(Request $request, LandingPage $landingPage): JsonResponse
    {
        $leads = $landingPage->leads()
            ->orderByDesc('id')
            ->paginate((int) $request->input('per_page', 50));

        return response()->json([
            'data' => $leads->getCollection()->map(fn (Lead $lead) => [
                'id' => $lead->id,
                'name' => $lead->name,
                'phone' => $lead->phone,
                'email' => $lead->email,
                'message' => $lead->message,
                'created_at' => $lead->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $leads->currentPage(),
                'last_page' => $leads->lastPage(),
                'per_page' => $leads->perPage(),
                'total' => $leads->total(),
            ],
            'landing_page' => $this->payload($landingPage),
        ]);
    }

    public function exportSubmissions(Request $request, LandingPage $landingPage): BinaryFileResponse|StreamedResponse
    {
        $validated = $request->validate([
            'format' => ['sometimes', 'string', Rule::in(['csv', 'xlsx'])],
        ]);
        $format = $validated['format'] ?? 'xlsx';

        $query = $landingPage->leads()->orderByDesc('id');
        $slug = Str::slug($landingPage->slug) ?: 'landing';
        $stamp = now()->format('Y-m-d');

        if ($format === 'csv') {
            $rows = $query->cursor()->map(fn (Lead $lead) => [
                $lead->name,
                $lead->phone,
                $lead->email,
                $lead->message,
                $lead->created_at?->format('Y-m-d H:i:s'),
            ]);

            return Csv::download("{$slug}-submissions-{$stamp}.csv", [
                'نام', 'شماره تماس', 'ایمیل', 'توضیحات', 'تاریخ ثبت',
            ], $rows);
        }

        return Excel::download(
            new LandingPageSubmissionsExport($query),
            "{$slug}-submissions-{$stamp}.xlsx",
        );
    }

    /** @return array<string, mixed> */
    private function payload(LandingPage $page): array
    {
        $heroImage = $page->hero_image
            ? (MediaUrl::fromDiskPath($page->hero_image) ?? MediaUrl::reference($page->hero_image))
            : null;

        return [
            'id' => $page->id,
            'slug' => $page->slug,
            'title' => $page->title,
            'subtitle' => $page->subtitle,
            'body' => $page->body,
            'hero_image' => $heroImage,
            'submit_label' => $page->submit_label,
            'success_message' => $page->success_message,
            'form_fields' => array_merge(LandingPage::defaultFormFields(), $page->form_fields ?? []),
            'is_published' => (bool) $page->is_published,
            'published_at' => $page->published_at?->toIso8601String(),
            'leads_count' => $page->leads_count ?? 0,
            'created_at' => $page->created_at?->toIso8601String(),
            'updated_at' => $page->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function validatePage(Request $request, ?LandingPage $page = null): array
    {
        return $request->validate([
            'title' => [$page ? 'sometimes' : 'required', 'string', 'max:255'],
            'slug' => [
                $page ? 'sometimes' : 'nullable',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('landing_pages', 'slug')->ignore($page?->id),
            ],
            'subtitle' => ['sometimes', 'nullable', 'string', 'max:500'],
            'body' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'hero_image' => ['sometimes', 'nullable', 'string', 'max:500'],
            'submit_label' => ['sometimes', 'nullable', 'string', 'max:100'],
            'success_message' => ['sometimes', 'nullable', 'string', 'max:500'],
            'form_fields' => ['sometimes', 'nullable', 'array'],
            'form_fields.message' => ['sometimes', 'boolean'],
            'form_fields.email' => ['sometimes', 'boolean'],
            'is_published' => ['sometimes', 'boolean'],
        ]);
    }

    /** @param  array<string, mixed>  $data */
    private function normalizeFormFields(array $data): array
    {
        if (array_key_exists('hero_image', $data) && filled($data['hero_image'])) {
            $data['hero_image'] = MediaUrl::reference((string) $data['hero_image']) ?: null;
        }

        if (array_key_exists('form_fields', $data)) {
            $data['form_fields'] = array_merge(LandingPage::defaultFormFields(), $data['form_fields'] ?? []);
        }

        return $data;
    }
}
