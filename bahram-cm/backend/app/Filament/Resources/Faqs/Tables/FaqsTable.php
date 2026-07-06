<?php

namespace App\Filament\Resources\Faqs\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ToggleColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class FaqsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->reorderable('sort_order')
            ->defaultSort('sort_order')
            ->columns([
                TextColumn::make('question')
                    ->label('سوال')
                    ->searchable()
                    ->limit(60)
                    ->wrap(),
                TextColumn::make('category')
                    ->label('دسته‌بندی')
                    ->badge()
                    ->placeholder('—')
                    ->searchable(),
                TextColumn::make('sort_order')
                    ->label('ترتیب')
                    ->sortable(),
                ToggleColumn::make('is_active')
                    ->label('فعال'),
                TextColumn::make('updated_at')
                    ->label('به‌روزرسانی')
                    ->dateTime('Y/m/d H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('is_active')
                    ->label('وضعیت')
                    ->options([
                        1 => 'فعال',
                        0 => 'غیرفعال',
                    ]),
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
