import io, sys, urllib.request
from pathlib import Path
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Check CF cache age on live sites
for url in ["https://rostami.app/", "https://rostami.club/"]:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        print(url)
        for h in ["age", "cf-cache-status", "cache-control", "cdn-cache-control"]:
            print(f"  {h}: {r.headers.get(h, '-')}")

env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
# fetch HTML and extract first js chunk, verify it loads
import re
req = urllib.request.Request("https://rostami.app/", headers={"User-Agent": "Mozilla/5.0"})
html = urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "ignore")
chunks = re.findall(r'/_next/static/chunks/[^"\']+\.js', html)[:3]
print("chunks in HTML:", chunks)
for ch in chunks[:2]:
    u = "https://rostami.app" + ch
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=15)
        print(f"  {ch} -> {r.status}")
    except Exception as e:
        print(f"  {ch} -> BROKEN {e}")
