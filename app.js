const $ = (id)=>document.getElementById(id);
const poster = $('captureArea');
const scheduleList = $('scheduleList');
const stand = $('standImage');
const mixerLayer = $('mixerLayer');

const layouts = [
  ['blank','白紙','最初は空白から','theme-simple'],
  ['weekly','週間予定','予定カード中心','theme-simple'],
  ['leftStand','左立ち絵','人物を左に配置','theme-simple layout-left'],
  ['rightStand','右立ち絵','人物を右に配置','theme-simple layout-right'],
  ['timetable','タイムテーブル','時間が見やすい','theme-simple layout-time'],
  ['large','大きめカード','文字を大きく','theme-simple largeCards']
];
const designs = [
  ['simple','シンプル','theme-simple'],['pop','ポップ','theme-pop'],['yume','ゆめかわ','theme-pop decorVisible'],['neon','ネオン','theme-neon'],['cafe','カフェ','theme-cafe'],['cyber','サイバー','theme-neon decorVisible']
];
const backgrounds = [['bg-blank','白紙'],['bg-gradient','グラデーション'],['bg-dots','水玉'],['bg-stripe','ストライプ'],['bg-night','夜空'],['bg-cafe','カフェ'],['bg-cyber','サイバー']];
const fonts = [
 ['-apple-system, BlinkMacSystemFont, sans-serif','標準・アプリ風'],
 ['Hiragino Sans, Hiragino Kaku Gothic ProN, sans-serif','Macゴシック'],
 ['Yu Gothic, YuGothic, sans-serif','すっきりゴシック'],
 ['Meiryo, sans-serif','読みやすい'],
 ['Arial, sans-serif','シンプル英字'],
 ['Arial Rounded MT Bold, Hiragino Maru Gothic ProN, sans-serif','丸文字風'],
 ['Verdana, sans-serif','やわらか'],
 ['Trebuchet MS, sans-serif','ポップ英字'],
 ['Georgia, serif','上品'],
 ['Times New Roman, serif','クラシック'],
 ['Courier New, monospace','ドット・端末風']
];
const stamps = '🎮 🎤 💬 ✨ ⭐ 💖 🌈 🔥 🎉 📢 🐱 🐰 🍓 🌸 🌙 ☁️ 🎧 🕹️ 👑 💎'.split(' ');
let schedules = JSON.parse(localStorage.getItem('sukedecoSchedules')||'[]');
let standState = JSON.parse(localStorage.getItem('sukedecoStandState')||'{"x":0,"y":0,"scale":1.2,"rotate":0,"flip":1,"opacity":1}');
let dragTarget=null, start={x:0,y:0,left:0,top:0};
let selectedEl=null;
let zCounter=20;

