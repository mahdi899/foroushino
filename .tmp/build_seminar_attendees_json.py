# -*- coding: utf-8 -*-
"""Build durable seminar attendees JSON from Excel + extras."""
import json
import re
import unicodedata
from pathlib import Path

import openpyxl

excel_path = Path(r"c:\Users\pc\Downloads\Telegram Desktop\لیست سمینار.xlsx")
out_path = Path(r"d:\foroushino\bahram-cm\backend\database\data\seminar_zaferaniyeh_attendees.json")


def norm_phone(v):
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    digits = re.sub(r"\D+", "", s)
    if digits.startswith("0098"):
        digits = digits[4:]
    elif digits.startswith("98") and len(digits) == 12:
        digits = digits[2:]
    if digits.startswith("9") and len(digits) == 10:
        digits = "0" + digits
    if re.fullmatch(r"09\d{9}", digits):
        return digits
    return None


def norm_name(v):
    if v is None:
        return None
    s = unicodedata.normalize("NFKC", str(v)).strip()
    s = re.sub(r"\s+", " ", s)
    return s or None


wb = openpyxl.load_workbook(excel_path, data_only=True)
ws = wb.active

by_phone = {}
skipped_no_phone = []
skipped_invalid = []
duplicates = []

for row in ws.iter_rows(values_only=True):
    name = norm_name(row[0] if len(row) > 0 else None)
    phone = norm_phone(row[1] if len(row) > 1 else None)
    if not name and not phone:
        continue
    if not phone:
        skipped_no_phone.append(name or "?")
        continue
    if phone in by_phone:
        duplicates.append({"phone": phone, "kept": by_phone[phone]["name"], "dup": name})
        continue
    by_phone[phone] = {"name": name or "شرکت‌کننده سمینار", "mobile": phone}

# Required extras (override name if already present)
extras = [
    {"name": "بهرام رستمی", "mobile": "09032352666"},
    {"name": "بهرام رستمی", "mobile": "09021362334"},
    {"name": "مهدی اکبری", "mobile": "09367018089"},
]
for ex in extras:
    phone = norm_phone(ex["mobile"])
    assert phone, ex
    by_phone[phone] = {"name": ex["name"], "mobile": phone}

attendees = sorted(by_phone.values(), key=lambda r: r["mobile"])

payload = {
    "seminar_slug": "smynar-zaafranyh-thran",
    "source": "لیست سمینار.xlsx + extras",
    "generated_at": "2026-07-31",
    "attendees": attendees,
    "meta": {
        "count": len(attendees),
        "skipped_no_phone": skipped_no_phone,
        "duplicate_phones_dropped": duplicates,
        "extras": extras,
    },
}

out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
print("wrote", out_path, "count", len(attendees))
print("skipped_no_phone", skipped_no_phone)
print("duplicates", len(duplicates))
