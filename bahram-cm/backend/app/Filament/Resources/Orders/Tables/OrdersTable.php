<?php

namespace App\Filament\Resources\Orders\Tables;

use App\Jobs\SendSmsJob;
use App\Models\Order;
use Filament\Actions\Action;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Notifications\Notification;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class OrdersTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->columns([
                TextColumn::make('order_number')
                    ->label('شماره سفارش')
                    ->searchable()
                    ->copyable(),
                TextColumn::make('product.title')
                    ->label('محصول')
                    ->searchable(),
                TextColumn::make('customer_name')
                    ->label('مشتری')
                    ->searchable()
                    ->description(fn ($record) => $record->customer_phone),
                TextColumn::make('final_amount')
                    ->label('مبلغ نهایی')
                    ->numeric()
                    ->suffix(' تومان')
                    ->sortable(),
                BadgeColumn::make('status')
                    ->label('وضعیت سفارش')
                    ->formatStateUsing(fn (string $state) => match ($state) {
                        'paid' => 'پرداخت‌شده',
                        'fulfilled' => 'تحویل داده‌شده',
                        'failed' => 'ناموفق',
                        'cancelled' => 'لغوشده',
                        default => 'در انتظار پرداخت',
                    })
                    ->color(fn (string $state) => match ($state) {
                        'paid', 'fulfilled' => 'success',
                        'failed', 'cancelled' => 'danger',
                        default => 'warning',
                    }),
                BadgeColumn::make('payment_status')
                    ->label('وضعیت پرداخت')
                    ->formatStateUsing(fn (string $state) => match ($state) {
                        'paid' => 'پرداخت‌شده',
                        'failed' => 'ناموفق',
                        default => 'در انتظار',
                    })
                    ->color(fn (string $state) => match ($state) {
                        'paid' => 'success',
                        'failed' => 'danger',
                        default => 'gray',
                    }),
                TextColumn::make('created_at')
                    ->label('تاریخ ثبت')
                    ->dateTime('Y/m/d H:i')
                    ->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('وضعیت سفارش')
                    ->options([
                        'pending_payment' => 'در انتظار پرداخت',
                        'paid' => 'پرداخت‌شده',
                        'fulfilled' => 'تحویل داده‌شده',
                        'failed' => 'ناموفق',
                        'cancelled' => 'لغوشده',
                    ]),
                SelectFilter::make('payment_status')
                    ->label('وضعیت پرداخت')
                    ->options([
                        'pending' => 'در انتظار',
                        'paid' => 'پرداخت‌شده',
                        'failed' => 'ناموفق',
                    ]),
            ])
            ->recordActions([
                Action::make('resend_sms')
                    ->label('ارسال مجدد پیامک')
                    ->icon(Heroicon::OutlinedPaperAirplane)
                    ->color('gray')
                    ->visible(fn (Order $record) => $record->isPaid())
                    ->requiresConfirmation()
                    ->action(function (Order $record) {
                        SendSmsJob::dispatch($record->id);

                        Notification::make()
                            ->title('درخواست ارسال مجدد پیامک ثبت شد.')
                            ->success()
                            ->send();
                    }),
                EditAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}
