<?php

namespace Tests\Unit\Support;

use App\Support\AesGcmCipher;
use PHPUnit\Framework\TestCase;

class AesGcmCipherTest extends TestCase
{
    public function test_encrypt_then_decrypt_round_trips(): void
    {
        $key = AesGcmCipher::generateKey();
        $plaintext = json_encode(['mobile' => '09120000000', 'code' => '12345']);

        $encrypted = AesGcmCipher::encrypt($plaintext, $key);

        $this->assertNotSame($plaintext, $encrypted);
        $this->assertSame($plaintext, AesGcmCipher::decrypt($encrypted, $key));
    }

    public function test_decrypt_fails_with_wrong_key(): void
    {
        $encrypted = AesGcmCipher::encrypt('secret data', AesGcmCipher::generateKey());

        $this->assertNull(AesGcmCipher::decrypt($encrypted, AesGcmCipher::generateKey()));
    }

    public function test_decrypt_rejects_tampered_payload(): void
    {
        $key = AesGcmCipher::generateKey();
        $encrypted = AesGcmCipher::encrypt('secret data', $key);

        $raw = base64_decode($encrypted, true);
        $raw[strlen($raw) - 1] = $raw[strlen($raw) - 1] === "\0" ? "\x01" : "\0";
        $tampered = base64_encode($raw);

        $this->assertNull(AesGcmCipher::decrypt($tampered, $key));
    }

    public function test_generate_key_produces_valid_base64_32_bytes(): void
    {
        $key = AesGcmCipher::generateKey();

        $this->assertSame(32, strlen(base64_decode($key, true)));
    }
}
