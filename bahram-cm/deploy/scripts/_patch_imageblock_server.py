#!/usr/bin/env python3
from _deploy_common import app_root, configure_stdout, connect, load_deploy_env

configure_stdout()
APP = app_root(load_deploy_env())

remote = f"""#!/bin/bash
sed -i 's/src={{previewSrc}}/src={{previewSrc ?? undefined}}/' {APP}/frontend/components/family/blocks/ImageBlock.tsx
grep -n 'previewSrc' {APP}/frontend/components/family/blocks/ImageBlock.tsx | head -3
"""

c = connect(load_deploy_env(), timeout=60)
sftp = c.open_sftp()
with sftp.file("/tmp/patch-img.sh", "w") as f:
    f.write(remote)
sftp.chmod("/tmp/patch-img.sh", 0o755)
sftp.close()
_, out, _ = c.exec_command("bash /tmp/patch-img.sh", timeout=30)
print(out.read().decode("utf-8", "replace"))
c.close()
