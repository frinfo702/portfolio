#!/bin/bash
# Bake the ice katana (katana.py) and write the web assets to public/scene/katana/.
# Needs blender and cwebp on PATH.
set -euo pipefail
cd "$(dirname "$0")/../.."
TMP=$(mktemp -d)
OUT=public/scene/katana
mkdir -p "$OUT"
blender -b -P scripts/blender/katana.py -- "$TMP"
for f in "$TMP"/*_col.png; do cwebp -quiet -q 90 -m 6 "$f" -o "$OUT/$(basename "${f%.png}").webp"; done
for f in "$TMP"/*_mat.png "$TMP"/*_nrm.png; do cwebp -quiet -q 88 -m 6 -exact "$f" -o "$OUT/$(basename "${f%.png}").webp"; done
npx -y @gltf-transform/cli@4 quantize "$TMP/katana.glb" "$TMP/katana.q.glb" --quantize-position 16 --quantize-normal 12 --quantize-texcoord 16
npx -y @gltf-transform/cli@4 meshopt "$TMP/katana.q.glb" "$OUT/katana.glb" --level high
rm -rf "$TMP"
