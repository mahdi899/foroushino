<?php

namespace App\Http\Requests\V1\Admin;

use App\Enums\RoleName;
use App\Models\User;
use App\Support\SupervisorCapacity;
use App\Support\TeamScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class AssignSupervisorTeamsRequest extends FormRequest
{
    public function authorize(): bool
    {
        $actor = $this->user();

        return $actor
            && $actor->can('users.manage')
            && TeamScope::isOrgWide($actor);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'team_ids' => ['present', 'array'],
            'team_ids.*' => ['integer', 'distinct', 'exists:teams,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            /** @var User $supervisor */
            $supervisor = $this->route('user');
            if (! $supervisor->hasRole(RoleName::Supervisor->value)) {
                $validator->errors()->add('team_ids', 'کاربر انتخاب‌شده ناظر نیست.');

                return;
            }

            $teamIds = collect($this->input('team_ids', []))->map(fn ($id) => (int) $id);
            if ($teamIds->count() > SupervisorCapacity::TEAMS_PER_SUPERVISOR) {
                $validator->errors()->add(
                    'team_ids',
                    'هر ناظر حداکثر '.SupervisorCapacity::TEAMS_PER_SUPERVISOR.' تیم می‌تواند داشته باشد.',
                );
            }
        });
    }
}
