<?php

namespace App\Modules\TelegramBot\Http\Middleware;

use App\Services\TelegramInfrastructureService;
use App\Support\AesGcmCipher;
use App\Support\HmacSigner;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards the `telegram-host` sync API (external cPanel "host" app <-> this
 * server). Runs after `proxy.origin:presence` (Bearer + X-Proxy-Origin) and
 * adds:
 *   1) HMAC-SHA256 signature verification (anti-tamper/anti-replay), reusing
 *      the same wire format as `HmacSigner` (SAT sync).
 *   2) AES-256-GCM decryption of the request body (confidentiality), so the
 *      payload is opaque to anything sitting between the host and the server.
 *
 * Decrypted JSON is placed on `$request->attributes->get('host_payload')`.
 */
class VerifyTelegramHostSignature
{
    public function __construct(
        private readonly TelegramInfrastructureService $infrastructure,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $hmacSecret = $this->infrastructure->hostSyncSecret();
        $aesKey = $this->infrastructure->hostEncryptionKey();

        if (! $this->infrastructure->usesHostBridge() || $hmacSecret === null || $aesKey === null) {
            return $this->deny('host_bridge_not_configured');
        }

        $rawBody = (string) $request->getContent();
        $encryptedPayload = trim($rawBody);

        // The HMAC signs the raw (still-encrypted) body — the host never needs
        // the server to decrypt before verifying authenticity.
        $failure = HmacSigner::verify(
            ['body' => $encryptedPayload],
            $request->header((string) config('security.hmac.header_timestamp', 'X-Timestamp')),
            $request->header('X-Nonce'),
            $request->header((string) config('security.hmac.header_signature', 'X-Signature')),
            $hmacSecret,
        );

        if ($failure !== null) {
            return $this->deny($failure);
        }

        $nonce = (string) $request->header('X-Nonce');
        $timestamp = (string) $request->header((string) config('security.hmac.header_timestamp', 'X-Timestamp'));

        if (! HmacSigner::consumeNonce($nonce, $timestamp, 'telegram-host')) {
            return $this->deny('nonce_replayed');
        }

        $decrypted = $encryptedPayload !== '' ? AesGcmCipher::decrypt($encryptedPayload, $aesKey) : '{}';
        if ($decrypted === null) {
            return $this->deny('decrypt_failed');
        }

        $payload = json_decode($decrypted, true);
        $request->attributes->set('host_payload', is_array($payload) ? $payload : []);
        $request->attributes->set('host_aes_key', $aesKey);

        return $next($request);
    }

    private function deny(string $reason): Response
    {
        return response()->json([
            'error' => ['code' => 'host_signature_invalid', 'message' => $reason],
        ], 403);
    }
}
