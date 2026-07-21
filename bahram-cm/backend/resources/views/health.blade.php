<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bahram</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f3f4f6;
            font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
            color: #111827;
        }
        .card {
            width: min(42rem, 92vw);
            padding: 1.5rem;
            border-radius: 0.75rem;
            background: #fff;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
        }
        .row { display: flex; align-items: center; gap: 1rem; }
        .dot {
            width: 0.75rem;
            height: 0.75rem;
            border-radius: 999px;
            background: #22c55e;
            flex: 0 0 auto;
        }
        .dot.down { background: #ef4444; }
        h1 { margin: 0; font-size: 1.25rem; }
        p { margin: 0.5rem 0 0; color: #6b7280; font-size: 0.875rem; line-height: 1.5; }
    </style>
</head>
<body>
    <div class="card">
        <div class="row">
            <span class="dot{{ $exception ? ' down' : '' }}" aria-hidden="true"></span>
            <div>
                <h1>{{ $exception ? 'Application down' : 'Application up' }}</h1>
                <p>
                    HTTP request received.
                    @isset($time)
                        Response rendered in {{ $time }}ms.
                    @endisset
                </p>
            </div>
        </div>
    </div>
</body>
</html>
