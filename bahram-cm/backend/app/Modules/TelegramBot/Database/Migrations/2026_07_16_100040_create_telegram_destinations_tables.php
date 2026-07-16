<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('telegram_destinations')) {
            Schema::create('telegram_destinations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('telegram_bot_id')
                    ->constrained('telegram_bots', indexName: 'tg_dest_bot_fk')
                    ->cascadeOnDelete();
                $table->string('title');
                $table->string('chat_id');
                $table->string('chat_type')->default('channel');
                $table->string('username')->nullable();
                $table->string('join_request_url')->nullable();
                $table->string('access_mode')->default('join_request');
                $table->boolean('is_active')->default(true);
                $table->boolean('welcome_inside_chat')->default(false);
                $table->json('settings')->nullable();
                $table->timestamps();

                $table->unique(['telegram_bot_id', 'chat_id'], 'tg_dest_bot_chat_unique');
            });
        }

        if (! Schema::hasTable('telegram_destination_requirements')) {
            Schema::create('telegram_destination_requirements', function (Blueprint $table) {
                $table->id();
                $table->foreignId('telegram_destination_id')
                    ->constrained('telegram_destinations', indexName: 'tg_dest_req_dest_fk')
                    ->cascadeOnDelete();
                $table->string('requirement_type');
                $table->string('requirement_value')->nullable();
                $table->string('group_key')->nullable();
                $table->string('operator', 8)->default('all');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('telegram_access_grants')) {
            Schema::create('telegram_access_grants', function (Blueprint $table) {
                $table->id();
                $table->foreignId('telegram_destination_id')
                    ->constrained('telegram_destinations', indexName: 'tg_access_grant_dest_fk')
                    ->cascadeOnDelete();
                $table->foreignId('user_id')
                    ->constrained('users', indexName: 'tg_access_grant_user_fk')
                    ->cascadeOnDelete();
                $table->string('reason')->nullable();
                $table->foreignId('granted_by')
                    ->nullable()
                    ->constrained('users', indexName: 'tg_access_grant_by_fk')
                    ->nullOnDelete();
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();

                $table->unique(['telegram_destination_id', 'user_id'], 'tg_access_grant_unique');
            });
        }

        if (! Schema::hasTable('telegram_access_denials')) {
            Schema::create('telegram_access_denials', function (Blueprint $table) {
                $table->id();
                $table->foreignId('telegram_destination_id')
                    ->constrained('telegram_destinations', indexName: 'tg_access_deny_dest_fk')
                    ->cascadeOnDelete();
                $table->foreignId('user_id')
                    ->constrained('users', indexName: 'tg_access_deny_user_fk')
                    ->cascadeOnDelete();
                $table->string('reason')->nullable();
                $table->foreignId('denied_by')
                    ->nullable()
                    ->constrained('users', indexName: 'tg_access_deny_by_fk')
                    ->nullOnDelete();
                $table->timestamps();

                $table->unique(['telegram_destination_id', 'user_id'], 'tg_access_deny_unique');
            });
        }

        if (! Schema::hasTable('telegram_join_requests')) {
            Schema::create('telegram_join_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('telegram_bot_id')
                    ->constrained('telegram_bots', indexName: 'tg_join_req_bot_fk')
                    ->cascadeOnDelete();
                $table->foreignId('telegram_destination_id')
                    ->nullable()
                    ->constrained('telegram_destinations', indexName: 'tg_join_req_dest_fk')
                    ->nullOnDelete();
                $table->string('chat_id');
                $table->unsignedBigInteger('telegram_user_id');
                $table->foreignId('user_id')
                    ->nullable()
                    ->constrained('users', indexName: 'tg_join_req_user_fk')
                    ->nullOnDelete();
                $table->string('status')->default('pending');
                $table->string('decision_reason')->nullable();
                $table->timestamp('decided_at')->nullable();
                $table->timestamps();

                $table->index(['chat_id', 'telegram_user_id'], 'tg_join_req_chat_user_idx');
                $table->index(['status'], 'tg_join_req_status_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_join_requests');
        Schema::dropIfExists('telegram_access_denials');
        Schema::dropIfExists('telegram_access_grants');
        Schema::dropIfExists('telegram_destination_requirements');
        Schema::dropIfExists('telegram_destinations');
    }
};
