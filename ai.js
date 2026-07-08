const AI_STYLES = [
  {name:'ポップ', mood:'pop', bg:['#eaf3ff','#ffe8f4'], ink:'#18304f', accent:'#ff7ab6'},
  {name:'クール', mood:'cool', bg:['#10192e','#284d8f'], ink:'#ffffff', accent:'#5ee7ff'},
  {name:'ゲーム', mood:'game', bg:['#1b1740','#5b7cfa'], ink:'#ffffff', accent:'#9cff6b'},
  {name:'ネオン', mood:'neon', bg:['#14002d','#0d5ea6'], ink:'#ffffff', accent:'#ff4fd8'},
  {name:'シンプル', mood:'simple', bg:['#f7f9fc','#e9eef8'], ink:'#1a2b44', accent:'#5b7cfa'},
  {name:'カフェ', mood:'cafe', bg:['#fff4e8','#d8b895'], ink:'#402d22', accent:'#7cc6a3'},
  {name:'和風', mood:'jp', bg:['#fff7f0','#e9d0bd'], ink:'#3a2d2b', accent:'#d84f5f'},
  {name:'モノトーン', mood:'mono', bg:['#f4f4f4','#b9c1cc'], ink:'#141820', accent:'#4b5563'},
  {name:'ゆめかわ', mood:'dream', bg:['#f4eaff','#e5fbff'], ink:'#533b74', accent:'#ff91c9'}
];
function generateCandidates(state){
  const count = state.schedules.length;
  const layout = chooseLayout(count);
  const requestedMood = state.brief.mood || 'おまかせ';
  let pool = [...AI_STYLES];
  if(requestedMood && requestedMood !== 'おまかせ'){
    const hit = pool.find(s => s.name === requestedMood);
    if(hit) pool = [hit, ...AI_STYLES.filter(s=>s.name!==hit.name)];
  }
  const shifted = pool.sort(()=>Math.random()-.5).slice(0,6);
  return shifted.map((s,i)=>({
    id: Date.now() + '_' + i,
    name: s.name,
    layout,
    bg: i < 2 ? [state.brief.mainColor || s.bg[0], state.brief.accentColor || s.bg[1]] : s.bg,
    ink: s.ink,
    accent: i < 2 ? (state.brief.accentColor || s.accent) : s.accent,
    score: {
      readability: Math.min(5, count <= 7 ? 5 : 4),
      sns: ['ポップ','ネオン','ゲーム','ゆめかわ'].includes(s.name) ? 5 : 4,
      streamer: ['ゲーム','ネオン','クール','ポップ'].includes(s.name) ? 5 : 4
    },
    comment: `${count}件の予定に合わせて「${layoutAdvice(count)}」`
  }));
}
