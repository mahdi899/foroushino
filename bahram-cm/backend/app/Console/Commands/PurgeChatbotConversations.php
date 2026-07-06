<?php

namespace App\Console\Commands;

use App\Services\ChatbotService;
use Illuminate\Console\Command;

class PurgeChatbotConversations extends Command
{
    protected $signature = 'chatbot:purge-old {--days= : Override retention days}';

    protected $description = 'Permanently delete chatbot conversations older than the retention window (default 60 days)';

    public function handle(ChatbotService $chatbot): int
    {
        $days = $this->option('days');
        $retention = is_numeric($days) ? (int) $days : null;
        $count = $chatbot->purgeExpiredConversations($retention);
        $window = $retention ?? (int) config('bahram.chatbot.retention_days', 60);
        $this->info("Purged {$count} chatbot conversation(s) older than {$window} day(s).");

        return self::SUCCESS;
    }
}
