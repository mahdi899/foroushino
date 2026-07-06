<?php

beforeEach(function () {
    seedRoles();
});

it('lets an admin create a product', function () {
    $admin = makeAdmin();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/admin/products', [
        'name' => 'دوره جدید',
        'slug' => 'new-course',
        'price' => 2_000_000,
        'commission_rate' => 12,
    ]);

    $response->assertCreated();
    expect(\App\Models\Product::where('slug', 'new-course')->exists())->toBeTrue();
});

it('forbids a supervisor from creating a product', function () {
    $supervisor = makeSupervisor();

    $this->actingAs($supervisor, 'sanctum')->postJson('/api/v1/admin/products', [
        'name' => 'دوره جدید',
        'slug' => 'new-course-2',
        'price' => 2_000_000,
        'commission_rate' => 12,
    ])->assertForbidden();
});

it('lets a manager update an existing product', function () {
    $manager = makeManager();
    $product = makeProduct();

    $response = $this->actingAs($manager, 'sanctum')
        ->patchJson("/api/v1/admin/products/{$product->id}", ['price' => 9_999_000]);

    $response->assertOk();
    expect((float) $product->fresh()->price)->toBe(9999000.0);
});

it('lets a manager create a campaign linked to a product', function () {
    $manager = makeManager();
    $product = makeProduct();

    $response = $this->actingAs($manager, 'sanctum')->postJson('/api/v1/admin/campaigns', [
        'name' => 'کمپین تابستان',
        'product_id' => $product->id,
        'source' => 'instagram',
    ]);

    $response->assertCreated();
    expect(\App\Models\Campaign::where('name', 'کمپین تابستان')->exists())->toBeTrue();
});

it('deactivates a product instead of deleting it', function () {
    $manager = makeManager();
    $product = makeProduct();

    $this->actingAs($manager, 'sanctum')->deleteJson("/api/v1/admin/products/{$product->id}")->assertOk();

    expect($product->fresh()->is_active)->toBeFalse();
    expect(\App\Models\Product::find($product->id))->not->toBeNull();
});
