<?php

namespace Tests\Unit;

use App\Support\SsrfGuard;
use PHPUnit\Framework\TestCase;

class SsrfGuardTest extends TestCase
{
    public function test_telegram_allows_custom_https_proxy_base_url(): void
    {
        $url = 'https://aged-queen-5071-fashio.ehsanghodratiofficial.workers.dev/?url=https://api.telegram.org';

        $this->assertNull(SsrfGuard::validateProviderBaseUrl('telegram', $url));
    }

    public function test_telegram_rejects_private_base_url(): void
    {
        $this->assertNotNull(SsrfGuard::validateProviderBaseUrl('telegram', 'https://127.0.0.1'));
    }

    public function test_other_providers_still_use_allowlist(): void
    {
        $this->assertNotNull(
            SsrfGuard::validateProviderBaseUrl('bale', 'https://evil.example.com'),
        );
    }
}
