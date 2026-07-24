<?php

namespace App\Services;

use App\Models\PushSubscription;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\MessageSentReport;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class WebPushSender
{
    private ?WebPush $client = null;

    public function isConfigured(): bool
    {
        $public = (string) config('webpush.vapid.public_key', '');
        $private = (string) config('webpush.vapid.private_key', '');

        return $public !== '' && $private !== '';
    }

    public function publicKey(): ?string
    {
        $key = (string) config('webpush.vapid.public_key', '');

        return $key !== '' ? $key : null;
    }

    /**
     * @param  array{title: string, body: string, url?: string, tag?: string, badge?: int}  $payload
     */
    public function send(PushSubscription $subscription, array $payload): bool
    {
        if (! $this->isConfigured()) {
            return false;
        }

        try {
            $report = $this->client()->sendOneNotification(
                Subscription::create([
                    'endpoint' => $subscription->endpoint,
                    'publicKey' => $subscription->public_key,
                    'authToken' => $subscription->auth_token,
                    'contentEncoding' => $subscription->content_encoding ?: 'aesgcm',
                ]),
                json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                ['TTL' => 86_400],
            );

            return $this->handleReport($subscription, $report);
        } catch (\Throwable $e) {
            Log::warning('webpush.send_failed', [
                'subscription_id' => $subscription->id,
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }

    private function client(): WebPush
    {
        if ($this->client) {
            return $this->client;
        }

        $this->client = new WebPush([
            'VAPID' => [
                'subject' => (string) config('webpush.vapid.subject'),
                'publicKey' => (string) config('webpush.vapid.public_key'),
                'privateKey' => (string) config('webpush.vapid.private_key'),
            ],
        ]);

        return $this->client;
    }

    private function handleReport(PushSubscription $subscription, MessageSentReport $report): bool
    {
        if ($report->isSuccess()) {
            $subscription->forceFill(['last_notified_at' => now()])->save();

            return true;
        }

        $code = $report->getResponse()?->getStatusCode();
        if (in_array($code, [404, 410], true)) {
            $subscription->delete();
        } else {
            Log::info('webpush.rejected', [
                'subscription_id' => $subscription->id,
                'reason' => $report->getReason(),
                'status' => $code,
            ]);
        }

        return false;
    }
}
