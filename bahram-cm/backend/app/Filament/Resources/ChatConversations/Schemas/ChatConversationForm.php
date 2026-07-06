<?php

namespace App\Filament\Resources\ChatConversations\Schemas;

use App\Models\ChatConversation;
use Filament\Forms\Components\Placeholder;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Illuminate\Support\HtmlString;

class ChatConversationForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('اطلاعات مخاطب')
                    ->columns(3)
                    ->schema([
                        TextInput::make('session_id')->label('شناسه نشست')->disabled(),
                        TextInput::make('name')->label('نام')->disabled(),
                        TextInput::make('phone')->label('شماره تماس')->disabled(),
                    ]),

                Section::make('وضعیت')
                    ->schema([
                        Select::make('status')
                            ->label('وضعیت گفتگو')
                            ->options([
                                'open' => 'باز',
                                'closed' => 'بسته‌شده',
                            ])
                            ->required(),
                    ]),

                Section::make('تاریخچه گفتگو')
                    ->schema([
                        Placeholder::make('transcript')
                            ->label('')
                            ->content(fn (?ChatConversation $record) => $record ? self::renderTranscript($record) : null),
                    ]),
            ]);
    }

    private static function renderTranscript(ChatConversation $record): HtmlString
    {
        $messages = $record->messages()->orderBy('id')->get();

        if ($messages->isEmpty()) {
            return new HtmlString('<p style="color:#6b7280;">پیامی ثبت نشده است.</p>');
        }

        $rows = $messages->map(function ($message) {
            $isUser = $message->sender === 'user';
            $align = $isUser ? 'right' : 'left';
            $bg = $isUser ? '#eff6ff' : '#f3f4f6';
            $label = $isUser ? 'کاربر' : 'ربات';
            $text = nl2br(e($message->message));

            return "<div style=\"text-align:{$align};margin-bottom:10px;\">".
                "<div style=\"display:inline-block;max-width:70%;background:{$bg};padding:8px 12px;border-radius:8px;\">".
                "<div style=\"font-size:11px;color:#6b7280;margin-bottom:4px;\">{$label} — {$message->created_at->format('Y/m/d H:i')}</div>".
                "<div>{$text}</div>".
                '</div></div>';
        })->implode('');

        return new HtmlString("<div style=\"max-height:400px;overflow-y:auto;padding:12px;border:1px solid #e5e7eb;border-radius:8px;\">{$rows}</div>");
    }
}
