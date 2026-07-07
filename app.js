const $ = (id)=>document.getElementById(id);
const poster = $('captureArea');
const scheduleList = $('scheduleList');
const stand = $('standImage');
const templates = [
  ['pop','ポップ','明るく親しみやすい','theme-pop bg-gradient'],['simple','シンプル','白系ですっきり','theme-simple bg-cafe'],['yume','ゆめかわ','水玉パステル','theme-pop bg-dots'],['neon','ネオン','夜・ゲーム向け','theme-neon bg-night'],['cafe','カフェ','雑談向け','theme-cafe bg-cafe'],['cyber','サイバー','かっこいい配信','theme-neon bg-cyber'],['stripe','カラフル','元気な告知','theme-pop bg-stripe'],['night','夜配信','落ち着いた雰囲気','theme-neon bg-night']
];
const backgrounds = [['bg-gradient','グラデーション'],['bg-dots','水玉'],['bg-stripe','ストライプ'],['bg-night','夜空'],['bg-cafe','カフェ'],['bg-cyber','サイバー']];
const fonts = [
 ['M PLUS Rounded 1c','丸ゴシック'],['Noto Sans JP','万能ゴシック'],['Zen Maru Gothic','やさしい丸文字'],['Zen Kaku Gothic New','すっきり'],['Kiwi Maru','手書き風'],['Yusei Magic','ポップ手書き'],['Kosugi Maru','読みやすい丸'],['Kaisei Decol','和風かわいい'],['DotGothic16','ドット'],['RocknRoll One','元気'],['Reggae One','個性強め']
];
const stamps = '🎮 🎤 💬 ✨ ⭐ 💖 🌈 🔥 🎉 📢 🐱 🐰 🍓 🌸 🌙 ☁️ 🎧 🕹️ 👑 💎'.split(' ');
let schedules = JSON.parse(localStorage.getItem('sukedecoSchedules')||'[]');
let standState = JSON.parse(localStorage.getItem('sukedecoStandState')||'{"x":0,"y":0,"scale":1.2,"rotate":0,"flip":1,"opacity":1}');
let dragTarget=null, start={x:0,y:0,left:0,top:0};
function init(){renderTemplates();renderBackgrounds();renderFonts();renderStamps();renderSchedules();loadDraft();bind();applyStandState();}
function renderTemplates(){ $('templateGrid').innerHTML = templates.map((t,i)=>`<button class="templateCard ${i===0?'active':''}" data-template="${t[0]}">${t[1]}<small>${t[2]}</small></button>`).join(''); }
function renderBackgrounds(){ $('bgGrid').innerHTML = backgrounds.map(b=>`<button class="bgChip" data-bg="${b[0]}">${b[1]}</button>`).join(''); }
function renderFonts(){ $('fontSelect').innerHTML = fonts.map(f=>`<option value="${f[0]}">${f[1]}</option>`).join(''); }
function renderStamps(){ $('stampGrid').innerHTML = stamps.map(s=>`<button data-stamp="${s}">${s}</button>`).join(''); }
function renderSchedules(){ if(!schedules.length){ schedules=[{date:'7/15(火)',time:'20:00',title:'雑談配信',genre:'💬 雑談'},{date:'7/17(木)',time:'21:00',title:'ゲーム配信',genre:'🎮 ゲーム'},{date:'7/20(日)',time:'19:30',title:'コラボ配信',genre:'🤝 コラボ'}]; }
 scheduleList.innerHTML=schedules.map((s,i)=>`<div class="scheduleItem" data-i="${i}"><div class="dateBadge">${escapeHtml(s.date)}</div><div class="timeBadge">${escapeHtml(s.time)}</div><div><div>${escapeHtml(s.title)}</div><span class="genreBadge">${escapeHtml(s.genre)}</span></div></div>`).join('');}
