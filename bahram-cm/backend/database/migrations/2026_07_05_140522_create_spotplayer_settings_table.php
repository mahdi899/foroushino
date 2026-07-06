<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('spotplayer_settings', function (Blueprint $table) {
            $table->id();
            $table->text('spotplayer_api_key')->nullable(); // encrypted
            $table->string('spotplayer_base_url')->nullable();
            $table->boolean('is_spotplayer_active')->default(false);
            $table->unsignedInteger('default_license_duration')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('spotplayer_settings');
    }
};
