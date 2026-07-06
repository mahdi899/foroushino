<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLeadRequest;
use App\Services\LeadService;
use App\Support\ApiResponse;

class LeadController extends Controller
{
    public function __construct(private readonly LeadService $leads) {}

    public function store(StoreLeadRequest $request)
    {
        $lead = $this->leads->create([
            ...$request->validated(),
            'page_url' => $request->validated('page_url') ?? $request->header('referer'),
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
