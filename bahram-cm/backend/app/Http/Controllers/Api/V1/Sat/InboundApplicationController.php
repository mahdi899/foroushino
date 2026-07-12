<?php

namespace App\Http\Controllers\Api\V1\Sat;

use App\Enums\SatLeadStatus;
use App\Http\Controllers\Controller;
use App\Models\SatLead;
use App\Support\ApiResponse;
use App\Support\Mobile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Inbound API for external Bahram site — receives accepted applications once.
 */
class InboundApplicationController extends Controller
{
    public function ping(): JsonResponse
    {
        return ApiResponse::success([
            'service' => 'sat',
            'status' => 'ok',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'bahram_application_id' => ['required', 'integer', 'min:1'],
            'name' => ['required', 'string', 'max:120'],
            'mobile' => ['required', 'string', 'max:20'],
            'city' => ['nullable', 'string', 'max:120'],
            'age' => ['nullable', 'integer', 'min:10', 'max:99'],
            'admin_note' => ['nullable', 'string', 'max:2000'],
            'accepted_at' => ['nullable', 'date'],
            'submitted_at' => ['nullable', 'date'],
        ]);

        $existing = SatLead::query()
            ->where('bahram_application_id', $data['bahram_application_id'])
            ->first();

        if ($existing) {
            return ApiResponse::success([
                'lead_id' => $existing->id,
                'duplicate' => true,
            ]);
        }

        $phone = Mobile::normalize($data['mobile']) ?? $data['mobile'];

        $lead = SatLead::query()->create([
            'name' => $data['name'],
            'phone' => $phone,
            'source' => 'bahram',
            'status' => SatLeadStatus::New,
            'notes' => $this->buildNotes($data),
            'bahram_application_id' => $data['bahram_application_id'],
            'meta' => [
                'city' => $data['city'] ?? null,
                'age' => $data['age'] ?? null,
                'accepted_at' => $data['accepted_at'] ?? null,
                'submitted_at' => $data['submitted_at'] ?? null,
            ],
        ]);

        return ApiResponse::success([
            'lead_id' => $lead->id,
            'duplicate' => false,
        ], 201);
    }

    /** @param array<string, mixed> $data */
    private function buildNotes(array $data): ?string
    {
        $parts = [];
        if (! empty($data['city'])) {
            $parts[] = 'شهر: '.$data['city'];
        }
        if (! empty($data['age'])) {
            $parts[] = 'سن: '.$data['age'];
        }
        if (! empty($data['admin_note'])) {
            $parts[] = 'یادداشت مدیر بهرام: '.$data['admin_note'];
        }

        return $parts === [] ? null : implode("\n", $parts);
    }
}
