<?php

namespace App\Http\Controllers\Api\V1\Leads;

use App\Enums\LeadSmsTemplate;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Leads\SendLeadSmsRequest;
use App\Models\Lead;
use App\Services\Sms\LeadSmsService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class LeadSmsController extends Controller
{
    public function __construct(
        private readonly LeadSmsService $leadSms,
    ) {}

    public function templates(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('calls.manage'), 403);

        return ApiResponse::success($this->leadSms->availableTemplates());
    }

    public function send(SendLeadSmsRequest $request, Lead $lead): JsonResponse
    {
        $this->authorize('view', $lead);

        $template = LeadSmsTemplate::from($request->string('template')->toString());

        try {
            $recId = $this->leadSms->send(
                $request->user(),
                $lead,
                $template,
                $request->string('body')->toString() ?: null,
            );
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), status: 422, code: 'sms_send_failed');
        }

        return ApiResponse::success([
            'rec_id' => $recId,
        ], 'پیامک ارسال شد');
    }
}
