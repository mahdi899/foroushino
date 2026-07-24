<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Minishlink\WebPush\VAPID;

class GenerateWebPushVapidKeys extends Command
{
    protected $signature = 'webpush:vapid';

    protected $description = 'Generate VAPID key pair for Family PWA Web Push';

    public function handle(): int
    {
        try {
            $keys = VAPID::createVapidKeys();
        } catch (\Throwable $e) {
            $this->error('OpenSSL could not create VAPID keys on this machine: '.$e->getMessage());
            $this->newLine();
            $this->line('Alternative (from frontend folder):');
            $this->line('  npx web-push generate-vapid-keys');
            $this->line('Then set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY.');

            return self::FAILURE;
        }

        $this->info('Add these to backend/.env and frontend/.env.local:');
        $this->newLine();
        $this->line('VAPID_SUBJECT='.(config('app.url') ?: 'mailto:admin@example.com'));
        $this->line('VAPID_PUBLIC_KEY='.$keys['publicKey']);
        $this->line('VAPID_PRIVATE_KEY='.$keys['privateKey']);
        $this->newLine();
        $this->line('NEXT_PUBLIC_VAPID_PUBLIC_KEY='.$keys['publicKey']);

        return self::SUCCESS;
    }
}
