<?php

namespace App\Listeners;

use App\Events\IdentityLevel2Approved;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\NotificationOutboxWriter;
use App\Modules\TelegramBot\Services\TelegramReferenceChannelPresenter;
use App\Services\ReferenceChannelAccessService;
use App\Services\TelegramHostAccountSync;
use App\Services\TelegramInfrastructureService;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * After expert KYC approval: push snapshot to the foreign Telegram host and
 * DM the student (identity approved + reference-channel invite when entitled).
 */
class NotifyIdentityApprovedTelegramListener
{
    public function __construct(
        private readonly TelegramHostAccountSync $hostSync,
        private readonly TelegramReferenceChannelPresenter $referencePresenter,
        private readonly ReferenceChannelAccessService $referenceAccess,
        private readonly TelegramInfrastructureService $infra,
        private readonly TelegramBotClientFactory $clients,
        private readonly NotificationOutboxWriter $outbox,
    ) {}

    public function handle(IdentityLevel2Approved $event): void
    {
        $user = $event->user;
        $usesHost = $this->infra->usesHostBridge();

        $accounts = TelegramAccount::query()
            ->where('user_id', $user->id)
            ->whereHas('bot', fn ($q) => $q->where('key', 'production'))
            ->with('bot')
            ->get();

        if ($accounts->isEmpty()) {
            if ($usesHost) {
                $this->hostSync->pushMobileAccessImmediate($user);
            } else {
                $this->hostSync->queuePushMobileAccess($user);
            }

            return;
        }

        $bot = TelegramBot::query()
            ->where('key', 'production')
            ->where('is_active', true)
            ->first();

        $channel = $this->referencePresenter->resolvePublishedChannel();
        $hasReferenceEntitlement = $channel !== null
            && $this->referenceAccess->userHasEntitlement($user, $channel);

        $delivered = false;

        foreach ($accounts as $account) {
            [$text, $notifyOptions] = $this->buildNotification($bot, $account, $channel, $hasReferenceEntitlement);

            if ($usesHost && $this->hostSync->pushPaidOrderNotification($account, $text, $notifyOptions)) {
                $delivered = true;

                continue;
            }

            if ($account->bot === null) {
                continue;
            }

            try {
                $this->clients->forBot($account->bot)->sendMessage(
                    (int) $account->telegram_user_id,
                    $text,
                    $notifyOptions,
                );
                $delivered = true;
            } catch (Throwable $e) {
                Log::channel('telegram')->warning('identity_approved_telegram_send_failed', [
                    'user_id' => $user->id,
                    'telegram_user_id' => $account->telegram_user_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        if (! $delivered) {
            try {
                $firstAccount = $accounts->first();
                [$text, $notifyOptions] = $this->buildNotification(
                    $bot,
                    $firstAccount,
                    $channel,
                    $hasReferenceEntitlement,
                );

                $this->outbox->write(
                    eventType: 'identity_approved',
                    userId: $user->id,
                    payload: [
                        'text' => $text,
                        'options' => $notifyOptions,
                    ],
                    channels: ['telegram'],
                    idempotencyKey: 'identity_approved:'.$user->id.':'.now()->format('Y-m-d'),
                );
            } catch (Throwable $e) {
                Log::channel('telegram')->warning('identity_approved_outbox_failed', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * @return array{0: string, 1: array<string, mixed>}
     */
    private function buildNotification(
        ?TelegramBot $bot,
        TelegramAccount $account,
        ?\App\Models\ReferenceChannel $channel,
        bool $hasReferenceEntitlement,
    ): array {
        $text = '✅ هویت شما تأیید شد.';
        $notifyOptions = [];

        if ($hasReferenceEntitlement && $bot !== null && $channel !== null) {
            $owned = $this->referencePresenter->presentOwned($bot, $account, $channel);
            $ownedText = trim((string) ($owned['text'] ?? ''));
            if ($ownedText !== '') {
                $text .= "\n\n".$ownedText;
            }

            $ownedOptions = (array) ($owned['options'] ?? []);
            if (isset($ownedOptions['reply_markup'])) {
                $notifyOptions['reply_markup'] = $ownedOptions['reply_markup'];
            }
            if (isset($ownedOptions['parse_mode'])) {
                $notifyOptions['parse_mode'] = $ownedOptions['parse_mode'];
            }
        }

        return [$text, $notifyOptions];
    }
}
