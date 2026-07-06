<?php

namespace App\Services;

use App\Models\Lead;

class LeadService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Lead
    {
        return Lead::create([
            'name' => $data['name'] ?? null,
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'source' => $data['source'] ?? 'website',
            'message' => $data['message'] ?? null,
            'page_url' => $data['page_url'] ?? null,
            'status' => 'new',
            'meta' => $data['meta'] ?? null,
        ]);
    }
}
