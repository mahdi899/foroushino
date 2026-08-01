<?php

namespace App\Modules\TelegramBot\Models;

use App\Modules\TelegramBot\Enums\BotFeatureFlag;
use App\Modules\TelegramBot\Enums\TelegramBotEnvironment;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Crypt;

class TelegramBot extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'display_name',
        'username',
        'token_key',
        'webhook_secret',
        'environment',
        'is_active',
        'support_group_chat_id',
        'reports_chat_id',
        'reports_topic_id',
        'settings',
    ];

    protected $hidden = [
        'webhook_secret',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'environment' => TelegramBotEnvironment::class,
            'settings' => 'array',
        ];
    }

    public function updates(): HasMany
    {
        return $this->hasMany(TelegramUpdate::class);
    }

    public function accounts(): HasMany
    {
        return $this->hasMany(TelegramAccount::class);
    }

    public function requiredChats(): HasMany
    {
        return $this->hasMany(TelegramRequiredChat::class);
    }

    /**
     * Resolve the bot token. Prefer panel/legacy storage, then values baked into
     * `config:cache` (`telegram_bot.bots.*.token`), then process env.
     * Never rely on runtime `env()` alone — it is null after `config:cache`.
     */
    public function resolveToken(): ?string
    {
        $fromPanel = $this->panelToken();
        if (filled($fromPanel)) {
            return $fromPanel;
        }

        if ($this->key === 'production') {
            $legacy = app(\App\Services\TelegramInfrastructureService::class)->legacyBotToken();
            if (filled($legacy)) {
                return $legacy;
            }
        }

        $fromConfig = config('telegram_bot.bots.'.$this->key.'.token');
        if (filled($fromConfig)) {
            return (string) $fromConfig;
        }

        if (blank($this->token_key)) {
            return null;
        }

        $value = $_ENV[$this->token_key]
            ?? $_SERVER[$this->token_key]
            ?? (getenv($this->token_key) ?: null)
            ?? env($this->token_key);

        return filled($value) ? (string) $value : null;
    }

    public function panelToken(): ?string
    {
        $encrypted = trim((string) data_get($this->settings, 'panel_token_encrypted', ''));
        if ($encrypted === '') {
            return null;
        }

        try {
            return Crypt::decryptString($encrypted);
        } catch (\Throwable) {
            return null;
        }
    }

    public function setPanelToken(string $token): void
    {
        $settings = (array) ($this->settings ?? []);
        $settings['panel_token_encrypted'] = Crypt::encryptString(trim($token));
        $this->forceFill(['settings' => $settings])->save();
    }

    /**
     * Resolve @username from Telegram API (getMe) and persist it for deep links.
     */
    public function syncIdentityFromTelegramApi(): bool
    {
        if (! filled($this->resolveToken())) {
            return false;
        }

        try {
            $client = app(\App\Modules\TelegramBot\Clients\TelegramBotClientFactory::class)->forBot($this);
            $me = $client->getMe();
            $username = ltrim((string) ($me['username'] ?? ''), '@');
            $updates = [];
            if ($username !== '' && $this->username !== $username) {
                $updates['username'] = $username;
            }
            $firstName = trim((string) ($me['first_name'] ?? ''));
            if ($firstName !== '' && blank($this->display_name)) {
                $updates['display_name'] = $firstName;
            }
            if ($updates !== []) {
                $this->update($updates);
            }

            return $username !== '';
        } catch (\Throwable) {
            return false;
        }
    }

    public function publicDeepLink(?string $startPayload = null): ?string
    {
        $username = ltrim(trim((string) $this->username), '@');
        if ($username === '' && filled($this->resolveToken())) {
            $this->syncIdentityFromTelegramApi();
            $this->refresh();
            $username = ltrim(trim((string) $this->username), '@');
        }
        if ($username === '') {
            return \App\Modules\TelegramBot\Support\TelegramSiteUrl::botStartDeepLink($startPayload);
        }

        $url = 'https://t.me/'.$username;
        $payload = trim((string) $startPayload);
        if ($payload !== '') {
            $url .= '?start='.rawurlencode($payload);
        }

        return $url;
    }

    public function panelTokenPreview(): ?string
    {
        $token = $this->panelToken();
        if ($token === null) {
            return null;
        }

        if (strlen($token) <= 8) {
            return '••••';
        }

        return substr($token, 0, 4).'…'.substr($token, -4);
    }

    /**
     * Webhook secret used for X-Telegram-Bot-Api-Secret-Token validation.
     * Production reads panel infrastructure settings first (same source as setWebhook).
     */
    public function resolveWebhookSecret(): ?string
    {
        if ($this->key === 'production') {
            $fromInfra = app(\App\Services\TelegramInfrastructureService::class)->webhookSecret();
            if (filled($fromInfra)) {
                return $fromInfra;
            }
        }

        $column = trim((string) ($this->webhook_secret ?? ''));

        return $column !== '' ? $column : null;
    }

    public function isProduction(): bool
    {
        return $this->environment === TelegramBotEnvironment::Production;
    }

    public function featureEnabled(BotFeatureFlag|string $flag): bool
    {
        $key = $flag instanceof BotFeatureFlag ? $flag->value : $flag;
        $enum = $flag instanceof BotFeatureFlag ? $flag : BotFeatureFlag::tryFrom($key);
        if ($enum === null) {
            return false;
        }

        $stored = data_get($this->settings, 'features.'.$enum->value);

        if ($stored === null && $enum === BotFeatureFlag::SupportEnabled) {
            $legacy = data_get($this->settings, 'features.support_requires_subscription');
            if ($legacy !== null) {
                return (bool) $legacy;
            }
        }

        if ($stored === null) {
            return $enum->defaultEnabled();
        }

        return (bool) $stored;
    }

    public function toggleFeature(BotFeatureFlag $flag): bool
    {
        $settings = (array) ($this->settings ?? []);
        $features = (array) ($settings['features'] ?? []);
        $next = ! $this->featureEnabled($flag);
        $features[$flag->value] = $next;
        $settings['features'] = $features;
        $this->forceFill(['settings' => $settings])->save();

        return $next;
    }

    public function setFeatureEnabled(BotFeatureFlag $flag, bool $enabled): void
    {
        $settings = (array) ($this->settings ?? []);
        $features = (array) ($settings['features'] ?? []);
        $features[$flag->value] = $enabled;
        $settings['features'] = $features;
        $this->forceFill(['settings' => $settings])->save();
    }

    /**
     * @return array{
     *     card_number: string,
     *     card_holder: string,
     *     bank_name: string,
     *     notes: string,
     *     override_text: string
     * }
     */
    public function cardToCardConfig(): array
    {
        $config = [
            'card_number' => trim((string) data_get($this->settings, 'card_to_card.card_number', '')),
            'card_holder' => trim((string) data_get($this->settings, 'card_to_card.card_holder', '')),
            'bank_name' => trim((string) data_get($this->settings, 'card_to_card.bank_name', '')),
            'notes' => trim((string) data_get($this->settings, 'card_to_card.notes', '')),
            'override_text' => trim((string) data_get($this->settings, 'card_to_card_text', '')),
        ];

        if ($config['override_text'] !== '' && $config['card_number'] === '') {
            $parsed = self::parseCardToCardFreeText($config['override_text']);
            foreach (['card_number', 'card_holder', 'bank_name'] as $key) {
                if ($config[$key] === '' && isset($parsed[$key])) {
                    $config[$key] = $parsed[$key];
                }
            }
        }

        return $config;
    }

    public function hasCardToCardDetails(): bool
    {
        $config = $this->cardToCardConfig();

        return $config['override_text'] !== '' || $config['card_number'] !== '';
    }

    /**
     * Preview card-to-card config after applying unsaved admin form fields.
     *
     * @param  array{
     *     card_number?: string|null,
     *     card_holder?: string|null,
     *     bank_name?: string|null,
     *     notes?: string|null,
     *     override_text?: string|null
     * }  $fields
     * @return array{
     *     card_number: string,
     *     card_holder: string,
     *     bank_name: string,
     *     notes: string,
     *     override_text: string
     * }
     */
    public function previewCardToCardConfig(array $fields): array
    {
        $config = $this->cardToCardConfig();

        foreach (['card_number', 'card_holder', 'bank_name', 'notes'] as $key) {
            if (! array_key_exists($key, $fields)) {
                continue;
            }
            $config[$key] = trim((string) ($fields[$key] ?? ''));
        }

        if (array_key_exists('override_text', $fields)) {
            $config['override_text'] = trim((string) ($fields['override_text'] ?? ''));
            if ($config['override_text'] !== '' && $config['card_number'] === '') {
                $parsed = self::parseCardToCardFreeText($config['override_text']);
                foreach (['card_number', 'card_holder', 'bank_name'] as $key) {
                    if ($config[$key] === '' && isset($parsed[$key])) {
                        $config[$key] = $parsed[$key];
                    }
                }
            }
        }

        return $config;
    }

    public static function configHasCardToCardDetails(array $config): bool
    {
        return trim((string) ($config['override_text'] ?? '')) !== ''
            || trim((string) ($config['card_number'] ?? '')) !== '';
    }

    public function cardToCardReady(): bool
    {
        return $this->featureEnabled(BotFeatureFlag::CardToCardPayment) && $this->hasCardToCardDetails();
    }

    public function cardToCardInstructions(): string
    {
        $config = $this->cardToCardConfig();
        if ($config['override_text'] !== '') {
            return $config['override_text'];
        }

        if ($config['card_number'] === '') {
            return "لطفاً مبلغ سفارش را کارت‌به‌کارت واریز کنید.\n"
                ."سپس عکس واضح رسید واریز را همین‌جا در ربات ارسال کنید تا ادمین بررسی کند.\n"
                .'اطلاعات کارت هنوز در تنظیمات ربات ثبت نشده — از پنل ادمین تلگرام تکمیل کنید.';
        }

        $lines = ['مبلغ سفارش را به کارت زیر واریز کنید:'];
        $lines[] = 'شماره کارت: '.$config['card_number'];
        if ($config['card_holder'] !== '') {
            $lines[] = 'به‌نام: '.$config['card_holder'];
        }
        if ($config['bank_name'] !== '') {
            $lines[] = 'بانک: '.$config['bank_name'];
        }
        if ($config['notes'] !== '') {
            $lines[] = $config['notes'];
        }

        return implode("\n", $lines);
    }

    public function setCardToCardInstructions(string $text): void
    {
        $body = mb_substr(trim($text), 0, 1000);
        $settings = (array) ($this->settings ?? []);
        $settings['card_to_card_text'] = $body;

        $parsed = self::parseCardToCardFreeText($body);
        if ($parsed !== []) {
            $settings['card_to_card'] = array_merge((array) ($settings['card_to_card'] ?? []), $parsed);
        }

        $this->forceFill(['settings' => $settings])->save();
    }

    /**
     * Best-effort parse of free-form card-to-card text (from bot admin panel)
     * into structured fields for the web settings form.
     *
     * @return array{card_number?: string, card_holder?: string, bank_name?: string}
     */
    public static function parseCardToCardFreeText(string $text): array
    {
        $text = self::normalizeCardToCardInputText($text);
        $parsed = [];

        if (preg_match('/(?:شماره\s*کارت|کارت)\s*[:：]?\s*([\d][\d\s\-]{14,22}\d)/u', $text, $match) === 1
            || preg_match('/\b(\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4})\b/u', $text, $match) === 1) {
            $digits = preg_replace('/\D+/', '', $match[1]);
            if (strlen($digits) === 16) {
                $parsed['card_number'] = $digits;
            }
        }

        if (! isset($parsed['card_number'])
            && preg_match('/(?<!\d)(\d[\d\s\-]{14,22}\d)(?!\d)/u', $text, $match) === 1) {
            $digits = preg_replace('/\D+/', '', $match[1]);
            if (strlen($digits) === 16) {
                $parsed['card_number'] = $digits;
            }
        }

        if (preg_match('/(?:به[\s\x{200c}\-]*نام|صاحب\s*کارت|به\s*نام)\s*[:：]\s*(.+)/u', $text, $match) === 1) {
            $holder = trim(preg_replace('/\s{2,}.*/u', '', trim($match[1])) ?? '');
            if ($holder !== '') {
                $parsed['card_holder'] = mb_substr($holder, 0, 64);
            }
        }

        if (preg_match('/بانک\s*[:：]\s*(.+)/u', $text, $match) === 1) {
            $bank = trim(preg_replace('/\s{2,}.*/u', '', trim($match[1])) ?? '');
            if ($bank !== '') {
                $parsed['bank_name'] = mb_substr($bank, 0, 64);
            }
        }

        return $parsed;
    }

    private static function normalizeCardToCardInputText(string $text): string
    {
        $persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        $latin = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        $arabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

        return str_replace($persian, $latin, str_replace($arabic, $latin, $text));
    }

    /**
     * @param  array{
     *     card_number?: string|null,
     *     card_holder?: string|null,
     *     bank_name?: string|null,
     *     notes?: string|null,
     *     override_text?: string|null
     * }  $fields
     */
    public function setCardToCardSettings(?bool $enabled, array $fields = []): void
    {
        $settings = (array) ($this->settings ?? []);
        $features = (array) ($settings['features'] ?? []);
        $c2c = (array) ($settings['card_to_card'] ?? []);

        if ($enabled !== null) {
            $features[BotFeatureFlag::CardToCardPayment->value] = $enabled;
            $settings['features'] = $features;
        }

        foreach (['card_number', 'card_holder', 'bank_name', 'notes'] as $key) {
            if (! array_key_exists($key, $fields)) {
                continue;
            }
            $value = trim((string) ($fields[$key] ?? ''));
            if ($value === '') {
                unset($c2c[$key]);
            } else {
                $max = $key === 'notes' ? 500 : 64;
                $c2c[$key] = mb_substr($value, 0, $max);
            }
        }

        $settings['card_to_card'] = $c2c;

        if (array_key_exists('override_text', $fields)) {
            $override = trim((string) ($fields['override_text'] ?? ''));
            if ($override === '') {
                unset($settings['card_to_card_text']);
            } else {
                $settings['card_to_card_text'] = mb_substr($override, 0, 1000);
                $parsed = self::parseCardToCardFreeText($override);
                if ($parsed !== []) {
                    $c2c = array_merge($c2c, $parsed);
                    $settings['card_to_card'] = $c2c;
                }
            }
        }

        $this->forceFill(['settings' => $settings])->save();
    }

    /**
     * Chat ID of the reports/support group where user tickets are mirrored.
     */
    public function reportsGroupChatId(): ?string
    {
        $fromSettings = data_get($this->settings, 'reports_group_chat_id')
            ?? data_get($this->settings, 'support_group_chat_id');

        if (filled($fromSettings)) {
            return (string) $fromSettings;
        }

        if (filled($this->support_group_chat_id)) {
            return (string) $this->support_group_chat_id;
        }

        if (filled($this->reports_chat_id)) {
            return (string) $this->reports_chat_id;
        }

        return null;
    }

    public function setReportsGroupChatId(?string $chatId): void
    {
        $settings = (array) ($this->settings ?? []);
        $normalized = filled($chatId) ? (string) $chatId : null;

        if ($normalized !== null) {
            $settings['reports_group_chat_id'] = $normalized;
        } else {
            unset($settings['reports_group_chat_id'], $settings['support_group_chat_id']);
        }

        $this->forceFill([
            'settings' => $settings,
            'support_group_chat_id' => $normalized,
            'reports_chat_id' => $normalized,
        ])->save();
    }

    /**
     * Channel/group for payment reports (C2C review + successful payments).
     */
    public function paymentReportsChatId(): ?string
    {
        $value = data_get($this->settings, 'payment_reports_chat_id');

        return filled($value) ? (string) $value : null;
    }

    public function setPaymentReportsChatId(?string $chatId): void
    {
        $settings = (array) ($this->settings ?? []);
        if (filled($chatId)) {
            $settings['payment_reports_chat_id'] = (string) $chatId;
        } else {
            unset($settings['payment_reports_chat_id']);
        }
        $this->forceFill(['settings' => $settings])->save();
    }
}
