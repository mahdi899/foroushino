<?php

return [
    'payout' => [
        'min_amount' => (int) env('WALLET_PAYOUT_MIN', 100_000),
        'step_amount' => (int) env('WALLET_PAYOUT_STEP', 1_000),
    ],
];
