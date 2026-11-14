#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
fixture=$(mktemp ./qa-XXXXXX.html)
module=$(mktemp ./src/qa-XXXXXX.js)
frame=$(mktemp ./qa-frame-XXXXXX.html)
profile=$(mktemp -d /tmp/so-scenario-XXXXXX)
trap 'rm -f "$fixture" "$module" "$frame"' EXIT
cat src/game.js tests/browser-scenarios.js tests/verdant-browser.js tests/opening-browser.js tests/creation-browser.js tests/account-browser.js tests/priest-browser.js tests/woods-browser.js tests/status-browser.js tests/progress-browser.js tests/mire-browser.js tests/buffs-browser.js tests/saves-browser.js tests/a11y-browser.js > "$module"
MODULE_PATH="${module#./}" FIXTURE_PATH="$fixture" FRAME_PATH="$frame" QA_SIZE="${1:-640,503}" QA_QUERY="${3:-}" python3 - <<'PY'
import os
from pathlib import Path
s=Path('index.html').read_text().replace('/src/game.js','/'+os.environ['MODULE_PATH'])
s=s.replace('<head>','<head><script>window.addEventListener("error",e=>document.title="SCENARIO FAIL "+e.message);window.addEventListener("unhandledrejection",e=>document.title="SCENARIO FAIL "+e.reason);localStorage.clear();localStorage.setItem("so_qual","low");</script>')
Path(os.environ['FIXTURE_PATH']).write_text(s)
w,h=map(int,os.environ['QA_SIZE'].split(','))
url=Path(os.environ['FIXTURE_PATH']).name+os.environ['QA_QUERY']
# An iframe supplies an exact CSS viewport below desktop Chrome's 500px minimum.
Path(os.environ['FRAME_PATH']).write_text(f'''<!doctype html><html><head><title>Waiting for scenario</title></head><body style="margin:0;background:#07060c"><iframe id="game" src="{url}" style="display:block;border:0;width:{w}px;height:{h-143}px"></iframe><script>setInterval(()=>{{document.title=document.querySelector('iframe').contentDocument.title}},100)</script></body></html>''')
PY
"$CHROME" --headless=new --disable-gpu --enable-unsafe-swiftshader \
 --use-gl=angle --use-angle=swiftshader --no-sandbox --hide-scrollbars \
 --virtual-time-budget=8000 --window-size="${1:-640,503}" \
 --user-data-dir="$profile" \
 --screenshot="${2:-/tmp/so-scenario.png}" --dump-dom \
 "http://127.0.0.1:5173/${frame#./}" 2>/dev/null | python3 -c '
import re,sys
m=re.search(r"<title>(.*?)</title>",sys.stdin.read(),re.S)
t=m.group(1) if m else "No scenario result"
print(t)
sys.exit(0 if "SCENARIO PASS" in t else 1)
'
