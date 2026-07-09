<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\SmsLog;
use App\Services\AudienceSegmentService;
use App\Services\SmsService;
use App\Support\Mobile;
use App\Support\SmsMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SmsAdminController extends Controller
{
    public function __construct(
        private readonly AudienceSegmentService $segments,
        private readonly SmsService $sms,
    ) {
    }

    public function segments(): JsonResponse
    {
        $data = collect(AudienceSegmentService::SEGMENTS)->map(fn ($label, $key) => [
            'key' => $key,
            'label' => $label,
            'count' => $this->segments->resolve($key)->count(),
        ])->values();

        return response()->json(['data' => $data]);
    }

    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:640'],
            'segment' => ['nullable', 'string', 'in:'.implode(',', array_keys(AudienceSegmentService::SEGMENTS))],
            'manual_numbers' => ['nullable', 'string'],
        ]);

        $recipients = [];

        if (filled($data['segment'] ?? null)) {
            foreach ($this->segments->resolve($data['segment']) as $user) {
                $recipients[$user->mobile] = $user->id;
            }
        }

        if (filled($data['manual_numbers'] ?? null)) {
            foreach (preg_split('/[\s,]+/', trim($data['manual_numbers'])) as $raw) {
                $mobile = Mobile::normalize($raw);
                if ($mobile) {
                    $recipients[$mobile] ??= null;
                }
            }
        }

        abort_if(empty($recipients), 422, 'حداقل یک مخاطب (بخش یا شماره دستی) باید انتخاب شود.');
        abort_unless(SmsMessage::hasOptOutSuffix($data['message']), 422, SmsMessage::optOutValidationMessage());

        $sent = 0;
        $failed = 0;

        foreach ($recipients as $mobile => $userId) {
            $ok = $this->sms->sendToMobile((string) $mobile, $data['message'], $userId);
            $ok ? $sent++ : $failed++;
        }

        return response()->json(['data' => [
            'total' => count($recipients),
            'sent' => $sent,
            'failed' => $failed,
        ]]);
    }

    public function logs(Request $request): JsonResponse
    {
        $query = SmsLog::query()->with('user')->orderByDesc('id');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        $logs = $query->paginate((int) $request->input('per_page', 50));

        return response()->json([
            'data' => $logs->getCollection()->map(fn (SmsLog $l) => [
                'id' => $l->id,
                'mobile' => $l->mobile,
                'user_name' => $l->user?->name,
                'message' => $l->message,
                'event_key' => $l->event_key,
                'provider' => $l->provider,
                'status' => $l->status,
                'is_fallback_attempt' => $l->is_fallback_attempt,
                'sent_at' => $l->sent_at?->toIso8601String(),
                'created_at' => $l->created_at?->toIso8601String(),
            ]),
            'meta' => ['current_page' => $logs->currentPage(), 'last_page' => $logs->lastPage(), 'total' => $logs->total()],
        ]);
    }

    public function test(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
            'message' => ['nullable', 'string', 'max:640'],
        ]);

        if (filled($data['message'] ?? null) && ! SmsMessage::hasOptOutSuffix($data['message'])) {
            abort(422, SmsMessage::optOutValidationMessage());
        }

        return response()->json(['data' => $this->sms->sendTest($data['phone'], $data['message'] ?? null)]);
    }
}
