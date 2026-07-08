const state = {
  schedules: [],
  mainColor: '#8b5cf6',
  subColor: '#38bdf8',
  mood: 'auto',
  layout: 'smart',
  fontScale: 100,
  watermark: true,
};

const $ = (id) => document.getElementById(id);
const scheduleList = $('scheduleList');
const renderedSchedule = $('renderedSchedule');
const canvas = $('exportCanvas');
const aiComment = $('aiComment');
const watermark = $('watermark');

function createSchedule(data = {}) {
  state.schedules.push({
    date: data.date || '',
    time: data.time || '',
    title: data.title || '',
    memo: data.memo || '',
  });
  renderInputs();
  autoRender(false);
}

function renderInputs() {
  scheduleList.innerHTML = '';
  state.schedules.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'schedule-item';
    div.innerHTML = `
      <button class="delete-small" title="削除">×</button>
      <div class="row">
        <input placeholder="日付 例：7/15(火)" value="${escapeAttr(item.date)}" data-field="date" />
        <input placeholder="時間 例：20:00" value="${escapeAttr(item.time)}" data-field="time" />
      </div>
      <input placeholder="内容 例：雑談配信" value="${escapeAttr(item.title)}" data-field="title" />
      <input placeholder="メモ 例：初見さん歓迎" value="${escapeAttr(item.memo)}" data-field="memo" />
    `;
    div.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', (e) => {
        state.schedules[index][e.target.dataset.field] = e.target.value;
        autoRender(false);
      });
    });
    div.querySelector('.delete-small').addEventListener('click', () => {
      state.schedules.splice(index, 1);
      renderInputs();
      autoRender(false);
    });
    scheduleList.appendChild(div);
  });
}

