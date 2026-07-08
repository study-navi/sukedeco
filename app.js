const $ = (id) => document.getElementById(id);
const state = {
  screen:'home', step:'input', title:'今週の配信予定', events:[], mood:'pop', color:'#54a6ff', prompt:'', candidates:[], selected:0,
  illust:null, illustX:0, illustY:0, illustScale:100, illustFlip:false, watermark:true, fontScale:100, seed:Date.now()
};
const moodNames = {pop:'ポップ',cool:'クール',game:'ゲーム',simple:'シンプル',cute:'かわいい',night:'夜'};
const palettes = {
  pop:['#dff4ff','#fff1f7','#54a6ff','#ff7ab6','dots'],
  cool:['#dbeafe','#eef2ff','#111827','#06b6d4','grid'],
  game:['#101827','#1e3a8a','#22d3ee','#8b5cf6','grid'],
  simple:['#f8fafc','#e2e8f0','#334155','#64748b','stripe'],
  cute:['#fff0f7','#fff7d6','#ff6fae','#f59e0b','dots'],
  night:['#1e1b4b','#312e81','#a78bfa','#22d3ee','stars']
};
const extraMoods = ['pop','cool','game','simple','cute','night'];

function showScreen(name){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$(name).classList.add('active');}
function showStep(step){state.step=step;document.querySelectorAll('.step').forEach(b=>b.classList.toggle('active',b.dataset.step===step));document.querySelectorAll('.step-panel').forEach(p=>p.classList.remove('active'));$('step'+step[0].toUpperCase()+step.slice(1)).classList.add('active');}
function fmtDate(v){if(!v)return '日付'; const d=new Date(v+'T00:00:00'); if(Number.isNaN(d.getTime())) return '日付'; const w='日月火水木金土'[d.getDay()]; return `${d.getMonth()+1}/${d.getDate()}(${w})`;}
function escapeHtml(s){return String(s ?? '').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
function saveState(){
  state.title=$('mainTitle')?.value || state.title || '今週の配信予定';
  state.prompt=$('aiPrompt')?.value || state.prompt || '';
  localStorage.setItem('sukedeco_v2_1', JSON.stringify({
    title:state.title, events:state.events, mood:state.mood, color:state.color, prompt:state.prompt,
    illust:state.illust, illustX:state.illustX, illustY:state.illustY, illustScale:state.illustScale,
    illustFlip:state.illustFlip, watermark:state.watermark, fontScale:state.fontScale
  }));
}
function loadState(){
  try{
    const s=JSON.parse(localStorage.getItem('sukedeco_v2_1') || localStorage.getItem('sukedeco_v2') || '{}');
    Object.assign(state, Object.fromEntries(Object.entries(s).filter(([_,v])=>v!==undefined && v!==null)));
    if(s.title) $('mainTitle').value=s.title;
    if(s.prompt) $('aiPrompt').value=s.prompt;
    if(s.fontScale) $('fontSizeRange').value=s.fontScale;
    if(s.illustScale) $('illustScaleRange').value=s.illustScale;
    if(typeof s.illustFlip==='boolean') $('flipIllust').checked=s.illustFlip;
    if(typeof s.watermark==='boolean') $('watermarkToggle').checked=s.watermark;
    if(s.illust){ $('illustImg').src=s.illust; $('illustLayer').classList.remove('hidden'); }
  }catch(e){}
}
function sortedEvents(){
  return [...state.events].sort((a,b)=>{
    const ka=(a.date||'9999')+' '+(a.time||'99:99'); const kb=(b.date||'9999')+' '+(b.time||'99:99');
    return ka.localeCompare(kb,'ja');
  });
}
function addEvent(){const date=$('dateInput').value; const time=$('timeInput').value; const title=$('eventTitle').value.trim(); const note=$('eventNote').value.trim(); if(!date&&!time&&!title&&!note)return; state.events.push({date,time,title:title||'配信予定',note}); $('eventTitle').value=''; $('eventNote').value=''; renderAll();}
function deleteEvent(i){state.events.splice(i,1); renderAll();}
function renderScheduleList(){const box=$('scheduleList'); box.innerHTML=''; if(state.events.length===0){box.innerHTML='<p class="hint">まだ予定がありません。まずは1件追加してください。</p>';return;} state.events.forEach((e,i)=>{const div=document.createElement('div');div.className='event-pill';div.innerHTML=`<div class="event-date">${fmtDate(e.date)}<br>${e.time||''}</div><div class="event-main"><strong>${escapeHtml(e.title)}</strong><small>${escapeHtml(e.note||'')}</small></div><button class="delete-event" aria-label="この予定を削除">削除</button>`;div.querySelector('button').onclick=()=>deleteEvent(i);box.appendChild(div);});}
function chooseLayout(){const n=state.events.length; if(n<=3)return 'カード型'; if(n<=6)return 'リスト型'; if(n<=10)return '2列型'; return '極小2列型';}
function renderPreview(){state.title=$('mainTitle').value||'今週の配信予定'; state.prompt=$('aiPrompt').value||''; $('previewTitle').textContent=state.title; $('previewTitle').style.fontSize = `${42*(state.fontScale/100)}px`; const badge=chooseLayout(); $('layoutBadge').textContent=badge; const ev=$('previewEvents'); ev.innerHTML=''; ev.className='preview-events'; const n=state.events.length; if(n>6) ev.classList.add('two-col'); if(n>10) ev.classList.add('dense'); const list=state.events.length?sortedEvents():[{date:'',time:'',title:'予定を追加するとここに表示',note:'AIが表にします'}]; list.forEach((e)=>{const card=document.createElement('div'); card.className='schedule-card'; if(n>6) card.classList.add('compact'); if(n>10) card.classList.add('mini'); card.innerHTML=`<div class="d">${fmtDate(e.date)}<br>${e.time||''}</div><div class="body"><div class="t">${escapeHtml(e.title)}</div><div class="n">${escapeHtml(e.note||'')}</div></div>`; ev.appendChild(card);});
  $('watermark').style.display=state.watermark?'block':'none';
  renderIllust();
}
function inferMoodFromPrompt(prompt){
  const t=(prompt||'').toLowerCase();
  if(/男性|男|かっこ|クール|黒|ネイビー|落ち着/.test(t)) return 'cool';
  if(/ゲーム|配信|サイバー|ネオン|apex|valorant|fps/.test(t)) return 'game';
  if(/かわいい|可愛い|ピンク|ゆめ|ハート/.test(t)) return 'cute';
  if(/夜|星|宇宙|月|暗/.test(t)) return 'night';
  if(/シンプル|白|ミニマル|見やす/.test(t)) return 'simple';
  return null;
}
function inferColorFromPrompt(prompt){
  const t=(prompt||'').toLowerCase();
  if(/青|ブルー|水色|シアン/.test(t)) return '#54a6ff';
  if(/紫|パープル/.test(t)) return '#8b5cf6';
  if(/ピンク/.test(t)) return '#ff6fae';
  if(/緑|グリーン/.test(t)) return '#10b981';
  if(/黒|ブラック|ネイビー/.test(t)) return '#111827';
  if(/黄色|イエロー|オレンジ/.test(t)) return '#f59e0b';
  return null;
}
function applyTheme(mood, color){state.mood=mood||state.mood; state.color=color||state.color; const p=palettes[state.mood]||palettes.pop; const root=document.documentElement; root.style.setProperty('--primary',state.color||p[2]); root.style.setProperty('--accent',p[3]); const canvas=$('canvasPreview'); canvas.className='schedule-canvas theme-'+state.mood; canvas.style.background=`linear-gradient(135deg, ${p[0]}, ${p[1]})`; const layer=$('patternLayer'); layer.className='pattern-layer '+p[4]; const dark = ['game','night','cool'].includes(state.mood); $('previewTitle').style.color = dark ? '#fff' : '#172033'; document.querySelectorAll('.schedule-card .d').forEach(el=>el.style.color=state.color||p[2]);}
function seededRandom(seed){let x=Math.sin(seed++)*10000;return x-Math.floor(x);}
function shuffleWithSeed(arr, seed){const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(seededRandom(seed+i)* (i+1)); [a[i],a[j]]=[a[j],a[i]];} return a;}
function generateCandidates(){
  state.prompt=$('aiPrompt').value || '';
  const promptMood=inferMoodFromPrompt(state.prompt);
  const promptColor=inferColorFromPrompt(state.prompt);
  if(promptColor) state.color=promptColor;
  const base=promptMood || state.mood;
  state.seed = Date.now() + Math.floor(Math.random()*99999);
  const rest=shuffleWithSeed(extraMoods.filter(m=>m!==base), state.seed);
  const order=[base,...rest].slice(0,6);
  state.candidates=order.map((m,i)=>{
    const n=state.events.length; const longText=state.events.reduce((a,e)=>a+(e.title||'').length+(e.note||'').length,0);
    let layout=n<=3?'大きめカード':n<=6?'見やすいリスト':n<=10?'2列タイムテーブル':'情報量重視';
    if(longText>120 && n>5) layout='読みやすさ優先';
    let baseScore= n<=3?92:n<=7?88:n<=12?84:78;
    if(m===base) baseScore += 3;
    if(promptMood===m) baseScore += 4;
    const jitter=Math.floor(seededRandom(state.seed+i*13)*9)-4;
    return {mood:m,name:moodNames[m],layout,score:Math.max(70,Math.min(98,baseScore-i+jitter)),pattern:palettes[m][4]};
  }).sort((a,b)=>b.score-a.score);
  state.selected=0; renderCandidates(); applyCandidate(0); saveState();
}
function renderCandidates(){const list=$('candidateList'); list.innerHTML=''; state.candidates.forEach((c,i)=>{const p=palettes[c.mood]; const card=document.createElement('button'); card.className='candidate-card '+(i===state.selected?'active':''); card.setAttribute('aria-label',`${c.name}案を選択`); card.innerHTML=`<div class="candidate-thumb ${p[4]}" style="background:linear-gradient(135deg,${p[0]},${p[1]})"></div><div><h3>${c.name}</h3><p>${c.layout} / ${c.pattern}</p><div class="score">見やすさ ${'★'.repeat(Math.max(1,Math.round(c.score/20)))} ${c.score}%</div></div>`; card.onclick=()=>applyCandidate(i); list.appendChild(card);});}
function applyCandidate(i){state.selected=i; const c=state.candidates[i]; if(c){applyTheme(c.mood,state.color); renderCandidates(); renderPreview(); saveState();} showStep('select');}
function thinkAndGenerate(){showStep('ai'); const texts=['予定数を分析中','自由メモを反映中','読みやすい配置を選択中','背景と柄を作成中','候補を6案生成中']; const box=$('thinking'); box.classList.remove('hidden'); let i=0; $('thinkingText').textContent=texts[0]; const timer=setInterval(()=>{i++; if(i<texts.length){$('thinkingText').textContent=texts[i];}else{clearInterval(timer); box.classList.add('hidden'); generateCandidates();}},420);}
function handleIllust(file){if(!file)return; const reader=new FileReader(); reader.onload=e=>{state.illust=e.target.result; $('illustImg').src=state.illust; $('illustLayer').classList.remove('hidden'); renderIllust(); saveState();}; reader.readAsDataURL(file);}
function renderIllust(){const layer=$('illustLayer'); if(!layer) return; layer.style.transform=`translate(${state.illustX}px,${state.illustY}px) scale(${state.illustScale/100}) scaleX(${state.illustFlip?-1:1})`;}
function getIllustExportPosition(){
  const preview=$('canvasPreview').getBoundingClientRect();
  const layer=$('illustLayer').getBoundingClientRect();
  const W=1080,H=1080;
  const cx=((layer.left + layer.width/2) - preview.left) / preview.width * W;
  const cy=((layer.top + layer.height/2) - preview.top) / preview.height * H;
  const iw=layer.width / preview.width * W;
  return {cx,cy,iw};
}
function savePng(){
  const canvas=$('exportCanvas'); const ctx=canvas.getContext('2d'); const W=1080,H=1080; ctx.clearRect(0,0,W,H);
  const p=palettes[state.mood]||palettes.pop; const g=ctx.createLinearGradient(0,0,W,H); g.addColorStop(0,p[0]); g.addColorStop(1,p[1]); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); drawPattern(ctx,p[4],W,H);
  const dark=['game','night','cool'].includes(state.mood); ctx.fillStyle=dark?'#fff':'#172033';
  const n=state.events.length; const events=sortedEvents();
  const titleSize=Math.max(42,Math.min(72,72*(state.fontScale/100) - Math.max(0,n-8)*2));
  ctx.font=`900 ${Math.round(titleSize)}px sans-serif`; wrapText(ctx,state.title,78,110,760,Math.round(titleSize*1.12),2);
  const two=n>6; const columns=two?2:1; const cardW=two?420:760; const startX=78; const gapX=26;
  const rows=Math.ceil(Math.max(n,1)/columns); const top=220; const bottom=930; const avail=bottom-top; const gapY=n>10?10:14;
  let h=Math.floor((avail - gapY*(rows-1))/rows); h=Math.max(42, Math.min(n>10?60:82,h));
  const dateFont=Math.max(14,Math.min(24, h*0.32)); const titleFont=Math.max(16,Math.min(30, h*0.38)); const noteFont=Math.max(11,Math.min(18, h*0.25));
  events.slice(0,24).forEach((e,i)=>{const col=two?i%2:0; const row=two?Math.floor(i/2):i; const x=startX+col*(cardW+gapX); const y=top+row*(h+gapY); roundRect(ctx,x,y,cardW,h,22,'rgba(255,255,255,.82)'); ctx.fillStyle=state.color||p[2]; ctx.font=`900 ${Math.round(dateFont)}px sans-serif`; ctx.fillText(fmtDate(e.date),x+18,y+h*.38); if(e.time) ctx.fillText(e.time,x+18,y+h*.70); ctx.fillStyle='#172033'; ctx.font=`900 ${Math.round(titleFont)}px sans-serif`; const textX=x+(two?122:145); clipText(ctx,e.title,textX,y+h*.42,cardW-(two?140:165)); ctx.fillStyle='#64748b'; ctx.font=`800 ${Math.round(noteFont)}px sans-serif`; clipText(ctx,e.note||'',textX,y+h*.72,cardW-(two?140:165));});
  if(n>24){ctx.fillStyle='rgba(15,23,42,.55)';ctx.font='900 20px sans-serif';ctx.fillText(`ほか ${n-24} 件`,78,970);}
  if(state.illust){const img=$('illustImg'); const pos=getIllustExportPosition(); const ratio=(img.naturalHeight/img.naturalWidth)||1; const iw=pos.iw; const ih=iw*ratio; ctx.save(); ctx.translate(pos.cx,pos.cy); ctx.scale(state.illustFlip?-1:1,1); ctx.drawImage(img,-iw/2,-ih/2,iw,ih); ctx.restore();}
  if(state.watermark){ctx.fillStyle='rgba(15,23,42,.42)';ctx.font='900 22px sans-serif';ctx.fillText('Made with SukeDeco',W-270,H-36);} const a=document.createElement('a'); a.download='sukedeco_schedule.png'; a.href=canvas.toDataURL('image/png'); a.click(); saveState();
}
function clipText(ctx,text,x,y,maxWidth){let s=String(text||''); while(s && ctx.measureText(s).width>maxWidth){s=s.slice(0,-1);} if(String(text||'').length>s.length && s.length>1) s=s.slice(0,-1)+'…'; ctx.fillText(s,x,y);}
function drawPattern(ctx,type,W,H){ctx.save(); if(type==='dots'){ctx.fillStyle='rgba(255,255,255,.42)'; for(let x=0;x<W;x+=42)for(let y=0;y<H;y+=42){ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();}} if(type==='grid'){ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=2;for(let x=0;x<W;x+=52){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=52){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}} if(type==='stripe'){ctx.fillStyle='rgba(255,255,255,.18)'; for(let x=-W;x<W*2;x+=54){ctx.save();ctx.translate(x,0);ctx.rotate(-Math.PI/4);ctx.fillRect(0,0,20,H*2);ctx.restore();}} if(type==='stars'){ctx.fillStyle='rgba(255,255,255,.65)';ctx.font='36px sans-serif';for(let i=0;i<35;i++){ctx.fillText(i%2?'✧':'✦',seededRandom(state.seed+i)*W,seededRandom(state.seed+i+77)*H);}} ctx.restore();}
function roundRect(ctx,x,y,w,h,r,fill){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines=3){let chars=String(text).split('');let line='',lines=0;for(const ch of chars){let test=line+ch;if(ctx.measureText(test).width>maxWidth){ctx.fillText(line,x,y);line=ch;y+=lineHeight;lines++; if(lines>=maxLines-1) break;}else line=test;}ctx.fillText(line,x,y);}
function renderAll(){renderScheduleList(); renderPreview(); applyTheme(state.mood,state.color); saveState();}
function load(){loadState(); const today=new Date(); if(!$('dateInput').value) $('dateInput').value=today.toISOString().slice(0,10); renderAll();}

