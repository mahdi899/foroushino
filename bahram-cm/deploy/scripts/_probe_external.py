import ssl
import urllib.request

ctx = ssl.create_default_context()
urls = [
    "https://rostami.app/",
    "https://rostami.club/",
    "https://rostami.app/api/v1/family/branding",
    "https://rostami.app/_next/static/chunks/0k6c9i47ki3cm.js",
    "https://rostami.club/_next/static/chunks/0k6c9i47ki3cm.js",
]
headers = {"User-Agent": "Mozilla/5.0"}
for u in urls:
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=headers), timeout=20, context=ctx)
        ct = r.headers.get("Content-Type", "?")
        print(f"OK {r.status} {u} ct={ct[:50]}")
    except Exception as e:
        print(f"FAIL {u}: {e}")
