<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\FamilyMembership;
use App\Models\User;
use Illuminate\Http\Request;

$membership = FamilyMembership::query()->first();
$user = $membership ? User::query()->find($membership->user_id) : User::query()->first();
if (! $user) {
    echo "no user\n";
    exit(1);
}

$token = $user->createToken('diag')->plainTextToken;
$endpoints = [
    '/api/v1/family/pinned',
    '/api/v1/family/me',
    '/api/v1/family/feed?limit=4',
    '/api/v1/family/feed/unread-summary?after_id=0',
    '/api/v1/family/branding',
    '/api/v1/family/pulse',
];

foreach ($endpoints as $path) {
    $request = Request::create($path, 'GET', server: ['HTTP_AUTHORIZATION' => 'Bearer '.$token]);
    $response = $app->handle($request);
    $status = $response->getStatusCode();
    echo $path.' -> '.$status.PHP_EOL;
    if ($status !== 200) {
        echo substr($response->getContent(), 0, 300).PHP_EOL;
    }
}
