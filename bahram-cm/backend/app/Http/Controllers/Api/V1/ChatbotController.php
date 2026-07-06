<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Concerns\VerifiesInternalSecret;
use App\Services\ChatbotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatbotController extends Controller
{
    use VerifiesInternalSecret;

    public function __construct(private ChatbotService $chatbot) {}

    public function config(): JsonResponse
    {
        return response()->json(['data' => $this->chatbot->publicConfig()]);
    }

    /** Resolved chatbot AI runtime for Next.js server actions (server-to-server only). */
    public function aiRuntime(Request $request): JsonResponse
    {
        if (! $this->verifyInternalSecret($request)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        return response()->json(['data' => $this->chatbot->resolveChatbotAiRuntime()]);
    }

    /** Pre-AI gate: captcha, honeypot, rate limits (server-to-server from Next.js). */
    public function gate(Request $request): JsonResponse
    {
        if (! $this->verifyInternalSecret($request)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (! $this->chatbot->isEnabled()) {
            return response()->json(['message' => 'Chatbot disabled', 'code' => 'disabled'], 503);
        }

        if (! $this->chatbot->isHoneypotValid($request->input('honeypot'))) {
            return response()->json(['message' => 'Invalid request', 'code' => 'bot'], 422);
        }

        $ip = $this->visitorIp($request) ?? 'unknown';
        $verified = $this->chatbot->verifyCaptcha(
            $request->input('captcha_token'),
            $request->input('captcha_math_id'),
            $request->input('captcha_math_answer'),
            $ip !== '' ? $ip : null,
            $request->input('session_id'),
        );

        if (! $verified) {
            return response()->json(['message' => 'Captcha failed', 'code' => 'captcha'], 422);
        }

        $rate = $this->chatbot->checkRateLimit(
            $ip !== '' ? $ip : 'unknown',
            $request->input('session_id'),
        );
        if (! $rate['ok']) {
            return response()->json([
                'message' => 'Rate limit exceeded',
                'code' => 'rate_limit',
                'reason' => $rate['reason'] ?? 'limit',
                'retry_after' => $rate['retry_after'] ?? 60,
            ], 429);
        }

        return response()->json(['data' => ['allowed' => true]]);
    }

    /** Verify captcha only — unlock chat before the first message (server-to-server from Next.js). */
    public function verifyCaptchaOnly(Request $request): JsonResponse
    {
        if (! $this->verifyInternalSecret($request)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (! $this->chatbot->isEnabled()) {
            return response()->json(['message' => 'Chatbot disabled', 'code' => 'disabled'], 503);
        }

        $ip = $this->visitorIp($request) ?? 'unknown';
        $verified = $this->chatbot->verifyCaptcha(
            $request->input('captcha_token'),
            $request->input('captcha_math_id'),
            $request->input('captcha_math_answer'),
            $ip !== '' ? $ip : null,
            $request->input('session_id'),
        );

        if (! $verified) {
            return response()->json(['message' => 'Captcha failed', 'code' => 'captcha'], 422);
        }

        return response()->json(['data' => ['verified' => true]]);
    }

    /** Persist Q&A after AI response (server-to-server from Next.js). */
    public function complete(Request $request): JsonResponse
    {
        if (! $this->verifyInternalSecret($request)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'session_id' => ['required', 'uuid'],
            'question' => ['required', 'string', 'max:2000'],
            'answer' => ['required', 'string', 'max:8000'],
            'client_ip' => ['nullable', 'string', 'max:45'],
            'user_agent' => ['nullable', 'string', 'max:500'],
            'metadata' => ['nullable', 'array'],
        ]);

        $log = $this->chatbot->logExchange(
            $validated['session_id'],
            $validated['question'],
            $validated['answer'],
            $validated['client_ip'] ?? null,
            $validated['user_agent'] ?? null,
            $validated['metadata'] ?? null,
        );

        return response()->json(['data' => ['id' => $log->id]]);
    }

    /** Store visitor star rating for a logged exchange (server-to-server from Next.js). */
    public function rate(Request $request): JsonResponse
    {
        if (! $this->verifyInternalSecret($request)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'session_id' => ['required', 'uuid'],
            'log_id' => ['required', 'integer', 'min:1'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
        ]);

        $result = $this->chatbot->rateLog(
            $validated['session_id'],
            (int) $validated['log_id'],
            (int) $validated['rating'],
        );

        if (! ($result['ok'] ?? false)) {
            return response()->json(['message' => 'Not found', 'code' => 'not_found'], 404);
        }

        return response()->json([
            'data' => [
                'rated' => true,
                'low_rating' => (bool) ($result['low_rating'] ?? false),
            ],
        ]);
    }

    /** Follow-up feedback after a low star rating — notifies operator. */
    public function ratingFeedback(Request $request): JsonResponse
    {
        if (! $this->verifyInternalSecret($request)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'session_id' => ['required', 'uuid'],
            'log_id' => ['required', 'integer', 'min:1'],
            'feedback' => ['required', 'string', 'min:2', 'max:2000'],
            'client_ip' => ['nullable', 'string', 'max:45'],
            'user_agent' => ['nullable', 'string', 'max:500'],
        ]);

        $result = $this->chatbot->submitLowRatingFeedback(
            $validated['session_id'],
            (int) $validated['log_id'],
            $validated['feedback'],
            $validated['client_ip'] ?? null,
            $validated['user_agent'] ?? null,
        );

        if (! ($result['ok'] ?? false)) {
            $code = $result['reason'] ?? 'invalid';
            $status = $code === 'not_found' ? 404 : 422;

            return response()->json(['message' => 'Invalid feedback', 'code' => $code], $status);
        }

        return response()->json([
            'data' => [
                'queued' => true,
                'log_id' => $result['log_id'] ?? null,
            ],
        ]);
    }

    /** Log when visitor opens the chat widget (server-to-server from Next.js). */
    public function sessionOpen(Request $request): JsonResponse
    {
        if (! $this->verifyInternalSecret($request)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'session_id' => ['required', 'uuid'],
            'client_ip' => ['nullable', 'string', 'max:45'],
            'user_agent' => ['nullable', 'string', 'max:500'],
            'page_url' => ['nullable', 'string', 'max:500'],
        ]);

        $session = $this->chatbot->recordSessionOpen(
            $validated['session_id'],
            $validated['client_ip'] ?? null,
            $validated['user_agent'] ?? null,
            $validated['page_url'] ?? null,
        );

        return response()->json(['data' => ['session_id' => $session->session_id]]);
    }

    /** Save visitor phone from chatbot widget (server-to-server from Next.js). */
    public function savePhone(Request $request): JsonResponse
    {
        if (! $this->verifyInternalSecret($request)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'session_id' => ['required', 'uuid'],
            'phone' => ['required', 'string', 'max:15', 'regex:/^[\d۰-۹٠-٩+\s\-()]+$/u'],
            'client_ip' => ['nullable', 'string', 'max:45'],
            'user_agent' => ['nullable', 'string', 'max:500'],
            'page_url' => ['nullable', 'string', 'max:500', 'regex:/^\/[^\s<>"]*$/'],
        ]);

        $pageUrl = $this->sanitizePageUrl($validated['page_url'] ?? null);

        try {
            $result = $this->chatbot->saveVisitorPhone(
                $validated['session_id'],
                $validated['phone'],
                $validated['client_ip'] ?? null,
                $validated['user_agent'] ?? null,
                $pageUrl,
            );
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['message' => 'Server error', 'code' => 'server_error'], 500);
        }

        if (! ($result['ok'] ?? false)) {
            return response()->json(['message' => 'Invalid phone', 'code' => 'invalid'], 422);
        }

        return response()->json([
            'data' => [
                'saved' => true,
                'phone' => $result['phone'] ?? null,
                'lead_id' => $result['lead_id'] ?? null,
                'duplicate' => (bool) ($result['duplicate'] ?? false),
            ],
        ]);
    }

    /** Save optional visitor name and preferred operator (server-to-server from Next.js). */
    public function saveVisitorInfo(Request $request): JsonResponse
    {
        if (! $this->verifyInternalSecret($request)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'session_id' => ['required', 'uuid'],
            'visitor_first_name' => ['nullable', 'string', 'max:80'],
            'visitor_last_name' => ['nullable', 'string', 'max:80'],
            'preferred_operator_profile_id' => ['nullable', 'uuid'],
            'client_ip' => ['nullable', 'string', 'max:45'],
            'user_agent' => ['nullable', 'string', 'max:500'],
        ]);

        $result = $this->chatbot->saveVisitorInfo(
            $validated['session_id'],
            array_key_exists('visitor_first_name', $validated) ? $validated['visitor_first_name'] : null,
            array_key_exists('visitor_last_name', $validated) ? $validated['visitor_last_name'] : null,
            array_key_exists('preferred_operator_profile_id', $validated)
                ? ($validated['preferred_operator_profile_id'] ?? '')
                : null,
            $validated['client_ip'] ?? null,
            $validated['user_agent'] ?? null,
        );

        return response()->json(['data' => $result]);
    }

    /** Queue visitor message for operator when AI is down (server-to-server from Next.js). */
    public function visitorMessage(Request $request): JsonResponse
    {
        if (! $this->verifyInternalSecret($request)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (! $this->chatbot->isEnabled()) {
            return response()->json(['message' => 'Chatbot disabled', 'code' => 'disabled'], 503);
        }

        if (! $this->chatbot->isHoneypotValid($request->input('honeypot'))) {
            return response()->json(['message' => 'Invalid request', 'code' => 'bot'], 422);
        }

        $validated = $request->validate([
            'session_id' => ['required', 'uuid'],
            'message' => ['required', 'string', 'max:2000'],
            'client_ip' => ['nullable', 'string', 'max:45'],
            'user_agent' => ['nullable', 'string', 'max:500'],
            'requested_operator_profile_id' => ['nullable', 'uuid'],
            'captcha_token' => ['nullable', 'string'],
            'captcha_math_id' => ['nullable', 'string'],
            'captcha_math_answer' => ['nullable'],
        ]);

        $ip = $this->visitorIp($request) ?? 'unknown';
        $verified = $this->chatbot->verifyCaptcha(
            $validated['captcha_token'] ?? null,
            $validated['captcha_math_id'] ?? null,
            $validated['captcha_math_answer'] ?? null,
            $ip !== '' ? $ip : null,
            $validated['session_id'],
        );

        if (! $verified) {
            return response()->json(['message' => 'Captcha failed', 'code' => 'captcha'], 422);
        }

        $rate = $this->chatbot->checkRateLimit(
            $ip !== '' ? $ip : 'unknown',
            $validated['session_id'],
            'operator',
        );
        if (! $rate['ok']) {
            return response()->json([
                'message' => 'Rate limit exceeded',
                'code' => 'rate_limit',
                'reason' => $rate['reason'] ?? 'limit',
                'retry_after' => $rate['retry_after'] ?? 60,
            ], 429);
        }

        $profileId = $validated['requested_operator_profile_id']
            ?? $this->chatbot->sessionPreferredOperatorProfileId($validated['session_id']);
        $operatorMeta = $this->chatbot->requestedOperatorMetadata($profileId);

        $log = $this->chatbot->logVisitorMessageForOperator(
            $validated['session_id'],
            trim($validated['message']),
            $ip !== '' ? $ip : null,
            $validated['user_agent'] ?? null,
            $operatorMeta !== [] ? $operatorMeta : null,
        );

        return response()->json(['data' => ['id' => $log->id, 'queued' => true]]);
    }

    /** Poll operator replies for visitor (server-to-server from Next.js). */
    public function poll(Request $request): JsonResponse
    {
        if (! $this->verifyInternalSecret($request)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'session_id' => ['required', 'uuid'],
            'after_log_id' => ['nullable', 'integer', 'min:0'],
        ]);

        $updates = $this->chatbot->sessionUpdatesSince(
            $validated['session_id'],
            (int) ($validated['after_log_id'] ?? 0),
        );

        return response()->json(['data' => $updates]);
    }

    public function adminSessionThread(string $sessionId): JsonResponse
    {
        return response()->json(['data' => $this->chatbot->sessionThread($sessionId)]);
    }

    public function adminOperatorReply(Request $request, string $sessionId): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'min:1', 'max:4000'],
            'reply_to_log_id' => ['nullable', 'integer', 'min:1'],
            'operator_profile_id' => ['nullable', 'string', 'uuid'],
        ]);

        $user = $request->user();
        $profile = isset($validated['operator_profile_id'])
            ? $this->chatbot->resolveOperatorProfile($validated['operator_profile_id'])
            : null;

        if (isset($validated['operator_profile_id']) && $validated['operator_profile_id'] !== '' && $profile === null) {
            return response()->json(['message' => 'Invalid operator profile', 'code' => 'invalid_profile'], 422);
        }

        $log = $this->chatbot->postOperatorReply(
            $sessionId,
            $validated['message'],
            (int) $user->id,
            $user->name ?? $user->email ?? 'اپراتور',
            isset($validated['reply_to_log_id']) ? (int) $validated['reply_to_log_id'] : null,
            $profile,
        );

        return response()->json(['data' => ['id' => $log->id, 'queued' => false]]);
    }

    public function adminLogs(Request $request): JsonResponse
    {
        return response()->json($this->chatbot->adminLogs($request));
    }

    public function adminSessions(Request $request): JsonResponse
    {
        return response()->json($this->chatbot->adminSessions($request));
    }

    public function adminOperatorQueue(Request $request): JsonResponse
    {
        return response()->json($this->chatbot->adminOperatorQueue($request));
    }

    public function adminExport(Request $request): JsonResponse
    {
        $search = $request->query('q');
        $rows = $this->chatbot->exportLogs(is_string($search) ? $search : null);

        return response()->json(['data' => $rows]);
    }

    public function adminDeleteSessions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_ids' => ['required', 'array', 'min:1', 'max:100'],
            'session_ids.*' => ['required', 'uuid'],
        ]);

        $deleted = $this->chatbot->deleteSessions($validated['session_ids']);

        return response()->json(['data' => ['deleted' => $deleted]]);
    }

    /** End-user IP forwarded by Next.js — never use $request->ip() (that is the app server). */
    private function visitorIp(Request $request): ?string
    {
        $ip = trim((string) $request->input('client_ip', ''));
        if ($ip === '' || $ip === 'unknown') {
            return null;
        }

        return mb_substr($ip, 0, 45);
    }

    private function sanitizePageUrl(?string $url): ?string
    {
        if ($url === null || trim($url) === '') {
            return null;
        }

        $path = trim($url);
        if (! str_starts_with($path, '/') || preg_match('/[<>"\'\\\\]|javascript:|data:/i', $path)) {
            return null;
        }

        return mb_substr($path, 0, 500);
    }
}
