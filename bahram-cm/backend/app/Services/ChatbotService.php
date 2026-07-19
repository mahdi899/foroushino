<?php

namespace App\Services;

use App\Models\ChatbotLog;
use App\Models\ChatbotSession;
use App\Models\ChatbotSetting;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\Setting;
use App\Services\Exceptions\AiServiceException;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ChatbotService
{
    private const CACHE_KEY = 'chatbot.config';

    private const OPERATOR_PROFILES_CACHE_KEY = 'chatbot.operator_profiles';

    /**
     * @return array<string, mixed>
     */
    public function storedConfig(): array
    {
        return Cache::remember(self::CACHE_KEY, 60, function () {
            $value = Setting::query()
                ->where('group', 'chatbot')
                ->where('key', 'config')
                ->value('value');

            return is_array($value) ? $value : [];
        });
    }

    public static function forgetCachedConfig(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    public static function forgetCachedOperatorProfiles(): void
    {
        Cache::forget(self::OPERATOR_PROFILES_CACHE_KEY);
    }

    /**
     * @return list<array{id: string, name: string, avatar_url: string}>
     */
    public function operatorProfiles(): array
    {
        return Cache::remember(self::OPERATOR_PROFILES_CACHE_KEY, 60, function () {
            $value = Setting::query()
                ->where('group', 'chatbot')
                ->where('key', 'operator_profiles')
                ->value('value');

            if (! is_array($value) || ! is_array($value['profiles'] ?? null)) {
                return [];
            }

            $profiles = [];
            foreach ($value['profiles'] as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $id = trim((string) ($row['id'] ?? ''));
                $name = trim((string) ($row['name'] ?? ''));
                $avatar = trim((string) ($row['avatar_url'] ?? ''));
                if ($id === '' || $name === '') {
                    continue;
                }
                if ($avatar !== '' && ! str_starts_with($avatar, '/') && ! str_starts_with($avatar, 'http')) {
                    $avatar = '';
                }
                $profiles[] = [
                    'id' => $id,
                    'name' => mb_substr($name, 0, 80),
                    'avatar_url' => mb_substr($avatar, 0, 500),
                ];
            }

            return $profiles;
        });
    }

    /**
     * @return array{id: string, name: string, avatar_url: string}|null
     */
    public function resolveOperatorProfile(?string $profileId): ?array
    {
        $profileId = trim((string) $profileId);
        if ($profileId === '') {
            return null;
        }

        foreach ($this->operatorProfiles() as $profile) {
            if (($profile['id'] ?? '') === $profileId) {
                return $profile;
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    public function mergedConfig(): array
    {
        $stored = $this->storedConfig();

        return [
            'enabled' => (bool) ($stored['enabled'] ?? false),
            'assistant_name' => trim((string) ($stored['assistant_name'] ?? 'دستیار بهرام')) ?: 'دستیار بهرام',
            'welcome_message' => trim((string) ($stored['welcome_message'] ?? ''))
                ?: 'آیا سوالی دارید؟ من دستیار آکادمی بهرام هستم و خوشحال می‌شوم کمکتان کنم.',
            'welcome_video_url' => trim((string) ($stored['welcome_video_url'] ?? '')),
            'system_prompt_extra' => trim((string) ($stored['system_prompt_extra'] ?? '')),
            'rate_limit_per_minute' => $this->normalizeRateLimit($stored['rate_limit_per_minute'] ?? null, 3),
            'rate_limit_per_hour' => $this->normalizeRateLimit($stored['rate_limit_per_hour'] ?? null, 10),
            'operator_rate_limit_per_minute' => $this->normalizeRateLimit($stored['operator_rate_limit_per_minute'] ?? null, 3),
            'operator_rate_limit_per_hour' => $this->normalizeRateLimit($stored['operator_rate_limit_per_hour'] ?? null, 10),
            'global_hourly_cap' => $this->normalizeRateLimit($stored['global_hourly_cap'] ?? null, 100),
            'require_captcha' => (bool) ($stored['require_captcha'] ?? true),
            'honeypot_enabled' => (bool) ($stored['honeypot_enabled'] ?? true),
            'cta_consultation' => (bool) ($stored['cta_consultation'] ?? true),
            'cta_whatsapp' => (bool) ($stored['cta_whatsapp'] ?? true),
            'cta_phone' => (bool) ($stored['cta_phone'] ?? true),
            'cta_pricing' => (bool) ($stored['cta_pricing'] ?? true),
            'max_history_messages' => max(2, min(20, (int) ($stored['max_history_messages'] ?? 8))),
            'quick_suggestions' => $this->normalizeQuickSuggestions($stored['quick_suggestions'] ?? null, isset($stored['quick_suggestions'])),
        ];
    }

    public function isEnabled(): bool
    {
        return $this->mergedConfig()['enabled'];
    }

    /**
     * @return list<array{id: string, label: string, response: string}>
     */
    private function normalizeQuickSuggestions(mixed $raw, bool $keyExists = false): array
    {
        if ($raw === null && ! $keyExists) {
            return $this->defaultQuickSuggestions();
        }

        if (! is_array($raw) || $raw === []) {
            return [];
        }

        $out = [];
        foreach ($raw as $row) {
            if (! is_array($row)) {
                continue;
            }
            $label = trim((string) ($row['label'] ?? ''));
            $response = trim((string) ($row['response'] ?? ''));
            if ($label === '' || $response === '') {
                continue;
            }
            $id = trim((string) ($row['id'] ?? ''));
            if ($id === '') {
                $id = (string) \Illuminate\Support\Str::uuid();
            }
            $out[] = [
                'id' => mb_substr($id, 0, 64),
                'label' => mb_substr($label, 0, 120),
                'response' => mb_substr($response, 0, 2000),
            ];
            if (count($out) >= 8) {
                break;
            }
        }

        return $out !== [] ? $out : [];
    }

    /**
     * @return list<array{id: string, label: string, response: string}>
     */
    private function defaultQuickSuggestions(): array
    {
        return [
            [
                'id' => 'courses',
                'label' => 'دوره‌های آکادمی بهرام چیست؟',
                'response' => 'آکادمی بهرام دوره‌های تخصصی در حوزه‌های فروش، بازاریابی، سات و رشد حرفه‌ای ارائه می‌دهد. برای مشاهده لیست دوره‌ها به صفحه «دوره‌ها» یا «آکادمی» مراجعه کنید.',
            ],
            [
                'id' => 'consultation',
                'label' => 'چطور مشاوره یا ثبت‌نام کنم؟',
                'response' => 'برای مشاوره رایگان می‌توانید از دکمه «مشاوره رایگان» در همین چت، تماس تلفنی یا واتساپ استفاده کنید. تیم ما در اولین فرصت با شما هماهنگ می‌کند.',
            ],
            [
                'id' => 'saat',
                'label' => 'سات (SAT) چیست و چطور آماده شوم؟',
                'response' => 'سات آزمون استاندارد پذیرش دانشگاه در آمریکا است. آکادمی بهرام برنامه آمادگی سات با مشاوره مسیر، منابع و کلاس‌های تخصصی دارد. برای جزئیات به صفحه «سات» مراجعه کنید.',
            ],
            [
                'id' => 'support',
                'label' => 'پشتیبانی و ساعات پاسخگویی',
                'response' => 'ساعات پاسخگویی و راه‌های تماس در صفحه «تماس با ما» یا از طریق همین چت در دسترس است. در ساعات اداری معمولاً پاسخگویی سریع‌تر است.',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function publicConfig(): array
    {
        $config = $this->mergedConfig();
        $captcha = app(CaptchaService::class)->publicConfig();

        return [
            'enabled' => $config['enabled'],
            'assistant_name' => $config['assistant_name'],
            'welcome_message' => $config['welcome_message'],
            'welcome_video_url' => $config['welcome_video_url'] ?: null,
            'require_captcha' => $config['require_captcha'],
            'captcha' => $captcha,
            'ctas' => [
                'consultation' => $config['cta_consultation'],
                'whatsapp' => $config['cta_whatsapp'],
                'phone' => $config['cta_phone'],
                'pricing' => $config['cta_pricing'],
            ],
            'operator_profiles' => $this->operatorProfiles(),
            'quick_suggestions' => $config['quick_suggestions'],
            'ai_available' => $this->isAiAvailable(),
            'system_prompt_extra' => $config['system_prompt_extra'],
            'max_history_messages' => $config['max_history_messages'],
            'honeypot_enabled' => $config['honeypot_enabled'],
        ];
    }

    public function isAiAvailable(): bool
    {
        return $this->resolveChatbotAiRuntime()['enabled'];
    }

    /**
     * @return array{enabled: bool, provider: string, apiStyle: string, keySource: string, active: array{model: string, baseUrl: string, temperature: float, apiKey: string|null}}
     */
    public function resolveChatbotAiRuntime(): array
    {
        $raw = $this->storedAiConfig();
        $chatbot = is_array($raw['chatbot'] ?? null) ? $raw['chatbot'] : [];
        $provider = in_array($chatbot['provider'] ?? '', ['openai', 'gemini', 'anthropic', 'custom'], true)
            ? $chatbot['provider']
            : 'gemini';
        $meta = self::CHATBOT_AI_PROVIDER_META[$provider] ?? self::CHATBOT_AI_PROVIDER_META['gemini'];

        $panelKey = trim((string) ($chatbot['apiKeys'][$provider] ?? ''));
        $envKey = $this->chatbotEnvKey($provider);
        $apiKey = $panelKey !== '' ? $panelKey : ($envKey !== '' ? $envKey : null);
        $keySource = $panelKey !== '' ? 'panel' : ($envKey !== '' ? 'env' : 'none');

        $temperature = is_numeric($chatbot['temperature'] ?? null)
            ? (float) $chatbot['temperature']
            : 0.35;
        $temperature = max(0.0, min(2.0, $temperature));

        return [
            'enabled' => $apiKey !== null,
            'provider' => $provider,
            'apiStyle' => $meta['apiStyle'],
            'keySource' => $keySource,
            'active' => [
                'model' => trim((string) ($chatbot['model'] ?? '')) ?: $meta['defaultModel'],
                'baseUrl' => trim((string) ($chatbot['baseUrl'] ?? '')) ?: $meta['defaultBaseUrl'],
                'temperature' => $temperature,
                'apiKey' => $apiKey,
            ],
        ];
    }

    /**
     * @return array<string, array{apiStyle: string, defaultModel: string, defaultBaseUrl: string, envKey: string}>
     */
    private const CHATBOT_AI_PROVIDER_META = [
        'openai' => [
            'apiStyle' => 'openai',
            'defaultModel' => 'gpt-4o-mini',
            'defaultBaseUrl' => 'https://api.openai.com/v1',
            'envKey' => 'CHATBOT_OPENAI_API_KEY',
        ],
        'gemini' => [
            'apiStyle' => 'gemini',
            'defaultModel' => 'gemini-flash-latest',
            'defaultBaseUrl' => 'https://generativelanguage.googleapis.com/v1beta',
            'envKey' => 'CHATBOT_GEMINI_API_KEY',
        ],
        'anthropic' => [
            'apiStyle' => 'anthropic',
            'defaultModel' => 'claude-3-5-haiku-latest',
            'defaultBaseUrl' => 'https://api.anthropic.com/v1',
            'envKey' => 'CHATBOT_ANTHROPIC_API_KEY',
        ],
        'custom' => [
            'apiStyle' => 'openai',
            'defaultModel' => '',
            'defaultBaseUrl' => '',
            'envKey' => 'CHATBOT_CUSTOM_API_KEY',
        ],
    ];

    private function storedAiConfig(): array
    {
        $value = Setting::query()
            ->where('group', 'ai')
            ->where('key', 'config')
            ->value('value');

        return is_array($value) ? $value : [];
    }

    private function chatbotEnvKey(string $provider): string
    {
        $meta = self::CHATBOT_AI_PROVIDER_META[$provider] ?? null;
        if ($meta === null) {
            return '';
        }

        $env = trim((string) env($meta['envKey'], ''));

        return $env;
    }

    /**
     * @return array{ok: bool, reason?: string, retry_after?: int}
     */
    public function checkRateLimit(string $ip, ?string $sessionId = null, string $channel = 'ai'): array
    {
        $config = $this->mergedConfig();
        $now = now();
        $cache = $this->rateLimitCache();
        $subject = $this->rateLimitSubject($ip, $sessionId);
        $prefix = $channel === 'operator' ? 'chatbot:op' : 'chatbot:ai';

        $minuteLimit = $channel === 'operator'
            ? (int) $config['operator_rate_limit_per_minute']
            : (int) $config['rate_limit_per_minute'];
        $hourLimit = $channel === 'operator'
            ? (int) $config['operator_rate_limit_per_hour']
            : (int) $config['rate_limit_per_hour'];
        $globalCap = (int) $config['global_hourly_cap'];

        $minuteKey = "{$prefix}:{$subject}:m:{$now->format('YmdHi')}";
        $hourKey = "{$prefix}:{$subject}:h:{$now->format('YmdH')}";
        $globalKey = 'chatbot:global:h:'.$now->format('YmdH');

        $minuteCount = $minuteLimit > 0 ? $this->readRateLimitCount($cache, $minuteKey) : 0;
        $hourCount = $hourLimit > 0 ? $this->readRateLimitCount($cache, $hourKey) : 0;
        $globalCount = $globalCap > 0 ? $this->readRateLimitCount($cache, $globalKey) : 0;

        if ($minuteLimit > 0 && $minuteCount >= $minuteLimit) {
            return ['ok' => false, 'reason' => 'minute', 'retry_after' => 60 - $now->second];
        }
        if ($hourLimit > 0 && $hourCount >= $hourLimit) {
            return ['ok' => false, 'reason' => 'hour', 'retry_after' => 3600 - ($now->minute * 60 + $now->second)];
        }
        if ($globalCap > 0 && $globalCount >= $globalCap) {
            return ['ok' => false, 'reason' => 'global', 'retry_after' => 3600 - ($now->minute * 60 + $now->second)];
        }

        if ($minuteLimit > 0) {
            $this->incrementRateLimitCount($cache, $minuteKey, 120);
        }
        if ($hourLimit > 0) {
            $this->incrementRateLimitCount($cache, $hourKey, 7200);
        }
        if ($globalCap > 0) {
            $this->incrementRateLimitCount($cache, $globalKey, 7200);
        }

        return ['ok' => true];
    }

    private function normalizeRateLimit(mixed $raw, int $default): int
    {
        if ($raw === null || $raw === '') {
            return $default;
        }

        return max(0, (int) $raw);
    }

    private function rateLimitCache(): CacheRepository
    {
        foreach (['database', 'file'] as $store) {
            try {
                return Cache::store($store);
            } catch (\Throwable) {
                continue;
            }
        }

        return Cache::store(config('cache.default'));
    }

    private function rateLimitSubject(string $ip, ?string $sessionId): string
    {
        $sessionId = trim((string) $sessionId);
        if ($sessionId !== '') {
            return 's:'.md5($sessionId);
        }

        return 'ip:'.md5($this->normalizeRateLimitIp($ip));
    }

    private function normalizeRateLimitIp(string $ip): string
    {
        $ip = trim($ip);
        if ($ip === '' || $ip === 'unknown') {
            return 'unknown';
        }

        $lower = strtolower($ip);
        if (in_array($lower, ['127.0.0.1', '::1', '0:0:0:0:0:0:0:1', 'localhost'], true)) {
            return 'loopback';
        }

        return mb_substr($ip, 0, 45);
    }

    private function readRateLimitCount(CacheRepository $cache, string $key): int
    {
        $value = $cache->get($key);

        return is_numeric($value) ? (int) $value : 0;
    }

    private function incrementRateLimitCount(CacheRepository $cache, string $key, int $ttlSeconds): void
    {
        if (! $cache->has($key)) {
            $cache->put($key, 1, $ttlSeconds);

            return;
        }

        $cache->increment($key);
    }

    public function verifyCaptcha(
        ?string $token,
        ?string $mathId,
        mixed $mathAnswer,
        ?string $ip,
        ?string $sessionId = null,
        ?string $provider = null,
    ): bool {
        $config = $this->mergedConfig();
        if (! $config['require_captcha']) {
            return true;
        }

        return app(CaptchaService::class)->verify(
            token: $token,
            mathId: $mathId,
            mathAnswer: $mathAnswer,
            ip: $ip,
            sessionId: $sessionId,
            allowIpTrust: false,
            provider: $provider,
        );
    }

    public function isHoneypotValid(?string $honeypot): bool
    {
        $config = $this->mergedConfig();
        if (! $config['honeypot_enabled']) {
            return true;
        }

        return $honeypot === null || trim($honeypot) === '';
    }

    /**
     * @param  array<string, mixed>|null  $metadata
     */
    public function logExchange(
        string $sessionId,
        string $question,
        string $answer,
        ?string $ip,
        ?string $userAgent,
        ?array $metadata = null,
    ): ChatbotLog {
        $this->touchSessionActivity($sessionId, $ip, $userAgent, incrementMessages: true);

        return ChatbotLog::query()->create([
            'session_id' => $sessionId,
            'ip_address' => $ip,
            'user_agent' => $userAgent ? mb_substr($userAgent, 0, 500) : null,
            'question' => $question,
            'answer' => $answer,
            'metadata' => $metadata,
        ]);
    }

    /**
     * @return array{ok: bool, low_rating?: bool}
     */
    public function rateLog(string $sessionId, int $logId, int $rating): array
    {
        $log = ChatbotLog::query()
            ->where('id', $logId)
            ->where('session_id', $sessionId)
            ->first();

        if (! $log || ! $this->isRateableLog($log)) {
            return ['ok' => false];
        }

        $metadata = is_array($log->metadata) ? $log->metadata : [];
        $metadata['rating'] = $rating;
        $metadata['rated_at'] = now()->toIso8601String();
        $lowRating = $rating < 3;
        if ($lowRating) {
            $metadata['low_rating'] = true;
        }
        $log->metadata = $metadata;
        $log->save();

        return ['ok' => true, 'low_rating' => $lowRating];
    }

    /**
     * @return array{ok: bool, reason?: string, log_id?: int}
     */
    public function submitLowRatingFeedback(
        string $sessionId,
        int $ratedLogId,
        string $feedback,
        ?string $ip,
        ?string $userAgent,
    ): array {
        $feedback = $this->sanitizePlainText($feedback, 2000);
        if ($feedback === null) {
            return ['ok' => false, 'reason' => 'invalid'];
        }

        $ratedLog = ChatbotLog::query()
            ->where('id', $ratedLogId)
            ->where('session_id', $sessionId)
            ->first();

        if (! $ratedLog || ! $this->isRateableLog($ratedLog)) {
            return ['ok' => false, 'reason' => 'not_found'];
        }

        $meta = is_array($ratedLog->metadata) ? $ratedLog->metadata : [];
        if (($meta['low_rating_feedback'] ?? null) !== null) {
            return ['ok' => false, 'reason' => 'duplicate'];
        }

        $meta['low_rating_feedback'] = $feedback;
        $meta['feedback_at'] = now()->toIso8601String();
        $meta['operator_notified'] = true;
        $ratedLog->metadata = $meta;
        $ratedLog->save();

        $stars = isset($meta['rating']) ? (int) $meta['rating'] : null;
        $operatorMeta = $this->requestedOperatorMetadata(
            $this->sessionPreferredOperatorProfileId($sessionId),
        );

        $queued = $this->logVisitorMessageForOperator(
            $sessionId,
            $feedback,
            $ip,
            $userAgent,
            array_merge($operatorMeta, [
                'low_rating_followup' => true,
                'rated_log_id' => $ratedLogId,
                'rated_stars' => $stars,
                'rated_question' => $this->sanitizePlainText($ratedLog->question, 300),
                'rated_answer' => $this->sanitizePlainText($ratedLog->answer, 300),
            ]),
        );

        return ['ok' => true, 'log_id' => $queued->id];
    }

    public function recordSessionOpen(
        string $sessionId,
        ?string $ip,
        ?string $userAgent,
        ?string $pageUrl = null,
    ): ChatbotSession {
        $session = ChatbotSession::query()->firstOrNew(['session_id' => $sessionId]);
        $now = now();

        if (! $session->exists) {
            $session->opened_at = $now;
            $session->open_count = 1;
            $session->message_count = 0;
        } else {
            $session->open_count = (int) $session->open_count + 1;
        }

        $session->ip_address = $ip;
        $session->user_agent = $userAgent ? mb_substr($userAgent, 0, 500) : null;
        if ($pageUrl) {
            $session->page_url = mb_substr($pageUrl, 0, 500);
        }
        $session->last_activity_at = $now;
        $session->save();

        ChatbotLog::query()->create([
            'session_id' => $sessionId,
            'ip_address' => $ip,
            'user_agent' => $userAgent ? mb_substr($userAgent, 0, 500) : null,
            'question' => '—',
            'answer' => 'باز کردن پنجره چت',
            'metadata' => ['event' => 'session_open', 'page_url' => $pageUrl],
        ]);

        return $session;
    }

    private function touchSessionActivity(
        string $sessionId,
        ?string $ip,
        ?string $userAgent,
        bool $incrementMessages = false,
    ): void {
        $session = ChatbotSession::query()->firstOrNew(['session_id' => $sessionId]);
        $now = now();

        if (! $session->exists) {
            $session->opened_at = $now;
            $session->open_count = 1;
            $session->message_count = 0;
        }

        if ($incrementMessages) {
            $session->message_count = (int) $session->message_count + 1;
        }

        $session->ip_address = $ip ?? $session->ip_address;
        $session->user_agent = $userAgent ? mb_substr($userAgent, 0, 500) : $session->user_agent;
        $session->last_activity_at = $now;
        $session->save();
    }

    /**
     * @return array{ok: bool, reason?: string, phone?: string, lead_id?: int|null, duplicate?: bool}
     */
    public function saveVisitorPhone(
        string $sessionId,
        string $phone,
        ?string $ip,
        ?string $userAgent,
        ?string $pageUrl = null,
    ): array {
        $normalized = $this->normalizeIranMobile($phone);
        if ($normalized === null) {
            return ['ok' => false, 'reason' => 'invalid'];
        }

        $pageUrl = $this->sanitizePageUrl($pageUrl);
        $chatSummary = $this->buildChatSummaryFromLogs($sessionId);

        $session = ChatbotSession::query()->firstOrNew(['session_id' => $sessionId]);
        if ($session->exists && $session->visitor_phone) {
            return [
                'ok' => true,
                'phone' => $session->visitor_phone,
                'lead_id' => $session->lead_id,
                'duplicate' => true,
            ];
        }

        $visitorName = $this->sessionVisitorDisplayName($session);

        if (! $session->exists) {
            $session->opened_at = now();
            $session->open_count = 1;
            $session->message_count = 0;
        }

        $session->visitor_phone = $normalized;
        $session->ip_address = $ip ?? $session->ip_address;
        $session->user_agent = $userAgent ? mb_substr($userAgent, 0, 500) : $session->user_agent;
        if ($pageUrl) {
            $session->page_url = mb_substr($pageUrl, 0, 500);
        }
        $session->last_activity_at = now();
        $session->save();

        if (! $session->lead_id) {
            $lead = app(LeadService::class)->create([
                'name' => $visitorName ?? 'کاربر چت‌بات',
                'phone' => $normalized,
                'form_type' => 'chatbot',
                'source' => 'chatbot',
                'page_url' => $pageUrl,
                'answers' => array_filter([
                    'chatbot_session_id' => $sessionId,
                    'chat_summary' => $chatSummary,
                ]),
            ], [
                'ip' => $ip,
                'user_agent' => $userAgent,
            ]);

            $session->lead_id = $lead->id;
            $session->save();
        }

        return [
            'ok' => true,
            'phone' => $normalized,
            'lead_id' => $session->lead_id,
            'duplicate' => false,
        ];
    }

    /**
     * @return array{ok: bool, visitor_first_name?: string|null, visitor_last_name?: string|null, preferred_operator_profile_id?: string|null}
     */
    public function saveVisitorInfo(
        string $sessionId,
        ?string $firstName,
        ?string $lastName,
        ?string $preferredOperatorProfileId,
        ?string $ip,
        ?string $userAgent,
    ): array {
        $session = ChatbotSession::query()->firstOrNew(['session_id' => $sessionId]);
        $now = now();

        if (! $session->exists) {
            $session->opened_at = $now;
            $session->open_count = 1;
            $session->message_count = 0;
        }

        if ($firstName !== null) {
            $session->visitor_first_name = $this->sanitizeVisitorName($firstName);
        }
        if ($lastName !== null) {
            $session->visitor_last_name = $this->sanitizeVisitorName($lastName);
        }

        if ($preferredOperatorProfileId !== null) {
            $profileId = trim($preferredOperatorProfileId);
            if ($profileId === '') {
                $session->preferred_operator_profile_id = null;
            } elseif ($this->resolveOperatorProfile($profileId) !== null) {
                $session->preferred_operator_profile_id = $profileId;
            }
        }

        $session->ip_address = $ip ?? $session->ip_address;
        $session->user_agent = $userAgent ? mb_substr($userAgent, 0, 500) : $session->user_agent;
        $session->last_activity_at = $now;
        $session->save();

        return [
            'ok' => true,
            'visitor_first_name' => $session->visitor_first_name,
            'visitor_last_name' => $session->visitor_last_name,
            'preferred_operator_profile_id' => $session->preferred_operator_profile_id,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function requestedOperatorMetadata(?string $profileId): array
    {
        $profile = $this->resolveOperatorProfile($profileId);
        if ($profile === null) {
            return [];
        }

        return array_filter([
            'requested_operator_profile_id' => $profile['id'],
            'requested_operator_name' => $profile['name'],
            'requested_operator_avatar_url' => ($profile['avatar_url'] ?? '') !== '' ? $profile['avatar_url'] : null,
        ]);
    }

    public function sessionPreferredOperatorProfileId(string $sessionId): ?string
    {
        $id = ChatbotSession::query()->where('session_id', $sessionId)->value('preferred_operator_profile_id');

        return is_string($id) && trim($id) !== '' ? trim($id) : null;
    }

    private function sanitizeVisitorName(?string $name): ?string
    {
        $name = trim(preg_replace('/\s+/u', ' ', (string) $name) ?? '');
        if ($name === '') {
            return null;
        }

        return mb_substr($name, 0, 80);
    }

    private function sessionVisitorDisplayName(?ChatbotSession $session): ?string
    {
        if ($session === null) {
            return null;
        }

        $parts = array_filter([
            trim((string) ($session->visitor_first_name ?? '')),
            trim((string) ($session->visitor_last_name ?? '')),
        ], fn (string $part) => $part !== '');

        return $parts !== [] ? implode(' ', $parts) : null;
    }

    private function normalizeIranMobile(string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        if (str_starts_with($digits, '98') && strlen($digits) >= 12) {
            $digits = '0'.substr($digits, 2);
        }
        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            $digits = '0'.$digits;
        }

        return preg_match('/^09\d{9}$/', $digits) ? $digits : null;
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

    private function sanitizePlainText(?string $value, int $maxLength): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $clean = strip_tags($value);
        $clean = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $clean) ?? '';
        $clean = trim($clean);

        return $clean === '' ? null : mb_substr($clean, 0, $maxLength);
    }

    private function replyTargetPreviewForLog(?int $replyToLogId, string $sessionId): ?string
    {
        if (! $replyToLogId) {
            return null;
        }

        $target = ChatbotLog::query()
            ->where('id', $replyToLogId)
            ->where('session_id', $sessionId)
            ->first();

        if (! $target) {
            return null;
        }

        $meta = is_array($target->metadata) ? $target->metadata : [];
        if (($meta['event'] ?? null) === 'visitor_message') {
            return $this->sanitizePlainText($target->question, 200);
        }

        if ($target->question !== '—' && trim($target->question) !== '') {
            return $this->sanitizePlainText($target->question, 200);
        }

        return null;
    }

    private function buildChatSummaryFromLogs(string $sessionId): ?string
    {
        $logs = ChatbotLog::query()
            ->where('session_id', $sessionId)
            ->where('question', '!=', '—')
            ->orderByDesc('id')
            ->limit(6)
            ->get()
            ->reverse();

        if ($logs->isEmpty()) {
            return null;
        }

        $lines = [];
        foreach ($logs as $log) {
            $question = $this->sanitizePlainText($log->question, 300);
            $answer = $this->sanitizePlainText($log->answer, 300);
            if ($question) {
                $lines[] = "کاربر: {$question}";
            }
            if ($answer) {
                $lines[] = 'دستیار: '.$answer;
            }
        }

        if ($lines === []) {
            return null;
        }

        return mb_substr(implode("\n", $lines), 0, 1000);
    }

    /** Queue a visitor message when AI is unavailable — waits for operator reply. */
    public function logVisitorMessageForOperator(
        string $sessionId,
        string $question,
        ?string $ip,
        ?string $userAgent,
        ?array $extraMetadata = null,
    ): ChatbotLog {
        $this->touchSessionActivity($sessionId, $ip, $userAgent, incrementMessages: true);

        return ChatbotLog::query()->create([
            'session_id' => $sessionId,
            'ip_address' => $ip,
            'user_agent' => $userAgent ? mb_substr($userAgent, 0, 500) : null,
            'question' => $question,
            'answer' => '—',
            'metadata' => array_merge(
                ['event' => 'visitor_message', 'pending_operator' => true],
                $extraMetadata ?? [],
            ),
        ]);
    }

    public function postOperatorReply(
        string $sessionId,
        string $message,
        int $operatorId,
        ?string $operatorName,
        ?int $replyToLogId = null,
        ?array $operatorProfile = null,
    ): ChatbotLog {
        $this->touchSessionActivity($sessionId, null, null, incrementMessages: true);

        if ($replyToLogId) {
            $target = ChatbotLog::query()
                ->where('id', $replyToLogId)
                ->where('session_id', $sessionId)
                ->first();
            if ($target && is_array($target->metadata) && ($target->metadata['pending_operator'] ?? false)) {
                $meta = $target->metadata;
                $meta['pending_operator'] = false;
                $target->metadata = $meta;
                $target->save();
            }
        }

        $displayName = trim((string) ($operatorProfile['name'] ?? $operatorName ?? 'اپراتور'));
        $avatarUrl = trim((string) ($operatorProfile['avatar_url'] ?? ''));

        return ChatbotLog::query()->create([
            'session_id' => $sessionId,
            'question' => '—',
            'answer' => trim($message),
            'metadata' => array_filter([
                'event' => 'operator_reply',
                'operator_id' => $operatorId,
                'operator_profile_id' => $operatorProfile['id'] ?? null,
                'operator_name' => $displayName !== '' ? $displayName : 'اپراتور',
                'operator_avatar_url' => $avatarUrl !== '' ? mb_substr($avatarUrl, 0, 500) : null,
                'reply_to_log_id' => $replyToLogId,
            ]),
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function sessionThread(string $sessionId): array
    {
        return ChatbotLog::query()
            ->where('session_id', $sessionId)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->map(fn (ChatbotLog $log) => $this->formatThreadLog($log))
            ->filter(fn (array $row) => ($row['kind'] ?? '') !== 'skip')
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function sessionUpdatesSince(string $sessionId, int $afterLogId = 0): array
    {
        return ChatbotLog::query()
            ->where('session_id', $sessionId)
            ->where('id', '>', max(0, $afterLogId))
            ->orderBy('id')
            ->get()
            ->map(fn (ChatbotLog $log) => $this->formatThreadLog($log))
            ->filter(fn (array $row) => in_array($row['kind'] ?? '', ['operator_reply', 'visitor_message'], true))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function formatThreadLog(ChatbotLog $log): array
    {
        $meta = is_array($log->metadata) ? $log->metadata : [];
        $event = $meta['event'] ?? null;

        if ($event === 'session_open') {
            return ['kind' => 'skip', 'id' => $log->id];
        }

        if ($event === 'operator_reply') {
            $replyToLogId = isset($meta['reply_to_log_id']) ? (int) $meta['reply_to_log_id'] : null;

            return [
                'kind' => 'operator_reply',
                'id' => $log->id,
                'content' => $log->answer,
                'operator_name' => $meta['operator_name'] ?? 'اپراتور',
                'operator_avatar_url' => $meta['operator_avatar_url'] ?? null,
                'reply_to_log_id' => $replyToLogId,
                'reply_to_preview' => $this->replyTargetPreviewForLog($replyToLogId, $log->session_id),
                'rating' => isset($meta['rating']) ? (int) $meta['rating'] : null,
                'created_at' => $log->created_at?->toIso8601String(),
            ];
        }

        if ($event === 'visitor_message') {
            return [
                'kind' => 'visitor_message',
                'id' => $log->id,
                'content' => $log->question,
                'pending_operator' => (bool) ($meta['pending_operator'] ?? false),
                'low_rating_followup' => (bool) ($meta['low_rating_followup'] ?? false),
                'rated_stars' => isset($meta['rated_stars']) ? (int) $meta['rated_stars'] : null,
                'rated_question' => $meta['rated_question'] ?? null,
                'requested_operator_profile_id' => $meta['requested_operator_profile_id'] ?? null,
                'requested_operator_name' => $meta['requested_operator_name'] ?? null,
                'requested_operator_avatar_url' => $meta['requested_operator_avatar_url'] ?? null,
                'created_at' => $log->created_at?->toIso8601String(),
            ];
        }

        if ($log->question === '—') {
            return ['kind' => 'skip', 'id' => $log->id];
        }

        return [
            'kind' => 'exchange',
            'id' => $log->id,
            'question' => $log->question,
            'answer' => $log->answer,
            'rating' => isset($meta['rating']) ? (int) $meta['rating'] : null,
            'created_at' => $log->created_at?->toIso8601String(),
        ];
    }

    /**
     * @return array{data: list<array<string, mixed>>, meta: array<string, int>}
     */
    public function adminSessions(Request $request): array
    {
        $perPage = min(50, max(10, (int) $request->query('per_page', 20)));
        $search = trim((string) $request->query('q', ''));

        $query = ChatbotSession::query()
            ->where('message_count', '>', 0)
            ->orderByDesc('last_activity_at');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('session_id', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%")
                    ->orWhere('page_url', 'like', "%{$search}%")
                    ->orWhere('visitor_phone', 'like', "%{$search}%")
                    ->orWhere('visitor_first_name', 'like', "%{$search}%")
                    ->orWhere('visitor_last_name', 'like', "%{$search}%");
            });
        }

        $paginator = $query->paginate($perPage);

        return [
            'data' => $paginator->getCollection()->map(fn (ChatbotSession $s) => [
                'session_id' => $s->session_id,
                'ip_address' => $s->ip_address,
                'page_url' => $s->page_url,
                'visitor_phone' => $s->visitor_phone,
                'visitor_first_name' => $s->visitor_first_name,
                'visitor_last_name' => $s->visitor_last_name,
                'visitor_name' => $this->sessionVisitorDisplayName($s),
                'preferred_operator_profile_id' => $s->preferred_operator_profile_id,
                'lead_id' => $s->lead_id,
                'open_count' => $s->open_count,
                'message_count' => $s->message_count,
                'opened_at' => $s->opened_at?->toIso8601String(),
                'last_activity_at' => $s->last_activity_at?->toIso8601String(),
            ])->values()->all(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];
    }

    /**
     * @return array{data: list<array<string, mixed>>, meta: array<string, int>}
     */
    public function adminOperatorQueue(Request $request): array
    {
        $perPage = min(50, max(10, (int) $request->query('per_page', 20)));
        $search = trim((string) $request->query('q', ''));

        $query = ChatbotLog::query()
            ->where('metadata->event', 'visitor_message')
            ->where('metadata->pending_operator', true)
            ->orderByDesc('created_at');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('question', 'like', "%{$search}%")
                    ->orWhere('session_id', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%");
            });
        }

        $paginator = $query->paginate($perPage);
        $sessionIds = $paginator->getCollection()->pluck('session_id')->unique()->values()->all();
        $sessions = ChatbotSession::query()
            ->whereIn('session_id', $sessionIds)
            ->get()
            ->keyBy('session_id');

        return [
            'data' => $paginator->getCollection()->map(function (ChatbotLog $log) use ($sessions) {
                $meta = is_array($log->metadata) ? $log->metadata : [];
                $session = $sessions->get($log->session_id);

                return [
                    'id' => $log->id,
                    'session_id' => $log->session_id,
                    'content' => $log->question,
                    'ip_address' => $log->ip_address,
                    'visitor_phone' => $session?->visitor_phone,
                    'visitor_first_name' => $session?->visitor_first_name,
                    'visitor_last_name' => $session?->visitor_last_name,
                    'visitor_name' => $this->sessionVisitorDisplayName($session),
                    'page_url' => $session?->page_url,
                    'low_rating_followup' => (bool) ($meta['low_rating_followup'] ?? false),
                    'rated_stars' => isset($meta['rated_stars']) ? (int) $meta['rated_stars'] : null,
                    'rated_question' => $meta['rated_question'] ?? null,
                    'requested_operator_profile_id' => $meta['requested_operator_profile_id'] ?? $session?->preferred_operator_profile_id,
                    'requested_operator_name' => $meta['requested_operator_name'] ?? null,
                    'created_at' => $log->created_at?->toIso8601String(),
                ];
            })->values()->all(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function exportLogs(?string $search = null): array
    {
        $query = ChatbotLog::query()
            ->orderBy('session_id')
            ->orderBy('created_at')
            ->orderBy('id');

        if ($search !== null && trim($search) !== '') {
            $s = trim($search);
            $query->where(function ($q) use ($s) {
                $q->where('question', 'like', "%{$s}%")
                    ->orWhere('answer', 'like', "%{$s}%")
                    ->orWhere('session_id', 'like', "%{$s}%")
                    ->orWhere('ip_address', 'like', "%{$s}%");
            });
        }

        $logs = $query->get();
        if ($logs->isEmpty()) {
            return [];
        }

        $sessions = ChatbotSession::query()
            ->whereIn('session_id', $logs->pluck('session_id')->unique()->all())
            ->get()
            ->keyBy('session_id');

        return $logs
            ->map(fn (ChatbotLog $log) => $this->formatExportRow($log, $sessions->get($log->session_id)))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function formatExportRow(ChatbotLog $log, ?ChatbotSession $session): array
    {
        $meta = is_array($log->metadata) ? $log->metadata : [];
        $event = $meta['event'] ?? null;

        if ($event === 'session_open') {
            $kind = 'session_open';
        } elseif ($event === 'operator_reply') {
            $kind = 'operator_reply';
        } elseif ($event === 'visitor_message') {
            $kind = 'visitor_message';
        } elseif ($log->question === '—') {
            $kind = 'system';
        } else {
            $kind = 'ai_exchange';
        }

        $userMessage = null;
        $reply = null;

        if ($kind === 'ai_exchange' || $kind === 'visitor_message') {
            $userMessage = $log->question !== '—' ? $log->question : null;
        }
        if ($kind === 'ai_exchange' || $kind === 'operator_reply') {
            $reply = $log->answer !== '—' ? $log->answer : null;
        }

        return [
            'id' => $log->id,
            'session_id' => $log->session_id,
            'kind' => $kind,
            'visitor_first_name' => $session?->visitor_first_name,
            'visitor_last_name' => $session?->visitor_last_name,
            'visitor_phone' => $session?->visitor_phone,
            'page_url' => $session?->page_url,
            'ip_address' => $log->ip_address,
            'user_message' => $userMessage,
            'reply' => $reply,
            'operator_name' => $meta['operator_name'] ?? null,
            'reply_to_log_id' => isset($meta['reply_to_log_id']) ? (int) $meta['reply_to_log_id'] : null,
            'rating' => isset($meta['rating']) ? (int) $meta['rating'] : null,
            'pending_operator' => (bool) ($meta['pending_operator'] ?? false),
            'low_rating_followup' => (bool) ($meta['low_rating_followup'] ?? false),
            'rated_stars' => isset($meta['rated_stars']) ? (int) $meta['rated_stars'] : null,
            'has_error' => (bool) ($meta['error'] ?? false),
            'error_code' => isset($meta['code']) ? (string) $meta['code'] : null,
            'created_at' => $log->created_at?->toIso8601String(),
        ];
    }

    /**
     * @return array{data: list<array<string, mixed>>, meta: array<string, int>}
     */
    public function adminLogs(Request $request): array
    {
        $perPage = min(50, max(10, (int) $request->query('per_page', 20)));
        $search = trim((string) $request->query('q', ''));

        $query = ChatbotLog::query()
            ->where('question', '!=', '—')
            ->orderByDesc('created_at');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('question', 'like', "%{$search}%")
                    ->orWhere('answer', 'like', "%{$search}%")
                    ->orWhere('session_id', 'like', "%{$search}%");
            });
        }

        $paginator = $query->paginate($perPage);

        return [
            'data' => $paginator->getCollection()->map(fn (ChatbotLog $log) => [
                'id' => $log->id,
                'session_id' => $log->session_id,
                'ip_address' => $log->ip_address,
                'question' => $log->question,
                'answer' => $log->answer,
                'metadata' => $log->metadata,
                'created_at' => $log->created_at?->toIso8601String(),
            ])->values()->all(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];
    }

    /**
     * @param  list<string>  $sessionIds
     */
    public function deleteSessions(array $sessionIds): int
    {
        $ids = array_values(array_unique(array_filter(array_map('strval', $sessionIds))));
        if ($ids === []) {
            return 0;
        }

        ChatbotLog::query()->whereIn('session_id', $ids)->delete();

        return ChatbotSession::query()->whereIn('session_id', $ids)->delete();
    }

    /** Permanently remove conversations older than the retention window. */
    public function purgeExpiredConversations(?int $days = null): int
    {
        $days = max(1, $days ?? (int) config('bahram.chatbot.retention_days', 60));
        $cutoff = now()->subDays($days);

        $sessionIds = ChatbotSession::query()
            ->where(function ($q) use ($cutoff) {
                $q->where('last_activity_at', '<', $cutoff)
                    ->orWhere(function ($q2) use ($cutoff) {
                        $q2->whereNull('last_activity_at')->where('updated_at', '<', $cutoff);
                    });
            })
            ->pluck('session_id')
            ->all();

        $deleted = 0;
        if ($sessionIds !== []) {
            $deleted = $this->deleteSessions($sessionIds);
        }

        // Orphan message logs (no session row or stale session_open-only rows).
        ChatbotLog::query()
            ->where('created_at', '<', $cutoff)
            ->delete();

        return $deleted;
    }

    /** Public legacy API — AI/fallback reply stored in chat_conversations / chat_messages. */
    public function reply(ChatConversation $conversation, string $message): ChatMessage
    {
        $settings = ChatbotSetting::current();

        ChatMessage::query()->create([
            'conversation_id' => $conversation->id,
            'sender' => 'user',
            'message' => $message,
        ]);

        if (filled($conversation->phone)) {
            app(LeadService::class)->create([
                'name' => $conversation->name,
                'phone' => $conversation->phone,
                'source' => 'chatbot',
                'message' => $message,
            ]);
        }

        $replyText = $this->resolveLegacyPublicReply($settings, $conversation);

        return ChatMessage::query()->create([
            'conversation_id' => $conversation->id,
            'sender' => 'bot',
            'message' => $replyText,
        ]);
    }

    private function resolveLegacyPublicReply(ChatbotSetting $settings, ChatConversation $conversation): string
    {
        $fallback = trim((string) ($settings->fallback_message ?? ''))
            ?: 'در حال حاضر امکان پاسخ‌گویی وجود ندارد.';

        if (! $settings->is_enabled) {
            return $fallback;
        }

        $ai = app(AIService::class);
        if (! $ai->isConfigured()) {
            return $fallback;
        }

        try {
            $system = trim((string) ($settings->system_prompt ?? ''))
                ?: 'You are a helpful Persian-speaking assistant for Bahram Academy.';

            $history = $conversation->messages()->orderBy('id')->get();
            $messages = [['role' => 'system', 'content' => $system]];

            foreach ($history as $row) {
                $messages[] = [
                    'role' => $row->sender === 'user' ? 'user' : 'assistant',
                    'content' => (string) $row->message,
                ];
            }

            return $ai->chat($messages);
        } catch (AiServiceException) {
            return $fallback;
        }
    }

    private function isRateableLog(ChatbotLog $log): bool
    {
        $meta = is_array($log->metadata) ? $log->metadata : [];

        if (($meta['event'] ?? null) === 'operator_reply') {
            return trim((string) $log->answer) !== '' && trim((string) $log->answer) !== '—';
        }

        return $log->question !== '—' && trim((string) $log->answer) !== '';
    }
}
