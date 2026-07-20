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
     * Resolve the actual bot token from the environment. The token itself is
     * never persisted in the database — only the name of the env var is
     * (`token_key`) — and it is read directly from the process environment
     * so it works whether or not config is cached.
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

        if (blank($this->token_key)) {
            return null;
        }

        $value = env($this->token_key);

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

    public function cardToCardInstructions(): string
    {
        $custom = trim((string) data_get($this->settings, 'card_to_card_text', ''));
        if ($custom !== '') {
            return $custom;
        }

        return "لطفاً مبلغ سفارش را کارت‌به‌کارت واریز کنید.\n"
            ."سپس عکس واضح رسید واریز را همین‌جا در ربات ارسال کنید تا ادمین بررسی کند.\n"
            .'اطلاعات کارت هنوز در تنظیمات ربات ثبت نشده — از «📝 متن کارت به کارت» در تنظیمات ادمین تکمیل کنید.';
    }

    public function setCardToCardInstructions(string $text): void
    {
        $settings = (array) ($this->settings ?? []);
        $settings['card_to_card_text'] = mb_substr(trim($text), 0, 1000);
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
