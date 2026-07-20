import io, sys
from pathlib import Path
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

chunks = [
    "/_next/static/chunks/0k6c9i47ki3cm.js",
    "/_next/static/chunks/0m97bbjp.vgzu.js",
    "/_next/static/chunks/0enmt9vpoejwv.css",
]
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
for host in ["rostami.app", "rostami.club"]:
    print(f"=== {host} ===")
    for ch in chunks:
        cmd = f"curl -sk -o /dev/null -w '{ch}:%{{http_code}} size:%{{size_download}}\\n' -H 'Host: {host}' 'https://127.0.0.1{ch}'"
        _, out, _ = c.exec_command(cmd, timeout=30)
        print(out.read().decode().strip())
# external via python requests
try:
    import urllib.request
    for url in ["https://rostami.app/_next/static/chunks/0k6c9i47ki3cm.js", "https://rostami.club/_next/static/chunks/0k6c9i47ki3cm.js"]:
        try:
            r = urllib.request.urlopen(url, timeout=15)
            print(f"EXT {url} -> {r.status} len={r.headers.get('Content-Length','?')}")
        except Exception as e:
            print(f"EXT {url} -> FAIL {e}")
except Exception as e:
    print("ext check skip", e)
c.close()
