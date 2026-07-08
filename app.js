const $ = (id) => document.getElementById(id);
const state = {
  screen:'home', step:'input', title:'今週の配信予定', events:[], mood:'pop', color:'#54a6ff', prompt:'', candidates:[], selected:0,
  illust:null, illustOriginal:null, illustEdgeColor:null, illustX:0, illustY:0, illustScale:100, illustFlip:false, autoFit:true, autoBackgroundRemove:true, watermark:true, fontScale:100, outputSize:'square', seed:Date.now(),
  brand:{name:'', logo:null, illust:null, color:'#54a6ff', mood:'pop'}, brandDraft:null, brandStep:1, startedAt:null, speedShown:false
};
const moodNames = {pop:'ポップ',cool:'クール',game:'ゲーム',simple:'シンプル',cute:'かわいい',night:'夜'};
const moodEmoji = {pop:'🌈',cool:'💎',game:'🎮',simple:'✨',cute:'💗',night:'🌙'};
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
function notify(msg){const t=$('toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); clearTimeout(notify._timer); notify._timer=setTimeout(()=>t.classList.remove('show'),2600);}

function startCreationTimer(){state.startedAt=Date.now();state.speedShown=false;if($('speedBadge')) $('speedBadge').classList.add('hidden');}
function getElapsedSec(){return state.startedAt ? Math.max(1, Math.round((Date.now() - state.startedAt) / 1000)) : null;}
function showSpeedBadge(elapsedSec){
  const badge=$('speedBadge'); const text=$('speedBadgeText');
  if(!badge || !text || !elapsedSec) return;
  text.textContent=`⚡ ${elapsedSec}秒で完成！`;
  badge.classList.remove('hidden');
  clearTimeout(showSpeedBadge._timer);
  showSpeedBadge._timer=setTimeout(()=>badge.classList.add('hidden'),3500);
}
function maybeShowSpeedBadge(){
  const elapsedSec=getElapsedSec();
  if(!elapsedSec || state.speedShown) return;
  showSpeedBadge(elapsedSec);
  state.speedShown=true;
}
function safeSetStorage(key, value){try{localStorage.setItem(key,value); return true;}catch(e){console.error(e); notify('保存に失敗しました。画像が大きい可能性があります。'); return false;}}
function getOutputSpec(){const v=state.outputSize||'square'; if(v==='wide') return {w:1600,h:900,label:'横長'}; if(v==='story') return {w:1080,h:1920,label:'縦長'}; return {w:1080,h:1080,label:'正方形'};}
function canShareFiles(){
  if(!navigator.share || !navigator.canShare || typeof File==='undefined') return false;
  try{
    const file = new File([new Blob(['sukedeco'], {type:'image/png'})], 'sukedeco.png', {type:'image/png'});
    return navigator.canShare({files:[file]});
  }catch(e){
    return false;
  }
}

function getDefaultBrand(){return {name:'', logo:null, illust:null, color:'#54a6ff', mood:'pop'};}
function normalizeBrand(b){return Object.assign(getDefaultBrand(), b || {});}
function saveBrand(){
  state.brand = normalizeBrand(state.brand);
  return safeSetStorage('sukedeco_brand_v1', JSON.stringify(state.brand));
}
function loadBrand(){
  try{
    const raw=localStorage.getItem('sukedeco_brand_v1');
    if(!raw){state.brand=getDefaultBrand(); return;}
    state.brand=normalizeBrand(JSON.parse(raw));
  }catch(e){
    console.error(e); state.brand=getDefaultBrand(); notify('ブランド設定を読み込めませんでした。');
  }
}
function updateHomeBrandCard(){
  const empty=$('brandEmptyCard'); const ready=$('brandReadyCard');
  if(!empty || !ready) return;
  const registered=!!(state.brand && state.brand.name);
  empty.hidden=registered; ready.hidden=!registered;
  if(registered){
    $('brandUseBtn').textContent=`✨ ${state.brand.name}ブランドで作る`;
  }
}
function openBrandWizard(edit=false){
  state.brandDraft=normalizeBrand(edit ? state.brand : state.brand);
  $('brandNameInput').value=state.brandDraft.name || '';
  setBrandPreview('brandIllustPreview', state.brandDraft.illust);
  setBrandPreview('brandLogoPreview', state.brandDraft.logo);
  setBrandColorActive(state.brandDraft.color);
  setBrandMoodActive(state.brandDraft.mood);
  showScreen('brandWizard'); showBrandStep(1);
}
function showBrandStep(step){
  state.brandStep=step;
  document.querySelectorAll('#brandWizard .brand-step-panel').forEach(p=>p.classList.remove('active'));
  const panel=$('brandStep'+step); if(panel) panel.classList.add('active');
}
function setBrandPreview(id, src){
  const box=$(id); if(!box) return;
  box.innerHTML = src ? `<img src="${src}" alt="プレビュー">` : '<span>未選択</span>';
}
function setBrandColorActive(color){
  document.querySelectorAll('#brandColorGroup .color-dot').forEach(b=>b.classList.toggle('active', b.dataset.color===color));
}
function setBrandMoodActive(mood){
  document.querySelectorAll('#brandMoodGroup .chip').forEach(b=>b.classList.toggle('active', b.dataset.mood===mood));
}
async function applyBrand(){
  if(!state.brand || !state.brand.name){notify('先にブランドを登録してください。'); return;}
  startCreationTimer();
  state.color=state.brand.color || '#54a6ff';
  state.mood=state.brand.mood || 'pop';
  state.illust=state.brand.illust || null;
  state.title='';
  if($('mainTitle')) $('mainTitle').value='';
  if(state.illust){
    $('illustImg').src=state.illust; $('illustLayer').classList.remove('hidden');
    state.illustFlip=false;
    if($('flipIllustStep')) $('flipIllustStep').checked=false;
    const loadedImg=await loadImageFromDataUrl(state.illust);
    state.illustEdgeColor=await detectIllustEdgeColor(loadedImg);
    if(state.autoFit){
      await applyAutoFitToCurrentIllust(loadedImg);
    }else{
      state.illustX=0; state.illustY=0; state.illustScale=100;
    }
    updateIllustControls();
  }else{
    state.illustEdgeColor=null;
    $('illustLayer').classList.add('hidden');
  }
  document.querySelectorAll('#moodGroup .chip').forEach(b=>b.classList.toggle('active', b.dataset.mood===state.mood));
  document.querySelectorAll('#colorGroup .color-dot').forEach(b=>b.classList.toggle('active', b.dataset.color===state.color));
  applyTheme(state.mood,state.color); renderPreview(); saveState();
  showScreen('create'); showStep('input'); notify('いつものブランドを反映しました。');
}
async function compressImage(file, {maxSide = 1200, quality = 0.86} = {}){
  return new Promise((resolve,reject)=>{
    if(!file || !file.type || !file.type.startsWith('image/')){reject(new Error('invalid image file')); return;}
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('file read failed'));
    reader.onload=e=>{
      const img=new Image();
      img.onerror=()=>reject(new Error('image decode failed'));
      img.onload=()=>{
        try{
          const scale=Math.min(1, maxSide/Math.max(img.width,img.height));
          const w=Math.max(1,Math.round(img.width*scale));
          const h=Math.max(1,Math.round(img.height*scale));
          const c=document.createElement('canvas'); c.width=w; c.height=h;
          const ctx=c.getContext('2d'); ctx.drawImage(img,0,0,w,h);
          const type=file.type==='image/png'?'image/png':'image/jpeg';
          resolve(c.toDataURL(type, type==='image/jpeg'?quality:undefined));
        }catch(err){reject(err);}
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function loadImageFromDataUrl(dataUrl){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onerror=()=>reject(new Error('image decode failed'));
    img.onload=()=>resolve(img);
    img.src=dataUrl;
  });
}
function computeAutoFit(img, outputSize){
  const aspect=(img && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 1;
  let illustX=0, illustY=0, illustScale=100;
  if(aspect < 0.75){
    illustScale=110;
  }else if(aspect < 1.3){
    illustScale=100;
  }else{
    illustScale=85; illustX=-40; illustY=10;
  }
  if(outputSize === 'story') illustScale += 10;
  if(outputSize === 'wide') illustScale -= 10;
  illustScale=Math.max(50, Math.min(180, illustScale));
  return {illustX, illustY, illustScale};
}
async function detectUniformBackground(img){
  try{
    const c=document.createElement('canvas');
    const w=Math.min(img.naturalWidth, 200);
    const h=Math.min(img.naturalHeight, 200);
    c.width=w; c.height=h;
    const ctx=c.getContext('2d');
    ctx.drawImage(img,0,0,w,h);

    const border=Math.max(2, Math.floor(Math.min(w,h)*.08));
    const data=ctx.getImageData(0,0,w,h).data;

    const ringPixels=[];
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const isBorder=x<border || x>=w-border || y<border || y>=h-border;
        if(!isBorder) continue;
        const i=(y*w+x)*4;
        ringPixels.push([data[i],data[i+1],data[i+2]]);
      }
    }
    if(ringPixels.length===0) return null;

    const bucketSize=16;
    const freq=new Map();
    ringPixels.forEach(p=>{
      const key=[Math.floor(p[0]/bucketSize), Math.floor(p[1]/bucketSize), Math.floor(p[2]/bucketSize)].join(',');
      if(!freq.has(key)) freq.set(key, {count:0, sumR:0, sumG:0, sumB:0});
      const entry=freq.get(key);
      entry.count++; entry.sumR+=p[0]; entry.sumG+=p[1]; entry.sumB+=p[2];
    });

    let best=null;
    freq.forEach(entry=>{ if(!best || entry.count>best.count) best=entry; });
    if(!best) return null;

    const candidate={r:best.sumR/best.count, g:best.sumG/best.count, b:best.sumB/best.count};

    const tolerance=40;
    let matchCount=0;
    const matchedSamples=[];
    ringPixels.forEach(p=>{
      const dist=Math.sqrt(Math.pow(p[0]-candidate.r,2)+Math.pow(p[1]-candidate.g,2)+Math.pow(p[2]-candidate.b,2));
      if(dist<=tolerance){ matchCount++; matchedSamples.push(p); }
    });

    const dominance=matchCount/ringPixels.length;
    if(dominance < 0.55) return null;
    if(matchedSamples.length===0) return null;

    const avg=matchedSamples.reduce((a,s)=>[a[0]+s[0],a[1]+s[1],a[2]+s[2]],[0,0,0]).map(v=>v/matchedSamples.length);
    const variance=matchedSamples.reduce((a,s)=>a+Math.pow(s[0]-avg[0],2)+Math.pow(s[1]-avg[1],2)+Math.pow(s[2]-avg[2],2),0)/matchedSamples.length;

    return {r:Math.round(avg[0]), g:Math.round(avg[1]), b:Math.round(avg[2]), variance};
  }catch(e){
    console.error(e);
    return null;
  }
}
function colorDistanceAt(data, index, bgColor){
  return Math.sqrt(
    Math.pow(data[index]-bgColor.r,2)+
    Math.pow(data[index+1]-bgColor.g,2)+
    Math.pow(data[index+2]-bgColor.b,2)
  );
}
function removeUniformBackground(img, bgColor){
  const c=document.createElement('canvas');
  c.width=img.naturalWidth; c.height=img.naturalHeight;
  const ctx=c.getContext('2d');
  ctx.drawImage(img,0,0);
  const imageData=ctx.getImageData(0,0,c.width,c.height);
  const d=imageData.data;
  const w=c.width, h=c.height;
  const visited=new Uint8Array(w*h);
  const mask=new Uint8Array(w*h);
  const queue=[];
  const threshold=30 + Math.min(40, (bgColor.variance||0)/20);
  const feather=threshold + 36;
  function enqueue(x,y){
    if(x<0||x>=w||y<0||y>=h) return;
    const p=y*w+x;
    if(visited[p]) return;
    visited[p]=1;
    const i=p*4;
    const dist=colorDistanceAt(d,i,bgColor);
    if(dist<=feather){
      queue.push(p);
      mask[p]= dist<=threshold ? 255 : Math.max(0, Math.round(255*(1-(dist-threshold)/(feather-threshold))));
    }
  }
  for(let x=0;x<w;x++){ enqueue(x,0); enqueue(x,h-1); }
  for(let y=0;y<h;y++){ enqueue(0,y); enqueue(w-1,y); }
  let head=0;
  while(head<queue.length){
    const p=queue[head++];
    const x=p%w, y=Math.floor(p/w);
    enqueue(x+1,y); enqueue(x-1,y); enqueue(x,y+1); enqueue(x,y-1);
  }
  for(let p=0;p<mask.length;p++){
    if(!mask[p]) continue;
    const i=p*4;
    const removeStrength=mask[p]/255;
    d[i+3]=Math.round(d[i+3]*(1-removeStrength));
  }
  ctx.putImageData(imageData,0,0);
  return c.toDataURL('image/png');
}
async function detectIllustEdgeColor(img){
  try{
    const c=document.createElement('canvas');
    const w=Math.min(img.naturalWidth, 200);
    const h=Math.min(img.naturalHeight, 200);
    c.width=w; c.height=h;
    const ctx=c.getContext('2d');
    ctx.drawImage(img,0,0,w,h);
    const sw=Math.max(1, Math.floor(w*.1));
    const sh=Math.max(1, Math.floor(h*.1));
    const corners=[
      ctx.getImageData(0,0,sw,sh),
      ctx.getImageData(w-sw,0,sw,sh),
      ctx.getImageData(0,h-sh,sw,sh),
      ctx.getImageData(w-sw,h-sh,sw,sh)
    ];
    let r=0,g=0,b=0,count=0,alphaSum=0,pixelCount=0;
    corners.forEach(data=>{
      const d=data.data;
      for(let i=0;i<d.length;i+=4){
        const alpha=d[i+3];
        alphaSum+=alpha; pixelCount++;
        if(alpha>10){ r+=d[i]; g+=d[i+1]; b+=d[i+2]; count++; }
      }
    });
    if(count===0) return null;
    const avgAlpha=pixelCount ? alphaSum/pixelCount : 0;
    if(avgAlpha<40) return null;
    return {r:Math.round(r/count), g:Math.round(g/count), b:Math.round(b/count)};
  }catch(e){
    console.error(e);
    return null;
  }
}
function updateIllustBlendGlow(){
  const glow=$('illustBlendGlow'); if(!glow) return;
  if(state.illustEdgeColor){
    const c=state.illustEdgeColor;
    glow.style.setProperty('--illust-glow-color', `rgba(${c.r}, ${c.g}, ${c.b}, .5)`);
    glow.classList.remove('hidden');
  }else{
    glow.classList.add('hidden');
  }
}
async function applyAutoFitToCurrentIllust(existingImg=null){
  if(!state.illust || !state.autoFit) return;
  try{
    const img=existingImg || await loadImageFromDataUrl(state.illust);
    const fit=computeAutoFit(img, state.outputSize || $('outputSize')?.value || 'square');
    state.illustX=fit.illustX;
    state.illustY=fit.illustY;
    state.illustScale=fit.illustScale;
  }catch(e){
    console.error(e);
    state.illustX=0; state.illustY=0; state.illustScale=100;
  }
}
function updateIllustControls(){
  if($('illustScaleRangeStep')) $('illustScaleRangeStep').value=state.illustScale;
  if($('flipIllustStep')) $('flipIllustStep').checked=state.illustFlip;
  if($('autoFitToggleStep')) $('autoFitToggleStep').checked=state.autoFit;
}
async function handleBrandImage(file, key, previewId){
  if(!file) return;
  try{
    const data=await compressImage(file);
    state.brandDraft=normalizeBrand(state.brandDraft);
    state.brandDraft[key]=data;
    setBrandPreview(previewId, data);
    notify('画像を軽量化して追加しました。');
  }catch(e){console.error(e); notify('画像の読み込みに失敗しました。');}
}
function completeBrandRegistration(){
  state.brandDraft=normalizeBrand(state.brandDraft);
  state.brandDraft.name=$('brandNameInput').value.trim();
  if(!state.brandDraft.name){notify('活動名を入力してください。'); showBrandStep(1); return;}
  state.brand=normalizeBrand(state.brandDraft);
  if(saveBrand()){
    $('brandCompleteMessage').textContent=`完成✨「${state.brand.name}」のブランドを登録しました。`;
    updateHomeBrandCard(); showBrandStep(5); notify('ブランドを登録しました。');
  }
}
function saveState(){
  state.title=$('mainTitle')?.value || state.title || '今週の配信予定';
  state.prompt=$('aiPrompt')?.value || state.prompt || '';
  state.outputSize=$('outputSize')?.value || state.outputSize || 'square';
  const payload = JSON.stringify({
    title:state.title, events:state.events, mood:state.mood, color:state.color, prompt:state.prompt, outputSize:state.outputSize,
    illust:state.illust, illustOriginal:state.illustOriginal, illustEdgeColor:state.illustEdgeColor, illustX:state.illustX, illustY:state.illustY, illustScale:state.illustScale,
    illustFlip:state.illustFlip, autoFit:state.autoFit, autoBackgroundRemove:state.autoBackgroundRemove, watermark:state.watermark, fontScale:state.fontScale
  });
  safeSetStorage('sukedeco_v2_2', payload);
}
function loadState(){
  try{
    const raw = localStorage.getItem('sukedeco_v2_2') || localStorage.getItem('sukedeco_v2_1') || localStorage.getItem('sukedeco_v2') || '{}';
    let s={};
    try{s=JSON.parse(raw);}catch(parseErr){console.error(parseErr); notify('保存データを読み込めませんでした。'); s={};}
    Object.assign(state, Object.fromEntries(Object.entries(s).filter(([_,v])=>v!==undefined && v!==null)));
    if(s.title) $('mainTitle').value=s.title;
    if(s.prompt) $('aiPrompt').value=s.prompt;
    if(s.outputSize && $('outputSize')) $('outputSize').value=s.outputSize;
    if(s.fontScale) $('fontSizeRange').value=s.fontScale;
    if(s.illustScale) $('illustScaleRangeStep').value=s.illustScale;
    if(typeof s.illustFlip==='boolean') $('flipIllustStep').checked=s.illustFlip;
    if(typeof s.autoFit==='boolean') state.autoFit=s.autoFit;
    if($('autoFitToggleStep')) $('autoFitToggleStep').checked=state.autoFit;
    if(typeof s.autoBackgroundRemove==='boolean') state.autoBackgroundRemove=s.autoBackgroundRemove;
    if($('autoBgRemoveToggle')) $('autoBgRemoveToggle').checked=state.autoBackgroundRemove;
    if(typeof s.watermark==='boolean') $('watermarkToggle').checked=s.watermark;
    if(s.illust){ $('illustImg').src=s.illust; $('illustLayer').classList.remove('hidden'); }
    updateIllustRevertButton();
  }catch(e){console.error(e); notify('読み込み中にエラーが発生しました。');}
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
function getSelectedCardLayout(){
  const c=state.candidates && state.candidates[state.selected];
  return c && c.layout ? c.layout : 'card';
}
function getLayoutLabel(layout){
  return layout==='ribbon' ? 'リボン型' : layout==='tab' ? 'タブ型' : '標準カード';
}
function renderPreview(){state.title=$('mainTitle').value||'今週の配信予定'; state.prompt=$('aiPrompt').value||''; state.outputSize=$('outputSize')?.value||state.outputSize||'square'; const cp=$('canvasPreview'); cp.classList.toggle('ratio-wide',state.outputSize==='wide'); cp.classList.toggle('ratio-story',state.outputSize==='story'); $('previewTitle').textContent=state.title; $('previewTitle').style.fontSize = `${42*(state.fontScale/100)}px`; const badge=chooseLayout(); $('layoutBadge').textContent=badge; const ev=$('previewEvents'); ev.innerHTML=''; ev.className='preview-events'; const n=state.events.length; if(n>6) ev.classList.add('two-col'); if(n>10) ev.classList.add('dense'); const list=state.events.length?sortedEvents():[{date:'',time:'',title:'予定を追加するとここに表示',note:'AIが表にします'}]; const cardLayout=getSelectedCardLayout(); list.forEach((e)=>{const card=document.createElement('div'); card.className='schedule-card layout-'+cardLayout; if(n>6) card.classList.add('compact'); if(n>10) card.classList.add('mini'); card.innerHTML=`<div class="d">${fmtDate(e.date)}<br>${e.time||''}</div><div class="body"><div class="t">${escapeHtml(e.title)}</div><div class="n">${escapeHtml(e.note||'')}</div></div>`; ev.appendChild(card);});
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
  const layoutPool=shuffleWithSeed(['card','ribbon','tab','card','ribbon','tab'], state.seed+311);
  if(!layoutPool.some(l=>l!=='card')) layoutPool[1]='ribbon';
  state.candidates=order.map((m,i)=>{
    const n=state.events.length; const longText=state.events.reduce((a,e)=>a+(e.title||'').length+(e.note||'').length,0);
    let layoutText=n<=3?'大きめカード':n<=6?'見やすいリスト':n<=10?'2列タイムテーブル':'情報量重視';
    if(longText>120 && n>5) layoutText='読みやすさ優先';
    let baseScore= n<=3?92:n<=7?88:n<=12?84:78;
    if(m===base) baseScore += 3;
    if(promptMood===m) baseScore += 4;
    const jitter=Math.floor(seededRandom(state.seed+i*13)*9)-4;
    return {mood:m,name:moodNames[m],layout:layoutPool[i]||'card',layoutText,score:Math.max(70,Math.min(98,baseScore-i+jitter)),pattern:palettes[m][4]};
  }).sort((a,b)=>b.score-a.score);
  if(!state.candidates.some(c=>c.layout!=='card') && state.candidates[1]) state.candidates[1].layout='ribbon';
  state.selected=0; renderCandidates(); applyCandidate(0); saveState();
}
function renderCandidates(){const list=$('candidateList'); list.innerHTML=''; state.candidates.forEach((c,i)=>{const p=palettes[c.mood]; const card=document.createElement('button'); card.className='candidate-card '+(i===state.selected?'active':''); card.setAttribute('aria-label',`${c.name}案を選択`); card.innerHTML=`<div class="candidate-thumb ${p[4]} layout-${c.layout||'card'}" style="background:linear-gradient(135deg,${p[0]},${p[1]})"><span></span></div><div><h3>${c.name}</h3><p>${getLayoutLabel(c.layout)} / ${c.layoutText||''}</p><div class="score">見やすさ ${'★'.repeat(Math.max(1,Math.round(c.score/20)))} ${c.score}%</div></div>`; card.onclick=()=>applyCandidate(i); list.appendChild(card);});}
function applyCandidate(i){state.selected=i; const c=state.candidates[i]; if(c){applyTheme(c.mood,state.color); renderCandidates(); renderPreview(); saveState();} showStep('select');}
function thinkAndGenerate(){showStep('ai'); const texts=['予定数を分析中','自由メモを反映中','読みやすい配置を選択中','背景と柄を作成中','候補を6案生成中']; const box=$('thinking'); box.classList.remove('hidden'); let i=0; $('thinkingText').textContent=texts[0]; const timer=setInterval(()=>{i++; if(i<texts.length){$('thinkingText').textContent=texts[i];}else{clearInterval(timer); box.classList.add('hidden'); generateCandidates();}},420);}
async function handleIllust(file){
  if(!file)return;
  if(!file.type.startsWith('image/')){notify('画像ファイルを選んでください。'); return;}
  try{
    state.illust=await compressImage(file);
    state.illustOriginal=state.illust;
    let loadedImg=await loadImageFromDataUrl(state.illust);
    if(state.autoBackgroundRemove){
      const bgColor=await detectUniformBackground(loadedImg);
      if(bgColor){
        state.illust=removeUniformBackground(loadedImg, bgColor);
        loadedImg=await loadImageFromDataUrl(state.illust);
        notify('✨ 白背景を検出しました。背景を透過しました。');
      }
    }
    $('illustImg').src=state.illust; $('illustLayer').classList.remove('hidden');
    state.illustFlip=false;
    if($('flipIllustStep')) $('flipIllustStep').checked=false;
    state.illustEdgeColor=await detectIllustEdgeColor(loadedImg);
    if(state.autoFit){
      await applyAutoFitToCurrentIllust(loadedImg);
      notify('立ち絵を自動フィットしました。');
    }else{
      state.illustX=0; state.illustY=0; state.illustScale=100;
      notify('画像を軽量化して追加しました。');
    }
    updateIllustControls();
    updateIllustRevertButton();
    renderIllust(); saveState();
  }catch(e){console.error(e); notify('画像の読み込みに失敗しました。');}
}
async function revertIllustOriginal(){
  if(!state.illustOriginal) return;
  state.illust=state.illustOriginal;
  $('illustImg').src=state.illust;
  const img=await loadImageFromDataUrl(state.illust);
  state.illustEdgeColor=await detectIllustEdgeColor(img);
  if(state.autoFit){
    await applyAutoFitToCurrentIllust(img);
  }
  updateIllustRevertButton();
  renderIllust(); saveState();
  notify('元の画像に戻しました。');
}
function updateIllustRevertButton(){
  const btn=$('illustRevertBtn'); if(!btn) return;
  btn.hidden=!state.illustOriginal;
}
function hexToRgb(hex){
  const value=String(hex||'').replace('#','').trim();
  if(!/^[0-9a-fA-F]{6}$/.test(value)) return null;
  return {r:parseInt(value.slice(0,2),16), g:parseInt(value.slice(2,4),16), b:parseInt(value.slice(4,6),16)};
}
function getIllustShadowColors(alphaShadow=.32, alphaGround=.20){
  const rgb=hexToRgb(state.color||'#54a6ff') || {r:54,g:166,b:255};
  const dark={r:Math.round(rgb.r*.42), g:Math.round(rgb.g*.42), b:Math.round(rgb.b*.42)};
  return {
    shadow:`rgba(${dark.r}, ${dark.g}, ${dark.b}, ${alphaShadow})`,
    ground:`rgba(${dark.r}, ${dark.g}, ${dark.b}, ${alphaGround})`
  };
}
function applyIllustShadowTheme(){
  const layer=$('illustLayer'); if(!layer) return;
  const colors=getIllustShadowColors();
  layer.style.setProperty('--illust-shadow-color', colors.shadow);
  layer.style.setProperty('--illust-ground-color', colors.ground);
}
function renderIllust(){const layer=$('illustLayer'); if(!layer) return; applyIllustShadowTheme(); updateIllustBlendGlow(); layer.style.transform=`translate(${state.illustX}px,${state.illustY}px) scale(${state.illustScale/100}) scaleX(${state.illustFlip?-1:1})`;}
function getIllustExportPosition(specW, specH){
  const preview=$('canvasPreview').getBoundingClientRect();
  const layer=$('illustLayer').getBoundingClientRect();
  const W=specW||1080, H=specH||1080;
  if(!preview.width || !preview.height || !layer.width){
    return {cx:W*0.78, cy:H*0.64, iw:W*0.25};
  }
  const cx=((layer.left + layer.width/2) - preview.left) / preview.width * W;
  const cy=((layer.top + layer.height/2) - preview.top) / preview.height * H;
  const iw=layer.width / preview.width * W;
  return {cx,cy,iw};
}
function drawScheduleCard(ctx, layout, x, y, w, h, event, opt){
  if(layout==='ribbon') return drawCardRibbon(ctx,x,y,w,h,event,opt);
  if(layout==='tab') return drawCardTab(ctx,x,y,w,h,event,opt);
  return drawCardStandard(ctx,x,y,w,h,event,opt);
}
function drawCardStandard(ctx,x,y,w,h,event,opt){
  const {color,dateFont,titleFont,noteFont,two}=opt;
  roundRect(ctx,x,y,w,h,Math.min(22,h/2.4),'rgba(255,255,255,.82)');
  ctx.fillStyle=color; ctx.font=`900 ${Math.round(dateFont)}px sans-serif`;
  ctx.fillText(fmtDate(event.date),x+14,y+h*.38); if(event.time) ctx.fillText(event.time,x+14,y+h*.70);
  ctx.fillStyle='#172033'; ctx.font=`900 ${Math.round(titleFont)}px sans-serif`;
  const textX=x+(two?105:135); clipText(ctx,event.title,textX,y+h*.42,w-(two?120:154));
  ctx.fillStyle='#64748b'; ctx.font=`800 ${Math.round(noteFont)}px sans-serif`;
  clipText(ctx,event.note||'',textX,y+h*.72,w-(two?120:154));
}
function drawCardRibbon(ctx,x,y,w,h,event,opt){
  const {color,dateFont,titleFont,noteFont}=opt;
  roundRect(ctx,x,y,w,h,Math.min(30,h/2),'rgba(255,255,255,.84)');
  ctx.save();
  ctx.translate(x+Math.min(62,w*.22), y+Math.min(18,h*.26));
  ctx.rotate(-Math.PI/12);
  roundRect(ctx,-48,-15,96,30,12,color);
  ctx.fillStyle='#fff'; ctx.font=`900 ${Math.max(10,Math.round(dateFont*.72))}px sans-serif`; ctx.textAlign='center';
  ctx.fillText(fmtDate(event.date),0,-2);
  if(event.time){ctx.font=`900 ${Math.max(9,Math.round(dateFont*.62))}px sans-serif`;ctx.fillText(event.time,0,11);}
  ctx.restore(); ctx.textAlign='left';
  const textX=x+22; const titleY=y+h*.48;
  ctx.fillStyle='#172033'; ctx.font=`900 ${Math.round(titleFont*1.12)}px sans-serif`; clipText(ctx,event.title,textX,titleY,w-44);
  ctx.fillStyle='#64748b'; ctx.font=`800 ${Math.round(noteFont)}px sans-serif`; clipText(ctx,event.note||'',textX,y+h*.75,w-44);
}
function drawCardTab(ctx,x,y,w,h,event,opt){
  const {color,dateFont,titleFont,noteFont}=opt;
  roundRect(ctx,x,y,w,h,Math.min(14,h/3),'rgba(255,255,255,.84)');
  const tabW=Math.min(58,Math.max(38,w*.17));
  ctx.save(); ctx.beginPath(); ctx.rect(x,y,tabW,h); ctx.clip(); roundRect(ctx,x,y,tabW+10,h,Math.min(12,h/3),color); ctx.restore();
  ctx.fillStyle='#fff'; ctx.font=`900 ${Math.max(10,Math.round(dateFont*.7))}px sans-serif`; ctx.textAlign='center';
  ctx.fillText(fmtDate(event.date),x+tabW/2,y+h*.40); if(event.time) ctx.fillText(event.time,x+tabW/2,y+h*.66); ctx.textAlign='left';
  const textX=x+tabW+14;
  ctx.fillStyle='#172033'; ctx.font=`900 ${Math.round(titleFont)}px sans-serif`; clipText(ctx,event.title,textX,y+h*.43,w-tabW-28);
  ctx.fillStyle='#64748b'; ctx.font=`800 ${Math.round(noteFont)}px sans-serif`; clipText(ctx,event.note||'',textX,y+h*.72,w-tabW-28);
}
function renderScheduleToExportCanvas(){
  const spec=getOutputSpec(); const canvas=$('exportCanvas'); canvas.width=spec.w; canvas.height=spec.h; const ctx=canvas.getContext('2d'); const W=spec.w,H=spec.h; ctx.clearRect(0,0,W,H);
  state.outputSize=$('outputSize')?.value||state.outputSize||'square';
  const p=palettes[state.mood]||palettes.pop; const g=ctx.createLinearGradient(0,0,W,H); g.addColorStop(0,p[0]); g.addColorStop(1,p[1]); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); drawPattern(ctx,p[4],W,H);
  const dark=['game','night','cool'].includes(state.mood); ctx.fillStyle=dark?'#fff':'#172033';
  const n=state.events.length; const events=sortedEvents(); const cardLayout=getSelectedCardLayout();
  const margin=Math.round(Math.min(W,H)*0.07); const contentW = state.outputSize==='wide' ? Math.round(W*0.60) : state.outputSize==='story' ? Math.round(W*0.82) : Math.round(W*0.70);
  const titleSize=Math.max(38,Math.min(76, Math.min(W,H)*0.067*(state.fontScale/100) - Math.max(0,n-8)*1.4));
  ctx.font=`900 ${Math.round(titleSize)}px sans-serif`; wrapText(ctx,state.title,margin,margin+titleSize,Math.min(contentW,W-margin*2),Math.round(titleSize*1.12),2);
  const two=(state.outputSize!=='story' && n>6) || n>9; const columns=two?2:1; const cardW=two?Math.floor((contentW-22)/2):contentW; const startX=margin; const gapX=22;
  const top=margin+Math.round(titleSize*2.05); const bottom=H-margin-54; const rows=Math.ceil(Math.max(n,1)/columns); const gapY=n>10?8:12;
  let h=Math.floor((bottom-top - gapY*(rows-1))/rows); h=Math.max(34, Math.min(n>10?58:82,h));
  const dateFont=Math.max(12,Math.min(23, h*0.31)); const titleFont=Math.max(14,Math.min(28, h*0.38)); const noteFont=Math.max(10,Math.min(17, h*0.24));
  events.slice(0,30).forEach((e,i)=>{const col=two?i%2:0; const row=two?Math.floor(i/2):i; const x=startX+col*(cardW+gapX); const y=top+row*(h+gapY); if(y+h>bottom) return; drawScheduleCard(ctx,cardLayout,x,y,cardW,h,e,{color:state.color||p[2],dateFont,titleFont,noteFont,two});});
  if(n>30){ctx.fillStyle='rgba(15,23,42,.55)';ctx.font='900 20px sans-serif';ctx.fillText(`ほか ${n-30} 件`,margin,H-margin-20);}
  if(state.illust){
    const img=$('illustImg'); const pos=getIllustExportPosition(W,H); const ratio=(img.naturalHeight/img.naturalWidth)||1; const iw=pos.iw; const ih=iw*ratio;
    const shadowColors=getIllustShadowColors(.30,.18);
    ctx.save(); ctx.globalAlpha=1; ctx.fillStyle=shadowColors.ground;
    ctx.beginPath(); ctx.ellipse(pos.cx, pos.cy+ih*.48, iw*.34, Math.max(10, ih*.045), 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    if(state.illustEdgeColor){
      const c=state.illustEdgeColor;
      const glowRadius=Math.max(iw,ih)*.62;
      const grad=ctx.createRadialGradient(pos.cx,pos.cy,0,pos.cx,pos.cy,glowRadius);
      grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, .45)`);
      grad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
      ctx.save(); ctx.globalAlpha=1; ctx.fillStyle=grad;
      ctx.beginPath(); ctx.arc(pos.cx,pos.cy,glowRadius,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    ctx.save(); ctx.translate(pos.cx,pos.cy); ctx.scale(state.illustFlip?-1:1,1);
    try{ctx.filter='brightness(1.04) contrast(1.05) saturate(1.08)';}catch(e){}
    ctx.drawImage(img,-iw/2,-ih/2,iw,ih);
    try{ctx.filter='none';}catch(e){}
    ctx.restore();
  }
  if(state.watermark){ctx.fillStyle='rgba(15,23,42,.42)';ctx.font=`900 ${Math.round(Math.min(W,H)*0.022)}px sans-serif`;ctx.fillText('Made with SukeDeco',W-Math.round(Math.min(W,H)*0.27),H-Math.round(Math.min(W,H)*0.035));}
  return {canvas,spec};
}
function canvasToBlob(canvas){
  return new Promise((resolve,reject)=>{
    canvas.toBlob((blob)=>{
      if(blob) resolve(blob);
      else reject(new Error('canvas.toBlob failed'));
    }, 'image/png');
  });
}
async function generateScheduleBlob(){
  const {canvas} = renderScheduleToExportCanvas();
  return await canvasToBlob(canvas);
}
async function savePng(){
  try{
    const spec=getOutputSpec();
    const blob=await generateScheduleBlob();
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.download=`sukedeco_${spec.label}.png`; a.href=url; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    saveState(); notify('PNGを保存しました。'); maybeShowSpeedBadge();
  }catch(e){console.error(e); notify('PNG保存に失敗しました。');}
}
async function shareSchedule(){
  try{
    const spec=getOutputSpec();
    const blob=await generateScheduleBlob();
    const file=new File([blob], `sukedeco_${spec.label}.png`, {type:'image/png'});
    if(!navigator.share || !navigator.canShare || !navigator.canShare({files:[file]})){
      notify('この端末では画像共有に対応していません。');
      return;
    }
    await navigator.share({
      title: state.title || 'SukeDeco',
      text: '#SukeDeco で作成',
      files: [file]
    });
    maybeShowSpeedBadge();
  }catch(e){
    if(e && e.name==='AbortError') return;
    console.error(e); notify('共有に失敗しました。');
  }
}
function clipText(ctx,text,x,y,maxWidth){let s=String(text||''); while(s && ctx.measureText(s).width>maxWidth){s=s.slice(0,-1);} if(String(text||'').length>s.length && s.length>1) s=s.slice(0,-1)+'…'; ctx.fillText(s,x,y);}
function drawPattern(ctx,type,W,H){ctx.save(); if(type==='dots'){ctx.fillStyle='rgba(255,255,255,.42)'; for(let x=0;x<W;x+=42)for(let y=0;y<H;y+=42){ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();}} if(type==='grid'){ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=2;for(let x=0;x<W;x+=52){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=52){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}} if(type==='stripe'){ctx.fillStyle='rgba(255,255,255,.18)'; for(let x=-W;x<W*2;x+=54){ctx.save();ctx.translate(x,0);ctx.rotate(-Math.PI/4);ctx.fillRect(0,0,20,H*2);ctx.restore();}} if(type==='stars'){ctx.fillStyle='rgba(255,255,255,.65)';ctx.font='36px sans-serif';for(let i=0;i<35;i++){ctx.fillText(i%2?'✧':'✦',seededRandom(state.seed+i)*W,seededRandom(state.seed+i+77)*H);}} ctx.restore();}
function roundRect(ctx,x,y,w,h,r,fill){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines=3){let chars=String(text).split('');let line='',lines=0;for(const ch of chars){let test=line+ch;if(ctx.measureText(test).width>maxWidth){ctx.fillText(line,x,y);line=ch;y+=lineHeight;lines++; if(lines>=maxLines-1) break;}else line=test;}ctx.fillText(line,x,y);}
function renderAll(){renderScheduleList(); renderPreview(); applyTheme(state.mood,state.color); saveState();}
function load(){loadBrand(); loadState(); updateIllustControls(); updateHomeBrandCard(); const today=new Date(); if(!$('dateInput').value) $('dateInput').value=today.toISOString().slice(0,10); renderAll();}

document.addEventListener('DOMContentLoaded',()=>{
 $('startBtn').onclick=()=>{startCreationTimer();showScreen('create');showStep('input');}; $('brandRegisterBtn').onclick=()=>openBrandWizard(false); $('brandEditBtn').onclick=()=>openBrandWizard(true); $('brandUseBtn').onclick=applyBrand; $('resetBtn').onclick=()=>{state.startedAt=null;state.speedShown=false;if($('speedBadge')) $('speedBadge').classList.add('hidden');localStorage.removeItem('sukedeco_v2_2'); localStorage.removeItem('sukedeco_v2_1'); localStorage.removeItem('sukedeco_v2'); notify('下書きを削除しました。'); setTimeout(()=>location.reload(),250);};
 document.querySelectorAll('.step').forEach(b=>b.onclick=()=>showStep(b.dataset.step));
 $('addEventBtn').onclick=addEvent; $('toAiBtn').onclick=()=>showStep('ai'); $('generateBtn').onclick=thinkAndGenerate; $('moreBtn').onclick=generateCandidates; $('saveBtn').onclick=savePng; if($('shareBtn')){ if(canShareFiles()){ $('shareBtn').hidden=false; $('shareBtn').onclick=shareSchedule; } else { $('shareBtn').hidden=true; } }
 $('mainTitle').oninput=renderAll; $('aiPrompt').oninput=()=>{state.prompt=$('aiPrompt').value; saveState();}; $('fontSizeRange').oninput=e=>{state.fontScale=+e.target.value; renderPreview(); saveState();}; $('illustScaleRangeStep').oninput=e=>{state.illustScale=+e.target.value; renderIllust(); saveState();}; $('flipIllustStep').onchange=e=>{state.illustFlip=e.target.checked; renderIllust(); saveState();}; $('autoFitToggleStep').onchange=e=>{state.autoFit=e.target.checked; notify(state.autoFit ? '次にアップロードする立ち絵から自動フィットします。' : '自動フィットをオフにしました。'); saveState();}; $('autoBgRemoveToggle').onchange=e=>{state.autoBackgroundRemove=e.target.checked; notify(state.autoBackgroundRemove ? '次にアップロードする立ち絵から背景を自動透過します。' : '背景の自動透過をオフにしました。'); saveState();}; $('illustRevertBtn').onclick=revertIllustOriginal; $('watermarkToggle').onchange=e=>{state.watermark=e.target.checked; renderPreview(); saveState();}; $('outputSize').onchange=e=>{state.outputSize=e.target.value; renderPreview(); saveState();}; $('illustInput').onchange=e=>handleIllust(e.target.files[0]); $('illustInputStep').onchange=e=>handleIllust(e.target.files[0]); $('illustNextBtn').onclick=()=>showStep('finish');
 document.querySelectorAll('#moodGroup .chip').forEach(b=>b.onclick=()=>{document.querySelectorAll('#moodGroup .chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.mood=b.dataset.mood;applyTheme(state.mood,state.color); saveState();});
 document.querySelectorAll('#colorGroup .color-dot').forEach(b=>b.onclick=()=>{document.querySelectorAll('#colorGroup .color-dot').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.color=b.dataset.color;applyTheme(state.mood,state.color); saveState();});
 $('brandNameNextBtn').onclick=()=>{state.brandDraft=normalizeBrand(state.brandDraft); state.brandDraft.name=$('brandNameInput').value.trim(); if(!state.brandDraft.name){notify('活動名を入力してください。'); return;} showBrandStep(2);};
 $('brandIllustInput').onchange=e=>handleBrandImage(e.target.files[0], 'illust', 'brandIllustPreview');
 $('brandIllustNextBtn').onclick=()=>showBrandStep(3); $('brandIllustBackBtn').onclick=()=>showBrandStep(1);
 $('brandLogoChooseBtn').onclick=()=>$('brandLogoInput').click(); $('brandLogoInput').onchange=e=>handleBrandImage(e.target.files[0], 'logo', 'brandLogoPreview');
 $('brandLogoSkipBtn').onclick=()=>{state.brandDraft=normalizeBrand(state.brandDraft); state.brandDraft.logo=null; setBrandPreview('brandLogoPreview', null); showBrandStep(4);};
 $('brandLogoNextBtn').onclick=()=>showBrandStep(4); $('brandLogoBackBtn').onclick=()=>showBrandStep(2);
 document.querySelectorAll('#brandColorGroup .color-dot').forEach(b=>b.onclick=()=>{state.brandDraft=normalizeBrand(state.brandDraft); state.brandDraft.color=b.dataset.color; setBrandColorActive(state.brandDraft.color);});
 document.querySelectorAll('#brandMoodGroup .chip').forEach(b=>b.onclick=()=>{state.brandDraft=normalizeBrand(state.brandDraft); state.brandDraft.mood=b.dataset.mood; setBrandMoodActive(state.brandDraft.mood);});
 $('brandRegisterDoneBtn').onclick=completeBrandRegistration; $('brandMoodBackBtn').onclick=()=>showBrandStep(3); $('brandHomeBtn').onclick=()=>{updateHomeBrandCard(); showScreen('home');};
 document.querySelectorAll('[data-brand-cancel]').forEach(b=>b.onclick=()=>{state.brandDraft=null; updateHomeBrandCard(); showScreen('home');});
 let drag=false,sx=0,sy=0,ox=0,oy=0; const layer=$('illustLayer'); layer.addEventListener('pointerdown',e=>{drag=true;sx=e.clientX;sy=e.clientY;ox=state.illustX;oy=state.illustY;layer.setPointerCapture(e.pointerId);}); layer.addEventListener('pointermove',e=>{if(!drag)return; state.illustX=ox+(e.clientX-sx); state.illustY=oy+(e.clientY-sy); renderIllust();}); layer.addEventListener('pointerup',()=>{drag=false; saveState();});
 load();
});
