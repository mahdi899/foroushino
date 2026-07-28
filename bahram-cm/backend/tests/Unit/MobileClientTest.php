<?php

namespace Tests\Unit;

use App\Support\MobileClient;
use Illuminate\Http\Request;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class MobileClientTest extends TestCase
{
    #[DataProvider('phoneUserAgents')]
    public function test_detects_phone_user_agents(string $ua): void
    {
        $this->assertTrue(MobileClient::isPhone($ua));
    }

    #[DataProvider('desktopUserAgents')]
    public function test_rejects_desktop_user_agents(string $ua): void
    {
        $this->assertFalse(MobileClient::isPhone($ua));
    }

    public function test_request_user_agent_prefers_forwarded_header(): void
    {
        $request = Request::create('/api/v1/student/identity-verification/submit', 'POST');
        $request->headers->set('User-Agent', 'node');
        $request->headers->set(
            'X-Forwarded-User-Agent',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
        );

        $this->assertTrue(MobileClient::isPhone(MobileClient::requestUserAgent($request)));
        $this->assertNull(MobileClient::denyUnlessPhone($request));
    }

    public function test_deny_unless_phone_blocks_server_hop_without_forwarded_ua(): void
    {
        $request = Request::create('/api/v1/student/identity-verification/submit', 'POST');
        $request->headers->set('User-Agent', 'node');

        $response = MobileClient::denyUnlessPhone($request, MobileClient::SELFIE_MOBILE_ONLY_MESSAGE);

        $this->assertNotNull($response);
        $this->assertSame(403, $response->getStatusCode());
        $this->assertSame('mobile_only', $response->getData(true)['error']['code'] ?? null);
    }

    /** @return array<string, array{0: string}> */
    public static function phoneUserAgents(): array
    {
        return [
            'iphone' => ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'],
            'android_phone' => ['Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Mobile Safari/537.36'],
        ];
    }

    /** @return array<string, array{0: string}> */
    public static function desktopUserAgents(): array
    {
        return [
            'windows_chrome' => ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'],
            'mac_safari' => ['Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15'],
            'ipad' => ['Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15'],
            'node_fetch' => ['node'],
        ];
    }
}
