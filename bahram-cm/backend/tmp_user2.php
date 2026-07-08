<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = \App\Models\User::find(2);
echo "User #2 {$user->mobile} {$user->name}\n\n";

echo "All orders:\n";
foreach (\App\Models\Order::where('user_id', 2)->orWhere('customer_phone', '09123456789')->orderBy('id')->with('product')->get() as $o) {
    echo "  #{$o->id} {$o->order_number} product={$o->product_id} {$o->product?->title} status={$o->status}\n";
}

echo "\nAll products:\n";
foreach (\App\Models\Product::all() as $p) {
    echo "  #{$p->id} {$p->title} slug={$p->slug} sp={$p->spotplayer_course_id}\n";
}

echo "\nAll licenses user 2:\n";
foreach (\App\Models\SpotplayerLicense::where('user_id', 2)->with('order')->orderBy('id')->get() as $l) {
    echo "  license#{$l->id} product={$l->product_id} order={$l->order_id} {$l->order?->order_number} sp_course={$l->spotplayer_course_id}\n";
}
