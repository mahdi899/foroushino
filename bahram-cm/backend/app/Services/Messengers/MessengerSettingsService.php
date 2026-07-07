<?php

namespace App\Services\Messengers;

use App\Models\Setting;
use Illuminate\Support\Facades\Crypt;

/**
 * Reads/writes messenger provider credentials from the generic `settings`
 * table (group "messengers"), so no dedicated migration is needed per
 * provider. Tokens are encrypted before storage and decrypted on read.
 */
class MessengerSettingsService
{
    public function get(string $provider): array
    {
        $row = Setting::query()->where('group', 'messengers')->where('key', $provider)->first();
        $value = $row?->value ?? [];

        if (! empty($value['token_encrypted'])) {
            try {
                $value['token'] = Crypt::decryptString($value['token_encrypted']);
            } catch (\Throwable) {
                $value['token'] = null;
            }
        } else {
            $value['token'] = null;
        }

        return $value;
    }

    /**
     * @param  array{token?: ?string, is_active?: bool, chat_id?: ?string}  $data
     */
    public function put(string $provider, array $data): void
    {
        $stored = [
            'is_active' => (bool) ($data['is_active'] ?? false),
            'chat_id' => $data['chat_id'] ?? null,
        ];

        if (filled($data['token'] ?? null)) {
            $stored['token_encrypted'] = Crypt::encryptString($data['token']);
        }

        Setting::query()->updateOrCreate(
            ['group' => 'messengers', 'key' => $provider],
            ['value' => $stored]
        );
    }
}
