<?php

namespace Tests\Unit\Telegram;

require_once dirname(__DIR__, 4).'/../telegram/src/Support/MobileNormalizer.php';

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use TelegramHost\Support\MobileNormalizer;

class HostMobileNormalizerTest extends TestCase
{
    #[DataProvider('iranOnlyValidProvider')]
    public function test_iran_only_accepts_iranian_numbers(string $input, string $expected): void
    {
        $this->assertSame($expected, MobileNormalizer::normalizeForRegistration($input, true));
    }

    #[DataProvider('iranOnlyInvalidProvider')]
    public function test_iran_only_rejects_non_iranian_numbers(string $input): void
    {
        $this->assertNull(MobileNormalizer::normalizeForRegistration($input, true));
    }

    #[DataProvider('internationalValidProvider')]
    public function test_international_mode_accepts_broader_numbers(string $input, string $expected): void
    {
        $this->assertSame($expected, MobileNormalizer::normalizeForRegistration($input, false));
    }

    public static function iranOnlyValidProvider(): array
    {
        return [
            ['09121234567', '09121234567'],
            ['989121234567', '09121234567'],
        ];
    }

    public static function iranOnlyInvalidProvider(): array
    {
        return [
            ['+14155552671'],
            ['12345678'],
        ];
    }

    public static function internationalValidProvider(): array
    {
        return [
            ['09121234567', '09121234567'],
            ['+14155552671', '14155552671'],
        ];
    }
}
