#!/bin/bash
# Recopie Text Fusion (~/Code/text-fusion) dans public/tf : moteur, panneau, icônes, police du panneau, préréglages.
# Le code se modifie dans text-fusion, puis on relance ce script. site.js et panel.css sont propres au site (non écrasés).
set -euo pipefail
SRC="$(cd "$(dirname "$0")/../../text-fusion" && pwd)"
DST="$(cd "$(dirname "$0")/.." && pwd)/public/tf"
mkdir -p "$DST/gpu"
cp "$SRC"/src/{engine,layout,params,panel}.js "$DST/"
cp "$SRC"/src/gpu/shaders.js "$DST/gpu/"
rm -rf "$DST/ui" "$DST/fonts" "$DST/presets"
cp -R "$SRC/ui" "$SRC/fonts" "$SRC/presets" "$DST/"
rm -f "$DST/neon.json"
echo "Text Fusion $(git -C "$SRC" rev-parse --short HEAD) → public/tf"
