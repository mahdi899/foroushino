<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    private const STATUS_LABELS = [
        'new' => 'جدید',
        'contacted' => 'تماس گرفته شده',
        'converted' => 'تبدیل شده',
        'ignored' => 'رد شده',
    ];

    /** Admin UI form_type filter → stored lead.source values. */
    private const FORM_TYPE_SOURCES = [
        'contact' => ['contact', 'web_contact'],
        'service' => ['service', 'web_service'],
        'consultation' => ['consultation', 'web_consultation', 'web_apply'],
        'pricing' => ['pricing', 'web_pricing'],
        'blog' => ['blog', 'web_blog'],
        'case' => ['case', 'web_case'],
        'chatbot' => ['chatbot'],
        'local_appointment' => ['local_appointment', 'web_local_appointment'],
        'landing' => ['landing', 'web_landing'],
    ];

    public function index(Request $request): JsonResponse
    {
        $query = Lead::query()->with('landingPage')->orderByDesc('id');

        $formType = $request->input('filter.form_type');
        if (! is_string($formType) || $formType === '') {
            $rawFilter = $request->input('filter');
            $formType = is_string($rawFilter) ? $rawFilter : '';
        }

        if ($formType !== '') {
            $this->applyFormTypeFilter($query, $formType);
        }

        if ($status = $request->string('filter.status')->toString()) {
            $query->where('status', $status);
        }

        if ($landingPageId = $request->input('landing_page_id')) {
            $query->where('landing_page_id', $landingPageId);
        }

        $leads = $query->limit((int) $request->input('per_page', 100))->get();

        return response()->json([
            'data' => $leads->map(fn (Lead $lead) => $this->adminPayload($lead)),
        ]);
    }

    public function show(Lead $lead): JsonResponse
    {
        return response()->json(['data' => $this->adminPayload($lead)]);
    }

    public function update(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'status' => 'sometimes|string|in:new,contacted,converted,ignored',
            'note' => 'sometimes|nullable|string|max:5000',
        ]);

        if (isset($data['status'])) {
            $lead->status = $data['status'];
        }

        if (! empty($data['note'])) {
            $meta = $lead->meta ?? [];
            $notes = is_array($meta['notes'] ?? null) ? $meta['notes'] : [];
            $notes[] = [
                'id' => count($notes) + 1,
                'note' => $data['note'],
                'created_at' => now()->toIso8601String(),
            ];
            $meta['notes'] = $notes;
            $lead->meta = $meta;
        }

        $lead->save();

        return response()->json(['data' => $this->adminPayload($lead)]);
    }

    private function applyFormTypeFilter(\Illuminate\Database\Eloquent\Builder $query, string $formType): void
    {
        if ($formType === 'landing') {
            $query->where(function ($q) {
                $q->whereIn('source', self::FORM_TYPE_SOURCES['landing'])
                    ->orWhereNotNull('landing_page_id');
            });

            return;
        }

        $sources = self::FORM_TYPE_SOURCES[$formType] ?? [$formType, "web_{$formType}"];
        $query->whereIn('source', array_values(array_unique($sources)));
    }

    /** @return array<string, mixed> */
    private function adminPayload(Lead $lead): array
    {
        $meta = $lead->meta ?? [];
        $notes = is_array($meta['notes'] ?? null) ? $meta['notes'] : [];

        return [
            'id' => $lead->id,
            'name' => $lead->name ?? '—',
            'phone' => $lead->phone ?? '—',
            'email' => $lead->email,
            'message' => $lead->message,
            'source' => $lead->source,
            'form_type' => $lead->source,
            'page_url' => $lead->page_url,
            'treatment_tags' => null,
            'selection' => null,
            'preferred_contact' => null,
            'budget_pref' => null,
            'best_call_time' => null,
            'landing_page' => $lead->landingPage ? [
                'id' => $lead->landingPage->id,
                'title' => $lead->landingPage->title,
                'slug' => $lead->landingPage->slug,
            ] : null,
            'campaign' => $meta['utm_campaign'] ?? null,
            'utm' => [
                'source' => $meta['utm_source'] ?? null,
                'medium' => $meta['utm_medium'] ?? null,
                'campaign' => $meta['utm_campaign'] ?? null,
            ],
            'status' => [
                'name' => strtoupper($lead->status),
                'label' => self::STATUS_LABELS[$lead->status] ?? $lead->status,
                'color' => match ($lead->status) {
                    'converted' => 'success',
                    'contacted' => 'warning',
                    'ignored' => 'gray',
                    default => 'info',
                },
            ],
            'created_at' => $lead->created_at?->toIso8601String() ?? '',
            'answers' => [],
            'notes' => array_map(fn (array $n) => [
                'id' => $n['id'] ?? 0,
                'note' => $n['note'] ?? '',
                'created_at' => $n['created_at'] ?? '',
            ], $notes),
            'media' => [],
        ];
    }
}
