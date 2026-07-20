from _deploy_common import configure_stdout, connect, load_deploy_env, backend_root
configure_stdout()
BE = backend_root(load_deploy_env())
php = f"""<?php
require '{BE}/vendor/autoload.php';
$app = require '{BE}/bootstrap/app.php';
$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
$settings = app(App\\Services\\SettingService::class);
$groups = ['cache', 'telegram', 'integrations', 'cloudflare', 'cdn', 'security'];
$out = [];
foreach ($groups as $g) {{
  $data = $settings->group($g);
  if (!is_array($data) || $data === []) continue;
  $masked = [];
  foreach ($data as $k => $v) {{
    if (!is_string($v)) {{ $masked[$k] = gettype($v); continue; }}
    $t = trim($v);
    if ($t === '') {{ $masked[$k] = 'empty'; continue; }}
    if (preg_match('/token|secret|key|password/i', (string)$k)) {{
      $masked[$k] = substr($t,0,4).'…'.substr($t,-4).' (len='.strlen($t).')';
    }} else {{
      $masked[$k] = strlen($t) > 80 ? substr($t,0,60).'…' : $t;
    }}
  }}
  $out[$g] = $masked;
}}
echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
"""
c = connect(load_deploy_env(), timeout=60)
sftp = c.open_sftp()
with sftp.open("/tmp/settings_scan.php", "w") as f:
    f.write(php)
sftp.close()
_, out, _ = c.exec_command("php /tmp/settings_scan.php; rm -f /tmp/settings_scan.php", timeout=30)
print(out.read().decode())
c.close()
