<?php

namespace App\Filament\Pages;

use App\Jobs\RegenerateSitemapJob;
use App\Models\SeoSetting;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\Placeholder;
use Filament\Forms\Components\Textarea;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Illuminate\Support\HtmlString;
use Illuminate\Support\Str;

class TechnicalSeo extends Page
{
    protected string $view = 'filament.pages.technical-seo';

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedGlobeAlt;

    protected static ?string $navigationLabel = 'سئوی فنی';

    protected static ?string $title = 'سئوی فنی';

    protected static ?int $navigationSort = 6;

    /**
     * @var array<string, mixed>
     */
    public ?array $data = [];

    public function mount(): void
    {
        $settings = SeoSetting::current();

        $this->form->fill([
            'robots_txt' => $settings->robots_txt ?: app(\App\Services\SitemapService::class)->defaultRobotsTxt(),
        ]);
    }

    public function form(Schema $schema): Schema
    {
        return $schema
            ->statePath('data')
            ->components([
                Section::make('robots.txt')
                    ->description('در آدرس عمومی /robots.txt در دسترس است.')
                    ->schema([
                        Textarea::make('robots_txt')
                            ->label('محتوای robots.txt')
                            ->rows(10)
                            ->required()
                            ->rule(function () {
                                return function (string $attribute, mixed $value, \Closure $fail) {
                                    if (! Str::contains(Str::lower((string) $value), 'user-agent')) {
                                        $fail('محتوای robots.txt باید حداقل شامل یک خط User-agent باشد.');
                                    }
                                };
                            })
                            ->columnSpanFull(),
                    ]),

                Section::make('sitemap.xml')
                    ->description('در آدرس عمومی /sitemap.xml در دسترس است. شامل مقالات منتشرشده و محصولات فعال.')
                    ->schema([
                        Placeholder::make('sitemap_info')
                            ->label('')
                            ->content(fn () => self::renderSitemapPreview()),
                    ]),
            ]);
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('regenerate_sitemap')
                ->label('بازتولید نقشه سایت')
                ->color('gray')
                ->icon(Heroicon::OutlinedArrowPath)
                ->action('regenerateSitemap'),
            Action::make('save_robots')
                ->label('ذخیره robots.txt')
                ->action('saveRobots'),
        ];
    }

    public function saveRobots(): void
    {
        $data = $this->form->getState();

        SeoSetting::current()->update([
            'robots_txt' => $data['robots_txt'],
        ]);

        Notification::make()
            ->title('robots.txt ذخیره شد.')
            ->success()
            ->send();
    }

    public function regenerateSitemap(): void
    {
        RegenerateSitemapJob::dispatchSync();

        Notification::make()
            ->title('نقشه سایت با موفقیت بازتولید شد.')
            ->success()
            ->send();
    }

    private static function renderSitemapPreview(): HtmlString
    {
        $settings = SeoSetting::current();
        $generatedAt = $settings->sitemap_generated_at?->format('Y/m/d H:i') ?? 'هنوز تولید نشده است';
        $preview = e(Str::limit((string) $settings->sitemap_xml, 2000));

        $html = <<<HTML
            <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
                <p style="margin-bottom:8px;"><strong>آخرین زمان تولید:</strong> {$generatedAt}</p>
                <pre style="white-space:pre-wrap;font-size:12px;max-height:300px;overflow:auto;background:#f9fafb;padding:12px;border-radius:6px;direction:ltr;text-align:left;">{$preview}</pre>
            </div>
        HTML;

        return new HtmlString($html);
    }
}
