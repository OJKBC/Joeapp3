/* =========================================================
   くく ヒーロー — ロジック
   ========================================================= */

const $ = id => document.getElementById(id);
const state = { dan:2, i:0, input:'', miss:0, rowMiss:[], lock:false, token:0 };

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
  try{
    speechSynthesis.cancel();
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
function tone(freq, dur, type='sine', vol=0.2, when=0){
  try{
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
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
  clear:() => [523,659,784,1047].forEach((f,k) => tone(f, 0.3, 'triangle', 0.25, k*0.13))
};

/* ---- 画面 ---- */
function show(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
}
const randHero = () => HEROES[Math.floor(Math.random() * HEROES.length)];

function goHome(){
  state.token++;
  if('speechSynthesis' in window) speechSynthesis.cancel();
  const p = loadProgress();
  [2,5].forEach(d => {
    const n = p.clears[d] || 0;
    $('stars'+d).textContent = n === 0 ? '' : (n <= 5 ? '⭐'.repeat(n) : '⭐×' + n);
  });
  $('homeHeroL').src = randHero();
  $('homeHeroR').src = randHero();
  show('home');
}

/* ---- プレイ ---- */
function startDan(dan){
  state.token++;
  Object.assign(state, { dan, i:0, input:'', miss:0, rowMiss:Array(9).fill(0), lock:false });
  $('hero').src = randHero();
  show('play');
  showQuestion();
}

const row = () => DANS[state.dan].rows[state.i];
const answer = () => String(state.dan * (state.i + 1));

function showQuestion(){
  state.input = ''; state.miss = 0; state.lock = false;
  $('card').classList.remove('ok');
  $('praise').textContent = '';
  $('keypad').classList.remove('lock');
  $('dots').innerHTML = DANS[state.dan].rows.map((_, k) =>
    '<span class="dot ' + (k < state.i ? 'done' : k === state.i ? 'now' : '') + '"></span>').join('');
  $('reading').textContent = row().q;
  renderEq();
  clearHint();
  say(row().q);
}

function renderEq(){
  const a = state.input;
  $('eq').innerHTML = state.dan + ' × ' + (state.i + 1) + ' = ' +
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
  $('keypad').classList.add('lock');
  clearHint();
  sfx.ok();
  $('card').classList.add('ok');
  $('praise').textContent = PRAISE[Math.floor(Math.random() * PRAISE.length)];
  $('reading').innerHTML = row().q + '<span class="hl">' + row().a + '</span>';
  const h = $('hero'); h.classList.remove('jump'); void h.offsetWidth; h.classList.add('jump');
  // 「に！」→「にいちがに」→ 次の問題
  say(row().a + '！', () => say(row().q + row().a, () => setTimeout(() => {
    state.i++;
    if(state.i >= 9) finish(); else showQuestion();
  }, CONFIG.nextDelay)));
}

function wrong(){
  state.lock = true;
  state.miss++; state.rowMiss[state.i]++;
  sfx.ng();
  const c = $('card'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake');
  setTimeout(() => {
    state.input = ''; state.lock = false;
    renderEq(); updateHint();
    say(row().q);
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
  p.clears[state.dan] = (p.clears[state.dan] || 0) + 1;
  saveProgress(p);
  $('clearTitle').textContent = DANS[state.dan].name + ' クリア！';
  $('clearHero').src = $('hero').src;
  $('clearTable').innerHTML = DANS[state.dan].rows.map((r, k) =>
    '<div>' + state.dan + ' × ' + (k + 1) + ' = ' + state.dan * (k + 1) + '</div>' +
    '<div class="r">' + r.q + r.a +
    (state.rowMiss[k] ? ' <span class="m">' + '×'.repeat(Math.min(state.rowMiss[k], 3)) + '</span>' : '') +
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
$('homeBtn').onclick = goHome;
$('backBtn').onclick = goHome;
$('retryBtn').onclick = () => startDan(state.dan);
$('againBtn').onclick = () => { if(!state.lock) say(row().q); };
document.addEventListener('keydown', e => {
  if(!$('play').classList.contains('on')) return;
  if(/^[0-9]$/.test(e.key)) press(e.key);
  else if(e.key === 'Backspace') press('del');
});

buildKeypad();
goHome();
