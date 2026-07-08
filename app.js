const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const state = {
  schedules: [],
  mood: 'pop',
  main: '#40bfff',
  accent: '#ff7aa8',
  prompt: '',
  selectedDesign: null,
  illust: null,
  illustX: 330,
  illustY: 205,
  illustScale: 100,
  illustRotate: 0,
  illustOpacity: 100,
  illustFlip: false,
  fontScale: 100,
  watermark: true,
  seed: 0
};

const moodMap = {
  pop: {label:'ポップ', theme:'theme-pop'},
  cool: {label:'クール', theme:'theme-cool'},
  game: {label:'ゲーム', theme:'theme-game'},
  simple: {label:'シンプル', theme:'theme-simple'},
  neon: {label:'ネオン', theme:'theme-neon'},
  cafe: {label:'カフェ', theme:'theme-cafe'},
  kawaii: {label:'かわいい', theme:'theme-kawaii'},
  mono: {label:'モノトーン', theme:'theme-mono'},
};

const candidateMoods = ['pop','cool','game','simple','neon','kawaii'];

function setView(name){
  $$('.view').forEach(v=>v.classList.remove('active-view'));
  $(`#view-${name}`).classList.add('active-view');
  $$('.pill').forEach(p=>p.classList.toggle('active',p.dataset.view===name));
  if(name==='candidates') renderCandidates();
}

function addSchedule(){
  const date = $('#dateInput').value.trim() || `7/${15 + state.schedules.length}`;
  const time = $('#timeInput').value.trim() || '20:00';
  const title = $('#titleInput').value.trim() || '配信予定';
  const genre = $('#genreInput').value;
  state.schedules.push({date,time,title,genre});
  $('#dateInput').value=''; $('#timeInput').value=''; $('#titleInput').value='';
  renderScheduleList();
  autoApplyPreview();
}

function renderScheduleList(){
  $('#scheduleCount').textContent = `${state.schedules.length}件`;
  const box = $('#scheduleList');
  if(!state.schedules.length){ box.className='schedule-list empty-list'; box.textContent='まだ予定がありません'; return; }
  box.className='schedule-list';
  box.innerHTML = state.schedules.map((s,i)=>`
    <div class="schedule-item">
      <div><strong>${escapeHtml(s.title)}</strong><span>${escapeHtml(s.date)}　${escapeHtml(s.time)}　#${escapeHtml(s.genre)}</span></div>
      <button data-del="${i}">削除</button>
    </div>`).join('');
  $$('[data-del]').forEach(btn=>btn.onclick=()=>{state.schedules.splice(+btn.dataset.del,1);renderScheduleList();autoApplyPreview();});
}

function chooseLayout(){
  const n = state.schedules.length;
  const totalChars = state.schedules.reduce((a,s)=>a+s.title.length,0);
  if(n===0) return 'layout-empty';
  if(n<=3 && totalChars<36) return 'layout-cards';
  if(n<=6) return 'layout-table';
  if(n<=10) return 'layout-compact';
  return 'layout-two';
}

function aiAdvice(){
  const n=state.schedules.length;
  if(n===0) return '予定を入れるとAIが提案します';
  if(n<=3) return '予定が少ないので大きめカードがおすすめ';
  if(n<=6) return '時間が見やすいタイムテーブル型に調整';
  if(n<=10) return '件数が多いのでコンパクト表示に調整';
  return '予定が多いので2列レイアウトに調整';
}

function renderPreview(design = state.selectedDesign){
  const canvas = $('#scheduleCanvas');
  const layout = design?.layout || chooseLayout();
  const theme = design?.theme || moodMap[state.mood].theme;
  canvas.className = `schedule-canvas ${theme} ${layout}`;
  canvas.style.setProperty('--main', state.main);
  canvas.style.setProperty('--accent', state.accent);
  document.documentElement.style.setProperty('--main', state.main);
  document.documentElement.style.setProperty('--accent', state.accent);

  $('#aiAdvice').textContent = design?.advice || aiAdvice();
  $('#watermark').hidden = !state.watermark;
  $('.canvas-title').textContent = $('#headlineInput')?.value || '今週のスケジュール';
  $('.canvas-title').style.fontSize = `calc(30px * ${state.fontScale/100})`;

  const list = $('#previewSchedule');
  list.innerHTML = state.schedules.map(s=>`
    <div class="preview-item">
      <div class="date">${escapeHtml(s.date)}　${escapeHtml(s.time)}</div>
      <div class="main">${escapeHtml(s.title)}</div>
      <div class="genre">${genreIcon(s.genre)} ${escapeHtml(s.genre)}</div>
    </div>`).join('');

  renderIllust();
}

