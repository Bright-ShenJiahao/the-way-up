// 异世界幸存者 · 卡牌篇 —— 主逻辑（玩法照搬杀戮尖塔第一幕）
import { CARDS, STARTER, RELICS, STATUS, ENEMIES, ENCOUNTERS, EVENTS } from './data.js';
import { createAudio } from './audio.js';

const $ = s => document.querySelector(s);
const view = $('#view'), fxl = $('#fx'), stage = $('#stage');
const DEBUG = /[?&]debug/.test(location.search) || location.hash === '#debug';
const audio = createAudio();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pickOne = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/"/g, '&quot;');

// ---------- 缩放 ----------
function fit() { const s = Math.min(innerWidth / 1280, innerHeight / 720); stage.style.transform = `scale(${s})`; stage.style.left = (innerWidth - 1280 * s) / 2 + 'px'; stage.style.top = (innerHeight - 720 * s) / 2 + 'px'; stage._s = s; }
addEventListener('resize', fit); fit();
stage.addEventListener('scroll', () => { stage.scrollTop = 0; stage.scrollLeft = 0; });

// ---------- 局 ----------
let TIPS = true; try { TIPS = localStorage.getItem('tipsOff') !== '1'; } catch (e) {}
const KW = { '格挡': '抵挡受到的伤害。你的回合开始时清零。', '易伤': '受到的攻击伤害 +50%，每回合减 1 层。', '虚弱': '造成的攻击伤害 -25%，每回合减 1 层。',
  '力量': '每次攻击伤害增加等同于力量的数值。', '敏捷': '每次获得格挡时额外增加等同于敏捷的数值。', '消耗': '打出后移出本场战斗，不进弃牌堆。',
  '荆棘': '被攻击时，对攻击者造成等同于层数的伤害。', '能量': '出牌要花能量，每回合开始恢复为 3 点。' };
const kwify = t => TIPS ? t.replace(new RegExp(Object.keys(KW).join('|'), 'g'), m => `<span class="kw" title="${KW[m]}">${m}</span>`) : t;
let R = null; // 当前一局
let uidN = 1;
const mkCard = (id, up = 0) => ({ id, up, uid: uidN++ });
function newRun(char = 'hero') {
  R = { char, hp: 80, maxHp: 80, gold: 99, deck: STARTER.map(id => mkCard(id)), relics: ['gameboy'], map: genMap(), pos: null,
    floor: 0, fights: 0, removeCost: 75, boss: pickOne(ENCOUNTERS.boss)[0], feather: 0 };
}
const has = id => R.relics.includes(id);
function save() { try { localStorage.setItem('isekai_cards_run', JSON.stringify(R)); } catch (e) {} }
function clearSave() { try { localStorage.removeItem('isekai_cards_run'); } catch (e) {} }
function load() { try { const s = JSON.parse(localStorage.getItem('isekai_cards_run')); if (s) { uidN = 1 + Math.max(0, ...s.deck.map(c => c.uid)); } return s; } catch (e) { return null; } }

// ---------- 地图生成 ----------
const ROWS = 15, COLS = 7;
function genMap() {
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const node = (r, c) => g[r][c] || (g[r][c] = { r, c, next: [], type: null, x: 140 + c * 120 + rnd(-20, 20), y: 0 });
  const crosses = (r, c, n) => g[r].some(o => o && o.c !== c && o.next.some(n2 => (o.c < c && n2 > n) || (o.c > c && n2 < n)));
  let first = -1;
  for (let p = 0; p < 6; p++) {
    let c = rnd(0, COLS - 1); if (p === 1) while (c === first) c = rnd(0, COLS - 1); if (p === 0) first = c;
    for (let r = 0; r < ROWS; r++) {
      const nd = node(r, c); if (r === ROWS - 1) break;
      const cand = shuffle([c - 1, c, c + 1]).filter(n => n >= 0 && n < COLS && !crosses(r, c, n));
      const n = cand.length ? cand[0] : c; if (!nd.next.includes(n)) nd.next.push(n); c = n;
    }
  }
  const W = { fight: 45, event: 22, elite: 16, rest: 12, shop: 5 };
  for (let r = 0; r < ROWS; r++) for (const nd of g[r]) {
    if (!nd) continue; nd.y = (ROWS - 1 - r) * 92 + 250 + rnd(-12, 12);
    if (r === 0) { nd.type = 'fight'; continue; } if (r === 8) { nd.type = 'treasure'; continue; } if (r === ROWS - 1) { nd.type = 'rest'; continue; }
    const parents = g[r - 1].filter(o => o && o.next.includes(nd.c)).map(o => o.type);
    for (let k = 0; k < 20; k++) {
      let tot = 0, x; const ok = Object.entries(W).filter(([t]) => !((t === 'elite' || t === 'rest') && r < 5) && !(t === 'rest' && r === 13) && !(['elite', 'rest', 'shop'].includes(t) && parents.includes(t)));
      ok.forEach(([, w]) => tot += w); x = Math.random() * tot;
      for (const [t, w] of ok) { x -= w; if (x <= 0) { nd.type = t; break; } }
      if (nd.type) break;
    }
    nd.type = nd.type || 'fight';
  }
  return g;
}

