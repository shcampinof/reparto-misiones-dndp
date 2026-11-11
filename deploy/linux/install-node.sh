#!/usr/bin/env bash
set -euo pipefail
test "$(uname -m)" = x86_64 || { echo 'Se requiere Linux x86_64'; exit 1; }
install -d -m 755 "$HOME/.local/bin" "$HOME/.local/opt" "$HOME/.cache/sigip"
sigip_download=$(mktemp -d "$HOME/.cache/sigip/node.XXXXXX")
cd "$sigip_download"
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
  https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt --output SHASUMS256.txt
sigip_archive=$(awk '$2 ~ /^node-v24\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$/ {print $2}' SHASUMS256.txt)
[[ "$sigip_archive" =~ ^node-v24\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$ ]] || exit 1
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
  "https://nodejs.org/dist/latest-v24.x/$sigip_archive" --output "$sigip_archive"
awk -v name="$sigip_archive" '$2 == name {print}' SHASUMS256.txt | sha256sum --check
sigip_node_dir="$HOME/.local/opt/${sigip_archive%.tar.xz}"
if [[ ! -d "$sigip_node_dir" ]]; then
  tar --extract --xz --file "$sigip_archive" --directory "$HOME/.local/opt" --no-same-owner
fi
for sigip_binary in node npm npx; do
  sigip_link="$HOME/.local/bin/$sigip_binary"
  if [[ -e "$sigip_link" || -L "$sigip_link" ]]; then
    printf 'Se conserva el ejecutable existente: %s\n' "$sigip_link"
  else
    ln -s "$sigip_node_dir/bin/$sigip_binary" "$sigip_link"
  fi
done
export PATH="$HOME/.local/bin:$PATH"
node --version
node -e 'const [major,minor]=process.versions.node.split(".").map(Number); if(major!==24 || minor<11) process.exit(1)'
npm --version
printf 'Node instalado para este usuario; agregue ~/.local/bin al PATH si hace falta.\n'