document.addEventListener('DOMContentLoaded',()=>{
 $('startBtn').onclick=()=>{showScreen('create');showStep('input');}; $('resetBtn').onclick=()=>{localStorage.removeItem('sukedeco_v2_1'); localStorage.removeItem('sukedeco_v2'); location.reload();};
 document.querySelectorAll('.step').forEach(b=>b.onclick=()=>showStep(b.dataset.step));
 $('addEventBtn').onclick=addEvent; $('toAiBtn').onclick=()=>showStep('ai'); $('generateBtn').onclick=thinkAndGenerate; $('moreBtn').onclick=generateCandidates; $('saveBtn').onclick=savePng;
 $('mainTitle').oninput=renderAll; $('aiPrompt').oninput=()=>{state.prompt=$('aiPrompt').value; saveState();}; $('fontSizeRange').oninput=e=>{state.fontScale=+e.target.value; renderPreview(); saveState();}; $('illustScaleRange').oninput=e=>{state.illustScale=+e.target.value; renderIllust(); saveState();}; $('flipIllust').onchange=e=>{state.illustFlip=e.target.checked; renderIllust(); saveState();}; $('watermarkToggle').onchange=e=>{state.watermark=e.target.checked; renderPreview(); saveState();}; $('illustInput').onchange=e=>handleIllust(e.target.files[0]);
 document.querySelectorAll('#moodGroup .chip').forEach(b=>b.onclick=()=>{document.querySelectorAll('#moodGroup .chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.mood=b.dataset.mood;applyTheme(state.mood,state.color); saveState();});
 document.querySelectorAll('#colorGroup .color-dot').forEach(b=>b.onclick=()=>{document.querySelectorAll('#colorGroup .color-dot').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.color=b.dataset.color;applyTheme(state.mood,state.color); saveState();});
 let drag=false,sx=0,sy=0,ox=0,oy=0; const layer=$('illustLayer'); layer.addEventListener('pointerdown',e=>{drag=true;sx=e.clientX;sy=e.clientY;ox=state.illustX;oy=state.illustY;layer.setPointerCapture(e.pointerId);}); layer.addEventListener('pointermove',e=>{if(!drag)return; state.illustX=ox+(e.clientX-sx); state.illustY=oy+(e.clientY-sy); renderIllust();}); layer.addEventListener('pointerup',()=>{drag=false; saveState();});
 load();
});
