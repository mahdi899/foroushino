<?php

namespace App\Listeners;

use App\Actions\Identity\TryActivateSatMembership;
use App\Events\IdentityLevel2Approved;
use App\Events\SatApplicationAccepted;

class TryActivateSatMembershipListener
{
    public function __construct(private readonly TryActivateSatMembership $activate) {}

    public function handle(IdentityLevel2Approved|SatApplicationAccepted $event): void
    {
        ($this->activate)($event->user);
    }
}
