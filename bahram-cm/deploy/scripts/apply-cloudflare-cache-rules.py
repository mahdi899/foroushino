#!/usr/bin/env python3
"""
Apply Cloudflare Cache Rules for rostami.app / cdn.rostami.app.

Requires:
  CLOUDFLARE_API_TOKEN  (Zone Cache Rules Edit + Zone Read, or Account Rulesets Edit)
  CLOUDFLARE_ZONE_ID    (rostami.app zone)

Can also read from bahram-cm/deploy/deploy.env or backend/.env on the server.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RULES_PATH = ROOT / "docs" / "cloudflare-cache-rules.example.json"
DEPLOY_ENV = Path(__file__).resolve().parents[1] / "deploy.env"

# Cloudflare Ruleset phase for Cache Rules
PHASE = "http_request_cache_settings"


def load_env_file(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.exists():
        return out
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def cf_request(method: str, url: str, token: str, body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        raise RuntimeError(f"CF API {method} {url} → {e.code}: {detail[:800]}") from e


def example_to_ruleset_rules(examples: list[dict]) -> list[dict]:
    rules: list[dict] = []
    for item in examples:
        action = item["action"]
        if action == "bypass_cache":
            rules.append(
                {
                    "action": "set_cache_settings",
                    "description": item["description"],
                    "enabled": True,
                    "expression": item["expression"],
                    "action_parameters": {
                        "cache": False,
                    },
                }
            )
            continue

        params = item.get("action_parameters") or {}
        edge = params.get("edge_ttl") or {"mode": "respect_origin"}
        browser = params.get("browser_ttl") or {"mode": "respect_origin"}

        edge_ttl: dict
        if edge.get("mode") == "override_origin":
            edge_ttl = {
                "mode": "override_origin",
                "default": int(edge.get("default", 31536000)),
            }
        else:
            # Honor origin CDN-Cache-Control / Cache-Control
            edge_ttl = {"mode": "respect_origin"}

        browser_ttl: dict
        if browser.get("mode") == "override_origin":
            browser_ttl = {
                "mode": "override_origin",
                "default": int(browser.get("default", 3600)),
            }
        else:
            browser_ttl = {"mode": "respect_origin"}

        rules.append(
            {
                "action": "set_cache_settings",
                "description": item["description"],
                "enabled": True,
                "expression": item["expression"],
                "action_parameters": {
                    "cache": True,
                    "edge_ttl": edge_ttl,
                    "browser_ttl": browser_ttl,
                },
            }
        )
    return rules


def main() -> int:
    local = load_env_file(DEPLOY_ENV)
    token = (
        os.environ.get("CLOUDFLARE_API_TOKEN")
        or local.get("CLOUDFLARE_API_TOKEN")
        or ""
    ).strip()
    zone = (
        os.environ.get("CLOUDFLARE_ZONE_ID")
        or local.get("CLOUDFLARE_ZONE_ID")
        or ""
    ).strip()

    if not token or not zone:
        print("MISSING_CREDENTIALS")
        print("Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID (env or deploy/deploy.env).")
        print("Token needs: Zone.Cache Rules Edit + Zone.Zone Read (or Account.Rulesets Edit).")
        return 2

    examples = json.loads(RULES_PATH.read_text(encoding="utf-8"))
    rules = example_to_ruleset_rules(examples)
    print(f"Prepared {len(rules)} cache rules from {RULES_PATH.name}")

    # Verify token / zone
    zone_info = cf_request("GET", f"https://api.cloudflare.com/client/v4/zones/{zone}", token)
    if not zone_info.get("success"):
        print("ZONE_LOOKUP_FAILED", zone_info)
        return 1
    zname = zone_info["result"]["name"]
    print(f"Zone OK: {zname} ({zone})")

    entry_url = f"https://api.cloudflare.com/client/v4/zones/{zone}/rulesets/phases/{PHASE}/entrypoint"

    # GET existing entrypoint (404 if none)
    try:
        existing = cf_request("GET", entry_url, token)
        ruleset_id = existing["result"]["id"]
        print(f"Updating existing ruleset {ruleset_id}")
        result = cf_request(
            "PUT",
            entry_url,
            token,
            {"rules": rules},
        )
    except RuntimeError as e:
        if "404" not in str(e):
            raise
        print("No entrypoint yet — creating ruleset")
        result = cf_request(
            "POST",
            f"https://api.cloudflare.com/client/v4/zones/{zone}/rulesets",
            token,
            {
                "name": "Bahram cache rules",
                "kind": "zone",
                "phase": PHASE,
                "rules": rules,
            },
        )

    if not result.get("success"):
        print("APPLY_FAILED", json.dumps(result, ensure_ascii=False)[:1200])
        return 1

    print("APPLY_OK")
    for r in result.get("result", {}).get("rules", rules):
        print("-", r.get("description", r.get("id")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
