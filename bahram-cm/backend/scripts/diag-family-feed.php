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
$request = Request::create('/api/v1/family/feed', 'GET', server: ['HTTP_AUTHORIZATION' => 'Bearer '.$token]);
$response = $app->handle($request);
echo 'user='.$user->id.' status='.$response->getStatusCode()."\n";
if ($response->getStatusCode() !== 200) {
    echo substr($response->getContent(), 0, 500)."\n";
}
