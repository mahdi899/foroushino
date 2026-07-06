<?php

namespace App\Filament\Resources\Orders\Schemas;

use App\Models\Order;
use Filament\Forms\Components\Placeholder;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Illuminate\Support\HtmlString;

class OrderForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('اطلاعات مشتری')
                    ->columns(2)
                    ->schema([
                        TextInput::make('order_number')->label('شماره سفارش')->disabled(),
                        TextInput::make('product.title')->label('محصول')->disabled(),
                        TextInput::make('customer_name')->label('نام مشتری')->disabled(),
                        TextInput::make('customer_phone')->label('شماره تماس')->disabled(),
                        TextInput::make('customer_email')->label('ایمیل')->disabled(),
                        TextInput::make('customer_national_code')->label('کد ملی')->disabled(),
                    ]),

                Section::make('مبلغ')
                    ->columns(3)
                    ->schema([
                        TextInput::make('amount')->label('مبلغ (تومان)')->disabled(),
                        TextInput::make('discount_amount')->label('تخفیف (تومان)')->disabled(),
                        TextInput::make('final_amount')->label('مبلغ نهایی (تومان)')->disabled(),
                    ]),

                Section::make('وضعیت سفارش')
                    ->columns(2)
                    ->schema([
                        Select::make('status')
                            ->label('وضعیت سفارش')
                            ->options([
                                'pending_payment' => 'در انتظار پرداخت',
                                'paid' => 'پرداخت‌شده',
                                'fulfilled' => 'تحویل داده‌شده',
                                'failed' => 'ناموفق',
                                'cancelled' => 'لغوشده',
                            ])
                            ->required(),
                        Select::make('payment_status')
                            ->label('وضعیت پرداخت')
                            ->options([
                                'pending' => 'در انتظار',
                                'paid' => 'پرداخت‌شده',
                                'failed' => 'ناموفق',
                            ])
                            ->required(),
                    ]),

                Section::make('تحویل سفارش')
                    ->columns(1)
                    ->visible(fn (?Order $record) => $record !== null)
                    ->schema([
                        Placeholder::make('fulfillment_overview')
                            ->label('')
                            ->content(fn (?Order $record) => $record ? self::renderFulfillmentOverview($record) : null),
                    ]),
            ]);
    }

    private static function renderFulfillmentOverview(Order $record): HtmlString
    {
        $latestPayment = $record->payments()->latest()->first();
        $refId = $latestPayment?->ref_id ?? '—';
        $licenseCode = $record->spotplayer_license_code ?: '—';
        $smsSentAt = $record->sms_sent_at?->format('Y/m/d H:i') ?? 'ارسال نشده';

        $html = <<<HTML
            <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
                <p style="margin-bottom:6px;"><strong>کد پیگیری پرداخت (ref_id):</strong> {$refId}</p>
                <p style="margin-bottom:6px;"><strong>کد لایسنس SpotPlayer:</strong> {$licenseCode}</p>
                <p><strong>زمان ارسال پیامک:</strong> {$smsSentAt}</p>
            </div>
        HTML;

        return new HtmlString($html);
    }
}
