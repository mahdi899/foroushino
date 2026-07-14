<?php

namespace App\Actions\Family;

use App\Models\FamilyMembership;
use App\Models\User;
use App\Services\Family\EntryContext;
use App\Services\Family\FamilyAssignmentService;

class JoinFamily
{
    public function __construct(
        private readonly FamilyAssignmentService $assignment,
    ) {}

    public function __invoke(User $user, ?EntryContext $context = null): FamilyMembership
    {
        return $this->assignment->assign($user, $context);
    }
}
