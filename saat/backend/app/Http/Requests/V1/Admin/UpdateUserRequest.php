<?php

namespace App\Http\Requests\V1\Admin;

use App\Enums\RoleName;
use App\Models\User;
use App\Support\AdminScope;
use App\Support\TeamCapacity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var User $user */
        $user = $this->route('user');
        $actor = $this->user();

        if (AdminScope::canManageUser($actor, $user)) {
            return true;
        }

        if ($actor?->can('users.manage-team-roster') && $user->hasRole(RoleName::Agent->value)) {
            if ($this->has('team_id')) {
                return AdminScope::canManageTeamRoster($actor, $this->integer('team_id'));
            }

            return AdminScope::canManageTeamRoster($actor, (int) ($user->team_id ?? 0));
        }

        return false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'team_id' => ['sometimes', 'nullable', 'integer', 'exists:teams,id'],
            'is_active' => ['sometimes', 'boolean'],
            'name' => ['sometimes', 'string', 'max:150'],
            'phone' => ['sometimes', 'string', 'max:20', Rule::unique('users', 'phone')->ignore($this->route('user'))],
            'bank_card' => ['sometimes', 'nullable', 'string', 'regex:/^\d{16}$/'],
            'confirm_bank_card' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('bank_card') && $this->input('bank_card') !== null) {
            $this->merge([
                'bank_card' => preg_replace('/\D/', '', (string) $this->input('bank_card')),
            ]);
        }
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            /** @var User $user */
            $user = $this->route('user');
            $actor = $this->user();

            if ($actor?->can('users.manage-team-roster') && ! $actor->can('users.manage-team') && ! $actor->can('users.manage')) {
                if (! $user->hasRole(RoleName::Agent->value)) {
                    $validator->errors()->add('role', 'فقط کارشناسان قابل ویرایش هستند.');

                    return;
                }

                $allowedKeys = ['team_id'];
                foreach (array_keys($this->all()) as $key) {
                    if (! in_array($key, $allowedKeys, true)) {
                        $validator->errors()->add($key, 'اجازه ویرایش این فیلد را ندارید.');
                    }
                }
            }

            if (! $user->hasRole(RoleName::Agent->value)) {
                return;
            }

            if ($this->boolean('confirm_bank_card') && ! $user->bank_card && ! $this->filled('bank_card')) {
                $validator->errors()->add('confirm_bank_card', 'برای تایید کارت، ابتدا شماره کارت را ثبت کن.');
            }

            if ($this->boolean('confirm_bank_card') && ! $user->bank_sheba) {
                $validator->errors()->add('confirm_bank_card', 'برای تایید، ابتدا شماره شبا را ثبت کن.');
            }

            $teamId = $this->has('team_id')
                ? $this->integer('team_id')
                : (int) $user->team_id;

            if ($teamId <= 0) {
                return;
            }

            if ($actor && $actor->can('users.manage-team-roster') && ! AdminScope::canManageTeamRoster($actor, $teamId)) {
                $validator->errors()->add('team_id', 'فقط می‌توانی کارشناسان تیم خودت را مدیریت کنی.');
            }

            $activating = $this->has('is_active') && $this->boolean('is_active') && ! $user->is_active;
            $movingTeam = $this->has('team_id') && (int) $user->team_id !== $teamId;

            if (! $movingTeam && ! $activating) {
                return;
            }

            if (! TeamCapacity::hasRoomForAgent($teamId, $user->id)) {
                $validator->errors()->add(
                    $movingTeam ? 'team_id' : 'is_active',
                    'هر تیم حداکثر '.TeamCapacity::AGENTS_PER_TEAM.' کارشناس فعال می‌تواند داشته باشد.',
                );
            }
        });
    }
}
