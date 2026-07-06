<?php

namespace App\Services;

use App\Models\ChatbotSetting;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\Lead;
use App\Services\Exceptions\AiServiceException;
use Illuminate\Support\Facades\Log;

/**
 * Drives the public chatbot widget: stores the conversation history, calls
 * the central AIService for a reply (falling back to a configured message on
 * any AI error), and captures a lead once contact details are known.
 */
class ChatbotService
{
    public function __construct(private readonly AIService $ai) {}

    public function reply(ChatConversation $conversation, string $userMessage): ChatMessage
    {
        ChatMessage::create([
            'conversation_id' => $conversation->id,
            'sender' => 'user',
            'message' => $userMessage,
        ]);

        $settings = ChatbotSetting::current();

        $replyText = $settings->is_enabled
            ? $this->generateAiReply($conversation, $settings)
            : ($settings->fallback_message ?: 'در حال حاضر گفتگوی آنلاین در دسترس نیست.');

        $this->captureLeadIfPossible($conversation, $userMessage);

        return ChatMessage::create([
            'conversation_id' => $conversation->id,
            'sender' => 'bot',
            'message' => $replyText,
        ]);
    }

    private function generateAiReply(ChatConversation $conversation, ChatbotSetting $settings): string
    {
        $history = $conversation->messages()
            ->orderBy('id')
            ->get(['sender', 'message'])
            ->map(fn (ChatMessage $message) => [
                'role' => $message->sender === 'user' ? 'user' : 'assistant',
                'content' => $message->message,
            ])
            ->all();

        $systemPrompt = $settings->system_prompt ?: 'شما دستیار پشتیبانی آنلاین سایت بهرام هستید. مودب، مختصر و مفید پاسخ بده.';

        if (filled($settings->response_structure)) {
            $systemPrompt .= "\n\nساختار پاسخ مورد انتظار: ".$settings->response_structure;
        }

        try {
            return $this->ai->chat([
                ['role' => 'system', 'content' => $systemPrompt],
                ...$history,
            ]);
        } catch (AiServiceException $e) {
            Log::channel('ai')->warning('Chatbot fell back to default message.', [
                'conversation_id' => $conversation->id,
                'message' => $e->getMessage(),
            ]);

            return $settings->fallback_message ?: 'در حال حاضر امکان پاسخگویی وجود ندارد. لطفاً بعداً دوباره تلاش کنید یا شماره تماس خود را ثبت کنید تا با شما تماس بگیریم.';
        }
    }

    private function captureLeadIfPossible(ChatConversation $conversation, string $lastMessage): void
    {
        if (blank($conversation->phone)) {
            return;
        }

        Lead::query()->firstOrCreate(
            ['source' => 'chatbot', 'phone' => $conversation->phone],
            [
                'name' => $conversation->name,
                'message' => $lastMessage,
                'status' => 'new',
                'meta' => ['conversation_id' => $conversation->id],
            ]
        );
    }
}
