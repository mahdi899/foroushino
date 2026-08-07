<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$n1 = DB::table('families')->whereIn('lifecycle', ['forming', 'cooling'])->update(['lifecycle' => 'active']);
$n2 = DB::table('families')->where('lifecycle', 'dormant')->update(['lifecycle' => 'inactive']);

echo "updated active={$n1} inactive={$n2}\n";
echo 'distinct='.json_encode(DB::table('families')->distinct()->pluck('lifecycle'))."\n";
