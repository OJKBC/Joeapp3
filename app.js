/* =========================================================
   くく ヒーロー — ロジック
   ========================================================= */

const $ = id => document.getElementById(id);
const state = { dan:2, random:false, order:[], i:0, input:'', miss:0, rowMiss:[], late:[], lock:false, token:0, timerIv:null };

/* ---- 保存 ---- */
function loadProgress(){
  try { return JSON.parse(localStorage.getItem(CONFIG.storageKey)) || {clears:{}}; }
  catch(e){ return {clears:{}}; }
}
function saveProgress(p){
  try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(p)); } catch(e){}
}

/* ---- よみあげ ---- */
let jaVoice = null;
function pickVoice(){
  if(!('speechSynthesis' in window)) return null;
  const vs = speechSynthesis.getVoices().filter(v => /^ja/i.test(v.lang));
  jaVoice = vs.find(v => /Kyoko|O-ren|Otoya/i.test(v.name)) || vs[0] || null;
  return jaVoice;
}
if('speechSynthesis' in window){
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

/* text を読み、おわったら cb。onend が来ない端末のために時間でも保険をかける。
   画面を出たら token が変わるので、古い cb は捨てる。 */
function say(text, cb){
  const tk = state.token;
  let done = false;
  const finish = () => {
    if(done) return; done = true;
    if(cb && tk === state.token) cb();
  };
  const fallback = 600 + text.length * 260 / CONFIG.rate;
  if(!('speechSynthesis' in window)){ setTimeout(finish, fallback); return; }
  stopVoice();
  try{
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP'; u.rate = CONFIG.rate; u.pitch = CONFIG.pitch;
    const v = jaVoice || pickVoice();
    if(v) u.voice = v;
    u.onend = () => setTimeout(finish, 150);
    u.onerror = () => setTimeout(finish, 150);
    speechSynthesis.speak(u);
  }catch(e){}
  setTimeout(finish, fallback + 1500);
}

/* ---- 効果音（Web Audio 合成） ---- */
let actx = null;
function ensureCtx(){
  actx = actx || new (window.AudioContext || window.webkitAudioContext)();
  if(actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, dur, type='sine', vol=0.2, when=0){
  try{
    ensureCtx();
    const t = actx.currentTime + when;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t); o.stop(t + dur);
  }catch(e){}
}
const sfx = {
  tap:  () => tone(880, 0.06, 'triangle', 0.15),
  ok:   () => { tone(784, 0.15, 'triangle', 0.25); tone(1175, 0.3, 'triangle', 0.25, 0.12); },
  ng:   () => tone(160, 0.3, 'sawtooth', 0.12),
  tick: () => tone(1200, 0.05, 'square', 0.08),
  late: () => { tone(440, 0.2, 'triangle', 0.2); tone(330, 0.35, 'triangle', 0.2, 0.18); },
  clear:() => [523,659,784,1047].forEach((f,k) => tone(f, 0.3, 'triangle', 0.25, k*0.13))
};

/* ---- 録音した声（voice/*.wav。rec.html で録る） ----
   キー: q2_1=「にいちが」 a2=「に！」 f2_1=「にいちがに」。録っていないものは say() の声で代わりに読む。 */
const voice = { buf:{}, src:null };
async function loadVoices(){
  try{
    const names = await (await fetch('voice/manifest.json?t=' + Date.now())).json();
    ensureCtx();
    await Promise.all(names.map(async n => {
      const ab = await (await fetch('voice/' + n + '.wav?t=' + Date.now())).arrayBuffer();
      voice.buf[n] = await actx.decodeAudioData(ab);
    }));
  }catch(e){}
}
function stopVoice(){
  if(voice.src){ try{ voice.src.onended = null; voice.src.stop(); }catch(e){} voice.src = null; }
  if('speechSynthesis' in window) speechSynthesis.cancel();
}
function speakKey(key, text, cb){
  const b = voice.buf[key];
  if(!b) return say(text, cb);
  stopVoice();
  const tk = state.token;
  let done = false;
  const finish = () => {
    if(done) return; done = true;
    if(cb && tk === state.token) cb();
  };
  try{
    ensureCtx();
    const src = actx.createBufferSource();
    src.buffer = b; src.connect(actx.destination);
    src.onended = () => setTimeout(finish, 120);
    src.start(); voice.src = src;
  }catch(e){}
  setTimeout(finish, b.duration * 1000 + 1500);
}
const qKey = () => 'q' + state.dan + '_' + num();
const fKey = () => 'f' + state.dan + '_' + num();
const aKey = () => 'a' + answer();

/* ---- 画面 ---- */
function show(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
}
const randHero = () => HEROES[Math.floor(Math.random() * HEROES.length)];

function goHome(){
  state.token++;
  stopTimer();
  stopVoice();
  loadVoices();
  const p = loadProgress();
  renderTimerToggle(p);
  [2,5].forEach(d => [d, d+'r'].forEach(k => {
    const n = p.clears[k] || 0;
    $('stars'+k).textContent = n === 0 ? '' : (n <= 5 ? '⭐'.repeat(n) : '⭐×' + n);
  }));
  $('homeHeroL').src = randHero();
  $('homeHeroR').src = randHero();
  show('home');
}

/* ---- プレイ ---- */
/* random=true は「ばらばら（むずかしい）」：1〜9を毎回ちがう順番で出す */
function shuffle(a){
  for(let k = a.length - 1; k > 0; k--){ const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; }
  return a;
}
function startDan(dan, random=false){
  state.token++;
  ensureCtx();   // iPad はタップの中で音を有効にする必要がある
  const order = [0,1,2,3,4,5,6,7,8];
  if(random) shuffle(order);
  Object.assign(state, { dan, random, order, i:0, input:'', miss:0, rowMiss:Array(9).fill(0), late:Array(9).fill(false), lock:false });
  $('hero').src = randHero();
  show('play');
  showQuestion();
}

const cur = () => state.order[state.i];          // いまの問題が何番目の行か(0〜8)
const num = () => cur() + 1;                        // かける数(1〜9)
const row = () => DANS[state.dan].rows[cur()];
const answer = () => String(state.dan * num());

function showQuestion(){
  state.input = ''; state.miss = 0; state.lock = false;
  stopTimer(); resetTimerUI();
  $('card').classList.remove('ok');
  $('praise').textContent = ''; $('praise').classList.remove('late');
  $('keypad').classList.remove('lock');
  $('dots').innerHTML = DANS[state.dan].rows.map((_, k) =>
    '<span class="dot ' + (k < state.i ? 'done' : k === state.i ? 'now' : '') + '"></span>').join('');
  $('reading').textContent = row().q;
  renderEq();
  clearHint();
  speakKey(qKey(), row().q, startTimer);   // 言いおわってからタイマー開始
}

function renderEq(){
  const a = state.input;
  $('eq').innerHTML = state.dan + ' × ' + num() + ' = ' +
    '<span id="ans" class="' + (a ? '' : 'empty') + '">' + (a || '?') + '</span>';
}

function press(key){
  if(state.lock) return;
  if(key === 'del'){ state.input = state.input.slice(0, -1); sfx.tap(); renderEq(); updateHint(); return; }
  sfx.tap();
  state.input += key;
  renderEq();
  const ans = answer();
  if(state.input === ans) correct();
  else if(ans.startsWith(state.input)) updateHint();
  else wrong();
}

function correct(){
  state.lock = true;
  stopTimer();
  $('keypad').classList.add('lock');
  clearHint();
  sfx.ok();
  $('card').classList.add('ok');
  $('praise').textContent = PRAISE[Math.floor(Math.random() * PRAISE.length)];
  const h = $('hero'); h.classList.remove('jump'); void h.offsetWidth; h.classList.add('jump');
  sayAnswerThenNext();
}

/* 「に！」→「にいちがに」→ 次の問題 */
function sayAnswerThenNext(){
  $('reading').innerHTML = row().q + '<span class="hl">' + row().a + '</span>';
  speakKey(aKey(), row().a + '！', () => speakKey(fKey(), row().q + row().a, () => setTimeout(() => {
    state.i++;
    if(state.i >= 9) finish(); else showQuestion();
  }, CONFIG.nextDelay)));
}

/* ---- タイマー ---- */
/* progress.timerSec: 0=なし / 3 / 5 / 10。むかしの ON/OFF(progress.timer=false) は「なし」とみなす */
function timerSec(p=loadProgress()){
  if(typeof p.timerSec === 'number') return p.timerSec;
  return p.timer === false ? 0 : CONFIG.timerDefault;
}
function timerOn(){ return timerSec() > 0; }
function renderTimerToggle(p){
  const now = timerSec(p);
  $('timerPick').innerHTML = '⏱ ' + [0, ...CONFIG.timerChoices].map(s =>
    '<button data-s="' + s + '" class="' + (s === now ? 'on' : '') + '">' + (s ? s + 'びょう' : 'なし') + '</button>').join('');
}
function resetTimerUI(){
  $('timer').classList.toggle('off', !timerOn());
  const b = $('tbar'); b.className = ''; b.style.width = '100%';
  $('tnum').textContent = timerSec();
}
function startTimer(){
  if(!timerOn() || state.lock) return;
  stopTimer();
  const limit = timerSec();
  const end = Date.now() + limit * 1000;
  let lastSec = limit;
  state.timerIv = setInterval(() => {
    const ms = Math.max(0, end - Date.now()), sec = Math.ceil(ms / 1000);
    const b = $('tbar');
    b.style.width = (ms / (limit * 1000) * 100) + '%';
    b.className = sec <= CONFIG.tickFrom ? 'hurry' : sec <= limit / 2 ? 'warn' : '';
    $('tnum').textContent = sec;
    if(sec < lastSec){ lastSec = sec; if(sec > 0 && sec <= CONFIG.tickFrom) sfx.tick(); }
    if(ms <= 0) timeUp();
  }, 100);
}
function stopTimer(){
  if(state.timerIv){ clearInterval(state.timerIv); state.timerIv = null; }
}
/* 時間ぎれ：罰にせず、こたえを見せて聞かせてから次へ */
function timeUp(){
  stopTimer();
  state.lock = true;
  state.late[cur()] = true;
  $('keypad').classList.add('lock');
  clearHint();
  sfx.late();
  state.input = answer(); renderEq();
  $('praise').textContent = 'じかん ぎれ！ こたえは ' + answer();
  $('praise').classList.add('late');
  setTimeout(sayAnswerThenNext, 700);
}

function wrong(){
  state.lock = true;
  state.miss++; state.rowMiss[cur()]++;
  sfx.ng();
  const c = $('card'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake');
  const i = state.i;
  setTimeout(() => {
    if(state.i !== i || state.late[cur()] || !$('play').classList.contains('on')) return;   // そのあいだに時間ぎれ・画面移動
    state.input = ''; state.lock = false;
    renderEq(); updateHint();
    speakKey(qKey(), row().q);
  }, 500);
}

/* まちがいが続いたら、つぎに押すボタンを光らせる */
function updateHint(){
  clearHint();
  if(state.miss < CONFIG.hintAfter) return;
  const next = answer()[state.input.length];
  const k = document.querySelector('.key[data-k="' + next + '"]');
  if(k) k.classList.add('hint');
}
function clearHint(){
  document.querySelectorAll('.key.hint').forEach(k => k.classList.remove('hint'));
}

/* ---- クリア ---- */
function finish(){
  const p = loadProgress();
  const ck = state.dan + (state.random ? 'r' : '');
  p.clears[ck] = (p.clears[ck] || 0) + 1;
  saveProgress(p);
  $('clearTitle').textContent = DANS[state.dan].name + (state.random ? ' ばらばら' : '') + ' クリア！';
  $('clearHero').src = $('hero').src;
  $('clearTable').innerHTML = DANS[state.dan].rows.map((r, k) =>
    '<div>' + state.dan + ' × ' + (k + 1) + ' = ' + state.dan * (k + 1) + '</div>' +
    '<div class="r">' + r.q + r.a +
    (state.rowMiss[k] ? ' <span class="m">' + '×'.repeat(Math.min(state.rowMiss[k], 3)) + '</span>' : '') +
    (state.late[k] ? ' <span class="m">⏰</span>' : '') +
    '</div>').join('');
  show('clear');
  sfx.clear();
  say((state.dan === 2 ? 'にのだん' : 'ごのだん') + '、くりあ！ やったね！');
}

/* ---- 初期化 ---- */
function buildKeypad(){
  const keys = ['1','2','3','4','5','6','7','8','9','del','0'];
  $('keypad').innerHTML = keys.map(k =>
    '<button class="key' + (k === 'del' ? ' del' : '') + '" data-k="' + k + '">' + (k === 'del' ? 'けす' : k) + '</button>').join('');
  $('keypad').addEventListener('pointerdown', e => {
    const b = e.target.closest('.key');
    if(b){ e.preventDefault(); press(b.dataset.k); }
  });
}

document.querySelectorAll('.dan-btn').forEach(b => b.onclick = () => startDan(Number(b.dataset.dan)));
document.querySelectorAll('.hard-btn').forEach(b => b.onclick = () => startDan(Number(b.dataset.dan), true));
$('homeBtn').onclick = goHome;
$('timerPick').onclick = e => {
  const b = e.target.closest('button'); if(!b) return;
  const p = loadProgress(); p.timerSec = Number(b.dataset.s); delete p.timer; saveProgress(p); renderTimerToggle(p);
};
$('backBtn').onclick = goHome;
$('retryBtn').onclick = () => startDan(state.dan, state.random);
$('againBtn').onclick = () => { if(!state.lock) speakKey(qKey(), row().q); };
document.addEventListener('keydown', e => {
  if(!$('play').classList.contains('on')) return;
  if(/^[0-9]$/.test(e.key)) press(e.key);
  else if(e.key === 'Backspace') press('del');
});

buildKeypad();
goHome();