function renderIllust(){
  const img = $('#previewIllust');
  if(!state.illust){ img.hidden = true; return; }
  img.hidden = false;
  img.src = state.illust;
  img.style.left = `${state.illustX}px`;
  img.style.top = `${state.illustY}px`;
  img.style.width = `${170 * state.illustScale/100}px`;
  img.style.opacity = state.illustOpacity/100;
  img.style.transform = `translate(-50%,-50%) rotate(${state.illustRotate}deg) scaleX(${state.illustFlip?-1:1})`;
}

function autoApplyPreview(){
  state.selectedDesign = {
    label: moodMap[state.mood].label,
    mood: state.mood,
    theme: moodMap[state.mood].theme,
    layout: chooseLayout(),
    advice: aiAdvice(),
    score: scoreDesign(state.mood, chooseLayout())
  };
  renderPreview();
}

function renderCandidates(){
  const moods = [...new Set([state.mood, ...candidateMoods])].slice(0,6);
  const grid = $('#candidateGrid');
  const layout = chooseLayout();
  grid.innerHTML = moods.map((m,i)=>{
    const item = moodMap[m];
    const score = scoreDesign(m, layout, i);
    return `<div class="candidate-card ${state.selectedDesign?.mood===m?'selected':''}" data-candidate="${m}">
      <div class="mini-preview ${item.theme}"><div class="mini-lines"><span></span><span></span><span></span><span></span></div></div>
      <div>
        <h3>${item.label}案</h3>
        <div class="score">見やすさ ${stars(score.readability)}　SNS映え ${stars(score.sns)}</div>
        <p class="small-note">${candidateAdvice(m, layout)}</p>
      </div>
      <button class="adoptBtn" data-adopt="${m}">採用</button>
    </div>`;
  }).join('');
  $$('[data-adopt]').forEach(btn=>btn.onclick=(e)=>{e.stopPropagation(); adoptCandidate(btn.dataset.adopt);});
  $$('[data-candidate]').forEach(card=>card.onclick=()=>adoptCandidate(card.dataset.candidate));
}

function adoptCandidate(mood){
  state.mood = mood;
  state.selectedDesign = {
    label:moodMap[mood].label,
    mood,
    theme:moodMap[mood].theme,
    layout:chooseLayout(),
    advice:candidateAdvice(mood, chooseLayout()),
    score:scoreDesign(mood, chooseLayout())
  };
  if(state.illust) autoPlaceIllust();
  renderPreview();
  renderCandidates();
  $('#editMainColor').value = state.main;
  $('#editAccentColor').value = state.accent;
  setView('edit');
}

function generateWithAI(){
  if(!state.schedules.length){
    alert('まず予定を1件以上追加してください。');
    setView('input');
    return;
  }
  state.main = $('#mainColor').value;
  state.accent = $('#accentColor').value;
  state.prompt = $('#promptInput').value.trim();
  $('#thinkingBox').hidden = false;
  $('#generateBtn').disabled = true;
  const texts = ['予定数を分析中','文字量を確認中','レイアウトを決定中','配色を調整中','候補を作成中'];
  let idx=0;
  $('#thinkingText').textContent = texts[0];
  const timer = setInterval(()=>{ idx++; $('#thinkingText').textContent = texts[idx%texts.length]; }, 330);
  setTimeout(()=>{
    clearInterval(timer);
    $('#thinkingBox').hidden = true;
    $('#generateBtn').disabled = false;
    if(state.illust) autoPlaceIllust();
    autoApplyPreview();
    setView('candidates');
  }, 1700);
}

function autoPlaceIllust(){
  const layout = chooseLayout();
  if(layout==='layout-two' || layout==='layout-compact') { state.illustX = 430; state.illustY = 405; state.illustScale = 82; }
  else if(layout==='layout-table') { state.illustX = 420; state.illustY = 360; state.illustScale = 95; }
  else { state.illustX = 395; state.illustY = 355; state.illustScale = 115; }
  $('#illustScale').value = state.illustScale;
}

function handleImage(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.illust = reader.result;
    $('#illustStatus').textContent = '選択済み：AIが配置します';
    autoPlaceIllust();
    renderPreview();
  };
  reader.readAsDataURL(file);
}

function setupDrag(){
  const img = $('#previewIllust');
  const canvas = $('#scheduleCanvas');
  let dragging=false;
  function point(e){ const t=e.touches?.[0]||e; const r=canvas.getBoundingClientRect(); return {x:(t.clientX-r.left)*520/r.width,y:(t.clientY-r.top)*520/r.height}; }
  img.addEventListener('pointerdown',e=>{dragging=true; img.setPointerCapture(e.pointerId); e.preventDefault();});
  img.addEventListener('pointermove',e=>{ if(!dragging)return; const p=point(e); state.illustX=p.x; state.illustY=p.y; renderIllust(); });
  img.addEventListener('pointerup',()=>dragging=false);
}

