<?php

namespace App\Filament\Resources\Leads\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class LeadsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->columns([
                TextColumn::make('name')
                    ->label('نام')
                    ->searchable()
                    ->placeholder('—'),
                TextColumn::make('phone')
                    ->label('شماره تماس')
                    ->searchable()
                    ->placeholder('—'),
                TextColumn::make('email')
                    ->label('ایمیل')
                    ->searchable()
                    ->placeholder('—'),
                BadgeColumn::make('source')
                    ->label('منبع'),
                BadgeColumn::make('status')
                    ->label('وضعیت')
                    ->formatStateUsing(fn (string $state) => match ($state) {
                        'contacted' => 'تماس گرفته‌شده',
                        'converted' => 'تبدیل‌شده',
                        'ignored' => 'نادیده گرفته‌شده',
                        default => 'جدید',
                    })
                    ->color(fn (string $state) => match ($state) {
                        'converted' => 'success',
                        'contacted' => 'warning',
                        'ignored' => 'gray',
                        default => 'info',
                    }),
                TextColumn::make('created_at')
                    ->label('تاریخ ثبت')
                    ->dateTime('Y/m/d H:i')
                    ->sortable(),
            ])
            ->filters([
                SelectFilter::make('source')
                    ->label('منبع')
                    ->options(fn () => \App\Models\Lead::query()->distinct()->pluck('source', 'source')->filter()->all()),
                SelectFilter::make('status')
                    ->label('وضعیت')
                    ->options([
                        'new' => 'جدید',
                        'contacted' => 'تماس گرفته‌شده',
                        'converted' => 'تبدیل‌شده',
                        'ignored' => 'نادیده گرفته‌شده',
                    ]),
            ])
            ->recordActions([
                EditAction::make()->label('مشاهده / ویرایش وضعیت'),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}
