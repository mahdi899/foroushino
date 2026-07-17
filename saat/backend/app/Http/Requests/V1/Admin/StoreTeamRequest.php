<?php

namespace App\Http\Requests\V1\Admin;

use App\Enums\RoleName;
use App\Models\User;
use App\Support\AdminScope;
use App\Support\TeamScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreTeamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return AdminScope::canCreateTeam($this->user());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'leader_id' => ['nullable', 'integer', 'exists:users,id'],
            'supervisor_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            if ($this->filled('leader_id')) {
                $leader = User::query()->find($this->integer('leader_id'));
                if ($leader && ! $leader->hasRole(RoleName::Leader->value)) {
                    $validator->errors()->add('leader_id', 'سرتیم انتخاب‌شده باید نقش سرتیم داشته باشد.');
                }
            }

            $actor = $this->user();
            if ($actor && ! TeamScope::isOrgWide($actor) && $this->filled('supervisor_id')) {
                if ((int) $this->integer('supervisor_id') !== (int) $actor->id) {
                    $validator->errors()->add('supervisor_id', 'نمی‌توانی تیم را برای ناظر دیگری بسازی.');
                }
            }
        });
    }
}
