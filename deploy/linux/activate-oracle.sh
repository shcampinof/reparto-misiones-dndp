#!/usr/bin/env bash
set -euo pipefail
sigip_root=$(cd "$(dirname "$0")/../.." && pwd)
export PATH="$HOME/.local/bin:$PATH"
export SIGIP_ENV_FILE="$sigip_root/.env.oracle"
test -f "$SIGIP_ENV_FILE"
cd "$sigip_root/backend"
# Sin credenciales o listener disponible se detiene aquí y conserva SQLite.
npm run oracle:check
npm run oracle:migrate
npm run oracle:init
if [[ -f "$sigip_root/.env" ]]; then
  cp -p "$sigip_root/.env" "$sigip_root/.env.pre-oracle.$(date -u +%Y%m%dT%H%M%SZ)"
fi
install -m 600 "$SIGIP_ENV_FILE" "$sigip_root/.env"
systemctl --user restart sigip-dp.service
sleep 2
curl --fail --silent --show-error http://127.0.0.1:4000/api/ready
printf '\nOracle activado. Se conserva copia de la configuración anterior.\n'
