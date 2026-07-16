<?php

namespace Tests\Unit\Telegram;

use App\Modules\TelegramBot\Services\IranMobileNormalizer;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class IranMobileNormalizerTest extends TestCase
{
    private IranMobileNormalizer $normalizer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->normalizer = new IranMobileNormalizer;
    }

    #[DataProvider('validMobilesProvider')]
    public function test_normalizes_valid_mobiles(string $input, string $expected): void
    {
        $this->assertSame($expected, $this->normalizer->normalize($input));
    }

    #[DataProvider('invalidMobilesProvider')]
    public function test_rejects_invalid_mobiles(?string $input): void
    {
        $this->assertNull($this->normalizer->normalize($input));
    }

    public static function validMobilesProvider(): array
    {
        return [
            ['09121234567', '09121234567'],
            ['9121234567', '09121234567'],
            ['989121234567', '09121234567'],
            ['+98 912 123 4567', '09121234567'],
        ];
    }

    public static function invalidMobilesProvider(): array
    {
        return [
            [null],
            [''],
            ['08121234567'],
            ['09121'],
            ['not-a-phone'],
        ];
    }
}
