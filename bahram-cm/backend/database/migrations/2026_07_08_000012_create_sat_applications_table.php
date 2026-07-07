<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SAT is a collaboration-request form, not a purchasable product. It
     * must never be linked to manual_accesses or any paid product table.
     */
    public function up(): void
    {
        Schema::create('sat_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('mobile', 20);
            $table->string('city')->nullable();
            $table->unsignedTinyInteger('age')->nullable();
            $table->string('status')->default('received');
            $table->text('admin_note')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sat_applications');
    }
};
