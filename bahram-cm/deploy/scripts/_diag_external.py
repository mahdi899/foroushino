import io, sys, urllib.request
from pathlib import Path
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

urls = [
    "https://rostami.app/",
    "https://rostami.club/",
    "https://rostami.app/_next/static/chunks/0k6c9i47ki3cm.js",
    "https://rostami.app/api/v1/family/branding",
]
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}
for url in urls:
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            body = r.read(500)
            print(f"OK {r.status} {url} ct={r.headers.get('Content-Type','?')[:40]} len={len(body)}+")
            if url.endswith("/") and b"\xe2\x80\x8c" in body or "loading" in body.lower() or "بارگذاری" in body.decode("utf-8", "ignore"):
                if "بارگذاری" in body.decode("utf-8", "ignore"):
                    print("  -> contains loading text in first 500 bytes")
    except Exception as e:
        print(f"FAIL {url}: {e}")

# check if next process is healthy after reload
env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
_, out, _ = c.exec_command("grep -E 'BACKEND|NEXT_PUBLIC' /var/www/bahram-cm/frontend/.env.local 2>/dev/null; pm2 restart bahram-frontend && sleep 4 && curl -sf -o /dev/null -w 'after_restart:%{http_code}\\n' http://127.0.0.1:3000/", timeout=60)
print(out.read().decode("utf-8", "replace"))
c.close()
