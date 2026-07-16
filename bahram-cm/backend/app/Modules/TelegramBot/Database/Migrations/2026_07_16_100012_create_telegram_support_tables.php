<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('telegram_support_categories')) {
            return;
        }

        Schema::create('telegram_support_categories', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('title_fa');
            $table->unsignedBigInteger('default_topic_id')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('telegram_support_quick_replies', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('shortcut')->nullable();
            $table->text('body')->nullable();
            $table->string('parse_mode')->default('HTML');
            $table->string('media_type')->nullable();
            $table->string('telegram_file_id')->nullable();
            $table->json('buttons')->nullable();
            $table->foreignId('support_category_id')->nullable()->constrained('telegram_support_categories')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_support_quick_replies');
        Schema::dropIfExists('telegram_support_categories');
    }
};
