#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOC_DIR="$ROOT/zensical-doc"
OUT_DOCS="$ROOT/out/docs"

if [[ ! -d "$DOC_DIR" ]]; then
  echo "zensical-doc not found at $DOC_DIR" >&2
  exit 1
fi

cd "$DOC_DIR"

if [[ -x .venv/bin/zensical ]]; then
  .venv/bin/zensical build
elif command -v zensical >/dev/null 2>&1; then
  zensical build
else
  python3 -m pip install --user zensical
  export PATH="${HOME}/.local/bin:${PATH}"
  zensical build
fi

rm -rf "$OUT_DOCS"
mkdir -p "$ROOT/out"
cp -R "$DOC_DIR/site" "$OUT_DOCS"
echo "Copied docs → out/docs"
