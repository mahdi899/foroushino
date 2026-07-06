<?php

namespace App\Http\Requests\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreMediaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->hasPermission('media.write');
    }

    public function rules(): array
    {
        $maxKb = (int) config('bahram.uploads.max_image_kb', 8192);

        return [
            'file' => ['required', 'file', 'image', 'max:'.$maxKb, 'mimes:jpg,jpeg,png,webp,gif'],
            'alt_fa' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:60'],
        ];
    }
}
