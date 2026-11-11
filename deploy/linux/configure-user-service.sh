#!/usr/bin/env bash
set -euo pipefail
sigip_root=$(cd "$(dirname "$0")/../.." && pwd)
export PATH="$HOME/.local/bin:$PATH"
test -f "$sigip_root/backend/package.json"
test -f "$sigip_root/frontend/dist/index.html"
python3 - "$sigip_root" <<'PY'
import pathlib, secrets, sys, os
root = pathlib.Path(sys.argv[1])
for name, source in [(".env", ".env.demo.example"), (".env.oracle", ".env.oracle.example")]:
    target = root / name
    if target.exists():
        print("Se conserva:", target)
        continue
    text = (root / source).read_text()
    text = text.replace("JWT_SECRET=", "JWT_SECRET=" + secrets.token_urlsafe(48), 1)
    if "HOST=" not in text:
        text += "\nHOST=127.0.0.1\n"
    if "STATIC_DIR=" in text:
        text = text.replace("STATIC_DIR=\n", "STATIC_DIR=" + str(root / "frontend/dist") + "\n")
    else:
        text += "\nSTATIC_DIR=" + str(root / "frontend/dist") + "\n"
    if name == ".env":
        text = text.replace("CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173", "CORS_ORIGINS=http://localhost:4000,http://127.0.0.1:4000,http://localhost:5173,http://127.0.0.1:5173")
        text += "\n# Oracle: completar .env.oracle y ejecutar deploy/linux/activate-oracle.sh\n"
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as handle:
        handle.write(text)
    print("Configuración privada creada:", target)
PY
install -d -m 700 "$HOME/.config/systemd/user"
sigip_unit="$HOME/.config/systemd/user/sigip-dp.service"
if [[ -f "$sigip_unit" ]]; then
  cp -p "$sigip_unit" "$sigip_unit.previous.$(date -u +%Y%m%dT%H%M%SZ)"
fi
cat > "$sigip_unit" <<EOF
[Unit]
Description=SIGIP-DP - entorno de desarrollo
After=network-online.target

[Service]
Type=simple
WorkingDirectory=$sigip_root/backend
ExecStart=$HOME/.local/bin/node src/server.js
Environment=PATH=$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin
Restart=on-failure
RestartSec=5
UMask=0077
NoNewPrivileges=true
TimeoutStopSec=30

[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable sigip-dp.service
systemctl --user restart sigip-dp.service
sleep 2
curl --fail --silent --show-error http://127.0.0.1:4000/api/ready
printf '\nServicio disponible sólo en loopback; acceso mediante túnel SSH.\n'
