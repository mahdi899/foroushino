import io, sys
from pathlib import Path
import paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
ROOT = Path(__file__).resolve().parents[2]
env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k,v=line.split("=",1); env[k.strip()]=v.strip()
uploads = [
    (ROOT/"backend/app/Support/JalaliDate.php", "/var/www/foroushino/bahram-cm/backend/app/Support/JalaliDate.php"),
    (ROOT/"backend/app/Modules/TelegramBot/Services/TelegramContentPresenter.php", "/var/www/foroushino/bahram-cm/backend/app/Modules/TelegramBot/Services/TelegramContentPresenter.php"),
]
c=paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"],22,env["DEPLOY_USER"],env["DEPLOY_PASSWORD"],timeout=120)
s=sftp=c.open_sftp()
for l,r in uploads: s.put(str(l),r); print("uploaded", l.name)
s.close()
_,out,_=c.exec_command("cd /var/www/bahram-cm/backend && composer dump-autoload -o --no-interaction 2>&1 | tail -2 && supervisorctl restart bahram-horizon && php -r \"require 'vendor/autoload.php'; \\$app=require 'bootstrap/app.php'; \\$app->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap(); echo App\\\\Support\\\\JalaliDate::formatDateTime(Carbon\\\\Carbon::parse('2026-07-24 19:46:00','Asia/Tehran')).PHP_EOL;\"", timeout=120)
print(out.read().decode("utf-8","replace"))
c.close()
