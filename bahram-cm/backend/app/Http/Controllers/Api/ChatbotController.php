<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ChatbotMessageRequest;
use App\Models\ChatbotSetting;
use App\Models\ChatConversation;
use App\Services\ChatbotService;
use App\Support\ApiResponse;

class ChatbotController extends Controller
{
    public function __construct(private readonly ChatbotService $chatbot) {}

    public function settings()
    {
        $settings = ChatbotSetting::current();

        return ApiResponse::success([
            'is_enabled' => (bool) $settings->is_enabled,
            'bot_name' => $settings->bot_name,
            'welcome_message' => $settings->welcome_message,
            'collect_name_enabled' => (bool) $settings->collect_name_enabled,
            'collect_phone_enabled' => (bool) $settings->collect_phone_enabled,
        ]);
    }

    public function message(ChatbotMessageRequest $request)
    {
        $data = $request->validated();

        $conversation = ChatConversation::query()->firstOrCreate(
            ['session_id' => $data['session_id']],
            ['status' => 'open']
        );

        $conversation->fill(array_filter([
            'name' => $data['name'] ?? null,
            'phone' => $data['phone'] ?? null,
        ]));

        if ($conversation->isDirty()) {
            $conversation->save();
        }

        $reply = $this->chatbot->reply($conversation, $data['message']);

        return ApiResponse::success([
            'session_id' => $conversation->session_id,
            'reply' => $reply->message,
        ]);
    }
}
