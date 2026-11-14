#!/usr/bin/env bash
# Drives the game from the title screen into a given menu tab, then reports what
# rendered. Unlike smoke.sh (which only boots and checks for errors), this
# actually exercises screens — the only way to verify UI work without a human.
#
#   ./scripts/drive.sh            # equipment tab
#   ./scripts/drive.sh forge
#   ./scripts/drive.sh shop out.png
#
# REQUIRES A REAL GPU. On a machine without one, headless Chrome falls back to
# SwiftShader software rendering; under a fast-forwarded virtual clock the game
# renders ~1000+ frames per run and this will exceed any sane timeout. It is NOT
# broken in that case — it is simply unaffordable. smoke.sh still works there.
set -uo pipefail
cd "$(dirname "$0")/.."

TAB="${1:-bag}"
SHOT="${2:-}"
URL="${URL:-http://localhost:5173}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || { echo "drive: Chrome not found at $CHROME"; exit 2; }

cat > /tmp/so_drive_inject.html <<EOF
<script>
// Cheapest renderer settings: shadows and bloom are what make this unaffordable.
try{localStorage.setItem('so_qual','low');}catch(e){}
window.__ERRS=[];window.__LOG=[];
addEventListener('error',e=>{__ERRS.push((e.message||e.error)+' @'+(e.lineno||''));},true);
addEventListener('unhandledrejection',e=>__ERRS.push('REJECT '+e.reason));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const q=s=>document.querySelector(s);
const click=s=>{const n=q(s);if(n){n.click();return true}return false};
// Modals and the intro dialog interleave unpredictably, so clear whatever is
// blocking right now rather than assuming a fixed sequence.
function modal(){
  const m=q('#modal');
  if(!m||!m.style.display||m.style.display==='none')return false;
  const inp=q('#mdIn');
  if(inp&&inp.style.display!=='none'){inp.value='Tester';inp.dispatchEvent(new Event('input',{bubbles:true}));}
  const btns=[...m.querySelectorAll('button')].filter(b=>b.offsetParent!==null);
  const pref=btns.find(b=>/offline|confirm|continue|^ok\$|yes/i.test(b.textContent))||btns[0];
  if(pref){__LOG.push(pref.textContent.trim().slice(0,14));pref.click();return true}
  return false;
}
addEventListener('load',async()=>{
  try{
    await wait(800);
    click('#tPlay');            await wait(400);
    click('#clsGrid button');   await wait(200);
    click('#facGrid button');   await wait(200);
    click('#selGo');            await wait(900);
    for(let i=0;i<45;i++){
      if(modal()){await wait(220);continue;}
      const d=q('#dlg');
      if(d&&d.classList.contains('show')){d.click();await wait(60);continue;}
      break;
    }
    await wait(250);
    click('#bMenu');                             await wait(350);
    click('#mSide button[data-v="${TAB}"]');     await wait(550);
    const cv=q('#panelCv');
    document.title='DRIVE errs='+__ERRS.length
      +' menu='+(q('#menu')&&q('#menu').classList.contains('show'))
      +' tab=${TAB} body='+(q('#mBody')?q('#mBody').innerHTML.length:0)
      +' panel='+(cv?cv.width+'x'+cv.height:'none')
      +' | '+__LOG.join(',')+(__ERRS.length?' :: '+__ERRS.join(' || '):'');
  }catch(err){document.title='DRIVE THREW '+err;}
});
</script>
EOF

awk '{print} /^<body>$/{while((getline l < "/tmp/so_drive_inject.html")>0) print l; close("/tmp/so_drive_inject.html")}' \
  index.html > drive.html
trap 'rm -f drive.html' EXIT

ARGS=(--headless=new --disable-gpu --enable-unsafe-swiftshader --use-gl=angle
      --use-angle=swiftshader --no-sandbox --virtual-time-budget=16000
      --window-size=640,360 --hide-scrollbars --user-data-dir=/tmp/so_drive_profile)
[ -n "$SHOT" ] && ARGS+=(--screenshot="$SHOT")

TITLE=$("$CHROME" "${ARGS[@]}" --dump-dom "$URL/drive.html" 2>/dev/null \
        | grep -oE '<title>[^<]*</title>')

echo "${TITLE:-<no title — dev server down, or software rendering timed out>}"
[ -n "$SHOT" ] && echo "screenshot: $SHOT"
case "$TITLE" in
  *"errs=0"*"menu=true"*) echo "drive: PASS"; exit 0 ;;
  *)                      echo "drive: FAIL"; exit 1 ;;
esac
