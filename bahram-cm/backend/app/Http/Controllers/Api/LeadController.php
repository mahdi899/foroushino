<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLeadRequest;
use App\Models\LandingPage;
use App\Services\LeadService;
use App\Support\ApiResponse;

class LeadController extends Controller
{
    public function __construct(private readonly LeadService $leads) {}

    public function store(StoreLeadRequest $request)
    {
        $data = $request->validated();

        $landingPage = null;
        if (! empty($data['landing_slug'])) {
            $landingPage = LandingPage::where('slug', $data['landing_slug'])
                ->where('is_published', true)
                ->first();
        }

        unset($data['landing_slug']);

        $lead = $this->leads->create([
            ...$data,
            'landing_page_id' => $landingPage?->id,
            'source' => $landingPage ? 'web_landing' : ($data['source'] ?? 'website'),
            'page_url' => $data['page_url'] ?? $request->header('referer'),
            'meta' => [
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        return ApiResponse::success([
            'id' => $lead->id,
            'status' => $lead->status,
            'created_at' => $lead->created_at?->toIso8601String(),
        ], 201);
    }
}