function init(){
  renderLayouts();renderDesigns();renderBackgrounds();renderFonts();renderStamps();renderSchedules();loadDraft();bind();applyStandState();updateEmptyState();
}
function renderLayouts(){ $('templateGrid').innerHTML = layouts.map((t,i)=>`<button class="templateCard ${i===0?'active':''}" data-layout="${t[0]}">${t[1]}<small>${t[2]}</small></button>`).join(''); }
function renderDesigns(){ $('designGrid').innerHTML = designs.map((d,i)=>`<button class="bgChip ${i===0?'designActive':''}" data-design="${d[0]}">${d[1]}</button>`).join(''); }
function renderBackgrounds(){ $('bgGrid').innerHTML = backgrounds.map((b,i)=>`<button class="bgChip ${i===0?'bgActive':''}" data-bg="${b[0]}">${b[1]}</button>`).join(''); }
function renderFonts(){ $('fontSelect').innerHTML = fonts.map(f=>`<option value="${f[0]}">${f[1]}</option>`).join(''); }
function renderStamps(){ $('stampGrid').innerHTML = stamps.map(s=>`<button data-stamp="${s}">${s}</button>`).join(''); }
function renderSchedules(){
 if(!schedules.length){ scheduleList.innerHTML=''; updateEmptyState(); return; }
 scheduleList.innerHTML=schedules.map((s,i)=>`<div class="scheduleItem" data-i="${i}"><div class="dateBadge">${escapeHtml(s.date)}</div><div class="timeBadge">${escapeHtml(s.time)}</div><div><div>${escapeHtml(s.title)}</div><span class="genreBadge">${escapeHtml(s.genre)}</span></div></div>`).join('');
 updateEmptyState();
}
function baseClasses(){ return ['poster',$('exportSize').value,getCurrentDesignClass(),getCurrentBgClass(),getCurrentLayoutClass()].join(' '); }
function getCurrentDesignClass(){ const a=document.querySelector('[data-design].designActive'); const d=designs.find(x=>x[0]===(a?.dataset.design||'simple')); return d?d[2]:'theme-simple'; }
function getCurrentBgClass(){ const a=document.querySelector('[data-bg].bgActive'); return a?.dataset.bg||'bg-blank'; }
function getCurrentLayoutClass(){ const a=document.querySelector('[data-layout].active'); const l=layouts.find(x=>x[0]===(a?.dataset.layout||'blank')); return l?l[3].replace('theme-simple','').trim():''; }
function refreshPosterClass(){ poster.className=baseClasses(); applyToggles(); updateEmptyState(); }
function bind(){
 $('addScheduleBtn').onclick=()=>{schedules.push({date:$('dateInput').value||'日付未定',time:$('timeInput').value||'時間未定',title:$('titleInput').value||'配信予定',genre:$('genreInput').value});renderSchedules();saveLocal();};
 document.querySelectorAll('.templateCard').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.templateCard').forEach(b=>b.classList.remove('active'));btn.classList.add('active');refreshPosterClass();});
 document.querySelectorAll('#designGrid .bgChip').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('#designGrid .bgChip').forEach(b=>b.classList.remove('designActive'));btn.classList.add('designActive');refreshPosterClass();});
 document.querySelectorAll('#bgGrid .bgChip').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('#bgGrid .bgChip').forEach(b=>b.classList.remove('bgActive'));btn.classList.add('bgActive');refreshPosterClass();});
 document.querySelectorAll('.toolBtn').forEach(btn=>btn.onclick=()=>showTool(btn.dataset.tool));
 $('fontSelect').onchange=()=>poster.style.fontFamily=$('fontSelect').value;
 $('textColor').oninput=()=>{document.querySelector('.posterTitle').style.color=$('textColor').value;document.querySelector('.posterSubtitle').style.color=$('textColor').value;};
 $('accentColor').oninput=()=>document.documentElement.style.setProperty('--pink',$('accentColor').value);
 $('titleSize').oninput=()=>document.querySelector('.posterTitle').style.fontSize=$('titleSize').value+'px';
 $('outlineToggle').onchange=applyToggles;$('shadowToggle').onchange=applyToggles;$('watermarkToggle').onchange=()=>$('watermark').classList.toggle('hidden',!$('watermarkToggle').checked);$('largeCardsToggle').onchange=applyToggles;
 $('standUpload').onchange=e=>{const file=e.target.files[0]; if(!file)return; const r=new FileReader();r.onload=()=>{stand.src=r.result;stand.classList.remove('hidden');localStorage.setItem('sukedecoStandImage',r.result);selectElement(stand);updateEmptyState();};r.readAsDataURL(file)};
 ['standSize','standOpacity','standRotate'].forEach(id=>$(id).oninput=()=>{standState.scale=$('standSize').value/100;standState.opacity=$('standOpacity').value/100;standState.rotate=+$('standRotate').value;applyStandState();saveLocal();});
 $('flipStand').onclick=()=>{standState.flip*=-1;applyStandState();saveLocal();};
 $('resetStand').onclick=()=>{standState={x:0,y:0,scale:1.2,rotate:0,flip:1,opacity:1};$('standSize').value=120;$('standOpacity').value=100;$('standRotate').value=0;applyStandState();saveLocal();};
 document.querySelectorAll('.shapeGrid button').forEach(b=>b.onclick=()=>addShape(b.dataset.shape));
 document.querySelectorAll('.stampGrid button').forEach(b=>b.onclick=()=>addStamp(b.dataset.stamp));
 $('exportSize').onchange=()=>{poster.classList.remove('square','portrait','story');poster.classList.add($('exportSize').value);$('sizeLabel').textContent={square:'X正方形 1080×1080',portrait:'X縦長 1080×1350',story:'ストーリー 1080×1920'}[$('exportSize').value];};
 $('downloadBtn').onclick=download;$('downloadBtn2').onclick=download;$('saveDraftBtn').onclick=()=>{saveLocal();alert('下書きを保存しました');};
 $('clearDraftBtn').onclick=()=>{localStorage.removeItem('sukedecoSchedules');localStorage.removeItem('sukedecoStandImage');localStorage.removeItem('sukedecoStandState');localStorage.removeItem('sukedecoMixerBg');alert('下書きを削除しました');};
 $('newDesignBtn').onclick=()=>{schedules=[];renderSchedules();$('shapeLayer').innerHTML='';$('stampLayer').innerHTML='';stand.classList.add('hidden');clearMixerBackground(false);localStorage.clear();updateEmptyState();};
 $('deleteEl').onclick=deleteSelected; $('duplicateEl').onclick=duplicateSelected; $('frontEl').onclick=()=>moveZ(1); $('backEl').onclick=()=>moveZ(-1);
 $('selectedScale').oninput=()=>updateSelectedTransform(); $('selectedRotate').oninput=()=>updateSelectedTransform(); $('selectedOpacity').oninput=()=>{ if(selectedEl){ selectedEl.style.opacity=$('selectedOpacity').value/100; }};

 $('makeMixerBg').onclick=()=>applyMixerBackground();
 $('mixerMood').onchange=()=>{setMixerPresetByMood();applyMixerBackground(false);};
 $('randomMixerBg').onclick=randomMixerBackground;
 $('clearMixerBg').onclick=()=>clearMixerBackground(true);
 ['mixerMood','mixerColor1','mixerColor2','mixerPattern','mixerAmount','mixerLight','mixerOpacity'].forEach(id=>$(id).oninput=()=>applyMixerBackground(false));
 poster.addEventListener('pointerdown',e=>{ if(e.target===poster || e.target.id==='emptyHint') selectElement(null); });
 makeDraggable(stand);
}
function showTool(tool){document.querySelectorAll('.toolBtn').forEach(b=>b.classList.remove('active'));document.querySelector(`[data-tool="${tool}"]`)?.classList.add('active');document.querySelectorAll('.toolPanel').forEach(p=>p.classList.add('hidden'));$(`tool-${tool}`).classList.remove('hidden');}
function applyToggles(){poster.classList.toggle('noOutline',!$('outlineToggle').checked);poster.classList.toggle('noShadow',!$('shadowToggle').checked);poster.classList.toggle('largeCards',$('largeCardsToggle').checked)}
function applyStandState(){stand.style.transform=`translate(${standState.x}px,${standState.y}px) scale(${standState.scale*standState.flip},${standState.scale}) rotate(${standState.rotate}deg)`;stand.style.opacity=standState.opacity;}
function addShape(type){const el=document.createElement('div');el.className=`shapeEl shape-${type}`;el.dataset.kind='図形';el.dataset.scale=1;el.dataset.rotate=0;el.style.zIndex=++zCounter;el.style.setProperty('--yellow',$('shapeColor').value);el.style.background=$('shapeColor').value;el.style.color=$('shapeColor').value;if(type==='star')el.textContent='★';if(type==='heart')el.textContent='♥';if(type==='bubble'){el.textContent='配信!';el.style.color='#fff'}$('shapeLayer').appendChild(el);makeDraggable(el);selectElement(el);updateEmptyState();}
function addStamp(s){const el=document.createElement('div');el.className='stampEl';el.dataset.kind='素材';el.dataset.scale=1;el.dataset.rotate=0;el.style.zIndex=++zCounter;el.textContent=s;$('stampLayer').appendChild(el);makeDraggable(el);selectElement(el);updateEmptyState();}
function selectElement(el){ if(selectedEl) selectedEl.classList.remove('selected'); selectedEl=el; if(el){el.classList.add('selected');$('selectedInfo').textContent=(el===stand?'立ち絵・画像':el.dataset.kind||'素材')+'を選択中';$('selectedScale').value=Math.round((parseFloat(el.dataset.scale)||1)*100);$('selectedRotate').value=parseFloat(el.dataset.rotate)||0;$('selectedOpacity').value=Math.round((parseFloat(el.style.opacity)||1)*100);showTool('edit');}else{$('selectedInfo').textContent='素材・図形・立ち絵をタップすると編集できます。';}}
function updateSelectedTransform(){ if(!selectedEl)return; const scale=$('selectedScale').value/100; const rotate=+$('selectedRotate').value; selectedEl.dataset.scale=scale; selectedEl.dataset.rotate=rotate; if(selectedEl===stand){standState.scale=scale;standState.rotate=rotate;applyStandState();}else{selectedEl.style.transform=`scale(${scale}) rotate(${rotate}deg)`;} }
function deleteSelected(){ if(!selectedEl)return; if(selectedEl===stand){stand.classList.add('hidden');stand.removeAttribute('src');localStorage.removeItem('sukedecoStandImage');} else selectedEl.remove(); selectedEl=null; $('selectedInfo').textContent='削除しました。'; updateEmptyState(); }
function duplicateSelected(){ if(!selectedEl || selectedEl===stand){alert('立ち絵はアップロードから差し替えてください');return;} const c=selectedEl.cloneNode(true); c.classList.remove('selected'); c.style.left=(parseFloat(selectedEl.style.left||0)+24)+'px'; c.style.top=(parseFloat(selectedEl.style.top||0)+24)+'px'; c.style.zIndex=++zCounter; selectedEl.parentNode.appendChild(c); makeDraggable(c); selectElement(c); updateEmptyState(); }
function moveZ(dir){ if(!selectedEl)return; let z=parseInt(selectedEl.style.zIndex||5,10); selectedEl.style.zIndex = dir>0 ? ++zCounter : Math.max(1,z-5); }
function makeDraggable(el){el.addEventListener('pointerdown',e=>{e.stopPropagation();selectElement(el);dragTarget=el;el.setPointerCapture(e.pointerId);start.x=e.clientX;start.y=e.clientY;if(el===stand){start.left=standState.x;start.top=standState.y}else{start.left=parseFloat(el.style.left||0);start.top=parseFloat(el.style.top||0)}});el.addEventListener('pointermove',e=>{if(dragTarget!==el)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(el===stand){standState.x=start.left+dx;standState.y=start.top+dy;applyStandState()}else{el.style.left=start.left+dx+'px';el.style.top=start.top+dy+'px'}});el.addEventListener('pointerup',()=>{dragTarget=null;saveLocal()})}
function saveLocal(){localStorage.setItem('sukedecoSchedules',JSON.stringify(schedules));localStorage.setItem('sukedecoStandState',JSON.stringify(standState)); saveMixerState();}
function loadDraft(){const img=localStorage.getItem('sukedecoStandImage');if(img){stand.src=img;stand.classList.remove('hidden')} loadMixerState();}
function updateEmptyState(){ const has=schedules.length||!stand.classList.contains('hidden')||$('shapeLayer').children.length||$('stampLayer').children.length||mixerLayer.children.length; poster.classList.toggle('hasContent',!!has); }
async function download(){
 selectElement(null);
 const map={square:[1080,1080],portrait:[1080,1350],story:[1080,1920]};
 const [w,h]=map[$('exportSize').value];
 const oldW=poster.style.width, oldH=poster.style.height;
 poster.style.width=w+'px'; poster.style.height=h+'px';
 try{
   const canvas = await domToCanvasLocal(poster,w,h);
   const a=document.createElement('a');
   a.download='sukedeco-schedule.png';
   a.href=canvas.toDataURL('image/png');
   a.click();
 }catch(err){
   alert('保存に失敗しました。画像が大きすぎる場合は、少し小さいサイズで試してください。');
   console.error(err);
 }finally{
   poster.style.width=oldW; poster.style.height=oldH;
 }
}
function inlineStyles(source, target){
 const computed = getComputedStyle(source);
 for(const prop of computed){ target.style.setProperty(prop, computed.getPropertyValue(prop), computed.getPropertyPriority(prop)); }
 target.removeAttribute('contenteditable');
 const srcChildren=[...source.children], tgtChildren=[...target.children];
 srcChildren.forEach((child,i)=>inlineStyles(child,tgtChildren[i]));
}
function domToCanvasLocal(node,w,h){
 return new Promise((resolve,reject)=>{
   const clone=node.cloneNode(true);
   inlineStyles(node, clone);
   clone.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
   const html=new XMLSerializer().serializeToString(clone);
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
   const img=new Image();
   const svgUrl='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
   img.onload=()=>{
     const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h;
     const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0); resolve(canvas);
   };
   img.onerror=reject;
   img.src=svgUrl;
 });
}

