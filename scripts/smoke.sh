#!/usr/bin/env bash
# Boots the game in headless Chrome and fails if it logs any runtime error or
# if the WebGL renderer never sized the canvas. This is the regression gate for
# the Phase 1b module carve: run it after every extraction.
#
# Usage:  ./scripts/smoke.sh [url]      (default: http://localhost:5173)
set -uo pipefail
cd "$(dirname "$0")/.."

URL="${1:-http://localhost:5173}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || { echo "smoke: Chrome not found at $CHROME"; exit 2; }

# Generate the harness from the live index.html so it can never drift out of sync.
cat > /tmp/so_collector.html <<'EOF'
<script>
window.__ERRS = [];
function __stamp(){
  var c = document.querySelector('canvas#c');
  var sized = c && c.width > 300 && c.height > 200;
  document.title = 'SMOKE errs=' + window.__ERRS.length
    + ' canvas=' + (c ? c.width + 'x' + c.height : 'missing')
    + ' webgl=' + (sized ? 'sized' : 'unsized')
    + (window.__ERRS.length ? ' :: ' + window.__ERRS.join(' || ') : '');
}
addEventListener('error', function(e){
  window.__ERRS.push((e.message || e.error) + ' @' + (e.filename||'') + ':' + (e.lineno||''));
  __stamp();
}, true);
addEventListener('unhandledrejection', function(e){
  window.__ERRS.push('REJECT ' + e.reason); __stamp();
});
addEventListener('load', function(){ setTimeout(__stamp, 2500); });
</script>
EOF
awk '{print} /^<body>$/{while((getline l < "/tmp/so_collector.html")>0) print l; close("/tmp/so_collector.html")}' \
  index.html > smoke.html
trap 'rm -f smoke.html' EXIT

TITLE=$("$CHROME" --headless=new --disable-gpu --enable-unsafe-swiftshader \
  --use-gl=angle --use-angle=swiftshader --no-sandbox \
  --virtual-time-budget=12000 --window-size=1280,720 \
  --user-data-dir=/tmp/so_chrome_smoke \
  --dump-dom "$URL/smoke.html" 2>/dev/null | grep -oE '<title>[^<]*</title>')

echo "${TITLE:-<no title captured — is the dev server running?>}"
case "$TITLE" in
  *"errs=0"*"webgl=sized"*) echo "smoke: PASS"; exit 0 ;;
  *)                        echo "smoke: FAIL"; exit 1 ;;
esac
