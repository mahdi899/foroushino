<?php

namespace App\Http\Requests\V1\Admin;

use App\Enums\RoleName;
use App\Models\Team;
use App\Models\User;
use App\Support\AdminScope;
use App\Support\TeamCapacity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class SyncTeamMembersRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Team $team */
        $team = $this->route('team');
        $actor = $this->user();

        if (AdminScope::canManageTeam($actor, $team)) {
            return true;
        }

        return $actor?->can('users.manage-team-roster')
            && AdminScope::canManageTeamRoster($actor, (int) $team->id);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'agent_ids' => ['required', 'array'],
            'agent_ids.*' => ['integer', 'distinct', 'exists:users,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            /** @var Team $team */
            $team = $this->route('team');
            $agentIds = collect($this->input('agent_ids', []))->map(fn ($id) => (int) $id);

            if ($agentIds->count() > TeamCapacity::AGENTS_PER_TEAM) {
                $validator->errors()->add(
                    'agent_ids',
                    'هر تیم حداکثر '.TeamCapacity::AGENTS_PER_TEAM.' کارشناس فعال می‌تواند داشته باشد.',
                );

                return;
            }

            $invalidAgents = User::query()
                ->whereIn('id', $agentIds)
                ->get()
                ->reject(fn (User $user) => $user->hasRole(RoleName::Agent->value));

            if ($invalidAgents->isNotEmpty()) {
                $validator->errors()->add('agent_ids', 'فقط کارشناسان قابل انتساب به تیم هستند.');
            }
        });
    }
}
