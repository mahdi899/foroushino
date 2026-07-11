<?php

namespace App\Events;

use App\Models\SatApplication;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SatApplicationAccepted
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly User $user,
        public readonly SatApplication $application,
    ) {}
}
