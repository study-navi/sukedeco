const $ = (id)=>document.getElementById(id);
const poster = $('captureArea');
const scheduleList = $('scheduleList');
const stand = $('standImage');

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
 ['M PLUS Rounded 1c','丸ゴシック'],['Noto Sans JP','万能ゴシック'],['Zen Maru Gothic','やさしい丸文字'],['Zen Kaku Gothic New','すっきり'],['Kiwi Maru','手書き風'],['Yusei Magic','ポップ手書き'],['Kosugi Maru','読みやすい丸'],['Kaisei Decol','和風かわいい'],['DotGothic16','ドット'],['RocknRoll One','元気'],['Reggae One','個性強め']
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
 $('fontSelect').onchange=()=>poster.style.fontFamily=`'${$('fontSelect').value}','Noto Sans JP',sans-serif`;
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
 $('clearDraftBtn').onclick=()=>{localStorage.removeItem('sukedecoSchedules');localStorage.removeItem('sukedecoStandImage');localStorage.removeItem('sukedecoStandState');alert('下書きを削除しました');};
 $('newDesignBtn').onclick=()=>{schedules=[];renderSchedules();$('shapeLayer').innerHTML='';$('stampLayer').innerHTML='';stand.classList.add('hidden');localStorage.clear();updateEmptyState();};
 $('deleteEl').onclick=deleteSelected; $('duplicateEl').onclick=duplicateSelected; $('frontEl').onclick=()=>moveZ(1); $('backEl').onclick=()=>moveZ(-1);
 $('selectedScale').oninput=()=>updateSelectedTransform(); $('selectedRotate').oninput=()=>updateSelectedTransform(); $('selectedOpacity').oninput=()=>{ if(selectedEl){ selectedEl.style.opacity=$('selectedOpacity').value/100; }};
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
function saveLocal(){localStorage.setItem('sukedecoSchedules',JSON.stringify(schedules));localStorage.setItem('sukedecoStandState',JSON.stringify(standState));}
function loadDraft(){const img=localStorage.getItem('sukedecoStandImage');if(img){stand.src=img;stand.classList.remove('hidden')}}
function updateEmptyState(){ const has=schedules.length||!stand.classList.contains('hidden')||$('shapeLayer').children.length||$('stampLayer').children.length; poster.classList.toggle('hasContent',!!has); }
async function download(){selectElement(null);const map={square:[1080,1080],portrait:[1080,1350],story:[1080,1920]};const [w,h]=map[$('exportSize').value];const oldW=poster.style.width,oldH=poster.style.height;poster.style.width=w+'px';poster.style.height=h+'px';const canvas=await html2canvas(poster,{backgroundColor:null,scale:1,useCORS:true});poster.style.width=oldW;poster.style.height=oldH;const a=document.createElement('a');a.download='sukedeco-schedule.png';a.href=canvas.toDataURL('image/png');a.click();}
function escapeHtml(str){return String(str).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
init();