function bind(){
 $('addScheduleBtn').onclick=()=>{schedules.push({date:$('dateInput').value||'日付未定',time:$('timeInput').value||'時間未定',title:$('titleInput').value||'配信予定',genre:$('genreInput').value});renderSchedules();saveLocal();};
 document.querySelectorAll('.templateCard').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.templateCard').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const t=templates.find(x=>x[0]===btn.dataset.template);poster.className=`poster ${$('exportSize').value} ${t[3]}`;applyToggles();});
 document.querySelectorAll('.bgChip').forEach(btn=>btn.onclick=()=>{backgrounds.forEach(b=>poster.classList.remove(b[0]));poster.classList.add(btn.dataset.bg);});
 document.querySelectorAll('.toolBtn').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.toolBtn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.toolPanel').forEach(p=>p.classList.add('hidden'));$(`tool-${btn.dataset.tool}`).classList.remove('hidden');});
 $('fontSelect').onchange=()=>poster.style.fontFamily=`'${$('fontSelect').value}','Noto Sans JP',sans-serif`;
 $('textColor').oninput=()=>{document.querySelector('.posterTitle').style.color=$('textColor').value;document.querySelector('.posterSubtitle').style.color=$('textColor').value;};
 $('accentColor').oninput=()=>document.documentElement.style.setProperty('--pink',$('accentColor').value);
 $('titleSize').oninput=()=>document.querySelector('.posterTitle').style.fontSize=$('titleSize').value+'px';
 $('outlineToggle').onchange=applyToggles;$('shadowToggle').onchange=applyToggles;$('watermarkToggle').onchange=()=>$('watermark').classList.toggle('hidden',!$('watermarkToggle').checked);$('largeCardsToggle').onchange=applyToggles;
 $('standUpload').onchange=e=>{const file=e.target.files[0]; if(!file)return; const r=new FileReader();r.onload=()=>{stand.src=r.result;stand.classList.remove('hidden');localStorage.setItem('sukedecoStandImage',r.result)};r.readAsDataURL(file)};
 ['standSize','standOpacity','standRotate'].forEach(id=>$(id).oninput=()=>{standState.scale=$('standSize').value/100;standState.opacity=$('standOpacity').value/100;standState.rotate=+$('standRotate').value;applyStandState();saveLocal();});
 $('flipStand').onclick=()=>{standState.flip*=-1;applyStandState();saveLocal();};$('resetStand').onclick=()=>{standState.x=0;standState.y=0;standState.scale=1.2;standState.rotate=0;standState.flip=1;standState.opacity=1;$('standSize').value=120;$('standOpacity').value=100;$('standRotate').value=0;applyStandState();saveLocal();};
 document.querySelectorAll('.shapeGrid button').forEach(b=>b.onclick=()=>addShape(b.dataset.shape));
 document.querySelectorAll('.stampGrid button').forEach(b=>b.onclick=()=>addStamp(b.dataset.stamp));
 $('exportSize').onchange=()=>{poster.classList.remove('square','portrait','story');poster.classList.add($('exportSize').value);$('sizeLabel').textContent={square:'X正方形 1080×1080',portrait:'X縦長 1080×1350',story:'ストーリー 1080×1920'}[$('exportSize').value];};
 $('downloadBtn').onclick=download;$('downloadBtn2').onclick=download;$('saveDraftBtn').onclick=()=>{saveLocal();alert('下書きを保存しました');};$('clearDraftBtn').onclick=()=>{localStorage.removeItem('sukedecoSchedules');localStorage.removeItem('sukedecoStandImage');localStorage.removeItem('sukedecoStandState');alert('下書きを削除しました');};$('newDesignBtn').onclick=()=>{schedules=[];renderSchedules();};
 makeDraggable(stand);
}
function applyToggles(){poster.classList.toggle('noOutline',!$('outlineToggle').checked);poster.classList.toggle('noShadow',!$('shadowToggle').checked);poster.classList.toggle('largeCards',$('largeCardsToggle').checked)}
function applyStandState(){stand.style.transform=`translate(${standState.x}px,${standState.y}px) scale(${standState.scale*standState.flip},${standState.scale}) rotate(${standState.rotate}deg)`;stand.style.opacity=standState.opacity;}
function addShape(type){const el=document.createElement('div');el.className=`shapeEl shape-${type}`;el.style.setProperty('--yellow',$('shapeColor').value);el.style.background=$('shapeColor').value;el.style.color=$('shapeColor').value;if(type==='star')el.textContent='★';if(type==='heart')el.textContent='♥';if(type==='bubble'){el.textContent='配信!';el.style.color='#fff'}$('shapeLayer').appendChild(el);makeDraggable(el)}
function addStamp(s){const el=document.createElement('div');el.className='stampEl';el.textContent=s;$('stampLayer').appendChild(el);makeDraggable(el)}
function makeDraggable(el){el.addEventListener('pointerdown',e=>{dragTarget=el;el.setPointerCapture(e.pointerId);start.x=e.clientX;start.y=e.clientY;if(el===stand){start.left=standState.x;start.top=standState.y}else{start.left=parseFloat(el.style.left||0);start.top=parseFloat(el.style.top||0)}});el.addEventListener('pointermove',e=>{if(dragTarget!==el)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(el===stand){standState.x=start.left+dx;standState.y=start.top+dy;applyStandState()}else{el.style.left=start.left+dx+'px';el.style.top=start.top+dy+'px'}});el.addEventListener('pointerup',()=>{dragTarget=null;saveLocal()})}
function saveLocal(){localStorage.setItem('sukedecoSchedules',JSON.stringify(schedules));localStorage.setItem('sukedecoStandState',JSON.stringify(standState));}
function loadDraft(){const img=localStorage.getItem('sukedecoStandImage');if(img){stand.src=img;stand.classList.remove('hidden')}}
async function download(){const map={square:[1080,1080],portrait:[1080,1350],story:[1080,1920]};const [w,h]=map[$('exportSize').value];const oldW=poster.style.width,oldH=poster.style.height;poster.style.width=w+'px';poster.style.height=h+'px';const canvas=await html2canvas(poster,{backgroundColor:null,scale:1,useCORS:true});poster.style.width=oldW;poster.style.height=oldH;const a=document.createElement('a');a.download='sukedeco-schedule.png';a.href=canvas.toDataURL('image/png');a.click();}
function escapeHtml(str){return String(str).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
init();
