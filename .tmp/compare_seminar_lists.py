# -*- coding: utf-8 -*-
import json
import re
import unicodedata
from pathlib import Path

import openpyxl

excel_path = Path(r"c:\Users\pc\Downloads\Telegram Desktop\لیست سمینار.xlsx")
server_path = Path(r"d:\foroushino\.tmp\seminar-attendees-export.json")
out_json = Path(r"d:\foroushino\.tmp\seminar-compare-report.json")
out_txt = Path(r"d:\foroushino\.tmp\seminar-compare-report.txt")


def norm_phone(v):
    if v is None:
        return None
    s = str(v).strip()
    if not s or s.lower() == "none":
        return None
    digits = re.sub(r"\D+", "", s)
    if digits.startswith("98") and len(digits) >= 12:
        digits = digits[2:]
    if digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    if len(digits) == 10 and digits.startswith("9"):
        return digits
    if len(digits) >= 10:
        last10 = digits[-10:]
        if last10.startswith("9"):
            return last10
    return digits or None


def norm_name(v):
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"\s+", " ", s)
    return s


wb = openpyxl.load_workbook(excel_path, data_only=True)
ws = wb.active
excel_rows = []
for row in ws.iter_rows(values_only=True):
    name = norm_name(row[0] if len(row) > 0 else None)
    phone = norm_phone(row[1] if len(row) > 1 else None)
    if not name and not phone:
        continue
    excel_rows.append({"name": name, "phone": phone})

server = json.loads(server_path.read_text(encoding="utf-8"))
server_rows = []
for a in server["attendees"]:
    server_rows.append(
        {
            "name": norm_name(a.get("name")),
            "phone": norm_phone(a.get("mobile")),
            "user_id": a.get("user_id"),
            "status": a.get("attendance_status"),
            "seminar": a.get("seminar_title"),
            "slug": a.get("seminar_slug"),
        }
    )

excel_by_phone = {}
excel_no_phone = []
for r in excel_rows:
    if r["phone"]:
        excel_by_phone.setdefault(r["phone"], []).append(r)
    else:
        excel_no_phone.append(r)

server_by_phone = {}
server_no_phone = []
for r in server_rows:
    if r["phone"]:
        server_by_phone.setdefault(r["phone"], []).append(r)
    else:
        server_no_phone.append(r)

excel_phones = set(excel_by_phone)
server_phones = set(server_by_phone)

only_excel_phones = sorted(excel_phones - server_phones)
only_server_phones = sorted(server_phones - excel_phones)
both_phones = sorted(excel_phones & server_phones)

only_excel = []
for p in only_excel_phones:
    for r in excel_by_phone[p]:
        only_excel.append({"name": r["name"], "phone": p})

only_server = []
for p in only_server_phones:
    for r in server_by_phone[p]:
        only_server.append(
            {
                "name": r["name"],
                "phone": p,
                "user_id": r["user_id"],
                "status": r["status"],
            }
        )

excel_names_no_phone = {r["name"] for r in excel_no_phone if r["name"]}
all_server_names = {r["name"] for r in server_rows if r["name"]}
all_excel_names = {r["name"] for r in excel_rows if r["name"]}
server_names_no_phone = {r["name"] for r in server_no_phone if r["name"]}

excel_name_only_not_on_server = sorted(n for n in excel_names_no_phone if n not in all_server_names)
server_name_only_not_in_excel = sorted(n for n in server_names_no_phone if n not in all_excel_names)

report = {
    "seminar_on_server": server.get("seminars"),
    "excel_total_rows_nonzero": len(excel_rows),
    "excel_unique_phones": len(excel_phones),
    "excel_without_phone": len(excel_no_phone),
    "server_total_attendees": len(server_rows),
    "server_unique_phones": len(server_phones),
    "server_without_phone": len(server_no_phone),
    "matched_by_phone": len(both_phones),
    "only_in_excel_by_phone_count": len(only_excel),
    "only_on_server_by_phone_count": len(only_server),
    "excel_no_phone_names_not_found_on_server": excel_name_only_not_on_server,
    "server_no_phone_names_not_found_in_excel": server_name_only_not_in_excel,
    "only_in_excel": only_excel,
    "only_on_server": only_server,
}
out_json.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

lines = [
    f"Excel rows: {len(excel_rows)} | unique phones: {len(excel_phones)} | no phone: {len(excel_no_phone)}",
    f"Server attendees: {len(server_rows)} | unique phones: {len(server_phones)} | no phone: {len(server_no_phone)}",
    f"Matched by phone: {len(both_phones)}",
    f"Only in Excel (phone): {len(only_excel)}",
    f"Only on Server (phone): {len(only_server)}",
    "",
    "=== فقط در اکسل (در سرور نیست) ===",
]
for r in only_excel:
    lines.append(f"{r['name'] or '-'} | 0{r['phone']}")
lines += ["", "=== فقط در سرور (در اکسل نیست) ==="]
for r in only_server:
    lines.append(f"{r['name'] or '-'} | 0{r['phone']} | status={r['status']}")
lines += ["", "=== اکسل بدون موبایل که نامشان در سرور پیدا نشد ==="]
lines.extend(excel_name_only_not_on_server or ["(خالی)"])
lines += ["", "=== سرور بدون موبایل که نامشان در اکسل پیدا نشد ==="]
lines.extend(server_name_only_not_in_excel or ["(خالی)"])
out_txt.write_text("\n".join(lines), encoding="utf-8")

print(
    "excel",
    len(excel_rows),
    "server",
    len(server_rows),
    "match",
    len(both_phones),
    "only_excel",
    len(only_excel),
    "only_server",
    len(only_server),
)
