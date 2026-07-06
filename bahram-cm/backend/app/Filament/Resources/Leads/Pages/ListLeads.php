<?php

namespace App\Filament\Resources\Leads\Pages;

use App\Filament\Resources\Leads\LeadResource;
use Filament\Actions\Action;
use Filament\Resources\Pages\ListRecords;
use Filament\Support\Icons\Heroicon;

class ListLeads extends ListRecords
{
    protected static string $resource = LeadResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('export')
                ->label('خروجی CSV')
                ->icon(Heroicon::OutlinedArrowDownTray)
                ->color('gray')
                ->url(route('admin.leads.export'))
                ->openUrlInNewTab(),
        ];
    }
}
