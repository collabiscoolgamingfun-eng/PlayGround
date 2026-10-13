#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
/usr/bin/time -p pwd
PROJECT_DIR="$(/usr/bin/time -p pwd)"
DIST_DIR="$PROJECT_DIR/dist"
PORT="${PORT:-3000}"
WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
/usr/bin/time -p mkdir -p "$DIST_DIR" "$WEB_DIR"
/usr/bin/time -p test -f "$DIST_DIR/index.html"
if /usr/bin/time -p test -f "$PROJECT_DIR/package.json"; then
  /usr/bin/time -p npm --prefix "$PROJECT_DIR" install --no-audit --no-fund
  if PROJECT_DIR="$PROJECT_DIR" /usr/bin/time -p node -e "const p=require(process.env.PROJECT_DIR+'/package.json');process.exit(p.scripts&&p.scripts.build?0:1)"; then
    /usr/bin/time -p npm --prefix "$PROJECT_DIR" run build
  fi
  /usr/bin/time -p test -f "$DIST_DIR/index.html"
fi
/usr/bin/time -p printf '%s' "{\"project\":\"$PROJECT_DIR\",\"directory\":\"$DIST_DIR\"}" > "$WEB_DIR/deployment-output.json"
/usr/bin/time -p mkdir -p /home/runner/work/_temp/omgithub-web
/usr/bin/time -p cp "$WEB_DIR/deployment-output.json" /home/runner/work/_temp/omgithub-web/deployment-output.json || true
/usr/bin/time -p cat "$WEB_DIR/deployment-output.json"
/usr/bin/time -p cat /home/runner/work/_temp/omgithub-web/deployment-output.json
/usr/bin/time -p ls -la "$DIST_DIR"
exec /usr/bin/time -p python3 -m http.server "$PORT" --directory "$DIST_DIR" --bind 0.0.0.0
