<?php

namespace App\Services\Messengers;

use App\Contracts\MessengerProviderContract;

class MessengerProviderRegistry
{
    public function __construct(
        private readonly BaleMessengerProvider $bale,
        private readonly RubikaMessengerProvider $rubika,
        private readonly EitaaMessengerProvider $eitaa,
    ) {}

    /** @return array<int, MessengerProviderContract> */
    public function all(): array
    {
        return [$this->bale, $this->rubika, $this->eitaa];
    }

    public function find(string $key): ?MessengerProviderContract
    {
        foreach ($this->all() as $provider) {
            if ($provider->key() === $key) {
                return $provider;
            }
        }

        return null;
    }
}
