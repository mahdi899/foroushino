<?php

namespace App\Http\Requests\V1\Admin;

use App\Enums\RoleName;
use App\Models\User;
use App\Support\TeamCapacity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('users.manage');
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
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            /** @var User $user */
            $user = $this->route('user');
            if (! $user->hasRole(RoleName::Agent->value)) {
                return;
            }

            $teamId = $this->has('team_id')
                ? $this->integer('team_id')
                : (int) $user->team_id;

            if ($teamId <= 0) {
                return;
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
