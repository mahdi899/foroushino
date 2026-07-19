import os
import paramiko
import sys

HOST = "185.130.50.24"
USER = "root"
PASSWORD = "45J8pr+1gU=65e"
APP = "/var/www/saat"
ROOT = r"c:\Users\Msi\Desktop\foroushino"

FILES = [
    ("saat/backend/app/Models/AppSetting.php", f"{APP}/backend/app/Models/AppSetting.php"),
    ("saat/backend/app/Services/Sms/MelipayamakClient.php", f"{APP}/backend/app/Services/Sms/MelipayamakClient.php"),
    ("saat/backend/app/Http/Controllers/Api/V1/Admin/SettingsController.php", f"{APP}/backend/app/Http/Controllers/Api/V1/Admin/SettingsController.php"),
    ("saat/backend/app/Http/Requests/V1/Admin/UpdateAppSettingsRequest.php", f"{APP}/backend/app/Http/Requests/V1/Admin/UpdateAppSettingsRequest.php"),
    ("saat/backend/app/Http/Requests/V1/Admin/TestMelipayamakRequest.php", f"{APP}/backend/app/Http/Requests/V1/Admin/TestMelipayamakRequest.php"),
    ("saat/backend/routes/api/admin.php", f"{APP}/backend/routes/api/admin.php"),
    ("saat/backend/tests/Feature/MelipayamakSettingsTest.php", f"{APP}/backend/tests/Feature/MelipayamakSettingsTest.php"),
    ("saat/frontend/src/lib/appSettings.ts", f"{APP}/frontend/src/lib/appSettings.ts"),
    ("saat/frontend/src/features/admin/AdminSettingsScreen.tsx", f"{APP}/frontend/src/features/admin/AdminSettingsScreen.tsx"),
    ("saat/frontend/src/services/admin.ts", f"{APP}/frontend/src/services/admin.ts"),
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, 22, USER, PASSWORD, timeout=30)
sftp = client.open_sftp()
for local_rel, remote in FILES:
    local = os.path.join(ROOT, local_rel.replace("/", os.sep))
    sys.stdout.buffer.write(f"upload {local_rel}\n".encode())
    sftp.put(local, remote)
sftp.close()

cmds = [
    f"cd {APP}/backend && php artisan route:cache && php artisan config:cache",
    f"cd {APP}/frontend && npm run build",
    "systemctl reload php8.3-fpm nginx",
]
for cmd in cmds:
    sys.stdout.buffer.write(f"\n$ {cmd}\n".encode())
    _, stdout, _ = client.exec_command(cmd, get_pty=True, timeout=600)
    out = stdout.read().decode("utf-8", errors="replace")
    sys.stdout.buffer.write(out.encode("utf-8", errors="replace"))
client.close()
print("DEPLOY_OK", file=sys.stderr)
