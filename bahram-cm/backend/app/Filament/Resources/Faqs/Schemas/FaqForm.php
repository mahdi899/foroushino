<?php

namespace App\Filament\Resources\Faqs\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class FaqForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('question')
                    ->label('سوال')
                    ->required()
                    ->maxLength(255)
                    ->columnSpanFull(),
                Textarea::make('answer')
                    ->label('پاسخ')
                    ->required()
                    ->rows(5)
                    ->columnSpanFull(),
                TextInput::make('category')
                    ->label('دسته‌بندی')
                    ->maxLength(255),
                TextInput::make('sort_order')
                    ->label('ترتیب نمایش')
                    ->numeric()
                    ->default(0),
                Toggle::make('is_active')
                    ->label('فعال')
                    ->default(true),
            ]);
    }
}
