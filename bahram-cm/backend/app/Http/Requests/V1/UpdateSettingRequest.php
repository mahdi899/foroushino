<?php

namespace App\Http\Requests\V1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        $group = (string) $this->route('group');
        if (in_array($group, ['site', 'links'], true)) {
            return $user->isSuperAdmin();
        }

        return $user->hasPermission('settings.manage');
    }

    public function rules(): array
    {
        return [
            'values' => ['required', 'array'],
        ];
    }
}
