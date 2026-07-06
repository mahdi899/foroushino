<?php

namespace App\Filament\Resources\Articles\Tables;

use Filament\Actions\Action;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class ArticlesTable
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
                    ->limit(50)
                    ->description(fn ($record) => $record->slug),
                BadgeColumn::make('status')
                    ->label('وضعیت')
                    ->formatStateUsing(fn (string $state) => $state === 'published' ? 'منتشرشده' : 'پیش‌نویس')
                    ->color(fn (string $state) => $state === 'published' ? 'success' : 'gray'),
                BadgeColumn::make('seo_status')
                    ->label('وضعیت سئو')
                    ->formatStateUsing(fn (string $state) => match ($state) {
                        'good' => 'خوب',
                        'ok' => 'متوسط',
                        default => 'ضعیف',
                    })
                    ->color(fn (string $state) => match ($state) {
                        'good' => 'success',
                        'ok' => 'warning',
                        default => 'danger',
                    }),
                TextColumn::make('seo_score')
                    ->label('امتیاز سئو')
                    ->suffix(' / 100')
                    ->sortable(),
                TextColumn::make('published_at')
                    ->label('تاریخ انتشار')
                    ->dateTime('Y/m/d H:i')
                    ->sortable()
                    ->placeholder('—'),
                TextColumn::make('author.name')
                    ->label('نویسنده')
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('وضعیت')
                    ->options([
                        'draft' => 'پیش‌نویس',
                        'published' => 'منتشرشده',
                    ]),
                SelectFilter::make('seo_status')
                    ->label('وضعیت سئو')
                    ->options([
                        'good' => 'خوب',
                        'ok' => 'متوسط',
                        'poor' => 'ضعیف',
                    ]),
            ])
            ->recordActions([
                Action::make('preview')
                    ->label('پیش‌نمایش')
                    ->icon('heroicon-o-eye')
                    ->color('gray')
                    ->url(fn ($record) => rtrim((string) config('app.frontend_url'), '/')."/articles/{$record->slug}")
                    ->openUrlInNewTab(),
                EditAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}
