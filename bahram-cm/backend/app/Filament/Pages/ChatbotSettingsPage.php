<?php

namespace App\Filament\Pages;

use App\Models\ChatbotSetting;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;

class ChatbotSettingsPage extends Page
{
    protected string $view = 'filament.pages.chatbot-settings-page';

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedChatBubbleLeftEllipsis;

    protected static ?string $navigationLabel = 'تنظیمات چت‌بات';

    protected static ?string $title = 'تنظیمات چت‌بات';

    protected static ?int $navigationSort = 12;

    protected static bool $shouldRegisterNavigation = false;

    /**
     * @var array<string, mixed>
     */
    public ?array $data = [];

    public function mount(): void
    {
        $settings = ChatbotSetting::current();

        $this->form->fill($settings->only([
            'is_enabled',
            'bot_name',
            'welcome_message',
            'system_prompt',
            'response_structure',
            'fallback_message',
            'collect_name_enabled',
            'collect_phone_enabled',
        ]));
    }

    public function form(Schema $schema): Schema
    {
        return $schema
            ->statePath('data')
            ->components([
                Section::make('رفتار چت‌بات')
                    ->columns(2)
                    ->schema([
                        Toggle::make('is_enabled')
                            ->label('فعال بودن چت‌بات')
                            ->helperText('در صورت غیرفعال بودن، ویجت چت در سایت نمایش داده نمی‌شود.')
                            ->columnSpanFull(),
                        TextInput::make('bot_name')
                            ->label('نام چت‌بات')
                            ->maxLength(255),
                        TextInput::make('welcome_message')
                            ->label('پیام خوش‌آمدگویی')
                            ->maxLength(500),
                        Toggle::make('collect_name_enabled')
                            ->label('درخواست نام از کاربر'),
                        Toggle::make('collect_phone_enabled')
                            ->label('درخواست شماره تماس از کاربر'),
                    ]),

                Section::make('هوش مصنوعی چت‌بات')
                    ->schema([
                        Textarea::make('system_prompt')
                            ->label('پرامپت سیستمی')
                            ->helperText('نحوه رفتار و لحن چت‌بات را مشخص می‌کند.')
                            ->rows(4)
                            ->columnSpanFull(),
                        Textarea::make('response_structure')
                            ->label('ساختار پاسخ (اختیاری)')
                            ->helperText('در صورت نیاز، قالب یا محدودیت خاصی برای پاسخ‌ها مشخص کنید.')
                            ->rows(2)
                            ->columnSpanFull(),
                        Textarea::make('fallback_message')
                            ->label('پیام جایگزین در صورت خطا یا غیرفعال بودن AI')
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

        ChatbotSetting::current()->update($data);

        Notification::make()
            ->title('تنظیمات چت‌بات ذخیره شد.')
            ->success()
            ->send();

        $this->mount();
    }
}
