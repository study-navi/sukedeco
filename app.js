const $ = (q, root=document) => root.querySelector(q);
const $$ = (q, root=document) => [...root.querySelectorAll(q)];
const app = $('#app');
const nav = $('#bottomNav');
const toast = $('#toast');

const state = {
  view: 'home',
  schedules: SukeStorage.load('schedules', []),
  brief: SukeStorage.load('brief', {mood:'おまかせ', mainColor:'#5b7cfa', accentColor:'#ff7ab6', prompt:'', standeeSpace:true}),
  candidates: SukeStorage.load('candidates', []),
  selected: SukeStorage.load('selected', null),
  standeeData: SukeStorage.load('standeeData', ''),
  watermark: SukeStorage.load('watermark', true)
};

function showToast(msg){ toast.textContent = msg; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'), 1800); }
function saveAll(){ SukeStorage.save('schedules', state.schedules); SukeStorage.save('brief', state.brief); SukeStorage.save('candidates', state.candidates); SukeStorage.save('selected', state.selected); SukeStorage.save('standeeData', state.standeeData); SukeStorage.save('watermark', state.watermark); }
function setView(view){ state.view=view; render(); }
function tpl(id){ return document.importNode($('#'+id).content, true); }

function render(){
  nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active', b.dataset.view===state.view));
  $('#backBtn').style.visibility = state.view==='home' ? 'hidden' : 'visible';
  app.innerHTML = '';
  if(state.view==='home') renderHome();
  if(state.view==='input') renderInput();
  if(state.view==='brief') renderBrief();
  if(state.view==='results') renderResults();
  if(state.view==='edit') renderEdit();
}
function renderHome(){ app.append(tpl('homeTpl')); }
function renderInput(){
  app.append(tpl('inputTpl'));
  renderScheduleList();
}
function renderScheduleList(){
  const box = $('#scheduleList'); if(!box) return;
  box.innerHTML = '';
  if(!state.schedules.length){ box.innerHTML = '<p class="lead">まだ予定がありません。まずは1件追加しましょう。</p>'; return; }
  state.schedules.forEach((s,i)=>{
    const item = document.createElement('article'); item.className='schedule-item';
    item.innerHTML = `<div class="schedule-date">${escapeHTML(s.date)}</div><div><div class="schedule-title">${escapeHTML(s.title)}</div><div class="schedule-meta">${escapeHTML(s.time)} / ${escapeHTML(s.genre)}</div></div><button class="mini-btn" data-del="${i}">削除</button>`;
    box.append(item);
  });
}
function renderBrief(){
  app.append(tpl('briefTpl'));
  $('#moodInput').value = state.brief.mood || 'おまかせ';
  $('#mainColor').value = state.brief.mainColor || '#5b7cfa';
  $('#accentColor').value = state.brief.accentColor || '#ff7ab6';
  $('#promptInput').value = state.brief.prompt || '';
  $('#standeeSpace').checked = state.brief.standeeSpace !== false;
}
function renderResults(){
  app.append(tpl('resultsTpl'));
  $('#aiNote').textContent = layoutAdvice(state.schedules.length);
  const track = $('#candidateTrack');
  if(!state.candidates.length){ state.candidates = generateCandidates(state); saveAll(); }
  state.candidates.forEach(c=>{
    const card = document.createElement('article'); card.className='candidate';
    card.innerHTML = `<div class="thumb">${canvasHTML(c, true)}</div><h3>${c.name}</h3><div class="score"><span>見やすさ ${'★'.repeat(c.score.readability)}</span><span>SNS ${'★'.repeat(c.score.sns)}</span></div><p class="schedule-meta">${c.comment}</p><button class="primary" data-select="${c.id}">この案にする</button>`;
    track.append(card);
  });
}
function renderEdit(){
  app.append(tpl('editTpl'));
  if(!state.selected){ state.selected = state.candidates[0] || generateCandidates(state)[0]; }
  $('#editMain').value = state.selected.bg[0];
  $('#editAccent').value = state.selected.accent;
  $('#watermarkToggle').checked = state.watermark;
  refreshPreview();
}
function refreshPreview(){
  const c = state.selected || generateCandidates(state)[0];
  const title = $('#posterTitle')?.value || '今週の配信予定';
  const main = $('#editMain')?.value || c.bg[0];
  const accent = $('#editAccent')?.value || c.accent;
  c.bg[0]=main; c.accent=accent; c.bg[1]=accent;
  state.selected=c; state.watermark = $('#watermarkToggle')?.checked ?? true;
  const canvas = $('#finalCanvas'); if(canvas) canvas.outerHTML = canvasHTML(c, false, title);
  saveAll();
}
function canvasHTML(c, preview=false, title='今週の配信予定'){
  const count = state.schedules.length;
  const compact = count>7 ? ' compact' : '';
  const rows = (state.schedules.length ? state.schedules : [{date:'7/15(火)',time:'20:00',title:'雑談配信',genre:'サンプル'}]).map(s=>`<div class="canvas-row${compact}"><div class="canvas-time">${escapeHTML(s.date)}<br>${escapeHTML(s.time)}</div><div><div class="canvas-name">${escapeHTML(s.title)}</div><div class="canvas-genre">${escapeHTML(s.genre)}</div></div></div>`).join('');
  const standee = state.standeeData && state.brief.standeeSpace ? `<img class="standee" src="${state.standeeData}" alt="立ち絵">` : '';
  const wm = state.watermark ? `<div class="watermark">Made with SukeDeco</div>` : '';
  return `<div id="finalCanvas" class="schedule-canvas" style="background:linear-gradient(135deg,${c.bg[0]},${c.bg[1]});color:${c.ink};"><h2 class="canvas-title">${escapeHTML(title)}</h2><div class="canvas-sub">${layoutAdvice(count)}</div><div class="canvas-list">${rows}</div>${standee}${wm}</div>`;
}
function escapeHTML(str=''){ return String(str).replace(/[&<>'"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m])); }

app.addEventListener('click', e=>{
  const action = e.target.closest('[data-action]')?.dataset.action;
  const viewgo = e.target.closest('[data-viewgo]')?.dataset.viewgo;
  const del = e.target.closest('[data-del]')?.dataset.del;
  const select = e.target.closest('[data-select]')?.dataset.select;
  if(viewgo) setView(viewgo);
  if(del!==undefined){ state.schedules.splice(Number(del),1); saveAll(); renderScheduleList(); }
  if(select){ state.selected = state.candidates.find(c=>c.id===select); saveAll(); setView('edit'); showToast('AI案を採用しました'); }
  if(!action) return;
  if(action==='start') setView('input');
  if(action==='random'){ state.candidates=generateCandidates(state); saveAll(); setView('results'); }
  if(action==='loadDraft'){ showToast('下書きを読み込みました'); setView('input'); }
  if(action==='settings') showToast('設定画面は次回追加予定です');
  if(action==='style') setView('brief');
  if(action==='addSchedule'){
    const s = {date:$('#dateInput').value.trim()||'未定', time:$('#timeInput').value.trim()||'時間未定', title:$('#titleInput').value.trim()||'配信予定', genre:$('#genreInput').value};
    state.schedules.push(s); saveAll(); renderScheduleList(); $('#titleInput').value=''; showToast('予定を追加しました');
  }
  if(action==='saveStyle'){
    readBrief(); SukeStorage.save('favoriteStyle', state.brief); showToast('お気に入りスタイルに保存しました');
  }
  if(action==='loadStyle'){
    state.brief = SukeStorage.load('favoriteStyle', state.brief); saveAll(); renderBrief(); showToast('お気に入りを読み込みました');
  }
  if(action==='generateAI'){
    readBrief(); state.candidates = generateCandidates(state); saveAll(); setView('results'); showToast('AI候補を作成しました');
  }
  if(action==='refreshPreview') refreshPreview();
  if(action==='exportPNG') exportCanvas();
});
nav.addEventListener('click', e=>{ const b=e.target.closest('[data-view]'); if(b) setView(b.dataset.view); });
$('#backBtn').addEventListener('click', ()=>{ const order=['home','input','brief','results','edit']; const i=order.indexOf(state.view); setView(order[Math.max(0,i-1)]); });
$('#saveDraftBtn').addEventListener('click', ()=>{ saveAll(); showToast('下書きを保存しました'); });
function readBrief(){
  if(!$('#moodInput')) return;
  state.brief = { mood:$('#moodInput').value, mainColor:$('#mainColor').value, accentColor:$('#accentColor').value, prompt:$('#promptInput').value, standeeSpace:$('#standeeSpace').checked };
  document.documentElement.style.setProperty('--main', state.brief.mainColor);
  document.documentElement.style.setProperty('--accent', state.brief.accentColor);
}
document.addEventListener('change', e=>{
  if(e.target.id==='imageUpload'){
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader(); reader.onload=()=>{ state.standeeData=reader.result; saveAll(); refreshPreview(); showToast('立ち絵を追加しました'); }; reader.readAsDataURL(file);
  }
});
async function exportCanvas(){
  refreshPreview();
  const node = $('#finalCanvas');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:1080px;height:1350px;transform-origin:top left;transform:scale(${1080/node.offsetWidth});">${node.outerHTML}</div></foreignObject></svg>`;
  const url = URL.createObjectURL(new Blob([svg], {type:'image/svg+xml'}));
  const img = new Image();
  img.onload = () => { const canvas=document.createElement('canvas'); canvas.width=1080; canvas.height=1350; const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0); URL.revokeObjectURL(url); const a=document.createElement('a'); a.download='sukedeco_schedule.png'; a.href=canvas.toDataURL('image/png'); a.click(); };
  img.onerror = () => showToast('保存に失敗しました');
  img.src=url;
}
render();