function applyEditControls(){
  $('#editMainColor').value = state.main;
  $('#editAccentColor').value = state.accent;
  $('#editMainColor').oninput = e => { state.main=e.target.value; renderPreview(); };
  $('#editAccentColor').oninput = e => { state.accent=e.target.value; renderPreview(); };
  $('#applyColorBtn').onclick = renderPreview;
  $('#headlineInput').oninput = renderPreview;
  $('#fontSizeRange').oninput = e => { state.fontScale = +e.target.value; renderPreview(); };
  $('#illustScale').oninput = e => { state.illustScale=+e.target.value; renderPreview(); };
  $('#illustRotate').oninput = e => { state.illustRotate=+e.target.value; renderPreview(); };
  $('#illustOpacity').oninput = e => { state.illustOpacity=+e.target.value; renderPreview(); };
  $('#flipIllustBtn').onclick = () => { state.illustFlip=!state.illustFlip; renderPreview(); };
  $('#deleteIllustBtn').onclick = () => { state.illust=null; $('#illustStatus').textContent='未選択'; renderPreview(); };
  $('#watermarkToggle').onchange = e => { state.watermark=e.target.checked; renderPreview(); };
}

function downloadPng(){
  const canvasEl = $('#scheduleCanvas');
  const rect = canvasEl.getBoundingClientRect();
  const out = document.createElement('canvas');
  const size = 1080;
  out.width=size; out.height=size;
  const ctx=out.getContext('2d');
  const theme = state.selectedDesign?.theme || moodMap[state.mood].theme;
  drawBackground(ctx,size,theme);
  ctx.save();
  ctx.scale(size/520,size/520);
  // text
  const dark = ['theme-cool','theme-game','theme-neon'].includes(theme);
  ctx.fillStyle = dark ? '#fff' : '#1e2a3a';
  ctx.font = `900 ${30*state.fontScale/100}px sans-serif`;
  ctx.fillText($('#headlineInput').value || '今週のスケジュール',36,58);
  ctx.font = '800 12px sans-serif'; ctx.globalAlpha=.6; ctx.fillText('AI Schedule Design',36,78); ctx.globalAlpha=1;
  drawSchedule(ctx, theme);
  if(state.illust){
    const img = $('#previewIllust');
    ctx.save(); ctx.globalAlpha=state.illustOpacity/100; ctx.translate(state.illustX,state.illustY); ctx.rotate(state.illustRotate*Math.PI/180); ctx.scale(state.illustFlip?-1:1,1);
    const w=170*state.illustScale/100; const ratio=img.naturalHeight/img.naturalWidth || 1.4; ctx.drawImage(img,-w/2,-w*ratio/2,w,w*ratio); ctx.restore();
  }
  if(state.watermark){ ctx.globalAlpha=.45; ctx.font='900 10px sans-serif'; ctx.textAlign='right'; ctx.fillStyle=dark?'#fff':'#1e2a3a'; ctx.fillText('Made with SukeDeco',502,502); ctx.textAlign='left'; ctx.globalAlpha=1; }
  ctx.restore();
  const a=document.createElement('a'); a.download='sukedeco_schedule.png'; a.href=out.toDataURL('image/png'); a.click();
}

function drawBackground(ctx,size,theme){
  const g=ctx.createLinearGradient(0,0,size,size);
  if(theme==='theme-cool'){g.addColorStop(0,'#101b32');g.addColorStop(1,'#234b6d');}
  else if(theme==='theme-game'){g.addColorStop(0,'#111827');g.addColorStop(.55,'#05233a');g.addColorStop(1,'#22113a');}
  else if(theme==='theme-neon'){g.addColorStop(0,'#15162b');g.addColorStop(1,'#3b185f');}
  else if(theme==='theme-simple'){g.addColorStop(0,'#f7fafc');g.addColorStop(1,'#eef3f8');}
  else if(theme==='theme-mono'){g.addColorStop(0,'#f5f5f5');g.addColorStop(1,'#dfe4ea');}
  else if(theme==='theme-cafe'){g.addColorStop(0,'#fff8ed');g.addColorStop(1,'#ead7c1');}
  else if(theme==='theme-kawaii'){g.addColorStop(0,'#fff0f8');g.addColorStop(1,'#eff8ff');}
  else {g.addColorStop(0,'#f4fcff');g.addColorStop(1,'#fff0f7');}
  ctx.fillStyle=g; ctx.fillRect(0,0,size,size);
}

