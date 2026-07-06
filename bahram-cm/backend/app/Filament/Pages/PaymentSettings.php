<?php

namespace App\Filament\Pages;

use App\Models\PaymentSetting;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;

class PaymentSettings extends Page
{
    protected string $view = 'filament.pages.payment-settings';

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedCreditCard;

    protected static ?string $navigationLabel = 'تنظیمات پرداخت';

    protected static ?string $title = 'تنظیمات درگاه پرداخت';

    protected static ?int $navigationSort = 10;

    /**
     * @var array<string, mixed>
     */
    public ?array $data = [];

    public function mount(): void
    {
        $settings = PaymentSetting::current();

        $this->form->fill([
            'sandbox_mode' => $settings->sandbox_mode,
            'callback_url' => $settings->callback_url,
            'is_active' => $settings->is_active,
            'currency' => $settings->currency ?? 'IRT',
            'description_template' => $settings->description_template,
        ]);
    }

    public function form(Schema $schema): Schema
    {
        $hasMerchantId = filled(PaymentSetting::current()->zarinpal_merchant_id);

        return $schema
            ->statePath('data')
            ->components([
                Section::make('اتصال به زرین‌پال')
                    ->columns(2)
                    ->schema([
                        TextInput::make('zarinpal_merchant_id')
                            ->label('کد پذیرنده (Merchant ID)')
                            ->password()
                            ->revealable()
                            ->dehydrated(fn ($state) => filled($state))
                            ->placeholder($hasMerchantId ? '•••••••••••••••• (برای تغییر، مقدار جدید وارد کنید)' : 'کد پذیرنده زرین‌پال را وارد کنید')
                            ->helperText($hasMerchantId ? 'یک کد پذیرنده ذخیره شده است.' : 'هنوز کد پذیرنده تنظیم نشده است.')
                            ->columnSpanFull(),
                        Toggle::make('sandbox_mode')
                            ->label('حالت آزمایشی (Sandbox)')
                            ->helperText('برای تست بدون پرداخت واقعی فعال کنید.'),
                        Toggle::make('is_active')
                            ->label('فعال بودن درگاه پرداخت'),
                        TextInput::make('callback_url')
                            ->label('Callback URL (اختیاری)')
                            ->url()
                            ->placeholder(route('api.payments.zarinpal.callback'))
                            ->helperText('در صورت خالی بودن، آدرس پیش‌فرض API استفاده می‌شود.')
                            ->columnSpanFull(),
                        Select::make('currency')
                            ->label('واحد پول ذخیره‌شده قیمت‌ها')
                            ->options([
                                'IRT' => 'تومان',
                                'IRR' => 'ریال',
                            ])
                            ->required(),
                    ]),

                Section::make('توضیحات تراکنش')
                    ->schema([
                        Textarea::make('description_template')
                            ->label('قالب توضیحات پرداخت')
                            ->helperText('می‌توانید از {order_number} و {product_title} استفاده کنید.')
                            ->rows(2)
                            ->columnSpanFull(),
                    ]),
            ]);
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('save')
                ->label('ذخیره تنظیمات')
                ->action('save'),
        ];
    }

    public function save(): void
    {
        $data = $this->form->getState();

        PaymentSetting::current()->update($data);

        Notification::make()
            ->title('تنظیمات پرداخت ذخیره شد.')
            ->success()
            ->send();

        $this->mount();
    }
}
