<?php

namespace App\Services;

use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminAuditLogger
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function log(
        ?User $actor,
        string $action,
        ?Model $subject = null,
        array $metadata = [],
        ?Request $request = null,
    ): AdminAuditLog {
        $request ??= request();

        return AdminAuditLog::query()->create([
            'actor_id' => $actor?->id,
            'action' => $action,
            'subject_type' => $subject ? $subject::class : null,
            'subject_id' => $subject?->getKey(),
            'request_id' => $request?->header('X-Request-Id') ?: (string) Str::uuid(),
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'metadata' => $this->sanitizeMetadata($metadata),
        ]);
    }

    /**
     * @param  array<string, mixed>  $metadata
     * @return array<string, mixed>
     */
    private function sanitizeMetadata(array $metadata): array
    {
        $blocked = [
            'mobile', 'phone', 'national_code', 'nationalCode',
            'token', 'secret', 'password', 'api_key', 'apiKey',
            'business_token', 'card_number', 'credentials',
        ];

        $clean = [];
        foreach ($metadata as $key => $value) {
            if (in_array(strtolower((string) $key), array_map('strtolower', $blocked), true)) {
                continue;
            }
            if (is_array($value)) {
                $clean[$key] = $this->sanitizeMetadata($value);
            } else {
                $clean[$key] = $value;
            }
        }

        return $clean;
    }
}
