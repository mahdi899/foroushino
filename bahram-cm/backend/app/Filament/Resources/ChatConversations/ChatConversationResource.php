<?php

namespace App\Filament\Resources\ChatConversations;

use App\Filament\Resources\ChatConversations\Pages\EditChatConversation;
use App\Filament\Resources\ChatConversations\Pages\ListChatConversations;
use App\Filament\Resources\ChatConversations\Schemas\ChatConversationForm;
use App\Filament\Resources\ChatConversations\Tables\ChatConversationsTable;
use App\Models\ChatConversation;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class ChatConversationResource extends Resource
{
    protected static ?string $model = ChatConversation::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedChatBubbleLeftRight;

    protected static ?string $navigationLabel = 'گفتگوهای چت‌بات';

    protected static ?string $modelLabel = 'گفتگو';

    protected static ?string $pluralModelLabel = 'گفتگوها';

    protected static ?int $navigationSort = 5;

    public static function canCreate(): bool
    {
        return false;
    }

    public static function form(Schema $schema): Schema
    {
        return ChatConversationForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return ChatConversationsTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListChatConversations::route('/'),
            'edit' => EditChatConversation::route('/{record}/edit'),
        ];
    }
}
