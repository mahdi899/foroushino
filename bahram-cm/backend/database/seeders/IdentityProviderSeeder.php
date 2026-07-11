<?php

namespace Database\Seeders;

use App\Enums\IdentityCapability;
use App\Models\IdentityProviderConfig;
use App\Models\IdentityVerificationRoute;
use App\Services\Identity\Providers\ApiIrShahkarProvider;
use App\Services\Identity\Providers\HodaProvider;
use App\Services\Identity\Providers\ManualReviewProvider;
use App\Services\Identity\Providers\UidEkycProvider;
use App\Services\Identity\Providers\UidShahkarProvider;
use Illuminate\Database\Seeder;

class IdentityProviderSeeder extends Seeder
{
    public function run(): void
    {
        $providers = [
            [
                'slug' => ManualReviewProvider::SLUG,
                'label' => 'بررسی دستی',
                'capabilities' => [
                    IdentityCapability::IdentityManualReview->value,
                    IdentityCapability::DocumentReview->value,
                ],
                'is_enabled' => true,
                'settings' => [],
            ],
            [
                'slug' => UidShahkarProvider::SLUG,
                'label' => 'یوآیدی شاهکار',
                'capabilities' => [IdentityCapability::MobileNationalCodeMatch->value],
                'is_enabled' => false,
                'settings' => [
                    'base_url' => 'https://json-api.uid.ir',
                    'verify_path' => '/api/inquiry/mobile/owner/v2',
                    'timeout' => 20,
                ],
            ],
            [
                'slug' => ApiIrShahkarProvider::SLUG,
                'label' => 'API.ir شاهکار',
                'capabilities' => [IdentityCapability::MobileNationalCodeMatch->value],
                'is_enabled' => false,
                'settings' => [
                    'base_url' => '',
                    'verify_path' => '/api/shahkar',
                    'timeout' => 20,
                ],
            ],
            [
                'slug' => UidEkycProvider::SLUG,
                'label' => 'یوآیدی eKYC',
                'capabilities' => [
                    IdentityCapability::SelfieVideoVerification->value,
                    IdentityCapability::FaceLiveness->value,
                    IdentityCapability::FaceMatch->value,
                ],
                'is_enabled' => false,
                'settings' => [
                    'base_url' => 'https://json-api.uid.ir',
                ],
            ],
            [
                'slug' => HodaProvider::SLUG,
                'label' => 'هدا (آینده)',
                'capabilities' => [],
                'is_enabled' => false,
                'settings' => [],
            ],
        ];

        foreach ($providers as $row) {
            IdentityProviderConfig::query()->updateOrCreate(
                ['slug' => $row['slug']],
                [
                    'label' => $row['label'],
                    'capabilities' => $row['capabilities'],
                    'is_enabled' => $row['is_enabled'],
                    'settings' => $row['settings'],
                    // credentials intentionally empty / disabled placeholders
                ],
            );
        }

        IdentityVerificationRoute::query()->updateOrCreate(
            ['capability' => IdentityCapability::IdentityManualReview->value],
            [
                'primary_provider' => ManualReviewProvider::SLUG,
                'fallback_provider' => null,
                'is_active' => true,
            ],
        );

        IdentityVerificationRoute::query()->updateOrCreate(
            ['capability' => IdentityCapability::DocumentReview->value],
            [
                'primary_provider' => ManualReviewProvider::SLUG,
                'fallback_provider' => null,
                'is_active' => true,
            ],
        );

        // Primary api-ir placeholder (disabled until credentials); fallback uid-shahkar placeholder.
        IdentityVerificationRoute::query()->updateOrCreate(
            ['capability' => IdentityCapability::MobileNationalCodeMatch->value],
            [
                'primary_provider' => ApiIrShahkarProvider::SLUG,
                'fallback_provider' => UidShahkarProvider::SLUG,
                'is_active' => true,
            ],
        );
    }
}