function drawSchedule(ctx, theme){
  const dark = ['theme-cool','theme-game','theme-neon'].includes(theme);
  const layout=chooseLayout();
  const startY=100;
  const itemColor = dark ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.82)';
  ctx.fillStyle=itemColor; ctx.strokeStyle=dark?'rgba(255,255,255,.2)':'rgba(255,255,255,.85)';
  const items=state.schedules;
  items.forEach((s,i)=>{
    let x=36,y=startY+i*78,w=320,h=64;
    if(layout==='layout-two'){w=210;h=56;x=36+(i%2)*224;y=startY+Math.floor(i/2)*66;}
    if(layout==='layout-compact'){h=44;y=startY+i*50;w=360;}
    if(layout==='layout-table'){h=60;y=startY+i*70;w=350;}
    roundRect(ctx,x,y,w,h,16); ctx.fill(); ctx.stroke();
    ctx.fillStyle=state.accent; ctx.font='900 12px sans-serif'; ctx.fillText(`${s.date} ${s.time}`,x+12,y+21);
    ctx.fillStyle=dark?'#fff':'#1e2a3a'; ctx.font='900 17px sans-serif'; ctx.fillText(s.title,x+12,y+43);
    ctx.fillStyle=itemColor; ctx.strokeStyle=dark?'rgba(255,255,255,.2)':'rgba(255,255,255,.85)';
  });
}

function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}

function scoreDesign(mood, layout, bonus=0){
  const base = layout==='layout-cards'?5:layout==='layout-table'?4:layout==='layout-compact'?4:4;
  return {readability: Math.max(3, Math.min(5, base - (mood==='neon'?1:0))), sns: Math.max(3, Math.min(5, 4 + (['pop','game','neon','kawaii'].includes(mood)?1:0) - bonus%2))};
}
function stars(n){return '★★★★★'.slice(0,n)+'☆☆☆☆☆'.slice(0,5-n)}
function candidateAdvice(mood, layout){
  const l = layout==='layout-cards'?'大きめカード':layout==='layout-table'?'タイムテーブル':layout==='layout-compact'?'コンパクト':layout==='layout-two'?'2列':'カード';
  return `${moodMap[mood].label}な雰囲気で、${l}に自動調整しました。`;
}
function genreIcon(g){return ({'雑談':'💬','ゲーム':'🎮','コラボ':'🤝','記念':'🎉','作業':'☕','歌':'🎤','イベント':'📢','その他':'✨'})[g]||'✨'}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

function saveDraft(){ localStorage.setItem('sukedeco_v11', JSON.stringify({...state, illust: state.illust})); alert('下書きを保存しました'); }
function loadDraft(){ try{ const d=JSON.parse(localStorage.getItem('sukedeco_v11')||'null'); if(d){ Object.assign(state,d); $('#mainColor').value=state.main; $('#accentColor').value=state.accent; $('#headlineInput').value=$('#headlineInput').value||'今週のスケジュール'; renderScheduleList(); renderPreview(); }}catch(e){} }
function resetAll(){ if(confirm('内容をリセットしますか？')){ localStorage.removeItem('sukedeco_v11'); location.reload(); } }

function init(){
  $$('.pill').forEach(p=>p.onclick=()=>setView(p.dataset.view));
  $('#addScheduleBtn').onclick=addSchedule;
  $('#goStyleBtn').onclick=()=>setView('style');
  $('#generateBtn').onclick=generateWithAI;
  $('#moreIdeasBtn').onclick=()=>{ state.seed++; renderCandidates(); };
  $('#resetBtn').onclick=resetAll;
  $('#saveDraftBtn').onclick=saveDraft;
  $('#downloadBtn').onclick=downloadPng;
  $('#illustInput').onchange=e=>handleImage(e.target.files[0]);
  $('#illustInput2').onchange=e=>handleImage(e.target.files[0]);
  $$('#moodChips .chip').forEach(c=>c.onclick=()=>{$$('#moodChips .chip').forEach(x=>x.classList.remove('active'));c.classList.add('active');state.mood=c.dataset.value;});
  $$('.edit-tab').forEach(t=>t.onclick=()=>{$$('.edit-tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');$$('.edit-panel').forEach(p=>p.classList.remove('active-panel'));$(`#${t.dataset.panel}`).classList.add('active-panel');});
  $('#mainColor').oninput=e=>state.main=e.target.value;
  $('#accentColor').oninput=e=>state.accent=e.target.value;
  setupDrag(); applyEditControls(); loadDraft(); renderScheduleList(); renderPreview();
}

document.addEventListener('DOMContentLoaded', init);
