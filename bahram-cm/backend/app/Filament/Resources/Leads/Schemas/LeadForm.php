<?php

namespace App\Filament\Resources\Leads\Schemas;

use Filament\Forms\Components\KeyValue;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class LeadForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('اطلاعات لید')
                    ->columns(2)
                    ->schema([
                        TextInput::make('name')->label('نام')->disabled(),
                        TextInput::make('phone')->label('شماره تماس')->disabled(),
                        TextInput::make('email')->label('ایمیل')->disabled(),
                        TextInput::make('source')->label('منبع')->disabled(),
                        TextInput::make('page_url')->label('آدرس صفحه')->disabled()->columnSpanFull(),
                        Textarea::make('message')->label('پیام')->disabled()->rows(3)->columnSpanFull(),
                        KeyValue::make('meta')->label('اطلاعات فنی')->disabled()->columnSpanFull(),
                    ]),

                Section::make('وضعیت پیگیری')
                    ->schema([
                        Select::make('status')
                            ->label('وضعیت')
                            ->options([
                                'new' => 'جدید',
                                'contacted' => 'تماس گرفته‌شده',
                                'converted' => 'تبدیل‌شده',
                                'ignored' => 'نادیده گرفته‌شده',
                            ])
                            ->required(),
                    ]),
            ]);
    }
}
