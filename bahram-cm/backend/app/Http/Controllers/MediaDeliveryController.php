<?php

namespace App\Http\Controllers;

use App\Services\MediaDeliveryService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class MediaDeliveryController extends Controller
{
    public function __construct(private readonly MediaDeliveryService $delivery)
    {
    }

    public function show(Request $request, string $path): Response
    {
        $width = $request->query('w');
        $quality = (int) $request->query('q', 85);

        return $this->delivery->deliver(
            $path,
            is_numeric($width) ? (int) $width : null,
            $quality,
        );
    }
}
