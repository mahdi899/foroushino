<?php

namespace Tests\Unit;

use App\Support\MobileClient;
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
        ];
    }
}
