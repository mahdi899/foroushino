import json
import ssl
import urllib.error
import urllib.request
from pathlib import Path

secrets = json.loads((Path(__file__).resolve().parent / "_tg_secrets.local.json").read_text(encoding="utf-8"))
worker = secrets["worker_url"].rstrip("/")
proxy = secrets["proxy_token"]
secret = secrets["webhook_secret"]
ctx = ssl.create_default_context()

def req(method, url, headers=None, data=None):
    h = {"User-Agent": "bahram-worker-test/1.0", **(headers or {})}
    r = urllib.request.Request(url, method=method, headers=h, data=data)
    try:
        with urllib.request.urlopen(r, timeout=20, context=ctx) as resp:
            body = resp.read(500)
            return resp.status, body
    except urllib.error.HTTPError as e:
        return e.code, e.read(500)

webhook = f"{worker}/api/v1/integrations/telegram/production/webhook"
print("1) webhook POST no secret:", req("POST", webhook, {"Content-Type": "application/json"}, b'{"update_id":1}'))
print("2) webhook POST bad secret:", req("POST", webhook, {"Content-Type": "application/json", "X-Telegram-Bot-Api-Secret-Token": "bad"}, b'{"update_id":1}'))
print("3) webhook POST good secret:", req("POST", webhook, {"Content-Type": "application/json", "X-Telegram-Bot-Api-Secret-Token": secret}, b'{"update_id":999999001}'))

# proxy path - getMe needs real bot token; just test auth
print("4) bot proxy no auth:", req("GET", f"{worker}/botFAKE/getMe"))
print("5) bot proxy bad auth:", req("GET", f"{worker}/botFAKE/getMe", {"Authorization": "Bearer bad"}))
print("6) bot proxy good auth:", req("GET", f"{worker}/botFAKE/getMe", {"Authorization": f"Bearer {proxy}"}))
