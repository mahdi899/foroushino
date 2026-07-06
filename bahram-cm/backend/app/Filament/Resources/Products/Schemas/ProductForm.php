<?php

namespace App\Filament\Resources\Products\Schemas;

use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\RichEditor;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Illuminate\Support\Str;

class ProductForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('اطلاعات محصول')
                    ->columns(2)
                    ->schema([
                        TextInput::make('title')
                            ->label('عنوان محصول')
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
                            ->unique(ignoreRecord: true)
                            ->maxLength(255)
                            ->columnSpanFull(),
                        Select::make('type')
                            ->label('نوع محصول')
                            ->options([
                                'package' => 'پکیج',
                                'normal' => 'عادی',
                            ])
                            ->default('normal')
                            ->required(),
                        Toggle::make('is_active')
                            ->label('فعال')
                            ->default(true),
                        Textarea::make('short_description')
                            ->label('توضیح کوتاه')
                            ->rows(2)
                            ->maxLength(500)
                            ->columnSpanFull(),
                        RichEditor::make('description')
                            ->label('توضیحات کامل')
                            ->columnSpanFull(),
                        FileUpload::make('featured_image')
                            ->label('تصویر شاخص')
                            ->image()
                            ->disk('public')
                            ->directory('products')
                            ->imageEditor()
                            ->columnSpanFull(),
                    ]),

                Section::make('قیمت‌گذاری')
                    ->columns(2)
                    ->schema([
                        TextInput::make('price')
                            ->label('قیمت (تومان)')
                            ->numeric()
                            ->required()
                            ->minValue(0),
                        TextInput::make('sale_price')
                            ->label('قیمت با تخفیف (اختیاری)')
                            ->numeric()
                            ->minValue(0),
                    ]),

                Section::make('اتصال به SpotPlayer')
                    ->columns(2)
                    ->schema([
                        TextInput::make('spotplayer_course_id')
                            ->label('شناسه دوره در SpotPlayer')
                            ->maxLength(255),
                        TextInput::make('spotplayer_product_id')
                            ->label('شناسه محصول در SpotPlayer')
                            ->maxLength(255),
                    ]),

                Section::make('سئو')
                    ->columns(2)
                    ->schema([
                        TextInput::make('meta_title')
                            ->label('Meta Title')
                            ->maxLength(255),
                        Textarea::make('meta_description')
                            ->label('Meta Description')
                            ->rows(2)
                            ->maxLength(500),
                    ]),
            ]);
    }
}
