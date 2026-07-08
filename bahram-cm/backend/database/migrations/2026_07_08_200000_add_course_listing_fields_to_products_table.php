<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('show_on_courses')->default(false)->after('is_active');
            $table->boolean('featured_listing')->default(false)->after('show_on_courses');
            $table->string('course_level')->nullable()->after('featured_listing');
            $table->string('course_duration')->nullable()->after('course_level');
            $table->string('landing_href')->nullable()->after('course_duration');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'show_on_courses',
                'featured_listing',
                'course_level',
                'course_duration',
                'landing_href',
            ]);
        });
    }
};
