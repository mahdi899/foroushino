<?php

namespace App\Http\Controllers\Api\V1\Integrations;

use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InboundApplicationController extends Controller
{
    public function ping(): JsonResponse
    {
        return ApiResponse::success([
            'service' => 'saat',
            'status' => 'ok',
        ], message: 'اتصال برقرار است.');
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

        $existing = Lead::query()
            ->where('bahram_application_id', $data['bahram_application_id'])
            ->first();

        if ($existing) {
            return ApiResponse::success([
                'lead_id' => $existing->id,
                'duplicate' => true,
            ], message: 'این درخواست قبلاً دریافت شده است.');
        }

        $phone = $this->normalizePhone($data['mobile']);
        $nameParts = $this->splitName($data['name']);
        $duplicate = Lead::query()->where('normalized_phone', $phone)->first();

        $lead = Lead::query()->create([
            'first_name' => $nameParts['first'],
            'last_name' => $nameParts['last'],
            'phone' => $data['mobile'],
            'normalized_phone' => $phone,
            'city' => $data['city'] ?? null,
            'source' => LeadSource::Bahram,
            'status' => $duplicate ? LeadStatus::Duplicate : LeadStatus::New,
            'duplicate_of_id' => $duplicate?->id,
            'bahram_application_id' => $data['bahram_application_id'],
            'last_note' => $this->buildNote($data),
            'metadata' => [
                'age' => $data['age'] ?? null,
                'accepted_at' => $data['accepted_at'] ?? null,
                'submitted_at' => $data['submitted_at'] ?? null,
                'admin_note' => $data['admin_note'] ?? null,
            ],
        ]);

        return ApiResponse::success([
            'lead_id' => $lead->id,
            'duplicate' => false,
        ], message: 'مشتری با موفقیت ثبت شد.', status: 201);
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone) ?? '';

        if (str_starts_with($digits, '98') && strlen($digits) > 10) {
            $digits = '0'.substr($digits, 2);
        }

        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            $digits = '0'.$digits;
        }

        return $digits;
    }

    /** @return array{first: string, last: string} */
    private function splitName(string $name): array
    {
        $trimmed = trim($name);
        $parts = preg_split('/\s+/', $trimmed, 2) ?: [];

        return [
            'first' => $parts[0] ?? $trimmed,
            'last' => $parts[1] ?? '',
        ];
    }

    /** @param array<string, mixed> $data */
    private function buildNote(array $data): ?string
    {
        $lines = [];
        if (! empty($data['age'])) {
            $lines[] = 'سن: '.$data['age'];
        }
        if (! empty($data['admin_note'])) {
            $lines[] = 'یادداشت مدیر بهرام: '.$data['admin_note'];
        }

        return $lines === [] ? null : implode("\n", $lines);
    }
}
