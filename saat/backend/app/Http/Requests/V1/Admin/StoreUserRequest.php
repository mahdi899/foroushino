<?php

namespace App\Http\Requests\V1\Admin;

use App\Enums\RoleName;
use App\Support\AdminScope;
use App\Support\TeamCapacity;
use App\Support\TeamScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $role = $this->input('role', RoleName::Agent->value);

        return AdminScope::canCreateRole($this->user(), (string) $role);
    }

    /**
     * @return list<string>
     */
    public static function allowedRolesFor(?\App\Models\User $actor): array
    {
        if (! $actor) {
            return [];
        }

        $roles = [RoleName::Agent->value];

        if ($actor->can('users.manage-team') || $actor->can('users.manage')) {
            $roles[] = RoleName::Leader->value;
        }

        if ($actor->can('users.manage')) {
            $roles[] = RoleName::Supervisor->value;
        }

        if (TeamScope::isOrgWide($actor) && $actor->can('users.manage')) {
            $roles[] = RoleName::Manager->value;
            $roles[] = RoleName::Admin->value;
            $roles[] = RoleName::SuperAdmin->value;
        }

        return array_values(array_unique($roles));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $role = $this->input('role', RoleName::Agent->value);
        $orgWideRole = in_array($role, [
            RoleName::SuperAdmin->value,
            RoleName::Admin->value,
            RoleName::Manager->value,
        ], true);
        $passwordLoginRole = in_array($role, RoleName::passwordLoginAtCreationValues(), true);

        return [
            'name' => ['required', 'string', 'max:150'],
            'phone' => ['required', 'string', 'max:20', 'unique:users,phone'],
            'role' => ['sometimes', 'string', Rule::in(self::allowedRolesFor($this->user()))],
            'team_id' => [
                Rule::requiredIf($role === RoleName::Agent->value),
                'nullable',
                'integer',
                'exists:teams,id',
            ],
            'email' => [
                Rule::requiredIf($orgWideRole),
                'nullable',
                'email',
                'max:150',
                'unique:users,email',
            ],
            'password' => [
                Rule::requiredIf($passwordLoginRole),
                'nullable',
                'string',
                'min:12',
                'max:128',
            ],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $role = (string) $this->input('role', RoleName::Agent->value);
            $actor = $this->user();

            if ($role === RoleName::Agent->value && $this->filled('team_id')) {
                $teamId = $this->integer('team_id');
                if (! TeamCapacity::hasRoomForAgent($teamId)) {
                    $validator->errors()->add(
                        'team_id',
                        'هر تیم حداکثر '.TeamCapacity::AGENTS_PER_TEAM.' کارشناس فعال می‌تواند داشته باشد.',
                    );
                }

                if ($actor && ! TeamScope::isOrgWide($actor)) {
                    $teamIds = TeamScope::supervisedTeamIds($actor);
                    if (! in_array($teamId, $teamIds, true)) {
                        $validator->errors()->add('team_id', 'اجازه افزودن کارشناس به این تیم را ندارید.');
                    }
                }
            }

            if ($role === RoleName::Leader->value && $actor && ! TeamScope::isOrgWide($actor) && ! $this->filled('team_id')) {
                $validator->errors()->add('team_id', 'تیم سرتیم را مشخص کن.');
            }

            if ($role === RoleName::Leader->value && $this->filled('team_id') && $actor && ! TeamScope::isOrgWide($actor)) {
                $teamId = $this->integer('team_id');
                $teamIds = TeamScope::supervisedTeamIds($actor);
                if (! in_array($teamId, $teamIds, true)) {
                    $validator->errors()->add('team_id', 'اجازه افزودن سرتیم به این تیم را ندارید.');
                }
            }
        });
    }
}
