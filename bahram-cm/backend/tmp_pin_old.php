<?php

use App\Models\FamilyPost;

require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

FamilyPost::query()->where('is_pinned', true)->update(['is_pinned' => false, 'pinned_at' => null]);

$earliest = FamilyPost::query()->where('status', 'published')->orderBy('published_at')->orderBy('id')->first();
$earliest->update(['is_pinned' => true, 'pinned_at' => now()]);

echo 'pinned id=' . $earliest->id . ' published_at=' . $earliest->published_at . PHP_EOL;

$latest = FamilyPost::query()->where('status', 'published')->orderByDesc('published_at')->orderByDesc('id')->first();
echo 'latest id=' . $latest->id . ' published_at=' . $latest->published_at . PHP_EOL;
echo 'total published=' . FamilyPost::query()->where('status', 'published')->count() . PHP_EOL;