function hexToRgb(hex){
 const v=hex.replace('#','');
 return {r:parseInt(v.slice(0,2),16),g:parseInt(v.slice(2,4),16),b:parseInt(v.slice(4,6),16)};
}
function rgba(hex,a){ const c=hexToRgb(hex); return `rgba(${c.r},${c.g},${c.b},${a})`; }
function lighten(hex,rate){
 const c=hexToRgb(hex); const t=rate>=1?255:0; const p=rate>=1?rate-1:1-rate;
 const n=x=>Math.round(x+(t-x)*Math.min(1,p));
 return `rgb(${n(c.r)},${n(c.g)},${n(c.b)})`;
}
function patternCss(pattern,c1,c2,opacity){
 const a=opacity/100;
 if(pattern==='none') return '';
 if(pattern==='dots') return `radial-gradient(${rgba('#ffffff',a)} 12%, transparent 13%) 0 0 / 34px 34px,`;
 if(pattern==='grid') return `linear-gradient(90deg,${rgba('#ffffff',a*.55)} 1px,transparent 1px) 0 0 / 36px 36px,linear-gradient(${rgba('#ffffff',a*.55)} 1px,transparent 1px) 0 0 / 36px 36px,`;
 if(pattern==='stripe') return `repeating-linear-gradient(135deg,${rgba('#ffffff',a*.38)} 0 14px,transparent 14px 32px),`;
 if(pattern==='hearts') return `radial-gradient(circle at 20% 18%,${rgba(c2,a*.85)} 0 7px,transparent 8px),radial-gradient(circle at 28% 18%,${rgba(c2,a*.85)} 0 7px,transparent 8px),radial-gradient(circle at 24% 25%,${rgba(c2,a*.85)} 0 9px,transparent 10px) 0 0 / 78px 78px,`;
 return `radial-gradient(circle at 15% 18%,${rgba('#ffffff',a)} 0 2px,transparent 3px),radial-gradient(circle at 50% 45%,${rgba(c2,a*.65)} 0 2px,transparent 4px),radial-gradient(circle at 82% 22%,${rgba('#ffffff',a*.9)} 0 3px,transparent 4px) 0 0 / 70px 70px,`;
}
function moodPreset(mood){
 const map={
  kawaii:['#ff8ecf','#9a7bff','hearts'], night:['#161b3f','#8d6bff','stars'], game:['#3ad7ff','#ffdf4d','grid'], cyber:['#081426','#2fffd2','grid'], cafe:['#f3c78e','#fff1d0','dots'], summer:['#55d8ff','#fff06a','stripe'], simple:['#f8f7fb','#ffffff','none']
 };
 return map[mood]||map.kawaii;
}
function setMixerPresetByMood(){
 const [c1,c2,pat]=moodPreset($('mixerMood').value);
 $('mixerColor1').value=c1; $('mixerColor2').value=c2; $('mixerPattern').value=pat;
}
function applyMixerBackground(announce=true){
 const c1=$('mixerColor1').value, c2=$('mixerColor2').value;
 const pattern=$('mixerPattern').value;
 const light=$('mixerLight').value/100;
 const opacity=+$('mixerOpacity').value;
 const base1=lighten(c1,light), base2=lighten(c2,light);
 const css=patternCss(pattern,c1,c2,opacity)+`radial-gradient(circle at 18% 12%,${rgba(c2,.55)},transparent 25%),radial-gradient(circle at 86% 18%,${rgba('#ffffff',.40)},transparent 18%),linear-gradient(145deg,${base1},${base2})`;
 poster.style.background=css;
 poster.classList.add('mixerBg');
 buildMixerDecor(pattern,c1,c2,parseInt($('mixerAmount').value,10));
 saveMixerState(); updateEmptyState();
 if(announce) flashHint('背景を作成しました');
}
function buildMixerDecor(pattern,c1,c2,amount){
 mixerLayer.innerHTML='';
 const symbols={stars:['✦','✧','★','•'],hearts:['♡','♥','✦','•'],dots:['●','○','•'],grid:['＋','□','◇','•'],stripe:['━','✦','•'],none:['']};
 const arr=symbols[pattern]||symbols.stars;
 for(let i=0;i<amount;i++){
  const el=document.createElement('span');
  el.className='mixerPiece';
  el.textContent=arr[i%arr.length];
  el.style.left=(4+Math.random()*90)+'%';
  el.style.top=(4+Math.random()*90)+'%';
  el.style.color=i%2?c1:c2;
  el.style.opacity=(.20+Math.random()*.48).toFixed(2);
  el.style.fontSize=(12+Math.random()*44)+'px';
  el.style.transform=`rotate(${Math.random()*60-30}deg)`;
  mixerLayer.appendChild(el);
 }
}
function randomMixerBackground(){
 const moods=['kawaii','night','game','cyber','cafe','summer','simple'];
 $('mixerMood').value=moods[Math.floor(Math.random()*moods.length)];
 setMixerPresetByMood();
 $('mixerAmount').value=Math.floor(8+Math.random()*26);
 $('mixerLight').value=Math.floor(86+Math.random()*34);
 $('mixerOpacity').value=Math.floor(24+Math.random()*44);
 applyMixerBackground();
}
function clearMixerBackground(save=true){
 poster.style.background='';
 poster.classList.remove('mixerBg');
 mixerLayer.innerHTML='';
 if(save) localStorage.removeItem('sukedecoMixerBg');
 updateEmptyState();
}
function saveMixerState(){
 if(!poster.classList.contains('mixerBg')) return;
 const data={mood:$('mixerMood').value,c1:$('mixerColor1').value,c2:$('mixerColor2').value,pattern:$('mixerPattern').value,amount:$('mixerAmount').value,light:$('mixerLight').value,opacity:$('mixerOpacity').value};
 localStorage.setItem('sukedecoMixerBg',JSON.stringify(data));
}
function loadMixerState(){
 const raw=localStorage.getItem('sukedecoMixerBg'); if(!raw) return;
 try{const d=JSON.parse(raw); $('mixerMood').value=d.mood||'kawaii'; $('mixerColor1').value=d.c1||'#9a7bff'; $('mixerColor2').value=d.c2||'#ff8ecf'; $('mixerPattern').value=d.pattern||'stars'; $('mixerAmount').value=d.amount||16; $('mixerLight').value=d.light||100; $('mixerOpacity').value=d.opacity||42; applyMixerBackground(false);}catch(e){}
}
function flashHint(text){
 const old=$('selectedInfo')?.textContent;
 if($('selectedInfo')){ $('selectedInfo').textContent=text; setTimeout(()=>{ if(!selectedEl) $('selectedInfo').textContent=old||'素材・図形・立ち絵をタップすると編集できます。';},1100); }
}

function escapeHtml(str){return String(str).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
init();
