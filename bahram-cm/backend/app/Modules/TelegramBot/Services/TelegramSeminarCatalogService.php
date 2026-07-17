<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\Seminar;
use Illuminate\Support\Collection;

class TelegramSeminarCatalogService
{
    /** @return Collection<int, Seminar> */
    public function listUpcoming(): Collection
    {
        return Seminar::query()
            ->with(['product:id,slug,is_active,price,sale_price,show_in_telegram,title'])
            ->where('status', 'published')
            ->where('date', '>=', now()->subDay())
            ->orderBy('date')
            ->limit(10)
            ->get();
    }
}
