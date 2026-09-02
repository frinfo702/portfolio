#!/usr/bin/env bash
# Build the Next.js portfolio and serve its static output from out/.
# In watch mode (default) the source directories are watched and the site is
# re-rendered (rebuilt) whenever a file changes.
#
# Usage:
#   ./scripts/preview.sh                 # build + watch + serve
#   WATCH=0 ./scripts/preview.sh       # build once + serve (no watching)
#   PORT=5000 ./scripts/preview.sh
#   SKIP_BUILD=1 ./scripts/preview.sh # serve existing out/ only (no watching)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-4173}"
SKIP_BUILD="${SKIP_BUILD:-0}"
WATCH="${WATCH:-1}"
OUT_DIR="$ROOT/out"
MARKER="${TMPDIR:-/tmp}/portfolio-preview-$(basename "$ROOT").marker"
WATCH_PATHS=("$ROOT/app" "$ROOT/content" "$ROOT/lib" "$ROOT/public" "$ROOT/next.config.ts")

info() { printf '==> %s\n' "$*"; }
die()  { printf 'error: %s\n' "$*" >&2; exit 1; }

build() {
  info "Building portfolio (Next.js → out/)..."
  npm run build
  touch "$MARKER"
}

if [[ "$SKIP_BUILD" != "1" ]]; then
  build
else
  info "Skipping build (SKIP_BUILD=1)"
fi

[[ -d "$OUT_DIR" ]] || die "output directory not found: $OUT_DIR (run without SKIP_BUILD)"
[[ -f "$OUT_DIR/index.html" ]] || die "out/index.html missing; build may have failed"
command -v npx >/dev/null 2>&1 || command -v python3 >/dev/null 2>&1 \
  || die "need npx or python3 to serve the preview"

info "Preview ready"
printf '    Portfolio  http://localhost:%s/\n' "$PORT"
printf '    Writing    http://localhost:%s/writing\n' "$PORT"
printf '\n    Ctrl+C to stop\n\n'

serve_cmd() {
  # Prefer `serve` (clean static hosting + SPA-friendly fallbacks).
  # Fall back to Python's http.server when npx is unavailable.
  if command -v npx >/dev/null 2>&1; then
    npx --yes serve "$OUT_DIR" -l "$PORT" --no-port-switching -s
  else
    info "npx not found; using python3 -m http.server"
    cd "$OUT_DIR"
    python3 -m http.server "$PORT"
  fi
}

# Build once + serve, no watching.
if [[ "$SKIP_BUILD" == "1" || "$WATCH" != "1" ]]; then
  exec serve_cmd
fi

# --- watch mode: rebuild on source changes, serve updated output ---
serve_cmd &
SERVE_PID=$!
trap 'kill "$SERVE_PID" 2>/dev/null || true' EXIT INT TERM

# Keep only paths that actually exist.
EXISTING=()
for p in "${WATCH_PATHS[@]}"; do
  [[ -e "$p" ]] && EXISTING+=("$p")
done
[[ "${#EXISTING[@]}" -gt 0 ]] || die "no watch paths found"

info "Watching for changes in: ${EXISTING[*]}"

while true; do
  if find "${EXISTING[@]}" -type f -newer "$MARKER" -print -quit 2>/dev/null | grep -q .; then
    info "Change detected; re-rendering..."
    if build; then
      info "Re-render complete"
    else
      info "Re-render failed; keeping previous output"
      touch "$MARKER"
    fi
  fi
  sleep 1
done
