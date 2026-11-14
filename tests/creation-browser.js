setTimeout(()=>{
 if(!location.search.includes('creation'))return;
 const errors=[],check=(ok,label)=>{if(!ok)errors.push(label);};
 try{
  requestAnimationFrame=()=>0;localStorage.setItem(PKEY,'Aria');openSelect();resize();
  const checkLayout=()=>{
   const body=$('#creationFields'),footer=$('.creation-footer').getBoundingClientRect(),stage=$('#creationPreview').getBoundingClientRect();
   check(body.scrollWidth<=body.clientWidth+1,'form overflow step '+CU.step);
   check(footer.bottom<=innerHeight+1&&footer.left>=0&&footer.right<=innerWidth+1,'footer outside viewport');
   if(innerWidth<innerHeight)check(stage.bottom<=$('.selp').getBoundingClientRect().top+1,'preview overlaps form');
   for(const b of body.querySelectorAll('section:not([hidden]) button')){const r=b.getBoundingClientRect();check(r.width>=43&&r.height>=43,'small touch target '+(b.title||b.textContent));check(r.left>=0&&r.right<=innerWidth+1,'choice outside viewport');}
  };
  check(CU.step===0,'initial hero step');checkLayout();
  for(const key of CLS_ORDER){$(`#clsGrid [data-c="${key}"]`).click();check(selC===key&&pModel,'class preview '+key);check(previewBounds.size.y>0,'preview bounds '+key);}
  $('#heroSeg [data-h="C"]').click();check(selH==='C','hero choice');
  $('#clsGrid [data-c="wizard"]').click();$('#selGo').click();check(CU.step===1,'continue to appearance');checkLayout();
  $('#cuStyle [data-v="pony"]').click();$('#cuHair button:last-child').click();$('#cuSkin button:last-child').click();$('#cuOut button:last-child').click();
  check(CU.style==='pony'&&CU.hair===HAIRCOLS.at(-1)&&CU.skin===SKINS.at(-1)&&CU.outfit===OUTFITS.at(-1),'appearance retained');
  check($('#cuHair button:last-child').getAttribute('aria-pressed')==='true','swatch selected state');
  $('#selGo').click();check(CU.step===2&&$('#selGo').disabled,'faction required');checkLayout();
  $('#facGrid button:first-child').click();$('#cuDiff [data-v="0"]').click();check(!$('#selGo').disabled&&CU.diff===0,'ready to start');
  $('#selBack').click();check(CU.step===1&&CU.fac&&CU.style==='pony','back retains choices');
  setCreationStep(2);$('#selGo').click();check(G.mode==='game'&&S.cls==='wizard'&&S.hero==='C'&&S.diff===0&&S.cust.style==='pony','begin journey preserves selections');
  toTitle();openSelect();$('#clsGrid [data-c="wizard"]').click();
  if(location.search.includes('appearance'))setCreationStep(1);
  if(location.search.includes('journey')){setCreationStep(2);$('#facGrid button:first-child').click();}
  drawCreationPreview(0);
  document.title='SCENARIO '+(errors.length?'FAIL '+errors.join(', '):'PASS')+' Creation viewport='+innerWidth+'x'+innerHeight;
 }catch(e){document.title='SCENARIO FAIL '+e.stack;}
},500);
