<?php

namespace Tests\Unit\Telegram;

use App\Modules\TelegramBot\Services\DisplayNameValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DisplayNameValidatorTest extends TestCase
{
    private DisplayNameValidator $validator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->validator = new DisplayNameValidator;
    }

    #[DataProvider('validNamesProvider')]
    public function test_accepts_valid_names(string $name): void
    {
        $this->assertTrue($this->validator->validate($name));
    }

    #[DataProvider('invalidNamesProvider')]
    public function test_rejects_invalid_names(?string $name): void
    {
        $this->assertFalse($this->validator->validate($name));
    }

    public function test_normalize_collapses_whitespace(): void
    {
        $this->assertSame('علی رضایی', $this->validator->normalize('  علی   رضایی  '));
    }

    public static function validNamesProvider(): array
    {
        return [
            ['علی'],
            ['Ali Reza'],
            ['مریم-احمدی'],
        ];
    }

    public static function invalidNamesProvider(): array
    {
        return [
            [null],
            [''],
            ['A'],
            ['Ali123'],
            ['https://spam.test'],
            ['😀'],
        ];
    }
}
