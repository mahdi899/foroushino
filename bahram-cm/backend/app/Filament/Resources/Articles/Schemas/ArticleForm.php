<?php

namespace App\Filament\Resources\Articles\Schemas;

use AmidEsfahani\FilamentTinyEditor\TinyEditor;
use App\Models\Article;
use App\Models\User;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Placeholder;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Illuminate\Support\Str;
use Illuminate\Support\HtmlString;

class ArticleForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('محتوای مقاله')
                    ->columns(2)
                    ->schema([
                        TextInput::make('title')
                            ->label('عنوان')
                            ->required()
                            ->maxLength(255)
                            ->live(onBlur: true)
                            ->afterStateUpdated(function (string $context, $state, callable $set, $get) {
                                if ($context === 'create' && blank($get('slug'))) {
                                    $set('slug', Str::slug($state));
                                }
                            })
                            ->columnSpanFull(),
                        TextInput::make('slug')
                            ->label('آدرس (slug)')
                            ->required()
                            ->maxLength(255)
                            ->unique(ignoreRecord: true)
                            ->helperText('در صورت خالی گذاشتن، به‌صورت خودکار از عنوان ساخته می‌شود.')
                            ->columnSpanFull(),
                        Textarea::make('excerpt')
                            ->label('خلاصه مقاله')
                            ->rows(3)
                            ->maxLength(500)
                            ->columnSpanFull(),
                        TinyEditor::make('content')
                            ->label('محتوای مقاله')
                            ->profile('default')
                            ->fileAttachmentsDisk('public')
                            ->fileAttachmentsVisibility('public')
                            ->required()
                            ->columnSpanFull(),
                        FileUpload::make('featured_image')
                            ->label('تصویر شاخص')
                            ->image()
                            ->disk('public')
                            ->directory('articles')
                            ->imageEditor()
                            ->columnSpanFull(),
                    ]),

                Section::make('سئو مقاله')
                    ->columns(2)
                    ->schema([
                        TextInput::make('focus_keyword')
                            ->label('کلمه کلیدی اصلی')
                            ->maxLength(255),
                        TextInput::make('canonical_url')
                            ->label('لینک کانونیکال (اختیاری)')
                            ->url()
                            ->maxLength(255),
                        TextInput::make('meta_title')
                            ->label('Meta Title')
                            ->maxLength(255)
                            ->columnSpanFull(),
                        Textarea::make('meta_description')
                            ->label('Meta Description')
                            ->rows(2)
                            ->maxLength(500)
                            ->columnSpanFull(),
                        Toggle::make('is_indexable')
                            ->label('قابل ایندکس توسط موتورهای جستجو')
                            ->default(true),
                    ]),

                Section::make('وضعیت سئو')
                    ->columns(1)
                    ->visible(fn (?Article $record) => $record !== null)
                    ->schema([
                        Placeholder::make('seo_overview')
                            ->label('')
                            ->content(fn (?Article $record) => $record ? self::renderSeoOverview($record) : null),
                    ]),

                Section::make('انتشار')
                    ->columns(2)
                    ->schema([
                        Select::make('status')
                            ->label('وضعیت')
                            ->options([
                                'draft' => 'پیش‌نویس',
                                'published' => 'منتشرشده',
                            ])
                            ->default('draft')
                            ->required()
                            ->live(),
                        DateTimePicker::make('published_at')
                            ->label('زمان انتشار')
                            ->native(false)
                            ->default(now())
                            ->visible(fn (callable $get) => $get('status') === 'published'),
                        Select::make('author_id')
                            ->label('نویسنده')
                            ->options(fn () => User::query()->pluck('name', 'id'))
                            ->searchable()
                            ->default(fn () => auth()->id()),
                    ]),
            ]);
    }

    private static function renderSeoOverview(Article $record): HtmlString
    {
        $colors = [
            'good' => ['#16a34a', 'خوب'],
            'ok' => ['#ca8a04', 'متوسط'],
            'poor' => ['#dc2626', 'ضعیف'],
        ];

        [$color, $label] = $colors[$record->seo_status] ?? $colors['poor'];

        $rows = collect($record->seo_checks ?? [])->map(function (array $check) {
            $icon = $check['passed'] ?? false ? '✅' : '❌';
            $title = e($check['title'] ?? '');
            $message = e($check['message'] ?? '');

            return "<li style=\"margin-bottom:6px;\">{$icon} <strong>{$title}:</strong> {$message}</li>";
        })->implode('');

        $html = <<<HTML
            <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <span style="display:inline-block;width:14px;height:14px;border-radius:9999px;background:{$color};"></span>
                    <strong style="font-size:16px;">امتیاز سئو: {$record->seo_score} / 100 ({$label})</strong>
                </div>
                <ul style="list-style:none;padding:0;margin:0;">{$rows}</ul>
            </div>
        HTML;

        return new HtmlString($html);
    }
}
