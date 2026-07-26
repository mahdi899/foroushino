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

    public function test_decrypt_legacy_wire_format_when_iv_starts_with_flag_byte(): void
    {
        $key = AesGcmCipher::generateKey();
        $plaintext = 'legacy host sync payload';
        $rawKey = base64_decode($key, true);

        foreach (["\x00", "\x01"] as $firstIvByte) {
            $iv = $firstIvByte.random_bytes(11);
            $tag = '';
            $ciphertext = openssl_encrypt(
                $plaintext,
                'aes-256-gcm',
                $rawKey,
                OPENSSL_RAW_DATA,
                $iv,
                $tag,
                '',
                16,
            );
            $legacy = base64_encode($iv.$tag.$ciphertext);

            $this->assertSame($plaintext, AesGcmCipher::decrypt($legacy, $key));
        }
    }

    public function test_encrypt_deflates_large_payloads(): void
    {
        $key = AesGcmCipher::generateKey();
        $plaintext = str_repeat('{"k":"v"}', 200);

        $encrypted = AesGcmCipher::encrypt($plaintext, $key);
        $raw = base64_decode($encrypted, true);

        $this->assertSame("\x01", $raw[0]);
        $this->assertSame($plaintext, AesGcmCipher::decrypt($encrypted, $key));
    }
}
