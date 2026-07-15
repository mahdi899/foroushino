<?php

namespace App\Http\Requests\V1\Admin;

use App\Enums\RoleName;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreTeamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('teams.manage');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'leader_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty() || ! $this->filled('leader_id')) {
                return;
            }

            $leader = User::query()->find($this->integer('leader_id'));
            if ($leader && ! $leader->hasRole(RoleName::Leader->value)) {
                $validator->errors()->add('leader_id', 'لیدر انتخاب‌شده باید نقش لیدر داشته باشد.');
            }
        });
    }
}