// ---------- 顶栏 ----------
function topBar() {
  return `<div id="top"><span class="hp">❤ ${R.hp}/${R.maxHp}</span><span class="gold">● ${R.gold}</span><span class="fl">第 ${R.floor} 层 · 翠绿之地</span>
  <div class="relics">${R.relics.map(id => `<img src="${RELICS[id].img}" title="${esc(RELICS[id].name + '：' + RELICS[id].desc)}">`).join('')}</div>
  <span class="sp"></span><button class="tb" id="tbdeck">牌组 (${R.deck.length})</button><button class="tb" id="tbtips" title="开关规则提示">提示：${TIPS ? '开' : '关'}</button><button class="tb" id="tbfs" title="全屏">⛶</button><button class="tb" id="tbmute">${audio.muted ? '🔇' : '🔊'}</button></div>`;
}
function bindTop() {
  $('#tbdeck')?.addEventListener('click', () => showPile('牌组', R.deck));
  $('#tbtips')?.addEventListener('click', () => { TIPS = !TIPS; try { localStorage.setItem('tipsOff', TIPS ? '0' : '1'); } catch (e) {} B && !B.over ? render() : (R && mapScreen()); });
  $('#tbfs')?.addEventListener('click', () => { const d = document.documentElement; (document.fullscreenElement ? document.exitFullscreen() : (d.requestFullscreen || d.webkitRequestFullscreen).call(d)).then?.(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch?.(() => {}); });
  $('#tbmute')?.addEventListener('click', () => { dispatchEvent(new KeyboardEvent('keydown', { key: 'm' })); setTimeout(() => { const b = $('#tbmute'); if (b) b.textContent = audio.muted ? '🔇' : '🔊'; }, 30); });
}
const BGS = ['battle_forest', 'battle_birch', 'battle_castle'];
const bgHTML = (dim, img = 'battle_forest') => `<div class="bg ${dim ? 'dim' : ''}"><img class="full px" src="assets/bg/${img}.jpg"><div class="light"></div><div class="vig"></div></div>`;
const foreHTML = () => `<div id="fore"><img src="assets/fg/bush.png" style="left:-90px;bottom:-70px;width:400px"><img src="assets/fg/fern.png" style="right:-80px;bottom:-60px;width:360px"></div>`;

// ---------- 卡牌显示 ----------
const TYPE = { atk: '攻击', skill: '技能', power: '能力' };
function cardCost(c) { const d = CARDS[c.id]; if (c.free) return 0; return d.cost[c.up ? 1 : 0]; }
function cardHTML(c, extra = '', energy = 99) {
  const d = CARDS[c.id], cost = cardCost(c), no = cost !== 'X' && cost > energy;
  const rr = d.rar === 'start' ? 'c' : d.rar;
  return `<div class="card t-${d.type} r-${d.rar} ${c.up ? 'up' : ''} ${extra}" data-uid="${c.uid}" title="${TYPE[d.type]}">
   <div class="art"><img src="${d.img}"></div><div class="cdesc"><span>${kwify(d.desc(c.up))}</span></div><img class="frame" src="assets/ui2/frame_${d.type}_${rr}.png">
   <div class="cost ${no ? 'no' : ''}">${cost}</div><div class="cname">${d.name}${c.up ? '+' : ''}</div></div>`;
}
function overlay(html) { const o = document.createElement('div'); o.className = 'overlay'; o.innerHTML = html; stage.appendChild(o); return o; }
function showPile(title, cards) {
  const o = overlay(`<h2>${title}（${cards.length}）</h2><div class="grid">${cards.map(c => cardHTML(c)).join('') || '<p>空</p>'}</div><button class="btn">关闭</button>`);
  o.querySelector('.btn').onclick = () => o.remove();
}
// 从牌组选一张牌：mode = remove / upgrade / transform
function pickDeck(mode, done) {
  const T = { remove: '选择一张牌移除', upgrade: '选择一张牌升级', transform: '选择一张牌变化' };
  const list = mode === 'upgrade' ? R.deck.filter(c => !c.up) : R.deck;
  if (!list.length) { done && done(); return; }
  const o = overlay(`<h2>${T[mode]}</h2><div class="grid">${list.map(c => cardHTML(c)).join('')}</div>${mode === 'upgrade' ? '<button class="btn">取消</button>' : ''}`);
  o.querySelector('.btn')?.addEventListener('click', () => { o.remove(); done && done(false); });
  o.querySelectorAll('.card').forEach(el => el.onclick = () => {
    const i = R.deck.findIndex(c => c.uid == el.dataset.uid), c = R.deck[i];
    if (mode === 'remove') R.deck.splice(i, 1);
    if (mode === 'upgrade') c.up = 1;
    if (mode === 'transform') { const pool = Object.values(CARDS).filter(d => d.rar !== 'start' && d.id !== c.id); R.deck[i] = mkCard(pickOne(pool).id); }
    audio.level(); o.remove(); done && done(true);
  });
}
// 卡牌奖励池
function rollCards(n, rareBonus = 0, onlyRare = false) {
  const out = [];
  while (out.length < n) {
    const x = Math.random(); const rar = onlyRare ? 'r' : x < .03 + rareBonus ? 'r' : x < .4 + rareBonus ? 'u' : 'c';
    const pool = Object.values(CARDS).filter(d => d.rar === rar && !out.includes(d.id));
    if (pool.length) out.push(pickOne(pool).id);
  }
  return out.map(id => mkCard(id));
}
function chooseCard(cards, done, title = '选择一张牌加入牌组') {
  const o = overlay(`<h2>${title}</h2><div class="row">${cards.map(c => cardHTML(c)).join('')}</div><button class="btn">跳过</button>`);
  o.querySelector('.btn').onclick = () => { o.remove(); done(false); };
  o.querySelectorAll('.card').forEach(el => el.onclick = () => { R.deck.push(cards.find(c => c.uid == el.dataset.uid)); audio.level(); o.remove(); done(true); });
}
function rollRelic(rars = ['c', 'c', 'c', 'u', 'u', 'r'], crown = false) {
  for (let k = 0; k < 30; k++) { const r = pickOne(rars); const pool = Object.values(RELICS).filter(x => x.rar === r && !has(x.id) && (crown || x.id !== 'crown')); if (pool.length) return pickOne(pool).id; }
  const pool = Object.values(RELICS).filter(x => x.rar !== 'start' && !has(x.id) && (crown || x.id !== 'crown')); return pool.length ? pickOne(pool).id : null;
}
function gainRelic(id) { if (!id) return; R.relics.push(id); if (id === 'herb') { R.maxHp += 10; R.hp += 10; } audio.level(); }

// ---------- 标题 ----------
function title() {
  audio.setMode('menu');
  const sv = load();
  view.innerHTML = `${bgHTML()}<div class="panel" style="top:46%">
   <h2 style="font-size:44px;margin-bottom:2px">通往顶端</h2><p style="font-size:22px;letter-spacing:4px;color:#ffd35a;margin-bottom:2px">THE WAY UP</p><p style="font-size:14px;letter-spacing:3px;color:#c8b890;margin-bottom:8px">OTHERWORLD DECK</p><p style="color:#c8d8b0">穿越者的掌机里，藏着一副会战斗的卡牌。</p>
   <img src="assets/hero2/portrait.png" style="height:170px;margin:6px 0 14px">
   <div class="row">${sv ? '<button class="btn" id="cont">继续冒险</button>' : ''}<button class="btn" id="start">${sv ? '新的冒险' : '开始冒险'}</button></div>
   <p style="font-size:13px;color:#998;margin:16px 0 0">快捷键：数字键选牌 · E 结束回合 · Esc 取消 · M 静音</p></div>`;
  $('#start').onclick = pickChar;
  $('#cont')?.addEventListener('click', () => { R = sv; mapScreen(); });
}

function pickChar() {
  view.innerHTML = `${bgHTML()}<div class="panel" style="top:48%"><h2>选择角色</h2><div class="row">${Object.entries(CHARS).map(([k, c]) => `<div class="reward" data-c="${k}" style="width:260px;flex-direction:column;padding:16px"><img src="assets/${c.dir}/portrait.png" style="width:160px;height:auto"><b style="font-size:20px">${c.name}</b><span>${c.desc}</span></div>`).join('')}</div>
   <p style="font-size:13px;color:#998;margin-top:12px">目前两位共用同一套卡牌，专属卡以后加入</p></div>`;
  view.querySelectorAll('[data-c]').forEach(el => el.onclick = () => { newRun(el.dataset.c); save(); mapScreen(); });
}
// ---------- 地图 ----------
const NODEICON = Object.fromEntries(['fight', 'elite', 'event', 'rest', 'shop', 'treasure'].map(k => [k, `<img src="assets/ui2/node_${k}.png">`]));
const NODENAME = { fight: '战斗', elite: '精英', event: '未知', rest: '营火', shop: '商店', treasure: '宝箱' };
function available() {
  if (!R.pos) return R.map[0].filter(Boolean);
  if (R.pos.r === ROWS - 1) return ['boss'];
  const cur = R.map[R.pos.r][R.pos.c]; return cur.next.map(c => R.map[R.pos.r + 1][c]);
}
function mapScreen() {
  audio.setMode('menu'); save();
  const av = available(), H = ROWS * 92 + 320;
  let lines = '';
  for (const row of R.map) for (const nd of row) if (nd) for (const c of nd.next) { const t = R.map[nd.r + 1][c]; lines += `<line x1="${nd.x}" y1="${nd.y}" x2="${t.x}" y2="${t.y}" stroke="#5a3a1a" stroke-width="3" stroke-dasharray="4 8" stroke-linecap="round" opacity=".75"/>`; }
  for (const nd of R.map[ROWS - 1]) if (nd) lines += `<line x1="${nd.x}" y1="${nd.y}" x2="500" y2="110" stroke="#5a3a1a" stroke-width="3" stroke-dasharray="4 8" stroke-linecap="round" opacity=".75"/>`;
  const visited = R.path || [];
  let nodes = '';
  for (const row of R.map) for (const nd of row) if (nd) {
    const isAv = av.includes(nd), done = visited.some(p => p.r === nd.r && p.c === nd.c), cur = R.pos && R.pos.r === nd.r && R.pos.c === nd.c;
    nodes += `<div class="node ${isAv ? 'av' : ''} ${done ? 'done' : ''} ${cur ? 'cur' : ''}" style="left:${nd.x}px;top:${nd.y}px" data-r="${nd.r}" data-c="${nd.c}" title="${NODENAME[nd.type]}">${NODEICON[nd.type]}</div>`;
  }
  const bk = R.boss;
  nodes += `<div class="node boss ${av[0] === 'boss' ? 'av' : ''}" style="left:500px;top:110px" title="Boss：${ENEMIES[bk].name}"><img src="assets/ui2/node_boss.png"></div>`;
  view.innerHTML = `${topBar()}<div id="map"><div id="mapin" style="height:${H}px"><svg width="1000" height="${H}">${lines}</svg>${nodes}
   <div style="position:absolute;left:500px;top:186px;transform:translateX(-50%);font-size:18px;font-weight:bold;color:#6a1a10;text-shadow:0 0 4px #f6e6c0">${ENEMIES[bk].name}</div></div></div>
   <div id="legend">${Object.keys(NODENAME).map(k => `<div>${NODEICON[k]}${NODENAME[k]}</div>`).join('')}</div>`;
  bindTop();
  const m = $('#map'); const y = R.pos ? R.map[R.pos.r][R.pos.c].y : H; m.scrollTop = Math.max(0, y - 480);
  view.querySelectorAll('.node.av').forEach(el => el.onclick = () => {
    if (el.classList.contains('boss')) { R.floor++; return battle([R.boss], 'boss'); }
    const nd = R.map[+el.dataset.r][+el.dataset.c]; R.pos = { r: nd.r, c: nd.c }; (R.path = R.path || []).push(R.pos); R.floor++;
    enterNode(nd.type);
  });
  dbgPanel();
}
function enterNode(t) {
  if (t === 'fight') { const pool = R.fights < 3 ? ENCOUNTERS.easy : ENCOUNTERS.hard; R.fights++; return battle(pickOne(pool), 'fight'); }
  if (t === 'elite') return battle(pickOne(ENCOUNTERS.elite), 'elite');
  if (t === 'rest') return restScreen();
  if (t === 'shop') return shopScreen();
  if (t === 'treasure') return treasureScreen();
  if (t === 'event') return eventScreen();
}

// ---------- 战斗 ----------
let B = null, eid = 1;
function mkEnemy(key) {
  const d = ENEMIES[key], hp = rnd(d.hp[0], d.hp[1]);
  const e = { key, d, name: d.name, hp, max: hp, block: 0, st: {}, turn: 0, hist: [], id: 'e' + eid++, move: null };
  d.init && d.init(e); return e;
}
const alive = () => B.en.filter(e => !e.dead);
function battle(keys, kind) {
  hst = { n: 'idle', t: performance.now() };
  const bg = kind === 'boss' ? 'battle_castle' : pickOne(BGS);
  B = { kind, bg, en: keys.map(mkEnemy), p: { block: 0, energy: 0, st: {}, noDraw: 0 }, draw: shuffle(R.deck.map(c => ({ ...c }))), hand: [], disc: [], exh: [], turn: 0, atkCnt: 0, sel: -1, busy: false, fx: [], over: false };
  audio.setMode(kind === 'boss' ? 'boss' : 'battle'); if (kind === 'boss') audio.boss();
  if (has('charm')) B.p.st.str = 1;
  if (has('spikes')) B.p.st.thorns = 3;
  if (has('wardrum')) B.en.forEach(e => e.st.vuln = 1);
  B.en.forEach(e => e.move = e.d.ai(e, BE));
  startTurn(true);
  setTimeout(tutorial, 1300);
  banner(kind === 'boss' ? `Boss · ${ENEMIES[keys[0]].name}` : kind === 'elite' ? '精英战斗' : '战斗开始');
}
const TUT = ['每回合有 3 点<b>能量</b>（左下角的球），出牌要花能量，卡牌左上角的数字就是费用。',
  '敌人头上的图标是它<b>下回合要做的事</b>：剑是攻击，数字是伤害；盾是加格挡。鼠标移上去可以看详细说明。',
  '<b>格挡</b>能挡住伤害，但只挡这一轮，你的回合开始时会清零。血条下面会提示你这回合还会受到多少伤害。',
  '有的攻击牌要选目标：点牌，再点敌人。出完牌，点右边的「结束回合」。'];
function tutorial() {
  if (!TIPS || !B) return; let done = false; try { done = localStorage.getItem('tutDone') === '1'; } catch (e) {} if (done) return;
  let i = 0; const o = overlay(''); o.style.background = 'rgba(0,0,0,.55)';
  const step = () => { if (i >= TUT.length) { o.remove(); try { localStorage.setItem('tutDone', '1'); } catch (e) {} return; }
    o.innerHTML = `<div class="panel" style="max-width:560px"><h2>新手提示 ${i + 1}/${TUT.length}</h2><p>${TUT[i]}</p><div class="row"><button class="btn" id="tn">${i < TUT.length - 1 ? '下一条' : '开始战斗'}</button><button class="btn" id="tx" style="filter:grayscale(.6)">关闭提示</button></div></div>`;
    o.querySelector('#tn').onclick = () => { i++; step(); };
    o.querySelector('#tx').onclick = () => { TIPS = false; try { localStorage.setItem('tipsOff', '1'); localStorage.setItem('tutDone', '1'); } catch (e) {} o.remove(); render(); }; };
  step();
}
function banner(t) { const b = document.createElement('div'); b.id = 'banner'; b.textContent = t; stage.appendChild(b); setTimeout(() => b.remove(), 1200); }

// 伤害计算
function atkVal(src, tgt, base, strMul = 1) {
  let d = base + (src.st.str || 0) * strMul; if (src.st.weak) d *= .75; if (tgt && tgt.st.vuln) d *= 1.5; return Math.max(0, Math.floor(d));
}
function fx(who, text, cls) { B.fx.push({ who, text, cls }); }
// 对目标造成伤害（已计算好的数值），返回未被格挡的伤害
function hurt(tgt, amt, attacker) {
  const isP = tgt === B.p;
  if (!isP && tgt.st.aegis) { fx(tgt.id, '免疫', 'blk'); return 0; } let blk = tgt.block, left = amt;
  const used = Math.min(blk, left); tgt.block -= used; left -= used;
  if (isP) { R.hp -= left; } else { tgt.hp -= left; }
  fx(isP ? 'hero' : tgt.id, left > 0 ? `-${left}` : '格挡', left > 0 ? 'dmg' : 'blk'); B.hitSet.add(isP ? 'hero' : tgt.id);
  if (attacker && tgt.st.thorns && attacker !== tgt) { const th = tgt.st.thorns; hurt(attacker, th); }
  if (!isP && left > 0) eAct(tgt, 'hurt');
  if (!isP && tgt.hp <= 0 && !tgt.dead) killE(tgt);
  if (!isP && !tgt.dead && tgt.key === 'gob_wolf' && tgt.hp <= tgt.max / 2) dismount(tgt);
  if (isP && R.hp <= 0) { if (has('feather') && !R.feather) { R.feather = 1; R.hp = Math.floor(R.maxHp / 2); fx('hero', '凤凰重生！', 'heal'); } }
  if (left > 0) { if (isP) { audio.hurt(); heroAct('hurt'); } else audio.hit('mel'); }
  return left;
}
function dismount(e) { // 骑狼兵半血落马：变成野狼 + 一只小兵
  e.key = 'wolf'; e.d = ENEMIES.wolf; e.name = '野狼'; e.anim = null; e.move = e.d.ai(e, BE);
  const g = mkEnemy('goblin'); g.hp = g.max = 8; g.move = g.d.ai(g, BE); B.en.splice(B.en.indexOf(e) + 1, 0, g);
  fx(e.id, '落马！', 'st');
}
function killE(e) { eAct(e, 'down'); e.dead = true; e.hp = 0; audio.kill(); if (has('fang')) { healP(3); } }
function healP(n) { if (n <= 0) return; R.hp = Math.min(R.maxHp, R.hp + n); fx('hero', `+${n}`, 'heal'); }
function addSt(t, k, n) { t.st[k] = (t.st[k] || 0) + n; if (t.st[k] === 0) delete t.st[k]; }

// 卡牌用的接口
const G = {
  get p() { return B.p; }, x: 0,
  attack(t, base, times = 1, strMul = 1) { let s = 0; for (let i = 0; i < times; i++) { if (!t || t.dead) break; s += hurt(t, atkVal(B.p, t, base, strMul), B.p); } audio.slash(); return s; },
  attackAll(base, times = 1) { let s = 0; for (let i = 0; i < times; i++) for (const e of alive()) s += hurt(e, atkVal(B.p, e, base), B.p); audio.slash(); return s; },
  attackRandom(base, times) { for (let i = 0; i < times; i++) { const a = alive(); if (!a.length) break; const e = pickOne(a); hurt(e, atkVal(B.p, e, base), B.p); } audio.slash(); },
  block(n, raw) { const v = Math.max(0, raw ? n : n + (B.p.st.dex || 0)); B.p.block += v; if (v) { fx('hero', `+${v}`, 'blk'); audio.holy(); heroAct('block'); } },
  apply(t, k, n) { if (t && !t.dead) { addSt(t, k, n); fx(t.id, `${STATUS[k][0]}+${n}`, 'st'); } },
  applyAll(k, n) { alive().forEach(e => G.apply(e, k, n)); },
  self(k, n) { addSt(B.p, k, n); fx('hero', `${STATUS[k][0]}+${n}`, 'st'); },
  draw(n) { drawCards(n); }, energy(n) { B.p.energy += n; },
  loseHp(n) { R.hp -= n; fx('hero', `-${n}`, 'dmg'); B.hitSet.add('hero'); },
  heal(n) { healP(n); },
  addCard(id, up, pile) { B[pile === 'discard' ? 'disc' : 'draw'].push(mkCard(id, up)); },
};
// 敌人用的接口
const BE = {
  applyP(k, n) { addSt(B.p, k, n); fx('hero', `${STATUS[k][0]}+${n}`, 'st'); },
  addSt(e, k, n) { addSt(e, k, n); fx(e.id, `${STATUS[k][0]}+${n}`, 'st'); },
  eBlock(e, n) { e.block += n; fx(e.id, `+${n}`, 'blk'); },
  allies: e => alive().filter(a => a !== e), alive: () => alive(),
  healE(e, n) { e.hp = Math.min(e.max, e.hp + n); fx(e.id, `+${n}`, 'heal'); },
  kill(e) { killE(e); B.hitSet.add(e.id); },
  summon(key) { if (alive().length >= 5) return; const e = mkEnemy(key); e.move = e.d.ai(e, BE); B.en.unshift(e); },
};

function drawCards(n) {
  for (let i = 0; i < n; i++) {
    if (B.p.noDraw) return; if (B.hand.length >= 10) return;
    if (!B.draw.length) { if (!B.disc.length) return; B.draw = shuffle(B.disc); B.disc = []; }
    B.hand.push(B.draw.pop());
  }
}
function startTurn(first) {
  B.turn++; B.hitSet = new Set();
  if (!B.p.st.keep) B.p.block = 0;
  B.p.energy = 3 + (has('crown') ? 1 : 0) + (first && has('hourglass') ? 1 : 0);
  B.p.noDraw = 0;
  if (B.p.st.rage) addSt(B.p, 'str', B.p.st.rage);
  if (first && has('anchor')) B.p.block += 10;
  drawCards(5 + (first && has('scroll') ? 2 : 0));
  if (first && has('dice') && B.hand.length) { const c = pickOne(B.hand); c.free = 1; }
  B.sel = -1; B.busy = false; render();
}
async function playCard(i, tgt) {
  if (B.busy || B.over || B.anim) return;
  const c = B.hand[i], d = CARDS[c.id]; let cost = cardCost(c);
  if (cost === 'X') cost = B.p.energy; if (cost > B.p.energy) { tip('能量不足'); return; }
  if (d.tgt === 'one' && !tgt) { const a = alive(); if (a.length === 1) tgt = a[0]; else { B.sel = B.sel === i ? -1 : i; render(); return; } }
  B.hitSet = new Set();
  const el = view.querySelector(`#hand .card[data-i="${i}"]`);
  B.p.energy -= cost; G.x = cost; B.hand.splice(i, 1); B.sel = -1; B.anim = true;
  if (el) flyCard(el, d.type); render(); await sleep(260);
  B.anim = false; B.hitSet = new Set();
  d.play(G, c.up, tgt, c);
  if (d.type === 'atk') { B.atkCnt++; if (has('quiver') && B.atkCnt % 3 === 0) for (const e of alive()) hurt(e, 5); heroAct('shoot'); }
  if (d.type === 'skill') alive().forEach(e => { if (e.st.enrage) BE.addSt(e, 'str', e.st.enrage); });
  if (d.type === 'power') {} else if (d.exhaust) B.exh.push(c); else B.disc.push(c);
  render(); await checkEnd();
}
function flyCard(el, type) {
  const sc = stage._s || 1, sr = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
  const cl = el.cloneNode(true); cl.removeAttribute('data-i');
  cl.style.cssText = `position:absolute;left:${(r.left - sr.left) / sc}px;top:${(r.top - sr.top) / sc}px;z-index:80;transform:none;margin:0`;
  fxl.appendChild(cl); cl.getBoundingClientRect();
  cl.style.transition = 'left .2s ease-out,top .2s ease-out,transform .2s ease-out';
  cl.style.left = '565px'; cl.style.top = '170px'; cl.style.transform = 'scale(1.3)';
  setTimeout(() => { cl.style.transition = 'all .28s ease-in'; cl.style.opacity = '0'; cl.style.transform = type === 'power' ? 'scale(1.8)' : 'translate(480px,330px) scale(.3) rotate(25deg)'; }, 360);
  setTimeout(() => cl.remove(), 700);
}
let heroAnimCls = '';
function eAct(e, n) { if (ENEMIES[e.key].hd) e.anim = { n, t: performance.now() }; }
function eFrame(e) {
  const k = e.key, now = performance.now(), a = e.anim, dt = a ? now - a.t : 1e9;
  if (e.dead) return `assets/enemies2/${k}/${(a && a.n === 'down' && dt < 260) ? 'down0' : 'down1'}.png`;
  if (a && a.n === 'atk' && dt < 420) return `assets/enemies2/${k}/${dt < 160 ? 'atk0' : 'atk1'}.png`;
  if (a && a.n === 'hurt' && dt < 320) return `assets/enemies2/${k}/hurt0.png`;
  return `assets/enemies2/${k}/idle${Math.floor(now / 480) % 2}.png`;
}
const CHARS = { hero: { dir: 'hero2', name: '穿越者 · 男', h: 241, desc: '掌机 · 光弹' }, heroine: { dir: 'heroine2', name: '穿越者 · 女', h: 251, desc: '耳机 · 音波', idle: [0, 3], idleMs: 520 } };
const cdir = () => CHARS[(R && R.char) || 'hero'].dir;
const HA = { idle: [4, 200, 1], shoot: [4, 75, 0], hurt: [2, 130, 0], block: [1, 380, 0], down: [3, 220, 2] }; // 帧数, 每帧毫秒, 1=循环 2=停在最后
let hst = { n: 'idle', t: 0 };
const heroImgs = []; const decodeAll = () => heroImgs.forEach(i => i.decode && i.decode().catch(() => {})); for (const [n, [c]] of Object.entries(HA)) for (let k = 0; k < c; k++) { const im = new Image(); for (const c of Object.values(CHARS)) { const im = new Image(); im.src = `assets/${c.dir}/${n}${k}.png`; heroImgs.push(im); } }
setTimeout(decodeAll, 500);
function heroAct(n) { if (hst.n === 'down') return; if (n === 'block' && hst.n === 'shoot') return; hst = { n, t: performance.now() }; }
function heroFrame() {
  const [c, ms, mode] = HA[hst.n]; let k = Math.floor((performance.now() - hst.t) / ms);
  if (k >= c) { if (mode === 1) k %= c; else if (mode === 2) k = c - 1; else { hst = { n: 'idle', t: performance.now() }; k = 0; } }
  const C = CHARS[(R && R.char) || 'hero'];
  if (hst.n === 'idle' && C.idle) { const j = Math.floor((performance.now() - hst.t) / C.idleMs) % C.idle.length; return `assets/${cdir()}/idle${C.idle[j]}.png`; }
  return `assets/${cdir()}/${hst.n}${k}.png`;
}
let lastT = 0;
(function loop(t) { requestAnimationFrame(loop); if (!B || t - lastT < 80) return; lastT = t; const h = view.querySelector('#hero .spr'); if (h) { const f = heroFrame(); if (!h.src.endsWith(f)) h.src = f; }
  view.querySelectorAll('.enemy.hd .spr').forEach(img => { const e = B.en.find(x => x.id === img.dataset.eid); if (e) { const f = eFrame(e); if (!img.src.endsWith(f)) img.src = f; } });
})(0);
function heroAnim(c) { heroAnimCls = c; }
async function endTurn() {
  if (B.busy || B.over || B.anim) return; B.busy = true; B.sel = -1; B.hitSet = new Set();
  B.disc.push(...B.hand); B.hand = [];
  if (B.p.st.metal) G.block(B.p.st.metal, true);
  if (B.p.st.regen) healP(B.p.st.regen);
  for (const k of ['vuln', 'weak']) if (B.p.st[k]) addSt(B.p, k, -1);
  render(); await sleep(300);
  // 敌人回合
  for (const e of alive()) e.block = 0;
  render();
  for (const e of [...B.en]) {
    if (e.dead || B.over) continue;
    B.hitSet = new Set();
    const mv = e.d.moves[e.move]; B.lunge = mv.d != null && mv.i.startsWith('atk') && mv.d > 0 ? e.id : null;
    if (mv.d) eAct(e, 'atk');
    if (mv.d) for (let k = 0; k < (mv.x || 1); k++) { hurt(B.p, atkVal(e, B.p, mv.d), e); if (e.dead) break; }
    if (mv.f && !e.dead) mv.f(e, BE);
    e.hist.push(e.move); e.d.after && e.d.after(e);
    render(); await sleep(mv.d ? 520 : 380);
    if (R.hp <= 0) return checkEnd();
    if (await checkEnd()) return;
  }
  B.lunge = null; B.hitSet = new Set();
  for (const e of alive()) {
    if (e.st.ritual) addSt(e, 'str', e.st.ritual);
    if (e.st.heal) BE.healE(e, e.st.heal);
    for (const k of ['vuln', 'weak', 'aegis']) if (e.st[k]) addSt(e, k, -1);
    e.turn++; e.move = e.d.ai(e, BE);
  }
  startTurn(false);
}
async function checkEnd() {
  if (B.over) return true;
  if (R.hp <= 0) { B.over = true; heroAct('down'); render(); await sleep(1400); clearSave(); return endScreen(false); }
  if (!alive().length) {
    B.over = true; render(); await sleep(600);
    if (has('gameboy')) R.hp = Math.min(R.maxHp, R.hp + 6);
    if (B.kind === 'boss') { clearSave(); return endScreen(true); }
    rewardScreen(); return true;
  }
  return false;
}
function tip(t) { const o = document.createElement('div'); o.id = 'tip'; o.textContent = t; stage.appendChild(o); setTimeout(() => o.remove(), 900); }

// 意图文字
const II = n => `<img src="assets/ui2/int_${n}.png">`;
const ICON = { atk: II('atk'), def: II('def'), buff: II('buff'), debuff: II('debuff'), atkdef: II('atk') + II('def'), atkdebuff: II('atk') + II('debuff'), summon: II('summon'), unknown: II('unknown') };
function intentHTML(e) {
  const mv = e.d.moves[e.move]; let num = '';
  if (mv.d != null && mv.i.startsWith('atk') && mv.d > 0) { const v = atkVal(e, B.p, mv.d); num = mv.x ? `${v}×${mv.x}` : `${v}`; }
  const IT = { atk: '攻击你', def: '给自己或队友加格挡', buff: '强化自己', debuff: '给你施加负面状态', atkdef: '攻击你并加格挡', atkdebuff: '攻击你并施加负面状态', summon: '召唤援兵', unknown: '意图不明' };
  const tip = `${mv.n}：下回合将${IT[mv.i]}${num ? `，伤害 ${num}` : ''}`;
  return `<div class="intent" title="${esc(tip)}">${ICON[mv.i]}${num}<small>${mv.n}</small></div>`;
}
const stsHTML = st => `<div class="sts">${Object.entries(st).filter(([k, n]) => n && STATUS[k]).map(([k, n]) => `<b style="border-color:${STATUS[k][2]};color:${STATUS[k][2]}" title="${esc(STATUS[k][0] + '：' + STATUS[k][1])}">${STATUS[k][0]}${n}</b>`).join('')}</div>`;
function incoming() { let t = 0; for (const e of alive()) { const mv = e.d.moves[e.move]; if (mv.d && mv.i.startsWith('atk')) t += atkVal(e, B.p, mv.d) * (mv.x || 1); } return t; }
function barHTML(hp, max, blk, me) {
  let cls = '', tip = '';
  if (me && TIPS && B && !B.busy) { const inc = incoming(); if (inc > 0) { cls = blk >= inc ? 'ok' : 'low'; tip = `敌人下回合共 ${inc} 点伤害，你有 ${blk} 格挡${blk >= inc ? '，足够' : `，还差 ${inc - blk}`}`; } }
  return `<div class="bar ${blk ? 'blk' : ''}" title="${tip}"><i style="width:${Math.max(0, hp) / max * 100}%"></i><span>${Math.max(0, hp)}/${max}</span>${blk || cls === 'low' ? `<div class="blkv ${cls}">${blk}</div>` : ''}</div>${cls ? `<div class="inc ${cls}">受到 ${inc_(blk)}</div>` : ''}`;
  function inc_(b) { return Math.max(0, incoming() - b); }
}
let frame = 0;
function render() {
  if (!B) return;
  const hs = B.hitSet || new Set();
  const enemies = B.en.map(e => {
    const img = e.dead ? 'a' : (frame % 2 ? 'b' : 'a'), h = ENEMIES[e.key].sc * 1.3, hd = ENEMIES[e.key].hd;
    const tg = B.sel >= 0 && !e.dead;
    return `<div class="unit enemy ${hd ? 'hd' : ''} ${tg ? 'tg' : ''} ${hs.has(e.id) ? 'hit' : ''} ${B.lunge === e.id ? 'lunge' : ''} ${e.dead ? 'dead' : ''}" data-id="${e.id}" data-eid="${e.id}">
      ${e.dead ? '<div class="intent"></div>' : intentHTML(e)}
      <div class="sprw" ${ENEMIES[e.key].hdw ? `style="width:${ENEMIES[e.key].hdw}px"` : ''}>${hd ? `<img class="spr" decoding="sync" data-eid="${e.id}" src="${eFrame(e)}" style="height:${hd}px">` : `<img class="spr px" data-k="${e.key}" src="assets/enemies/${e.key}/${img}.png" style="zoom:${h}">`}<i class="shd"></i></div>
      ${barHTML(e.hp, e.max, e.block)}${stsHTML(e.st)}<div class="uname">${e.name}</div></div>`;
  }).join('');
  const energy = B.p.energy, n = B.hand.length, W = 980, cw = 150, gap = Math.min(cw + 6, (W - cw) / Math.max(1, n - 1));
  const x0 = (W - (gap * (n - 1) + cw)) / 2;
  const hand = B.hand.map((c, i) => {
    const mid = (n - 1) / 2, rot = (i - mid) * 3, dy = Math.abs(i - mid) * Math.abs(i - mid) * 2.2, sel = B.sel === i;
    const cost = cardCost(c), off = cost !== 'X' && cost > energy;
    return cardHTML(c, `${sel ? 'sel' : ''} ${off ? 'off' : ''}`, energy).replace('class="card', `data-i="${i}" style="left:${x0 + i * gap}px;transform:translateY(${sel ? -100 : dy}px) rotate(${sel ? 0 : rot}deg);z-index:${i + 1}" class="card`);
  }).join('');
  view.innerHTML = `${bgHTML(true, B.bg)}${topBar()}
   <div id="hero" class="unit ${hs.has('hero') ? 'hit' : ''} ${heroAnimCls}" data-id="hero"><div class="intent"></div><div class="sprw"><img class="spr" decoding="sync" src="${heroFrame()}" style="height:${CHARS[R.char || 'hero'].h}px"><i class="shd" style="width:150px"></i></div>${barHTML(R.hp, R.maxHp, B.p.block, 1)}${stsHTML(B.p.st)}<div class="uname">${CHARS[R.char || 'hero'].name}</div></div>
   <div id="enemies">${enemies}</div>${foreHTML()}
   <div id="energy" class="${energy ? '' : 'empty'}">${energy}/${3 + (has('crown') ? 1 : 0)}</div>
   <button class="btn" id="endturn" ${B.busy ? 'disabled' : ''}>${B.busy ? '敌人回合' : '结束回合 (E)'}</button>
   <div class="pile" id="drawp"><b>${B.draw.length}</b>抽牌堆</div><div class="pile" id="discp"><b>${B.disc.length}</b>弃牌堆</div><div class="pile" id="exhp"><b>${B.exh.length}</b>消耗</div>
   <div id="hand">${hand}</div>${B.sel >= 0 ? '<div id="tip">选择目标（Esc 取消）</div>' : ''}`;
  heroAnimCls = '';
  bindTop();
  $('#endturn').onclick = endTurn;
  $('#drawp').onclick = () => showPile('抽牌堆（顺序已打乱）', [...B.draw].sort((a, b) => a.id < b.id ? -1 : 1));
  $('#discp').onclick = () => showPile('弃牌堆', B.disc);
  $('#exhp').onclick = () => showPile('消耗', B.exh);
  view.querySelectorAll('#hand .card').forEach(el => el.onclick = ev => { ev.stopPropagation(); playCard(+el.dataset.i); });
  view.querySelectorAll('.enemy').forEach(el => el.onclick = () => { if (B.sel >= 0) { const e = B.en.find(x => x.id === el.dataset.eid); if (e && !e.dead) playCard(B.sel, e); } });
  flushFx(); dbgPanel();
}
function flushFx() {
  const s = stage._s || 1, sr = stage.getBoundingClientRect();
  const count = {}; let shake = false;
  for (const f of B.fx) {
    const el = view.querySelector(`[data-id="${f.who}"] .spr`); if (!el) continue;
    const r = el.getBoundingClientRect(); const k = f.who; count[k] = (count[k] || 0) + 1;
    const d = document.createElement('div'); d.className = 'fxn ' + f.cls; d.textContent = f.text;
    d.style.left = ((r.left + r.width / 2 - sr.left) / s + (count[k] - 1) * 18) + 'px'; d.style.top = ((r.top - sr.top) / s + 10 + (count[k] - 1) * 26) + 'px';
    fxl.appendChild(d); setTimeout(() => d.remove(), 950);
    if (f.cls === 'dmg') {
      const cx = (r.left + r.width / 2 - sr.left) / s, cy = (r.top + r.height * .45 - sr.top) / s;
      for (let k = 0; k < 12; k++) { const p = document.createElement('div'); p.className = 'spark'; const an = Math.random() * 6.28, dist = 50 + Math.random() * 90;
        p.style.left = cx + 'px'; p.style.top = cy + 'px'; p.style.setProperty('--dx', Math.cos(an) * dist + 'px'); p.style.setProperty('--dy', Math.sin(an) * dist + 'px');
        if (f.who === 'hero') p.style.background = '#ff5a4a'; fxl.appendChild(p); setTimeout(() => p.remove(), 600); }
      if (f.who !== 'hero') { const sl = document.createElement('img'); sl.src = 'assets/icons/fx_slash.png'; sl.className = 'slashfx'; sl.style.left = (cx - 75) + 'px'; sl.style.top = (cy - 75) + 'px'; sl.style.rotate = (Math.random() * 60 - 30) + 'deg'; fxl.appendChild(sl); setTimeout(() => sl.remove(), 400); }
      const n = parseInt(String(f.text).replace('-', '')) || 0;
      if (f.who === 'hero' || n >= 15) shake = true;
    }
  }
  if (shake) { view.classList.remove('shake'); void view.offsetWidth; view.classList.add('shake'); }
  B.fx = [];
}
setInterval(() => { frame++; if (!B || B.over) return; view.querySelectorAll('.enemy:not(.dead):not(.hd) .spr').forEach(img => img.src = `assets/enemies/${img.dataset.k}/${frame % 2 ? 'b' : 'a'}.png`); }, 520);
addEventListener('keydown', e => {
  if (!B || B.over || document.querySelector('.overlay') || !view.querySelector('#hand')) return;
  if (e.key === 'e' || e.key === 'E') endTurn();
  else if (e.key === 'Escape') { B.sel = -1; render(); }
  else if (/^[0-9]$/.test(e.key)) { const i = (+e.key + 9) % 10; if (i < B.hand.length) playCard(i); }
});
view.addEventListener('contextmenu', e => { if (B && B.sel >= 0) { e.preventDefault(); B.sel = -1; render(); } });

// ---------- 战后奖励 ----------
function rewardScreen() {
  const kind = B.kind; B = null; audio.setMode('menu');
  const items = [];
  const gold = kind === 'elite' ? rnd(25, 35) : rnd(10, 20);
  items.push({ html: `<img src="assets/icons/goldbag.png">${gold} 金币`, go: () => { R.gold += gold; } });
  if (has('clover')) items.push({ html: `<img src="${RELICS.clover.img}">四叶草：15 金币`, go: () => { R.gold += 15; } });
  if (kind === 'elite') { const rl = rollRelic(); if (rl) items.push({ html: `<img src="${RELICS[rl].img}">遗物：${RELICS[rl].name}`, go: () => gainRelic(rl) }); }
  const cards = rollCards(3, kind === 'elite' ? .07 : 0);
  items.push({ html: `<img src="assets/icons/p_arc.png">选择一张牌加入牌组`, card: true, go: done => chooseCard(cards, ok => done(ok)) });
  const draw = () => {
    view.innerHTML = `${bgHTML()}${topBar()}<div class="panel"><h2>战利品</h2>${items.map((it, i) => `<div class="reward" data-i="${i}">${it.html}</div>`).join('')}<br><button class="btn" id="go">继续前进</button></div>`;
    bindTop();
    view.querySelectorAll('.reward').forEach(el => el.onclick = () => {
      const i = +el.dataset.i, it = items[i];
      if (it.card) it.go(ok => { if (ok) { items.splice(i, 1); } draw(); });
      else { it.go(); items.splice(i, 1); audio.gem(); draw(); }
    });
    $('#go').onclick = mapScreen;
  };
  draw();
}

// ---------- 营火 ----------
function restScreen() {
  const heal = Math.floor(R.maxHp * .3);
  view.innerHTML = `${bgHTML()}${topBar()}<div class="panel"><h2>营火</h2><p>篝火噼啪作响，难得的安宁。</p><div class="row">
   <button class="btn" id="rest">休息：回复 ${heal} 生命</button><button class="btn" id="smith" ${R.deck.some(c => !c.up) ? '' : 'disabled'}>锻造：升级一张牌</button></div></div>`;
  bindTop();
  $('#rest').onclick = () => { R.hp = Math.min(R.maxHp, R.hp + heal); audio.holy(); mapScreen(); };
  $('#smith').onclick = () => pickDeck('upgrade', ok => { if (ok) mapScreen(); });
}

// ---------- 宝箱 ----------
function treasureScreen() {
  view.innerHTML = `${bgHTML()}${topBar()}<div class="panel"><h2>宝箱</h2><img src="assets/icons/box.png" style="width:120px;cursor:pointer" id="chest"><p>点击打开</p></div>`;
  bindTop();
  $('#chest').onclick = () => {
    const rl = rollRelic(); const g = rnd(20, 40); gainRelic(rl); R.gold += g;
    view.innerHTML = `${bgHTML()}${topBar()}<div class="panel"><h2>宝箱</h2>${rl ? `<img src="${RELICS[rl].img}" style="width:90px"><p><b>${RELICS[rl].name}</b><br>${RELICS[rl].desc}</p>` : ''}<p>以及 ${g} 金币。</p><button class="btn" id="go">继续前进</button></div>`;
    bindTop(); $('#go').onclick = mapScreen;
  };
}

// ---------- 商店 ----------
function shopScreen() {
  const PR = { c: 50, u: 75, r: 150 }, RP = { c: 150, u: 200, r: 280 };
  const cards = rollCards(5).map(c => ({ c, p: Math.round(PR[CARDS[c.id].rar] * (0.9 + Math.random() * .2)) }));
  const rels = []; for (let k = 0; k < 2; k++) { const id = rollRelic(['c', 'u', 'u', 'r'], true); if (id && !rels.some(x => x.id === id)) rels.push({ id, p: RP[RELICS[id].rar] + rnd(-10, 10) }); }
  let removed = false;
  const draw = () => {
    view.innerHTML = `${bgHTML()}${topBar()}<div class="panel" style="top:53%;width:1000px;padding:14px 26px"><h2 style="margin-bottom:8px">哥布林商人</h2>
     <div class="row" style="flex-wrap:nowrap">${cards.map((x, i) => `<div class="shopitem" data-c="${i}">${x.c ? cardHTML(x.c) : '<div style="width:129px;height:181px"></div>'}<span class="price ${x.p > R.gold ? 'no' : ''}">${x.c ? '● ' + x.p : '已售出'}</span></div>`).join('')}</div>
     <div class="row" style="margin-top:14px">${rels.map((x, i) => `<div class="relicbig" data-r="${i}" title="${x.id ? esc(RELICS[x.id].desc) : ''}">${x.id ? `<img src="${RELICS[x.id].img}">${RELICS[x.id].name}<span class="price ${x.p > R.gold ? 'no' : ''}">● ${x.p}</span>` : '已售出'}</div>`).join('')}
      <div class="relicbig" id="rm"><img src="assets/icons/sk_bmist.png">移除一张牌<span class="price ${R.removeCost > R.gold || removed ? 'no' : ''}">${removed ? '已使用' : '● ' + R.removeCost}</span></div>
      <div style="align-self:center;margin-left:30px"><button class="btn" id="go">离开商店</button></div></div></div>`;
    bindTop();
    view.querySelectorAll('[data-c]').forEach(el => el.onclick = () => { const x = cards[+el.dataset.c]; if (!x.c || x.p > R.gold) return; R.gold -= x.p; R.deck.push(x.c); x.c = null; audio.gem(); draw(); });
    view.querySelectorAll('[data-r]').forEach(el => el.onclick = () => { const x = rels[+el.dataset.r]; if (!x.id || x.p > R.gold) return; R.gold -= x.p; gainRelic(x.id); x.id = null; draw(); });
    $('#rm').onclick = () => { if (removed || R.removeCost > R.gold) return; pickDeck('remove', () => { R.gold -= R.removeCost; R.removeCost += 25; removed = true; draw(); }); };
    $('#go').onclick = mapScreen;
  };
  draw();
}

// ---------- 事件 ----------
function eventScreen() {
  const ev = pickOne(EVENTS);
  const A = {
    heal: n => { R.hp = Math.min(R.maxHp, R.hp + n); }, gold: n => { R.gold += n; }, hurt: n => { R.hp = Math.max(1, R.hp - n); },
    maxHp: n => { R.maxHp += n; R.hp = Math.min(R.hp, R.maxHp); }, relic: () => { const id = rollRelic(); gainRelic(id); return id ? RELICS[id].name : '（空）'; },
    pick: m => setTimeout(() => pickDeck(m, () => draw2()), 50), rareCard: () => setTimeout(() => chooseCard(rollCards(3, 0, true), () => draw2()), 50),
  };
  let result = null;
  const img = ev.img === 'gb' ? 'assets/icons/gb.png' : `assets/icons/${ev.img}.png`;
  const draw2 = () => {
    view.innerHTML = `${bgHTML()}${topBar()}<div class="panel" style="width:620px"><h2>${ev.title}</h2><img src="${img}" style="width:110px;margin-bottom:8px">
     <p>${result || ev.text}</p>${result ? '<button class="btn" id="go">继续前进</button>' : ev.opts.map((o, i) => `<button class="btn opt" data-i="${i}" ${o.ok && !o.ok(R) ? 'disabled' : ''}>${o.t}</button>`).join('')}</div>`;
    bindTop();
    view.querySelectorAll('.opt').forEach(el => el.onclick = () => { result = ev.opts[+el.dataset.i].go(R, A); draw2(); });
    $('#go')?.addEventListener('click', mapScreen);
  };
  draw2();
}

// ---------- 结束 ----------
function endScreen(win) {
  B = null; audio.setMode('menu');
  view.innerHTML = `${bgHTML()}<div class="panel"><h2>${win ? '第一幕通关！' : '你倒下了……'}</h2>
   <p>${win ? `${ENEMIES[R.boss].name}倒下了，翠绿之地恢复了平静。<br>（后续幕数待制作）` : `倒在了翠绿之地第 ${R.floor} 层。`}</p>
   <p>牌组 ${R.deck.length} 张 · 遗物 ${R.relics.length} 个 · 金币 ${R.gold}</p><button class="btn" id="again">回到标题</button></div>`;
  $('#again').onclick = title;
}

// ---------- 调试 ----------
function dbgPanel() {
  if (!DEBUG) return; let d = $('#dbg'); if (!d) { d = document.createElement('div'); d.id = 'dbg'; stage.appendChild(d); }
  const btns = [['秒杀敌人', () => { if (B) { B.en.forEach(e => { if (!e.dead) killE(e); }); render(); checkEnd(); } }], ['+100金', () => { R.gold += 100; B ? render() : mapScreen(); }],
    ['满血', () => { R.hp = R.maxHp; B ? render() : mapScreen(); }], ['+3能量', () => { if (B) { B.p.energy += 3; render(); } }], ['抽5张', () => { if (B) { drawCards(5); render(); } }],
    ['全部遗物', () => { Object.keys(RELICS).forEach(id => { if (!has(id)) gainRelic(id); }); B ? render() : mapScreen(); }],
    ['跳到Boss', () => { R.pos = { r: ROWS - 1, c: R.map[ROWS - 1].findIndex(Boolean) }; R.floor = 15; mapScreen(); }],
    ['商店', () => shopScreen()], ['事件', () => eventScreen()], ['精英', () => battle(pickOne(ENCOUNTERS.elite), 'elite')]];
  d.innerHTML = ''; btns.forEach(([t, f]) => { const b = document.createElement('button'); b.textContent = t; b.onclick = f; d.appendChild(b); });
}

title();
dbgPanel();
