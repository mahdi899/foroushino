<?php

namespace App\Filament\Pages;

use App\Jobs\GenerateArticleJob;
use App\Services\AIService;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;

class GenerateArticle extends Page
{
    protected string $view = 'filament.pages.generate-article';

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedSparkles;

    protected static ?string $navigationLabel = 'تولید مقاله با AI';

    protected static ?string $title = 'تولید مقاله با هوش مصنوعی';

    protected static ?int $navigationSort = 3;

    /**
     * @var array<string, mixed>
     */
    public ?array $data = [];

    public function mount(): void
    {
        $this->form->fill([
            'tone' => 'حرفه‌ای و قابل‌فهم',
            'audience' => 'عموم مخاطبان فارسی‌زبان',
            'word_count' => 800,
        ]);
    }

    public function form(Schema $schema): Schema
    {
        return $schema
            ->statePath('data')
            ->components([
                Section::make('مشخصات مقاله درخواستی')
                    ->description('پس از ثبت، مقاله به‌صورت خودکار در پس‌زمینه تولید و به‌عنوان پیش‌نویس در بخش «مقالات» ذخیره می‌شود.')
                    ->columns(2)
                    ->schema([
                        TextInput::make('topic')
                            ->label('موضوع مقاله')
                            ->required()
                            ->maxLength(255)
                            ->columnSpanFull(),
                        TextInput::make('focus_keyword')
                            ->label('کلمه کلیدی اصلی')
                            ->required()
                            ->maxLength(255),
                        TextInput::make('secondary_keywords')
                            ->label('کلمات کلیدی فرعی (اختیاری)')
                            ->helperText('با کاما از هم جدا کنید.')
                            ->maxLength(255),
                        Select::make('tone')
                            ->label('لحن مقاله')
                            ->options([
                                'حرفه‌ای و قابل‌فهم' => 'حرفه‌ای و قابل‌فهم',
                                'دوستانه و صمیمی' => 'دوستانه و صمیمی',
                                'رسمی و آکادمیک' => 'رسمی و آکادمیک',
                                'ترغیب‌کننده و فروش‌محور' => 'ترغیب‌کننده و فروش‌محور',
                            ])
                            ->searchable(),
                        TextInput::make('audience')
                            ->label('مخاطب هدف')
                            ->maxLength(255),
                        TextInput::make('word_count')
                            ->label('تعداد تقریبی کلمات')
                            ->numeric()
                            ->minValue(200)
                            ->maxValue(3000)
                            ->step(50),
                        Textarea::make('custom_prompt')
                            ->label('توضیحات یا پرامپت اختصاصی (اختیاری)')
                            ->rows(3)
                            ->columnSpanFull(),
                    ]),
            ]);
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('generate')
                ->label('تولید مقاله')
                ->icon(Heroicon::OutlinedSparkles)
                ->action('generate'),
        ];
    }

    public function generate(): void
    {
        if (! app(AIService::class)->isConfigured()) {
            Notification::make()
                ->title('سرویس هوش مصنوعی تنظیم نشده است')
                ->body('لطفاً ابتدا از بخش «تنظیمات AI» کلید API را وارد و فعال کنید.')
                ->danger()
                ->send();

            return;
        }

        $data = $this->form->getState();

        GenerateArticleJob::dispatch($data, auth()->id());

        Notification::make()
            ->title('درخواست تولید مقاله ثبت شد')
            ->body('مقاله به‌صورت خودکار تولید و به‌عنوان پیش‌نویس در بخش «مقالات» ذخیره می‌شود. پس از تولید می‌توانید آن را ویرایش و منتشر کنید.')
            ->success()
            ->send();

        $this->form->fill([
            'topic' => null,
            'focus_keyword' => null,
            'secondary_keywords' => null,
            'custom_prompt' => null,
        ]);
    }
}
