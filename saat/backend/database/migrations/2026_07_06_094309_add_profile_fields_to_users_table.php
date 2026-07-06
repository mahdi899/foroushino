<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('phone', 20)->nullable()->unique()->after('email');
            $table->string('avatar')->nullable()->after('phone');
            $table->unsignedBigInteger('telegram_id')->nullable()->unique()->after('avatar');
            $table->unsignedSmallInteger('level')->default(1)->after('telegram_id');
            $table->unsignedInteger('points')->default(0)->after('level');
            $table->unsignedSmallInteger('streak')->default(0)->after('points');
            $table->unsignedSmallInteger('call_goal')->default(40)->after('streak');
            $table->unsignedSmallInteger('sale_goal')->default(3)->after('call_goal');
            $table->string('availability', 20)->default('offline')->after('sale_goal');
            $table->timestamp('availability_changed_at')->nullable()->after('availability');
            $table->boolean('is_active')->default(true)->after('availability_changed_at');
            $table->boolean('mask_phone_numbers')->default(false)->after('is_active');
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'phone', 'avatar', 'telegram_id', 'level', 'points', 'streak',
                'call_goal', 'sale_goal', 'availability', 'availability_changed_at',
                'is_active', 'mask_phone_numbers',
            ]);
            $table->dropSoftDeletes();
        });
    }
};
