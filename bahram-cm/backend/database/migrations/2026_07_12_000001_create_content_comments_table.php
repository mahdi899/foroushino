<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_comments', function (Blueprint $table) {
            $table->id();
            $table->string('content_type', 32);
            $table->string('content_slug');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('author_name');
            $table->string('author_email')->nullable();
            $table->string('author_avatar_url', 512)->nullable();
            $table->text('body');
            $table->string('status', 20)->default('pending');
            $table->foreignId('parent_id')->nullable()->constrained('content_comments')->nullOnDelete();
            $table->timestamps();

            $table->index(['content_type', 'content_slug', 'status']);
            $table->index(['status', 'created_at']);
        });

        if (Schema::hasTable('mini_course_comments')) {
            $this->migrateMiniCourseComments();
            Schema::dropIfExists('mini_course_comments');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('content_comments');
    }

    private function migrateMiniCourseComments(): void
    {
        $rows = DB::table('mini_course_comments')
            ->join('mini_courses', 'mini_courses.id', '=', 'mini_course_comments.mini_course_id')
            ->select([
                'mini_course_comments.id',
                'mini_courses.slug as content_slug',
                'mini_course_comments.author_name',
                'mini_course_comments.author_email',
                'mini_course_comments.body',
                'mini_course_comments.status',
                'mini_course_comments.parent_id',
                'mini_course_comments.created_at',
                'mini_course_comments.updated_at',
            ])
            ->orderBy('mini_course_comments.id')
            ->get();

        $idMap = [];

        foreach ($rows->whereNull('parent_id') as $row) {
            $newId = DB::table('content_comments')->insertGetId([
                'content_type' => 'mini_course',
                'content_slug' => $row->content_slug,
                'user_id' => null,
                'author_name' => $row->author_name,
                'author_email' => $row->author_email,
                'author_avatar_url' => null,
                'body' => $row->body,
                'status' => $row->status,
                'parent_id' => null,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
            $idMap[$row->id] = $newId;
        }

        foreach ($rows->whereNotNull('parent_id') as $row) {
            DB::table('content_comments')->insert([
                'content_type' => 'mini_course',
                'content_slug' => $row->content_slug,
                'user_id' => null,
                'author_name' => $row->author_name,
                'author_email' => $row->author_email,
                'author_avatar_url' => null,
                'body' => $row->body,
                'status' => $row->status,
                'parent_id' => $idMap[$row->parent_id] ?? null,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
        }
    }
};
