<?php

namespace App\Services;

/** Tracks failed Iran → external-host push so the scheduler can retry. */
class TelegramHostPushState
{
    public const GROUP = 'telegram';

    public const KEY = 'host_push_pending_action';

    public function __construct(private readonly SettingService $settings) {}

    public function markPending(string $action): void
    {
        $group = $this->settings->group(self::GROUP);
        $group[self::KEY] = $action;
        $this->settings->updateGroup(self::GROUP, $group);
    }

    public function clear(): void
    {
        $group = $this->settings->group(self::GROUP);
        unset($group[self::KEY]);
        $this->settings->updateGroup(self::GROUP, $group);
    }

    public function pendingAction(): ?string
    {
        $value = $this->settings->group(self::GROUP)[self::KEY] ?? null;

        return is_string($value) && $value !== '' ? $value : null;
    }
}
