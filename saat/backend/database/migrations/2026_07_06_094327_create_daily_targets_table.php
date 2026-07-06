<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_targets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date')->index();
            $table->unsignedSmallInteger('call_goal')->default(0);
            $table->unsignedSmallInteger('sale_goal')->default(0);
            $table->unsignedSmallInteger('calls_made')->default(0);
            $table->unsignedSmallInteger('sales_made')->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_targets');
    }
};
