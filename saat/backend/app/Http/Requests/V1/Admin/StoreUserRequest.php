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
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $role = $this->input('role', RoleName::Agent->value);

        return [
            'name' => ['required', 'string', 'max:150'],
            'phone' => ['required', 'string', 'max:20', 'unique:users,phone'],
            'role' => ['sometimes', 'string', Rule::in([
                RoleName::Agent->value,
                RoleName::Leader->value,
                RoleName::Supervisor->value,
            ])],
            'team_id' => [
                Rule::requiredIf(in_array($role, [RoleName::Agent->value, RoleName::Leader->value], true)),
                'nullable',
                'integer',
                'exists:teams,id',
            ],
            'email' => ['nullable', 'email', 'max:150', 'unique:users,email'],
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
