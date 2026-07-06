<?php

namespace Tests\Feature;

use App\Models\AiSetting;
use App\Models\ChatbotSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ChatbotTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_settings_endpoint_exposes_only_public_fields(): void
    {
        ChatbotSetting::current()->update([
            'is_enabled' => true,
            'bot_name' => 'دستیار تست',
            'welcome_message' => 'سلام!',
        ]);

        $response = $this->getJson('/api/chatbot/settings');

        $response->assertOk();
        $response->assertJson([
            'data' => [
                'is_enabled' => true,
                'bot_name' => 'دستیار تست',
                'welcome_message' => 'سلام!',
            ],
        ]);
        $response->assertJsonMissingPath('data.system_prompt');
    }

    public function test_message_returns_ai_reply_when_configured(): void
    {
        ChatbotSetting::current()->update(['is_enabled' => true]);
        AiSetting::current()->update(['is_active' => true, 'api_key' => 'test-key']);

        Http::fake([
            'api.openai.com/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => 'سلام! چطور می‌توانم کمکتان کنم؟']],
                ],
            ], 200),
        ]);

        $response = $this->postJson('/api/chatbot/message', [
            'session_id' => 'sess-ai-1',
            'message' => 'سلام',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.reply', 'سلام! چطور می‌توانم کمکتان کنم؟');

        $this->assertDatabaseHas('chat_conversations', ['session_id' => 'sess-ai-1']);
        $this->assertDatabaseCount('chat_messages', 2);
    }

    public function test_message_falls_back_gracefully_when_ai_is_not_configured(): void
    {
        ChatbotSetting::current()->update([
            'is_enabled' => true,
            'fallback_message' => 'در حال حاضر امکان پاسخ‌گویی وجود ندارد.',
        ]);
        // AiSetting left inactive/unconfigured on purpose.

        $response = $this->postJson('/api/chatbot/message', [
            'session_id' => 'sess-fallback-1',
            'message' => 'سلام، هزینه دوره چقدر است؟',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.reply', 'در حال حاضر امکان پاسخ‌گویی وجود ندارد.');
    }

    public function test_message_with_phone_captures_a_lead(): void
    {
        ChatbotSetting::current()->update(['is_enabled' => false]);

        $response = $this->postJson('/api/chatbot/message', [
            'session_id' => 'sess-lead-1',
            'message' => 'لطفا با من تماس بگیرید',
            'name' => 'سارا',
            'phone' => '09129998877',
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('leads', [
            'source' => 'chatbot',
            'phone' => '09129998877',
            'name' => 'سارا',
        ]);
    }

    public function test_message_requires_session_id_and_message(): void
    {
        $response = $this->postJson('/api/chatbot/message', []);

        $response->assertUnprocessable();
        $response->assertJsonPath('error.code', 'validation_error');
        $response->assertJsonStructure(['error' => ['details' => ['session_id', 'message']]]);
    }
}
