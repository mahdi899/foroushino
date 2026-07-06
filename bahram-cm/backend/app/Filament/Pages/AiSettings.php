<?php

namespace App\Filament\Pages;

use App\Models\AiSetting;
use App\Services\AIService;
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

class AiSettings extends Page
{
    protected string $view = 'filament.pages.ai-settings';

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedCpuChip;

    protected static ?string $navigationLabel = 'تنظیمات AI';

    protected static ?string $title = 'تنظیمات هوش مصنوعی';

    protected static ?int $navigationSort = 4;

    /**
     * @var array<string, mixed>
     */
    public ?array $data = [];

    public function mount(): void
    {
        $settings = AiSetting::current();

        $this->form->fill([
            'provider_name' => $settings->provider_name,
            'base_url' => $settings->base_url,
            'model' => $settings->model,
            'temperature' => $settings->temperature,
            'max_tokens' => $settings->max_tokens,
            'is_active' => $settings->is_active,
            'system_default_prompt' => $settings->system_default_prompt,
            // api_key is intentionally left blank; see helperText below.
        ]);
    }

    public function form(Schema $schema): Schema
    {
        $hasKey = filled(AiSetting::current()->api_key);

        return $schema
            ->statePath('data')
            ->components([
                Section::make('اتصال به سرویس هوش مصنوعی')
                    ->description('این تنظیمات توسط تمام بخش‌های هوش مصنوعی سایت (تولید مقاله، چت‌بات) استفاده می‌شود.')
                    ->columns(2)
                    ->schema([
                        Select::make('provider_name')
                            ->label('ارائه‌دهنده')
                            ->options([
                                'OpenAI-compatible' => 'OpenAI-compatible',
                                'Custom' => 'Custom',
                            ])
                            ->default('OpenAI-compatible')
                            ->required(),
                        TextInput::make('base_url')
                            ->label('Base URL (اختیاری)')
                            ->url()
                            ->placeholder('https://api.openai.com/v1')
                            ->maxLength(255),
                        TextInput::make('api_key')
                            ->label('API Key')
                            ->password()
                            ->revealable()
                            ->dehydrated(fn ($state) => filled($state))
                            ->placeholder($hasKey ? '•••••••••••••••• (برای تغییر، مقدار جدید وارد کنید)' : 'کلید API را وارد کنید')
                            ->helperText($hasKey ? 'یک کلید API ذخیره شده است.' : 'هنوز کلید API تنظیم نشده است.')
                            ->columnSpanFull(),
                        TextInput::make('model')
                            ->label('مدل')
                            ->default('gpt-4o-mini')
                            ->required(),
                        TextInput::make('temperature')
                            ->label('Temperature (۰ تا ۲)')
                            ->numeric()
                            ->step(0.1)
                            ->minValue(0)
                            ->maxValue(2)
                            ->default(0.7),
                        TextInput::make('max_tokens')
                            ->label('حداکثر توکن پاسخ')
                            ->numeric()
                            ->minValue(100)
                            ->maxValue(8000)
                            ->default(2000),
                        Toggle::make('is_active')
                            ->label('فعال بودن سرویس هوش مصنوعی')
                            ->helperText('در صورت غیرفعال بودن، هیچ درخواستی به AI ارسال نمی‌شود.')
                            ->columnSpanFull(),
                    ]),

                Section::make('پرامپت پیش‌فرض سیستم')
                    ->description('در صورت نیاز، به‌عنوان پرامپت پایه برای بخش‌های مختلف هوش مصنوعی استفاده می‌شود.')
                    ->schema([
                        Textarea::make('system_default_prompt')
                            ->label('پرامپت پیش‌فرض')
                            ->rows(4)
                            ->columnSpanFull(),
                    ]),
            ]);
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('test_connection')
                ->label('ذخیره و تست اتصال')
                ->color('gray')
                ->icon(Heroicon::OutlinedBoltSlash)
                ->action('testConnection'),
            Action::make('save')
                ->label('ذخیره تنظیمات')
                ->action('save'),
        ];
    }

    protected function persist(): void
    {
        $data = $this->form->getState();

        AiSetting::current()->update($data);
    }

    public function save(): void
    {
        $this->persist();

        Notification::make()
            ->title('تنظیمات هوش مصنوعی ذخیره شد.')
            ->success()
            ->send();

        $this->mount();
    }

    public function testConnection(): void
    {
        $this->persist();

        $result = app(AIService::class)->testConnection();

        Notification::make()
            ->title($result['success'] ? 'اتصال موفق بود' : 'اتصال ناموفق بود')
            ->body($result['message'])
            ->color($result['success'] ? 'success' : 'danger')
            ->send();

        $this->mount();
    }
}
