<?php

namespace App\Filament\Resources\Products\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ToggleColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class ProductsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->columns([
                ImageColumn::make('featured_image')
                    ->label('')
                    ->disk('public')
                    ->square(),
                TextColumn::make('title')
                    ->label('عنوان')
                    ->searchable()
                    ->description(fn ($record) => $record->slug),
                BadgeColumn::make('type')
                    ->label('نوع')
                    ->formatStateUsing(fn (string $state) => $state === 'package' ? 'پکیج' : 'عادی')
                    ->color(fn (string $state) => $state === 'package' ? 'warning' : 'gray'),
                TextColumn::make('price')
                    ->label('قیمت')
                    ->numeric()
                    ->suffix(' تومان'),
                TextColumn::make('sale_price')
                    ->label('قیمت تخفیفی')
                    ->numeric()
                    ->suffix(' تومان')
                    ->placeholder('—'),
                ToggleColumn::make('is_active')
                    ->label('فعال'),
                TextColumn::make('created_at')
                    ->label('تاریخ ایجاد')
                    ->dateTime('Y/m/d')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('type')
                    ->label('نوع')
                    ->options([
                        'package' => 'پکیج',
                        'normal' => 'عادی',
                    ]),
                SelectFilter::make('is_active')
                    ->label('وضعیت')
                    ->options([1 => 'فعال', 0 => 'غیرفعال']),
            ])
            ->recordActions([
                EditAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}
