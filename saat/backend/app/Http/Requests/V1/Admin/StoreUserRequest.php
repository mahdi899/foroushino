<?php

namespace App\Http\Requests\V1\Admin;

use App\Enums\RoleName;
use App\Support\TeamCapacity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('users.manage-team');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'phone' => ['required', 'string', 'max:20', 'unique:users,phone'],
            'team_id' => ['required', 'integer', 'exists:teams,id'],
            'email' => ['nullable', 'email', 'max:150', 'unique:users,email'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $teamId = $this->integer('team_id');
            if (! TeamCapacity::hasRoomForAgent($teamId)) {
                $validator->errors()->add(
                    'team_id',
                    'هر تیم حداکثر '.TeamCapacity::AGENTS_PER_TEAM.' کارشناس فعال می‌تواند داشته باشد.',
                );
            }
        });
    }
}
