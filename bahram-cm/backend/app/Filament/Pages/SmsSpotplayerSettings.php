<?php

namespace App\Filament\Pages;

use App\Models\SmsSetting;
use App\Models\SpotplayerSetting;
use App\Services\SmsService;
use App\Services\SpotPlayerService;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;

class SmsSpotplayerSettings extends Page
{
    protected string $view = 'filament.pages.sms-spotplayer-settings';

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedDevicePhoneMobile;

    protected static ?string $navigationLabel = 'پیامک و SpotPlayer';

    protected static ?string $title = 'تنظیمات پیامک و SpotPlayer';

    protected static ?int $navigationSort = 11;

    /**
     * @var array<string, mixed>
     */
    public ?array $data = [];

    public function mount(): void
    {
        $sms = SmsSetting::current();
        $spotplayer = SpotplayerSetting::current();

        $this->form->fill([
            'sms_provider' => $sms->sms_provider ?? 'kavenegar',
            'sms_sender_number' => $sms->sms_sender_number,
            'sms_pattern_code' => $sms->sms_pattern_code,
            'is_sms_active' => $sms->is_sms_active,
            'test_phone' => $sms->test_phone,
            'purchase_message_template' => $sms->purchase_message_template,
            'spotplayer_base_url' => $spotplayer->spotplayer_base_url,
            'is_spotplayer_active' => $spotplayer->is_spotplayer_active,
            'default_license_duration' => $spotplayer->default_license_duration,
        ]);
    }

    public function form(Schema $schema): Schema
    {
        $hasSmsKey = filled(SmsSetting::current()->sms_api_key);
        $hasSpotplayerKey = filled(SpotplayerSetting::current()->spotplayer_api_key);

        return $schema
            ->statePath('data')
            ->components([
                Section::make('سرویس پیامک (Kavenegar)')
                    ->columns(2)
                    ->schema([
                        TextInput::make('sms_api_key')
                            ->label('API Key')
                            ->password()
                            ->revealable()
                            ->dehydrated(fn ($state) => filled($state))
                            ->placeholder($hasSmsKey ? '•••••••••••••••• (برای تغییر، مقدار جدید وارد کنید)' : 'کلید API پیامک را وارد کنید')
                            ->helperText($hasSmsKey ? 'یک کلید API ذخیره شده است.' : 'هنوز کلید API تنظیم نشده است.')
                            ->columnSpanFull(),
                        TextInput::make('sms_sender_number')
                            ->label('شماره فرستنده'),
                        TextInput::make('sms_pattern_code')
                            ->label('کد پترن (اختیاری)'),
                        TextInput::make('test_phone')
                            ->label('شماره تست پیش‌فرض')
                            ->tel(),
                        Toggle::make('is_sms_active')
                            ->label('فعال بودن سرویس پیامک'),
                        Textarea::make('purchase_message_template')
                            ->label('قالب پیامک تایید خرید')
                            ->helperText('متغیرهای قابل استفاده: {name}, {phone}, {order_number}, {product_title}, {code}')
                            ->rows(3)
                            ->columnSpanFull(),
                    ]),

                Section::make('SpotPlayer')
                    ->columns(2)
                    ->schema([
                        TextInput::make('spotplayer_api_key')
                            ->label('API Key')
                            ->password()
                            ->revealable()
                            ->dehydrated(fn ($state) => filled($state))
                            ->placeholder($hasSpotplayerKey ? '•••••••••••••••• (برای تغییر، مقدار جدید وارد کنید)' : 'کلید API SpotPlayer را وارد کنید')
                            ->helperText($hasSpotplayerKey ? 'یک کلید API ذخیره شده است.' : 'هنوز کلید API تنظیم نشده است.')
                            ->columnSpanFull(),
                        TextInput::make('spotplayer_base_url')
                            ->label('Base URL (اختیاری)')
                            ->url()
                            ->placeholder('https://panel.spotplayer.ir'),
                        TextInput::make('default_license_duration')
                            ->label('مدت زمان پیش‌فرض لایسنس (روز)')
                            ->numeric()
                            ->minValue(0),
                        Toggle::make('is_spotplayer_active')
                            ->label('فعال بودن SpotPlayer')
                            ->columnSpanFull(),
                    ]),
            ]);
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('test_sms')
                ->label('ذخیره و تست پیامک')
                ->color('gray')
                ->icon(Heroicon::OutlinedPaperAirplane)
                ->action('testSms'),
            Action::make('test_spotplayer')
                ->label('ذخیره و تست SpotPlayer')
                ->color('gray')
                ->icon(Heroicon::OutlinedPlayCircle)
                ->action('testSpotplayer'),
            Action::make('save')
                ->label('ذخیره تنظیمات')
                ->action('save'),
        ];
    }

    protected function persist(): void
    {
        $data = $this->form->getState();

        SmsSetting::current()->update([
            'sms_provider' => $data['sms_provider'] ?? 'kavenegar',
            'sms_api_key' => $data['sms_api_key'] ?? null,
            'sms_sender_number' => $data['sms_sender_number'] ?? null,
            'sms_pattern_code' => $data['sms_pattern_code'] ?? null,
            'is_sms_active' => $data['is_sms_active'] ?? false,
            'test_phone' => $data['test_phone'] ?? null,
            'purchase_message_template' => $data['purchase_message_template'] ?? null,
        ]);

        SpotplayerSetting::current()->update([
            'spotplayer_api_key' => $data['spotplayer_api_key'] ?? null,
            'spotplayer_base_url' => $data['spotplayer_base_url'] ?? null,
            'is_spotplayer_active' => $data['is_spotplayer_active'] ?? false,
            'default_license_duration' => $data['default_license_duration'] ?? null,
        ]);
    }

    public function save(): void
    {
        $this->persist();

        Notification::make()
            ->title('تنظیمات ذخیره شد.')
            ->success()
            ->send();

        $this->mount();
    }

    public function testSms(): void
    {
        $this->persist();

        $phone = SmsSetting::current()->test_phone;

        if (blank($phone)) {
            Notification::make()
                ->title('برای تست، ابتدا یک «شماره تست پیش‌فرض» وارد کنید.')
                ->danger()
                ->send();

            return;
        }

        $result = app(SmsService::class)->sendTest($phone);

        Notification::make()
            ->title($result['success'] ? 'ارسال موفق' : 'ارسال ناموفق')
            ->body($result['message'])
            ->color($result['success'] ? 'success' : 'danger')
            ->send();

        $this->mount();
    }

    public function testSpotplayer(): void
    {
        $this->persist();

        $result = app(SpotPlayerService::class)->testConnection();

        Notification::make()
            ->title($result['success'] ? 'اتصال موفق' : 'اتصال ناموفق')
            ->body($result['message'])
            ->color($result['success'] ? 'success' : 'danger')
            ->send();

        $this->mount();
    }
}
