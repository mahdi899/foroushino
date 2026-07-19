# -*- coding: utf-8 -*-
import paramiko, sys, io, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

def poll():
    s = paramiko.SSHClient()
    s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    s.connect("185.130.50.24", 22, "root", "45J8pr+1gU=65e", timeout=12)
    ch = s.get_transport().open_channel("direct-tcpip", ("193.228.90.175", 22), ("127.0.0.1", 0))
    b = paramiko.SSHClient()
    b.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    b.connect("193.228.90.175", 22, "root", "9%&Z5tlE63vQ28", sock=ch, timeout=15)
    _, o, _ = b.exec_command(
        "grep -E '^==>|^=== DONE|^E:' /root/bahram-bootstrap.log | tail -12; "
        "pgrep -af 'bash /root/bahram-bootstrap' || echo STOPPED",
        timeout=20,
    )
    text = o.read().decode("utf-8", errors="replace")
    b.close()
    s.close()
    return text

for i in range(30):
    t = poll()
    print(f"--- poll {i+1} ---")
    print(t)
    if "=== DONE" in t:
        break
    if "STOPPED" in t and "==> bootstrap" in t:
        break
    if "STOPPED" in t and i > 3:
        # failed early
        break
    time.sleep(60)