function escapeAttr(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}
function escapeHTML(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function chooseMood() {
  if (state.mood !== 'auto') return state.mood;
  const n = state.schedules.length;
  const text = state.schedules.map(s => `${s.title} ${s.memo}`).join(' ');
  if (/ゲーム|APEX|マイクラ|原神|大会|参加型/i.test(text)) return 'game';
  if (/夜|深夜|月|星|寝落ち/i.test(text)) return 'night';
  if (/カフェ|作業|勉強|まったり/i.test(text)) return 'cafe';
  if (/夏|海|祭|花火/i.test(text)) return 'summer';
  if (n >= 8) return 'simple';
  return 'cute';
}

function chooseLayout() {
  if (state.layout !== 'smart') return state.layout;
  const n = state.schedules.length;
  const longText = state.schedules.some(s => (s.title + s.memo).length > 18);
  if (n === 0) return 'cards';
  if (n <= 4 && !longText) return 'cards';
  if (n <= 8) return 'timeline';
  if (n <= 14) return 'compact';
  return 'poster';
}

function autoRender(showComment = true) {
  const mood = chooseMood();
  const layout = chooseLayout();
  applyClass(mood, layout);
  document.documentElement.style.setProperty('--main', state.mainColor);
  document.documentElement.style.setProperty('--sub', state.subColor);
  watermark.classList.toggle('hide', !state.watermark);
  renderedSchedule.style.fontSize = `${state.fontScale}%`;
  renderScheduleCards(layout);
  if (showComment) updateComment(mood, layout);
}

function applyClass(mood, layout) {
  canvas.className = canvas.className
    .replace(/mood-\w+/g, '')
    .replace(/layout-\w+/g, '')
    .trim();
  canvas.classList.add(`mood-${mood}`, `layout-${layout}`);
}

function renderScheduleCards(layout) {
  if (state.schedules.length === 0) {
    renderedSchedule.innerHTML = `<div class="empty-state">＋ 予定を追加して<br>スケジュール表を作ろう</div>`;
    return;
  }
  const count = state.schedules.length;
  const scale = count <= 4 ? 100 : count <= 7 ? 88 : count <= 12 ? 76 : 68;
  renderedSchedule.style.fontSize = `${(state.fontScale * scale) / 100}%`;
  renderedSchedule.innerHTML = state.schedules.map(s => `
    <div class="schedule-card">
      <div class="date-box">
        <div class="date">${escapeHTML(s.date || '日付')}</div>
        <div class="time">${escapeHTML(s.time || '時間')}</div>
      </div>
      <div class="schedule-text">
        <strong>${escapeHTML(s.title || '配信内容')}</strong>
        <span>${escapeHTML(s.memo || 'メモを入力できます')}</span>
      </div>
    </div>
  `).join('');
}

function updateComment(mood, layout) {
  const moodName = {cute:'かわいい',simple:'シンプル',neon:'ネオン',game:'ゲーム',night:'夜配信',cafe:'カフェ',summer:'夏'}[mood] || mood;
  const layoutName = {cards:'カード型',timeline:'タイムテーブル型',compact:'コンパクト型',poster:'ポスター型'}[layout] || layout;
  const n = state.schedules.length;
  if (!n) aiComment.textContent = 'まずは予定を追加してください。入力後、自動で表にします。';
  else aiComment.textContent = `予定${n}件に合わせて、${layoutName}・${moodName}系で整えました。`;
}

function setSize(sizeClass) {
  canvas.classList.remove('size-square','size-vertical','size-story');
  canvas.classList.add(sizeClass);
}

function downloadImage() {
  // Simple SVG foreignObject export. Works in many modern browsers.
  const rect = canvas.getBoundingClientRect();
  const width = Math.round(rect.width * 2);
  const height = Math.round(rect.height * 2);
  const html = new XMLSerializer().serializeToString(canvas.cloneNode(true));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${rect.width} ${rect.height}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
  const blob = new Blob([svg], {type:'image/svg+xml;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = width; c.height = height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img,0,0,width,height);
    URL.revokeObjectURL(url);
    c.toBlob((png) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(png);
      a.download = 'sukedeco-schedule.png';
      a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    });
  };
  img.src = url;
}

function saveDraft() {
  localStorage.setItem('sukedeco_v07', JSON.stringify(state));
  alert('下書きを保存しました');
}
function loadDraft() {
  const raw = localStorage.getItem('sukedeco_v07');
  if (!raw) return;
  try {
    Object.assign(state, JSON.parse(raw));
    $('moodSelect').value = state.mood;
    $('layoutSelect').value = state.layout;
    $('mainColor').value = state.mainColor;
    $('subColor').value = state.subColor;
    $('fontSizeRange').value = state.fontScale;
    $('watermarkCheck').checked = state.watermark;
    renderInputs();
    autoRender(false);
  } catch(e) {}
}

$('addScheduleBtn').addEventListener('click', () => createSchedule());
$('aiCreateBtn').addEventListener('click', () => autoRender(true));
$('sampleBtn').addEventListener('click', () => {
  state.schedules = [
    {date:'7/15(火)', time:'20:00', title:'雑談配信', memo:'初見さん歓迎'},
    {date:'7/17(木)', time:'21:00', title:'ゲーム参加型', memo:'みんなで遊ぼう'},
    {date:'7/20(日)', time:'19:00', title:'コラボ配信', memo:'特別企画あり'},
  ];
  renderInputs(); autoRender(true);
});
$('clearBtn').addEventListener('click', () => { state.schedules = []; renderInputs(); autoRender(true); });
$('moodSelect').addEventListener('change', e => { state.mood = e.target.value; autoRender(true); });
$('layoutSelect').addEventListener('change', e => { state.layout = e.target.value; autoRender(true); });
$('mainColor').addEventListener('input', e => { state.mainColor = e.target.value; autoRender(false); });
$('subColor').addEventListener('input', e => { state.subColor = e.target.value; autoRender(false); });
$('fontSizeRange').addEventListener('input', e => { state.fontScale = Number(e.target.value); autoRender(false); });
$('watermarkCheck').addEventListener('change', e => { state.watermark = e.target.checked; autoRender(false); });
$('saveDraftBtn').addEventListener('click', saveDraft);
$('squareBtn').addEventListener('click', () => { setSize('size-square'); setTimeout(downloadImage,50); });
$('verticalBtn').addEventListener('click', () => { setSize('size-vertical'); setTimeout(downloadImage,50); });
$('storyBtn').addEventListener('click', () => { setSize('size-story'); setTimeout(downloadImage,50); });

loadDraft();
if (state.schedules.length === 0) renderInputs();
autoRender(false);
