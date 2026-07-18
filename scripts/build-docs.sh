#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOC_DIR="$ROOT/zensical-doc"
OUT_DOCS="$ROOT/out/docs"

# Vercel previews don't ship Python/zensical; Cloudflare CI builds docs instead.
if [[ "${VERCEL:-}" == "1" && "${REQUIRE_DOCS:-}" != "1" ]]; then
  echo "Skipping docs build on Vercel (set REQUIRE_DOCS=1 to force)."
  exit 0
fi

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
  if ! command -v python3 >/dev/null 2>&1; then
    echo "python3/zensical unavailable; cannot build docs" >&2
    exit 1
  fi
  python3 -m pip install --user zensical
  export PATH="${HOME}/.local/bin:${PATH}"
  zensical build
fi

rm -rf "$OUT_DOCS"
mkdir -p "$ROOT/out"
cp -R "$DOC_DIR/site" "$OUT_DOCS"
echo "Copied docs → out/docs"
