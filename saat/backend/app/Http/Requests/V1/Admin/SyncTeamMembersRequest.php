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
            /** @var User $actor */
            $actor = $this->user();

            $desiredIds = collect($this->input('agent_ids', []))->map(fn ($id) => (int) $id);
            $currentIds = User::query()
                ->role(RoleName::Agent->value)
                ->where('team_id', $team->id)
                ->pluck('id')
                ->map(fn ($id) => (int) $id);

            if ($desiredIds->count() > TeamCapacity::AGENTS_PER_TEAM) {
                $validator->errors()->add(
                    'agent_ids',
                    'هر تیم حداکثر '.TeamCapacity::AGENTS_PER_TEAM.' کارشناس فعال می‌تواند داشته باشد.',
                );

                return;
            }

            $affectedIds = $desiredIds->merge($currentIds)->unique()->values();
            $agents = User::query()->whereIn('id', $affectedIds)->get()->keyBy('id');

            foreach ($affectedIds as $agentId) {
                $agent = $agents->get($agentId);
                if (! $agent || ! $agent->hasRole(RoleName::Agent->value)) {
                    $validator->errors()->add('agent_ids', 'فقط کارشناسان قابل انتساب به تیم هستند.');

                    return;
                }

                if (! AdminScope::canManageUser($actor, $agent)) {
                    $validator->errors()->add(
                        'agent_ids',
                        'اجازه مدیریت همه کارشناسان انتخاب‌شده را ندارید.',
                    );

                    return;
                }
            }

            if ($actor->can('users.manage-team-roster')
                && ! $actor->can('users.manage-team')
                && ! $actor->can('users.manage')) {
                $forbiddenPull = $desiredIds
                    ->diff($currentIds)
                    ->contains(function (int $agentId) use ($agents, $team): bool {
                        $agent = $agents->get($agentId);
                        if (! $agent?->team_id) {
                            return false;
                        }

                        return (int) $agent->team_id !== (int) $team->id;
                    });

                if ($forbiddenPull) {
                    $validator->errors()->add(
                        'agent_ids',
                        'نمی‌توانی کارشناس تیم دیگر را به تیم خودت منتقل کنی.',
                    );
                }
            }
        });
    }
}
