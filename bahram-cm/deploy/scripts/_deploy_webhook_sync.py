"""Deploy sync webhook processing after purge."""
from _deploy_common import ROOT, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

files = [
    "backend/app/Modules/TelegramBot/Http/Controllers/WebhookController.php",
]

c = connect(env, timeout=60)
upload_files(c, [(ROOT / rel, rel) for rel in files], env)
_, out, _ = c.exec_command(
    f"cd {BE} && php artisan config:clear && supervisorctl restart bahram-horizon && echo OK",
    timeout=30,
)
print(out.read().decode())
c.close()
