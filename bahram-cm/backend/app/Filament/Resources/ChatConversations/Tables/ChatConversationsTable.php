<?php

namespace App\Filament\Resources\ChatConversations\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class ChatConversationsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('updated_at', 'desc')
            ->columns([
                TextColumn::make('session_id')
                    ->label('شناسه نشست')
                    ->searchable()
                    ->limit(20),
                TextColumn::make('name')
                    ->label('نام')
                    ->searchable()
                    ->placeholder('—'),
                TextColumn::make('phone')
                    ->label('شماره تماس')
                    ->searchable()
                    ->placeholder('—'),
                TextColumn::make('messages_count')
                    ->label('تعداد پیام')
                    ->counts('messages'),
                BadgeColumn::make('status')
                    ->label('وضعیت')
                    ->formatStateUsing(fn (string $state) => $state === 'closed' ? 'بسته‌شده' : 'باز')
                    ->color(fn (string $state) => $state === 'closed' ? 'gray' : 'success'),
                TextColumn::make('updated_at')
                    ->label('آخرین فعالیت')
                    ->dateTime('Y/m/d H:i')
                    ->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('وضعیت')
                    ->options([
                        'open' => 'باز',
                        'closed' => 'بسته‌شده',
                    ]),
            ])
            ->recordActions([
                EditAction::make()->label('مشاهده گفتگو'),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}
