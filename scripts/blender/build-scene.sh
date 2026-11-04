#!/bin/bash
# Bake one Blender model and write its web assets to public/scene/<name>/.
#   bash scripts/blender/build-scene.sh katana   # ice katana (light theme)
#   bash scripts/blender/build-scene.sh blades   # twin black blades (dark theme)
# Needs blender and cwebp on PATH.
set -euo pipefail
cd "$(dirname "$0")/../.."
NAME=$1
TMP=$(mktemp -d)
OUT=public/scene/$NAME
mkdir -p "$OUT"
blender -b -P "scripts/blender/$NAME.py" -- "$TMP"
for f in "$TMP"/*_col.png; do cwebp -quiet -q 90 -m 6 "$f" -o "$OUT/$(basename "${f%.png}").webp"; done
for f in "$TMP"/*_mat.png "$TMP"/*_nrm.png; do cwebp -quiet -q 88 -m 6 -exact "$f" -o "$OUT/$(basename "${f%.png}").webp"; done
npx -y @gltf-transform/cli@4 quantize "$TMP/$NAME.glb" "$TMP/$NAME.q.glb" --quantize-position 16 --quantize-normal 12 --quantize-texcoord 16
npx -y @gltf-transform/cli@4 meshopt "$TMP/$NAME.q.glb" "$OUT/$NAME.glb" --level high
rm -rf "$TMP"
