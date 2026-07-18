#!/usr/bin/env bash
# Build both projects (Next.js portfolio + zensical docs) and serve the
# combined static output under out/ for local preview.
#
# Usage:
#   ./scripts/preview.sh
#   PORT=5000 ./scripts/preview.sh
#   SKIP_BUILD=1 ./scripts/preview.sh   # serve existing out/ only
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-4173}"
SKIP_BUILD="${SKIP_BUILD:-0}"
OUT_DIR="$ROOT/out"

info() { printf '==> %s\n' "$*"; }
die()  { printf 'error: %s\n' "$*" >&2; exit 1; }

if [[ "$SKIP_BUILD" != "1" ]]; then
  info "Building portfolio (Next.js → out/) and docs (zensical → out/docs/)..."
  npm run build
else
  info "Skipping build (SKIP_BUILD=1)"
fi

[[ -d "$OUT_DIR" ]] || die "output directory not found: $OUT_DIR (run without SKIP_BUILD)"
[[ -f "$OUT_DIR/index.html" ]] || die "out/index.html missing; build may have failed"

info "Preview ready"
printf '    Portfolio  http://localhost:%s/\n' "$PORT"
printf '    Docs       http://localhost:%s/docs/\n' "$PORT"
printf '\n    Ctrl+C to stop\n\n'

# Prefer `serve` (clean static hosting + SPA-friendly fallbacks).
# Fall back to Python's http.server when npm/npx is unavailable.
if command -v npx >/dev/null 2>&1; then
  exec npx --yes serve "$OUT_DIR" -l "$PORT" --no-port-switching
fi

if command -v python3 >/dev/null 2>&1; then
  info "npx not found; using python3 -m http.server"
  cd "$OUT_DIR"
  exec python3 -m http.server "$PORT"
fi

die "need npx or python3 to serve the preview"
