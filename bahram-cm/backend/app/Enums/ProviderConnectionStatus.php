<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum ProviderConnectionStatus: string
{
    use EnumValues;

    case Connected = 'connected';
    case InvalidCredentials = 'invalid_credentials';
    case ProviderUnavailable = 'provider_unavailable';
    case ConfigurationIncomplete = 'configuration_incomplete';
}
