// 异世界幸存者 · 卡牌篇 —— 主逻辑（玩法照搬杀戮尖塔第一幕）
import { CARDS, STARTERS, RELICS, POTIONS, STATUS, ENEMIES, ENCOUNTERS, EVENTS } from './data.js?v=mob11042125';
import { createAudio } from './audio.js?v=mob11042125';
import { t, tr, getLanguage, setLanguage, onLanguageChange, watch, missing } from './i18n.js?v=mob11042125';

const $ = s => document.querySelector(s);
const view = $('#view'), fxl = $('#fx'), stage = $('#stage');
watch(stage); window.__i18nMissing = missing;
let SCREEN = 'title';
const TOUCH = matchMedia('(hover: none), (pointer: coarse)').matches; document.documentElement.classList.toggle('touch', TOUCH);
/* 卡牌说明放不下时自动缩小字号（最小 8px） */
const fitCard = c => { const sp = c.querySelector('.cdesc span'), box = c.querySelector('.cdesc'), nm = c.querySelector('.cname'); if (box && sp) { let f = 12; sp.style.fontSize = ''; while (box.scrollHeight > box.clientHeight + 1 && f > 8) { f -= .5; sp.style.fontSize = f + 'px'; } } if (nm) { let f = 14; nm.style.fontSize = ''; while (nm.scrollWidth > nm.clientWidth + 1 && f > 9) { f -= .5; nm.style.fontSize = f + 'px'; } } };
new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(n => { if (n.nodeType !== 1) return; if (n.matches?.('.card')) fitCard(n); n.querySelectorAll?.('.card').forEach(fitCard); }); }).observe(stage, { childList: true, subtree: true });
addEventListener('error', e => { try { tip(tr('出错了，可以在设置里保存并退出后重新进入') + ' (' + (e.message || '').slice(0, 60) + ')'); } catch (_) {} });
const LANGS = [['zh', '中文'], ['en', 'English'], ['ja', '日本語']];
const langBar = () => `<div class="langbar" data-noi18n>${LANGS.map(([k, n]) => `<b class="${getLanguage() === k ? 'on' : ''}" data-lang="${k}">${n}</b>`).join('')}</div>`;
const bindLang = after => view.querySelectorAll('[data-lang]').forEach(el => el.onclick = () => { setLanguage(el.dataset.lang); after && after(); });
const applyStatic = () => { document.title = tr('通往顶端') + ' The Way Up: Otherworld Deck'; const r = document.querySelector('#rot div:nth-child(2)'); if (r) r.textContent = getLanguage() === 'zh' ? '请把手机横过来玩' : tr('请把手机横过来玩'); const r3 = document.querySelector('#rot div:nth-child(3)'); if (r3) r3.style.display = getLanguage() === 'en' ? 'none' : ''; document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : getLanguage(); };
onLanguageChange(applyStatic); applyStatic();
const DEBUG = /[?&]debug/.test(location.search) || location.hash === '#debug';
const audio = createAudio();
let SET = { shake: 1, fast: 0, kwtip: 1 }; try { Object.assign(SET, JSON.parse(localStorage.getItem('tw_set') || '{}')); } catch (e) {}
const saveSet = () => { try { localStorage.setItem('tw_set', JSON.stringify(SET)); } catch (e) {} };
const sleep = ms => new Promise(r => setTimeout(r, SET.fast ? ms / 2 : ms));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pickOne = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ---------- 缩放 ----------
let SW = 1280;
function fit() { const ar = innerWidth / innerHeight; SW = Math.round(Math.max(1280, Math.min(1720, 720 * ar))); const s = Math.min(innerWidth / SW, innerHeight / 720);
  stage.style.width = SW + 'px'; document.documentElement.style.setProperty('--sw', SW + 'px'); stage.style.transform = `scale(${s})`; stage.style.left = (innerWidth - SW * s) / 2 + 'px'; stage.style.top = (innerHeight - 720 * s) / 2 + 'px'; stage._s = s; }
addEventListener('resize', fit); addEventListener('orientationchange', () => setTimeout(fit, 250)); fit();
stage.addEventListener('scroll', () => { stage.scrollTop = 0; stage.scrollLeft = 0; });

// ---------- 局 ----------
let TIPS = true; try { TIPS = localStorage.getItem('tipsOff') !== '1'; } catch (e) {}
const KW = { '格挡': '抵挡受到的伤害。你的回合开始时清零。', '易伤': '受到的攻击伤害 +50%，每回合减 1 层。', '虚弱': '造成的攻击伤害 -25%，每回合减 1 层。',
  '力量': '每次攻击伤害增加等同于力量的数值。', '敏捷': '每次获得格挡时额外增加等同于敏捷的数值。', '消耗': '打出后移出本场战斗，不进弃牌堆。',
  '荆棘': '被攻击时，对攻击者造成等同于层数的伤害。', '能量': '出牌要花能量，每回合开始恢复为 3 点。',
  '光弹': '林拓的掌机子弹。回合结束时自动射出，每发对随机敌人造成 3 点伤害，然后清零。最多 10 发。', '共鸣': '叠在敌人身上，到 10 层自动爆音。', '中毒': '敌人行动前受到等同层数的伤害（无视格挡），然后减 1 层。', '炼金瓶': '魔女的 0 费一次性牌，由其他牌生成，用完消耗。', '药水': '所有角色通用的一次性道具，最多带 3 瓶，战斗中点左上角的药水就能用，不花能量。', '结界': '叠在自己身上，每回合开始按层数获得格挡，整场战斗保留。', '爆音': '共鸣满 10 层时，对该敌人造成 24 点伤害，之后保留 3 层（多出的层数也保留）。' };
const kwify = s => { if (!TIPS) return s; const names = Object.keys(KW).map(k => [tr(k), tr(KW[k])]).sort((a, b) => b[0].length - a[0].length); const re = new RegExp(names.map(n => n[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g'); const m2 = Object.fromEntries(names); return s.replace(re, m => `<span class="kw" title="${m2[m]}">${m}</span>`); };
let R = null; // 当前一局
let uidN = 1;
const mkCard = (id, up = 0) => ({ id, up, uid: uidN++ });
function newRun(char = 'hero', asc = 0) {
  R = { char, hp: 80, maxHp: 80, gold: 120, potions: [], asc, deck: STARTERS[char].map(id => mkCard(id)), relics: [{ heroine: 'phones', miko: 'suzu', witch: 'cauldron' }[char] || 'gameboy'], map: genMap(), pos: null,
    floor: 0, fights: 0, removeCost: 75, boss: pickOne(ENCOUNTERS.boss)[0], feather: 0 };
  if (asc >= 4) { R.maxHp -= 8; R.hp = R.maxHp; }
}
const has = id => R.relics.includes(id);
const snap = () => { const { snap: _, ...o } = R; R.snap = JSON.stringify(o); }; /* 进入节点前的快照：中途退出后从这里恢复 */
const mine = d => !d.ch || d.ch === (R.char || 'hero');
function save() { try { localStorage.setItem('theway_run_v2', JSON.stringify(R)); } catch (e) {} }
function clearSave() { try { localStorage.removeItem('theway_run_v2'); } catch (e) {} }
function load() { try { const s = JSON.parse(localStorage.getItem('theway_run_v2')); if (s) { if (!CHARS[s.char] || !Array.isArray(s.deck) || !Array.isArray(s.map)) return null; s.potions = (s.potions || []).filter(p => POTIONS[p]); s.deck = s.deck.filter(c => CARDS[c.id]); s.relics = (s.relics || []).filter(r => RELICS[r]); uidN = 1 + Math.max(0, ...s.deck.map(c => c.uid)); } return s; } catch (e) { return null; } }

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
  <div class="pots">${[0, 1, 2].map(i => { const id = (R.potions || [])[i]; return id ? `<img class="pot ${B && B.potSel === i ? 'sel' : ''}" data-pot="${i}" src="${POTIONS[id].img}" title="${esc(POTIONS[id].name + '：' + POTIONS[id].desc)}">` : '<i class="pot empty"></i>'; }).join('')}</div>
  <div class="relics">${R.relics.map(id => `<img src="${RELICS[id].img}" title="${esc(RELICS[id].name + '：' + RELICS[id].desc)}">`).join('')}</div>
  <span class="sp"></span><button class="tb" id="tbdeck">牌组 (${R.deck.length})</button><button class="tb" id="tbtips" title="开关规则提示">提示：${TIPS ? '开' : '关'}</button><button class="tb" id="tbfs" title="全屏">⛶</button><button class="tb" id="tbmute">${audio.muted ? '🔇' : '🔊'}</button><button class="tb" id="tbset" title="设置">⚙</button></div>`;
}
function bindTop() {
  $('#tbdeck')?.addEventListener('click', () => showPile('牌组', R.deck));
  $('#tbset')?.addEventListener('click', () => settings(true));
  view.querySelectorAll('[data-pot]').forEach(el => el.onclick = () => potionClick(+el.dataset.pot));
  $('#tbtips')?.addEventListener('click', () => { TIPS = !TIPS; try { localStorage.setItem('tipsOff', TIPS ? '0' : '1'); } catch (e) {} if (B && !B.over) render(); else { const b = $('#tbtips'); if (b) b.textContent = tr(TIPS ? '提示：开' : '提示：关'); } });
  $('#tbfs')?.addEventListener('click', () => { const d = document.documentElement; (document.fullscreenElement ? document.exitFullscreen() : (d.requestFullscreen || d.webkitRequestFullscreen).call(d)).then?.(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch?.(() => {}); });
  $('#tbmute')?.addEventListener('click', () => { dispatchEvent(new KeyboardEvent('keydown', { key: 'm' })); setTimeout(() => { const b = $('#tbmute'); if (b) b.textContent = audio.muted ? '🔇' : '🔊'; }, 30); });
}
const BGS = ['battle_forest', 'battle_birch', 'battle_castle'];
const bgHTML = (dim, img = 'battle_forest') => `<div class="bg ${dim ? 'dim' : ''}"><img class="full px" src="assets/bg/${img}.jpg"><div class="light"></div><div class="vig"></div></div>`;
const foreHTML = () => `<div id="fore"><img src="assets/fg/bush.png" style="left:-90px;bottom:-70px;width:400px"><img src="assets/fg/fern.png" style="right:-80px;bottom:-60px;width:360px"></div>`;

// ---------- 卡牌显示 ----------
const TYPE = { atk: '攻击', skill: '技能', power: '能力' };
function cardCost(c) { const d = CARDS[c.id]; if (c.free) return 0; const k = d.cost[c.up ? 1 : 0]; return c.disc && k !== 'X' ? Math.max(0, k - 1) : k; }
function cardHTML(c, extra = '', energy = 99) {
  const d = CARDS[c.id], cost = cardCost(c), no = cost !== 'X' && cost > energy;
  const rr = d.rar === 'start' || d.rar === 'gen' ? 'c' : d.rar;
  return `<div class="card t-${d.type} r-${d.rar} ${c.up ? 'up' : ''} ${extra}" data-uid="${c.uid}" data-cid="${c.id}" data-up="${c.up ? 1 : 0}">
   <div class="art"><img src="${d.img}"></div><div class="cdesc" data-noi18n><span>${kwify(d.desc(c.up))}</span></div><img class="frame" src="assets/ui2/frame_${d.type}_${rr}.png">
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
    if (mode === 'transform') { const pool = Object.values(CARDS).filter(d => d.rar !== 'start' && d.rar !== 'gen' && mine(d) && d.id !== c.id); R.deck[i] = mkCard(pickOne(pool).id); }
    audio.level(); o.remove(); done && done(true);
  });
}
// 卡牌奖励池
function rollCards(n, rareBonus = 0, onlyRare = false) {
  const out = [], L = lockedSet(), ok = d => mine(d) && !L.has(d.id) && !out.includes(d.id) && d.rar !== 'start' && d.rar !== 'gen';
  for (let tries = 0; out.length < n && tries < 60; tries++) {
    const x = Math.random(); const rar = onlyRare ? 'r' : x < .06 + rareBonus ? 'r' : x < .4 + rareBonus ? 'u' : 'c';
    let pool = Object.values(CARDS).filter(d => d.rar === rar && ok(d));
    if (!pool.length && onlyRare) pool = Object.values(CARDS).filter(d => d.rar === 'u' && ok(d)); /* 稀有牌不够时用罕见牌补 */
    if (!pool.length) pool = Object.values(CARDS).filter(ok);
    if (!pool.length) break;
    out.push(pickOne(pool).id);
  }
  return out.map(id => mkCard(id));
}
function chooseCard(cards, done, title = '选择一张牌加入牌组') {
  const o = overlay(`<h2>${title}</h2><div class="row">${cards.map(c => cardHTML(c)).join('')}</div><button class="btn">跳过</button>`);
  o.querySelector('.btn').onclick = () => { o.remove(); done(false); };
  o.querySelectorAll('.card').forEach(el => el.onclick = () => { R.deck.push(cards.find(c => c.uid == el.dataset.uid)); audio.level(); o.remove(); done(true); });
}
function rollRelic(rars = ['c', 'c', 'c', 'u', 'u', 'r'], crown = false) {
  for (let k = 0; k < 30; k++) { const r = pickOne(rars); const pool = Object.values(RELICS).filter(x => x.rar === r && mine(x) && !lockedSet().has(x.id) && !has(x.id) && (crown || x.id !== 'crown')); if (pool.length) return pickOne(pool).id; }
  const pool = Object.values(RELICS).filter(x => x.rar !== 'start' && mine(x) && !lockedSet().has(x.id) && !has(x.id) && (crown || x.id !== 'crown')); return pool.length ? pickOne(pool).id : null;
}
function gainRelic(id) { if (!id) return; R.relics.push(id); if (id === 'herb') { R.maxHp += 10; R.hp += 10; } if (id === 'crown') { R.maxHp -= 10; R.hp = Math.min(R.hp, R.maxHp); } audio.level(); }

// ---------- 标题 ----------
// ---------- 玩家名字 / 口令（存在浏览器里） ----------
const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k) || ''; localStorage.setItem(k, v); } catch (e) { return ''; } };
// ---------- 局外成长：进阶难度 + 解锁 ----------
const ASC = ['标准难度', '精英血量 +15%', '普通怪血量 +10%', '敌人伤害 +10%', '开局最大生命 -8', '营火只回复 20% 生命', 'Boss 血量 +15%', '战斗金币 -30%', '敌人伤害再 +10%'];
const UNLOCKS = [
  { xp: 300, cards: ['dual', 'concert'], relics: [] },
  { xp: 800, cards: ['shinboku', 'sage'], relics: ['mic'] },
  { xp: 1500, cards: ['screen', 'distort', 'deadly'], relics: ['pad'] },
  { xp: 2500, cards: ['thunder'], relics: ['crown', 'feather'] },
];
const metaGet = () => { try { return Object.assign({ xp: 0, asc: {} }, JSON.parse(localStorage.getItem('tw_meta') || '{}')); } catch (e) { return { xp: 0, asc: {} }; } };
const metaSet = m => { try { localStorage.setItem('tw_meta', JSON.stringify(m)); } catch (e) {} };
const lockedSet = () => { const xp = metaGet().xp, s = new Set(); UNLOCKS.forEach(u => { if (xp < u.xp) [...u.cards, ...u.relics].forEach(x => s.add(x)); }); if (DEBUG) s.clear(); return s; };
const A_ = n => (R && R.asc || 0) >= n;
const ONLINE = !/githack|localhost|127\.0\.0\.1|^file/.test(location.href); // 试玩链接上没有后台
const CHARINFO = {
  miko: { diff: 1, tip: '结界越叠越厚，每回合自动加格挡。防守稳，最适合新手。' },
  hero: { diff: 2, tip: '打牌攒光弹，回合结束自动扫射。光弹越多打得越猛，规则最简单。' },
  witch: { diff: 2, tip: '随机炼金瓶 + 剧毒，慢慢把敌人磨死。每局手感都不一样。' },
  heroine: { diff: 3, tip: '给敌人叠共鸣，满 10 层爆音。要算层数，玩好了伤害最高。' },
};
const ORDER = ['miko', 'hero', 'witch', 'heroine'];
function title() {
  audio.setMode('menu'); R = null; B = null;
  view.innerHTML = `<div class="bg" style="background:url(assets/bg/title.jpg) center/cover,url(assets/bg/battle_castle.jpg) center/cover"></div><div class="tshade"></div>
   <div class="tlogo"><h1>通往顶端</h1><p class="en">THE WAY UP</p><p class="en2">OTHERWORLD DECK</p></div>
   <div class="tbox"><input id="nm" class="inp" maxlength="8" placeholder="输入你的名字（可不填）" value="${esc(LS('tw_name'))}">
    <input id="pin" class="inp sm" maxlength="6" inputmode="numeric" placeholder="口令（可选，4～6 位数字）" value="${esc(LS('tw_pin'))}">
    <button class="btn big" id="enter">进入游戏</button><p class="tkeys">设了口令，别人就不能用你的名字上排行榜</p>${langBar()}</div>`;
  bindLang(title); SCREEN = 'title';
  const go = () => { const n = $('#nm').value.trim() || ('Guest' + Math.floor(100 + Math.random() * 900)); LS('tw_name', n); LS('tw_pin', $('#pin').value.trim()); mainMenu(); };
  $('#enter').onclick = go; $('#nm').onkeydown = $('#pin').onkeydown = e => { if (e.key === 'Enter') go(); };
}
function mainMenu() {
  audio.setMode('menu'); R = null; B = null;
  const sv = load(), nm = LS('tw_name');
  view.innerHTML = `<div class="bg" style="background:url(assets/bg/title.jpg) center/cover,url(assets/bg/battle_castle.jpg) center/cover"></div><div class="tshade"></div>
   <div class="tlogo sm"><h1>通往顶端</h1><p class="en">THE WAY UP</p></div>
   <div class="mmenu">${nm ? `<p class="who">冒险者：<b data-noi18n>${esc(nm)}</b></p>` : ''}
    ${sv ? `<button class="btn mm" id="cont">继续冒险<small>${CHARS[sv.char || 'hero'].name} · 第 ${sv.floor} 层</small></button>` : ''}
    <button class="btn mm" id="start">新的冒险</button><button class="btn mm" id="book">图鉴</button>
    <button class="btn mm" id="rank">排行榜</button><button class="btn mm" id="set">设置</button>
    <button class="btn mm sm2" id="back">返回标题</button>${langBar()}</div>`;
  bindLang(mainMenu); SCREEN = 'menu';
  $('#start').onclick = () => askName(() => { if (!sv) return pickChar();
    const y = overlay(`<h2>开始新的冒险？</h2><p>当前存档（${CHARS[sv.char || 'hero'].name} · 第 ${sv.floor} 层）会被放弃。</p><div class="row"><button class="btn red" id="y1">放弃旧档，重新开始</button><button class="btn" id="y0">取消</button></div>`);
    y.querySelector('#y0').onclick = () => y.remove(); y.querySelector('#y1').onclick = () => { y.remove(); clearSave(); pickChar(); }; });
  $('#cont')?.addEventListener('click', () => { R = sv; if (R.pending && R.snap) { try { const o = JSON.parse(R.snap); R = Object.assign(o, { snap: R.snap }); } catch (e) {} } if (R.pending) enterNode(R.pending); else mapScreen(); });
  $('#book').onclick = () => book();
  $('#rank').onclick = rankBoard; $('#set').onclick = () => settings(false); $('#back').onclick = title;
}
function askName(done) {
  if (LS('tw_name')) return done();
  const o = overlay(`<h2>你的名字</h2><p>用于排行榜，之后可以在设置里修改。</p>
   <input id="nm2" class="inp" maxlength="8" placeholder="输入你的名字"><input id="pin2" class="inp sm" maxlength="6" inputmode="numeric" placeholder="口令（可选，4～6 位数字）">
   <p class="tkeys">设了口令，别人就不能用你的名字上榜</p><div class="row"><button class="btn" id="ok2">确定</button><button class="btn" id="cx2">取消</button></div>`);
  o.querySelector('#cx2').onclick = () => o.remove();
  o.querySelector('#ok2').onclick = () => { const n = o.querySelector('#nm2').value.trim(); if (!n) { tip('先输入名字'); return; } LS('tw_name', n); LS('tw_pin', o.querySelector('#pin2').value.trim()); o.remove(); done(); };
  o.querySelector('#nm2').focus();
}
function settings(inRun) {
  const V = audio.vol, sl = (k, n) => `<label class="sl"><span>${n}</span><input type="range" min="0" max="100" value="${Math.round(V[k] * 100)}" data-v="${k}"><i>${Math.round(V[k] * 100)}%</i></label>`;
  const ck = (k, n, on) => `<label class="ck"><input type="checkbox" data-s="${k}" ${on ? 'checked' : ''}><span>${n}</span></label>`;
  const o = overlay(`<div class="setw"><div class="tabs"><b class="on" data-t="g">游戏设置</b><b data-t="k">操作说明</b></div>
   <div class="tp" data-p="g"><div class="sgrid">
    <div class="sbox"><h3>声音</h3>${sl('m', '主音量')}${sl('mu', '音乐音量')}${sl('s', '音效音量')}</div>
    <div class="sbox"><h3>偏好</h3>${ck('tips', '显示规则提示', TIPS)}${ck('shake', '屏幕震动', SET.shake)}${ck('fast', '加速模式（动画快一倍）', SET.fast)}${ck('kwtip', '卡牌关键词说明框', SET.kwtip)}</div>
    <div class="sbox"><h3>玩家</h3><label class="sl"><span>名字</span><input id="snm" class="inp sm" maxlength="8" value="${esc(LS('tw_name'))}"></label>
     <label class="sl"><span>口令</span><input id="spin" class="inp sm" maxlength="6" inputmode="numeric" value="${esc(LS('tw_pin'))}" placeholder="可不填"></label></div>
    <div class="sbox"><h3>语言 / Language</h3>${langBar()}</div>
    <div class="sbox"><h3>其他</h3><button class="btn" id="sfs">全屏 / 退出全屏</button><button class="btn" id="stut">重看新手教程</button>${inRun ? `<button class="btn red" id="sab">放弃这局</button><button class="btn" id="ssq">保存并退出</button>${R && R.pending ? '<p class="tkeys">中途退出，继续时从进入这一格之前开始</p>' : ''}` : ''}</div>
   </div></div>
   <div class="tp" data-p="k" style="display:none"><table class="keys">${[['选择第 1～9 张手牌', '1 ～ 9'], ['第 10 张手牌', '0'], ['结束回合', 'E'], ['取消选择', 'Esc'], ['静音', 'M'], ['选择目标', '点击敌人']].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table></div>
   <button class="btn" id="sx">返回</button></div>`);
  o.querySelectorAll('[data-lang]').forEach(el => el.onclick = () => { setLanguage(el.dataset.lang); o.remove(); if (inRun && R) { if (B && !B.over) render(); else if (SCREEN === 'map') mapScreen(); else tip(tr('离开当前界面后完全生效')); } else if (SCREEN === 'menu') mainMenu(); settings(inRun); });
  o.querySelectorAll('.tabs b').forEach(t => t.onclick = () => { o.querySelectorAll('.tabs b').forEach(x => x.classList.toggle('on', x === t)); o.querySelectorAll('.tp').forEach(p => p.style.display = p.dataset.p === t.dataset.t ? '' : 'none'); });
  o.querySelectorAll('[data-v]').forEach(r => r.oninput = () => { audio.setVol(r.dataset.v, r.value / 100); r.nextElementSibling.textContent = r.value + '%'; });
  o.querySelectorAll('[data-s]').forEach(c => c.onchange = () => { const k = c.dataset.s;
    if (k === 'tips') { TIPS = c.checked; try { localStorage.setItem('tipsOff', TIPS ? '0' : '1'); } catch (e) {} } else { SET[k] = c.checked ? 1 : 0; saveSet(); } });
  o.querySelector('#stut').onclick = () => { try { localStorage.removeItem('tutDone'); } catch (e) {} TIPS = true; try { localStorage.setItem('tipsOff', '0'); } catch (e) {} tip(tr('下一场战斗开始时会重新显示教程')); };
  o.querySelector('#sfs').onclick = () => $('#tbfs') ? $('#tbfs').click() : (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());
  const close = () => { LS('tw_name', o.querySelector('#snm').value.trim()); LS('tw_pin', o.querySelector('#spin').value.trim()); o.remove(); };
  o.querySelector('#sx').onclick = () => { close(); if (inRun && B && !B.over) render(); };
  o.querySelector('#sab')?.addEventListener('click', () => { const y = overlay(`<h2>放弃这局？</h2><p>这局会按死亡结算，进度无法恢复。</p><div class="row"><button class="btn red" id="y1">放弃</button><button class="btn" id="y0">再想想</button></div>`);
    y.querySelector('#y0').onclick = () => y.remove(); y.querySelector('#y1').onclick = () => { if (B && (B.busy || B.anim)) { y.remove(); tip(tr('等这一步结算完再退出')); return; } y.remove(); close(); clearSave(); endScreen(false); }; });
  o.querySelector('#ssq')?.addEventListener('click', () => { if (B && (B.busy || B.anim)) { tip(tr('等这一步结算完再退出')); return; } close(); save(); B = null; mainMenu(); });
}
function rankBoard() {
  const o = overlay(`<h2>排行榜</h2><div id="rk" class="rk">读取中……</div><button class="btn" id="rkx">关闭</button>`);
  o.querySelector('#rkx').onclick = () => o.remove();
  const box = o.querySelector('#rk');
  if (!ONLINE) { box.innerHTML = '<p>排行榜要在正式网站上才能用（试玩链接没有后台）。</p>'; return; }
  fetch('/api/scores', { cache: 'no-store' }).then(r => r.json()).then(d => {
    if (!d.ok || !d.list.length) { box.innerHTML = '<p>还没有人上榜，快来当第一名！</p>'; return; }
    const me = LS('tw_name');
    box.innerHTML = `<table><tr><th>#</th><th>名字</th><th>角色</th><th>到达</th><th>击杀</th><th>积分</th></tr>${d.list.map((r, i) => `<tr class="${r.name === me ? 'me' : ''}"><td>${i + 1}</td><td data-noi18n>${esc(r.name)}</td><td><img src="assets/${CHARS[r.char].dir}/portrait.png"></td><td>${r.win ? '<b class="win">通关</b>' : '第 ' + r.floor + ' 层'}</td><td>${r.kills}</td><td><b>${r.score}</b></td></tr>`).join('')}</table>`;
  }).catch(() => { box.innerHTML = '<p>暂时连不上排行榜，稍后再试。</p>'; });
}
function submitScore(win) {
  const name = LS('tw_name'); if (DEBUG || !ONLINE || !name) return Promise.resolve(null);
  return fetch('/api/scores', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, pin: LS('tw_pin'), char: R.char, asc: R.asc || 0, floor: R.floor, kills: R.kills || 0, elites: R.elites || 0, win, hp: Math.max(0, R.hp) }) })
    .then(r => r.json()).catch(() => null);
}

function pickChar() {
  view.innerHTML = `${bgHTML()}<div class="panel csel"><h2>选择角色</h2><div class="row">${ORDER.map(k => { const c = CHARS[k], i = CHARINFO[k];
    return `<div class="reward cc" data-c="${k}"><img src="assets/${c.dir}/portrait.png"><b>${tr(c.name)}</b><span class="cd">${tr(c.desc)}</span>
     <span class="diff">上手难度 <i>${'★'.repeat(i.diff)}${'☆'.repeat(3 - i.diff)}</i> ${['', '简单', '普通', '困难'][i.diff]}</span><span class="ct">${i.tip}</span></div>`; }).join('')}</div>
   <div class="ascbar">进阶难度 <button class="btn" id="am">−</button><b id="av"></b><button class="btn" id="ap">＋</button><span id="ad"></span></div>
   <button class="btn" id="back">返回</button></div>`;
  const M = metaGet(); let asc = 0, cur = 'miko';
  const mx = k => DEBUG ? 8 : Math.min(8, M.asc[k] || 0);
  const show = () => { asc = Math.min(asc, mx(cur)); $('#av').textContent = asc; $('#ad').textContent = asc ? ASC.slice(1, asc + 1).join('，') : `标准难度（用这个角色通关可解锁进阶 1，当前最高 ${mx(cur)}）`; };
  view.querySelectorAll('[data-c]').forEach(el => { el.onmouseenter = () => { cur = el.dataset.c; show(); }; el.onclick = () => { newRun(el.dataset.c, Math.min(asc, mx(el.dataset.c))); save(); mapScreen(); }; });
  $('#am').onclick = () => { asc = Math.max(0, asc - 1); show(); }; $('#ap').onclick = () => { asc = Math.min(mx(cur), asc + 1); if (asc === mx(cur) && asc < 8) tip(`${CHARS[cur].name}：通关进阶 ${asc} 后解锁下一级`); show(); }; show();
  $('#back').onclick = mainMenu;
}
// ---------- 地图 ----------
const NODEICON = Object.fromEntries(['fight', 'elite', 'event', 'rest', 'shop', 'treasure'].map(k => [k, `<img src="assets/ui2/node_${k}.png">`]));
const NODENAME = { fight: '战斗', elite: '精英', event: '未知', rest: '营火', shop: '商店', treasure: '宝箱' };
function available() {
  if (!R.pos) return R.map[0].filter(Boolean);
  if (R.pos.r === ROWS - 1) return ['boss'];
  const cur = R.map[R.pos.r][R.pos.c]; return cur.next.map(c => R.map[R.pos.r + 1][c]);
}
function mapScreen() { SCREEN = 'map';
  audio.setMode('menu'); delete R.pending; delete R.pendEnc; delete R.snap; save();
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
    if (el.classList.contains('boss')) { R.floor++; R.pending = 'boss'; snap(); save(); return enterNode('boss'); }
    const nd = R.map[+el.dataset.r][+el.dataset.c]; R.pos = { r: nd.r, c: nd.c }; (R.path = R.path || []).push(R.pos); R.floor++;
    R.pending = nd.type; snap(); save(); enterNode(nd.type);
  });
  dbgPanel();
}
function enterNode(t) {
  if (t === 'boss') return battle([R.boss], 'boss');
  if (t === 'fight' || t === 'elite') { // 记住这场遭遇，中途退出再进来还是同一批怪
    if (!R.pendEnc) { R.pendEnc = t === 'elite' ? pickOne(ENCOUNTERS.elite) : pickOne(R.fights < 3 ? ENCOUNTERS.easy : ENCOUNTERS.hard); if (t === 'fight') R.fights++; snap(); save(); }
    return battle(R.pendEnc, t);
  }
  if (t === 'rest') return restScreen();
  if (t === 'shop') return shopScreen();
  if (t === 'treasure') return treasureScreen();
  if (t === 'event') return eventScreen();
}

// ---------- 战斗 ----------
let B = null, eid = 1;
function mkEnemy(key) {
  const d = ENEMIES[key], hp = rnd(d.hp[0], d.hp[1]);
  const hm = 1 + (A_(1) && d.elite ? .15 : 0) + (A_(2) && !d.elite && !d.boss ? .1 : 0) + (A_(6) && d.boss ? .15 : 0);
  const hp1 = Math.round(hp * hm);
  const e = { key, d, name: d.name, hp: hp1, max: hp1, dmul: 1 + (A_(3) ? .1 : 0) + (A_(8) ? .1 : 0), block: 0, st: {}, turn: 0, hist: [], id: 'e' + eid++, move: null };
  d.init && d.init(e); return e;
}
const alive = () => B.en.filter(e => !e.dead);
function battle(keys, kind) {
  hst = { n: 'idle', t: performance.now() };
  const bg = kind === 'boss' ? 'battle_castle' : pickOne(BGS);
  B = { kind, bg, en: keys.map(mkEnemy), p: { block: 0, energy: 0, st: {}, noDraw: 0 }, draw: shuffle(R.deck.map(c => ({ ...c }))), hand: [], disc: [], exh: [], turn: 0, atkCnt: 0, sel: -1, busy: false, fx: [], over: false };
  audio.setMode(kind === 'boss' ? 'boss' : kind === 'elite' ? 'elite' : 'battle'); setTimeout(() => B && B.en[0] && gv(B.en[0], 'laugh'), 500); if (kind === 'boss') audio.boss();
  if (has('charm')) B.p.st.str = 1;
  
  if (has('suzu')) B.p.st.kek = 3 + (has('omamori') ? 2 : 0); else if (has('omamori')) B.p.st.kek = 2;
  if (has('phones')) B.en.forEach(e => e.st.res = 4);
  if (has('spikes')) B.p.st.thorns = 3;
  if (has('wardrum')) B.en.forEach(e => e.st.vuln = 1);
  B.en.filter(e => e.key === 'gob_bomb').forEach((e, i) => e.st.fuse = 3 + i); // 多个炸弹兵错开倒计时
  B.en.forEach(e => e.move = e.d.ai(e, BE));
  startTurn(true);
  setTimeout(tutorial, 1300);
  banner(kind === 'boss' ? `Boss · ${ENEMIES[keys[0]].name}` : kind === 'elite' ? '精英战斗' : '战斗开始');
}
const TUT = ['每回合有 3 点<b>能量</b>（左下角的球），出牌要花能量，卡牌左上角的数字就是费用。',
  '敌人头上的图标是它<b>下回合要做的事</b>：剑是攻击，数字是伤害；盾是加格挡。鼠标移上去可以看详细说明。',
  '<b>格挡</b>能挡住伤害，但只挡这一轮，你的回合开始时会清零。血条下面会提示你这回合还会受到多少伤害。',
  '有的攻击牌要选目标：点牌，再点敌人。出完牌，点右边的「结束回合」。',
  '左上角是<b>药水栏</b>（最多 3 瓶）：点一下就用，不花能量；需要目标的药水，点完再点敌人。打完战斗有机会掉药水。<br>所有规则都能在主菜单的“图鉴 → 概念说明”里查到。'];
function tutorial() {
  if (!TIPS || !B) return; let done = false; try { done = localStorage.getItem('tutDone') === '1'; } catch (e) {} if (done) return;
  let i = 0; const o = overlay(''); o.style.background = 'rgba(0,0,0,.55)';
  const step = () => { if (i >= TUT.length) { o.remove(); try { localStorage.setItem('tutDone', '1'); } catch (e) {} return; }
    o.innerHTML = `<div class="panel" style="max-width:560px"><h2>新手提示 ${i + 1}/${TUT.length}</h2><p data-noi18n>${tr(TUT[i])}</p><div class="row"><button class="btn" id="tn">${i < TUT.length - 1 ? '下一条' : '开始战斗'}</button><button class="btn" id="tx" style="filter:grayscale(.6)">关闭提示</button></div></div>`;
    o.querySelector('#tn').onclick = () => { i++; step(); };
    o.querySelector('#tx').onclick = () => { try { localStorage.setItem('tutDone', '1'); } catch (e) {} o.remove(); render(); }; };
  step();
}
function banner(t) { const b = document.createElement('div'); b.id = 'banner'; b.textContent = t; stage.appendChild(b); setTimeout(() => b.remove(), 1200); }

// 伤害计算
function atkVal(src, tgt, base, strMul = 1) {
  let d = (base + (src.st.str || 0) * strMul) * (src.dmul || 1); if (src.st.weak) d *= .75; if (tgt && tgt.st.vuln) d *= 1.5; return Math.max(0, Math.floor(d));
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
  if (!isP && left > 0) { eAct(tgt, 'hurt'); if (tgt.hp > 0) gv(tgt, 'hurt'); }
  if (!isP && tgt.hp <= 0 && !tgt.dead) killE(tgt);
  if (!isP && !tgt.dead && tgt.key === 'gob_wolf' && tgt.hp <= tgt.max / 2) dismount(tgt);
  if (isP) pDeath();
  if (false && isP && R.hp <= 0 && (R.potions || []).includes('fairy')) { R.potions.splice(R.potions.indexOf('fairy'), 1); R.hp = Math.floor(R.maxHp * .3); fx('hero', '复活药水！', 'heal'); }
  if (false && isP && R.hp <= 0) { if (has('feather') && !R.feather) { R.feather = 1; R.hp = Math.floor(R.maxHp * .3); fx('hero', '凤凰重生！', 'heal'); } }
  if (left > 0) { if (isP) { audio.hurt(); heroAct('hurt'); } else audio.hit('mel'); }
  return left;
}
function pDeath() { /* 掉到 0 血时：先复活药水，再凤凰羽 */
  if (R.hp > 0) return;
  if ((R.potions || []).includes('fairy')) { R.potions.splice(R.potions.indexOf('fairy'), 1); R.hp = Math.floor(R.maxHp * .3); fx('hero', '复活药水！', 'heal'); return; }
  if (has('feather') && !R.feather) { R.feather = 1; R.hp = Math.floor(R.maxHp * .3); fx('hero', '凤凰重生！', 'heal'); }
}
function dismount(e) { // 骑狼兵半血落马：变成野狼 + 一只小兵
  e.key = 'wolf'; e.d = ENEMIES.wolf; e.name = ENEMIES.wolf.name; e.max = Math.max(e.hp, ENEMIES.wolf.hp[1]); e.anim = null; e.move = e.d.ai(e, BE);
  const g = mkEnemy('goblin'); g.hp = g.max = 8; g.move = g.d.ai(g, BE); B.en.splice(B.en.indexOf(e) + 1, 0, g);
  fx(e.id, '落马！', 'st');
}
const VSZ = { gob_kid: 1.45, gob_bomb: 1.25, gob_giant: .6, gob_king: .55, gob_hero: .85, gob_paladin: .85, gob_shaman: 1.15 };
function gv(e, k) { if (e.key === 'wolf') { if (k === 'atk' || k === 'die') audio.gob(k === 'die' ? 'howl' : 'growl'); return; } audio.gob(k, VSZ[e.key] || 1); }
function killE(e) { gv(e, 'die'); if (R) R.kills = (R.kills || 0) + 1; eAct(e, 'down'); e.dead = true; e.hp = 0; audio.kill(); if (has('fang')) { healP(3); } }
function boom(t) { // 爆音：伤害后保留 3 层（失真再 +3），多出的层数也保留
  const d = 24 + (B.p.st.dist ? 5 : 0) + (has('mic') ? 6 : 0);
  t.st.res = t.st.res - 10 + 3 + (B.p.st.dist ? 3 : 0);
  fx(t.id, '爆音！', 'st'); hurt(t, d); if (has('metro') && !B.p.metroUsed) { B.p.metroUsed = 1; B.p.energy++; } }
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
  loseHp(n) { R.hp -= n; fx('hero', `-${n}`, 'dmg'); B.hitSet.add('hero'); pDeath(); },
  heal(n) { healP(n); },
  pm() { return B.p.st.sage ? 2 : 1; },
  potion(n, id) { const ps = ['p_fire', 'p_frost', 'p_heal', 'p_poison', 'p_boom']; for (let i = 0; i < n; i++) { const c = mkCard(id || pickOne(ps)); (B.hand.length < 10 ? B.hand : B.disc).push(c); } fx('hero', `药瓶+${n}`, 'st'); },
  poison(t, n) { if (!t || t.dead || n <= 0) return; n += has('toad') ? 1 : 0; addSt(t, 'poison', n); fx(t.id, `中毒+${n}`, 'st'); },
  volley(clear = true) { // 光弹齐射：每发 3 点（+双持 +超频），打随机敌人或全体
    const n = B.p.st.ammo || 0; if (!n) return; const dmg = 3 + (B.p.st.dual || 0) + (B.p.oc || 0);
    for (let i = 0; i < n; i++) { const a = alive(); if (!a.length) break; (B.p.aoe ? a : []).forEach(e => B.fx.push({ who: e.id, cls: 'bul', n: i })); if (B.p.aoe) a.forEach(e => hurt(e, atkVal(B.p, e, dmg), B.p)); else { const e = pickOne(a); B.fx.push({ who: e.id, cls: 'bul', n: i }); hurt(e, atkVal(B.p, e, dmg), B.p); } }
    if (B.p.st.rapid) G.block(B.p.st.rapid * n, true);
    if (clear) { B.shots = (B.shots || 0) + n; if (has('pad')) { B.p.padDraw = Math.floor(B.shots / 4); B.shots %= 4; } delete B.p.st.ammo; }
    audio.slash && audio.slash(); },
  usePotion() { const i = B.hand.findIndex(c => CARDS[c.id].potion); if (i < 0) return false; B.exh.push(B.hand.splice(i, 1)[0]); return true; },
  hit(t, n) { if (t && !t.dead) hurt(t, n, B.p); },
  kek(n) { addSt(B.p, 'kek', n); fx('hero', `结界+${n}`, 'st'); },
  ammo(n) { const a = Math.min(10, (B.p.st.ammo || 0) + n); if (a !== B.p.st.ammo) { B.p.st.ammo = a; fx('hero', `光弹+${n}`, 'st'); } },
  spend(n) { const k = Math.min(n, B.p.st.ammo || 0); if (!k) return 0; addSt(B.p, 'ammo', -k); if (B.p.st.rapid) G.block(B.p.st.rapid * k, true);
    B.shots = (B.shots || 0) + k; if (has('pad')) { while (B.shots >= 4) { B.shots -= 4; drawCards(1); } } return k; },
  fire(t, k, dmg) { if (k) G.attack(t, dmg + (B.p.st.dual || 0), k); },
  fireAll(k, dmg) { if (k) G.attackAll(dmg + (B.p.st.dual || 0), k); },
  fireRandom(k, dmg) { if (k) G.attackRandom(dmg + (B.p.st.dual || 0), k); },
  res(t, n) { if (!t || t.dead || n <= 0) return; addSt(t, 'res', n); fx(t.id, `共鸣+${n}`, 'st'); for (let k = 0; k < 5 && !t.dead && t.st.res >= 10; k++) boom(t); },
  resAll(n) { alive().forEach(e => G.res(e, n)); },
  resRandom(n) { const a = alive(); if (a.length) G.res(pickOne(a), n); },
  resTotal() { return alive().reduce((s, e) => s + (e.st.res || 0), 0); },
  eachEnemy(f) { alive().forEach(f); },
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
  summon(key, hp) { if (alive().length >= 5) return; const e = mkEnemy(key); if (hp) e.hp = e.max = hp; e.move = e.d.ai(e, BE); B.en.unshift(e); },
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
  B.p.pot = 0;
  if (first && has('cauldron')) G.potion(1);
  if (B.p.st.satchel) G.potion(B.p.st.satchel);
  if (B.p.st.plague) alive().forEach(e => G.poison(e, B.p.st.plague));
  if (B.p.st.kagura) G.kek(B.p.st.kagura);
  if (B.p.st.kek) G.block(B.p.st.kek * (B.p.st.shinboku ? 2 : 1), true);
  if (has('hamaya') && (B.p.st.kek || 0) >= 4) drawCards(1);
  B.p.oc = 0; B.p.aoe = 0; B.p.metroUsed = 0; B.p.cplays = 0; if (B.p.st.gen) G.ammo(B.p.st.gen); if (has('spare')) G.ammo(1); if (B.p.padDraw) { drawCards(B.p.padDraw); B.p.padDraw = 0; } if (has('gameboy')) G.ammo(1); if (!first && has('phones')) G.resAll(1);
  if (B.p.st.lowf) G.resAll(B.p.st.lowf);
  if (first && has('anchor')) B.p.block += 10;
  drawCards(5 + (first && has('scroll') ? 2 : 0));
  if (first && has('dice')) { const cs = B.hand.filter(c => typeof cardCost(c) === 'number' && cardCost(c) >= 1); if (cs.length) pickOne(cs).disc = 1; }
  B.sel = -1; B.busy = false; render();
}
async function playCard(i, tgt) {
  if (!B || B.busy || B.over || B.anim) return; const b0 = B;
  const c = B.hand[i], d = CARDS[c.id]; let cost = cardCost(c);
  if (cost === 'X') cost = B.p.energy; if (cost > B.p.energy) { tip('能量不足'); return; }
  if (d.tgt === 'one' && !tgt) { const a = alive(); if (a.length === 1) tgt = a[0]; else { B.sel = B.sel === i ? -1 : i; render(); return; } }
  B.hitSet = new Set();
  const el = view.querySelector(`#hand .card[data-i="${i}"]`);
  B.p.energy -= cost; G.x = cost; B.hand.splice(i, 1); B.sel = -1; B.anim = true;
  if (el) flyCard(el, d.type); render(); await sleep(260);
  if (B !== b0) return; B.anim = false; B.hitSet = new Set();
  try { d.play(G, c.up, tgt, c); } catch (err) { console.error(err); tip(tr('这张牌出错了，已跳过')); }
  if (d.type === 'atk') { B.atkCnt++; if (has('quiver') && B.atkCnt % 3 === 0) for (const e of alive()) hurt(e, 5); heroAct('shoot'); }
  if (d.potion) { B.p.pot = (B.p.pot || 0) + 1; if (has('hat')) G.block(2, true); }
  if (B.p.st.concert && (B.p.cplays = (B.p.cplays || 0) + 1) <= 4) G.resAll(B.p.st.concert);
  if (d.type === 'skill') alive().forEach(e => { if (e.st.enrage) BE.addSt(e, 'str', e.st.enrage); });
  if (d.type === 'power') {} else if (d.exhaust) B.exh.push(c); else B.disc.push(c);
  pDeath();
  render(); await checkEnd();
}
function flyCard(el, type) {
  const sc = stage._s || 1, sr = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
  const cl = el.cloneNode(true); cl.removeAttribute('data-i');
  cl.style.cssText = `position:absolute;left:${(r.left - sr.left) / sc}px;top:${(r.top - sr.top) / sc}px;z-index:80;transform:none;margin:0`;
  fxl.appendChild(cl); cl.getBoundingClientRect();
  cl.style.transition = 'left .2s ease-out,top .2s ease-out,transform .2s ease-out';
  cl.style.left = (SW / 2 - 75) + 'px'; cl.style.top = '170px'; cl.style.transform = 'scale(1.3)';
  setTimeout(() => { cl.style.transition = 'all .28s ease-in'; cl.style.opacity = '0'; cl.style.transform = type === 'power' ? 'scale(1.8)' : 'translate(480px,330px) scale(.3) rotate(25deg)'; }, 360);
  setTimeout(() => cl.remove(), 700);
}
let heroAnimCls = '';
function eAct(e, n) { if (ENEMIES[e.key].hd) e.anim = { n, t: performance.now() }; }
function eFrame(e) {
  const k = ENEMIES[e.key].art || e.key, now = performance.now(), a = e.anim, dt = a ? now - a.t : 1e9;
  if (e.dead) return `assets/enemies2/${k}/${(a && a.n === 'down' && dt < 260) ? 'down0' : 'down1'}.png`;
  if (a && a.n === 'atk' && dt < 420) return `assets/enemies2/${k}/${dt < 160 ? 'atk0' : 'atk1'}.png`;
  if (a && a.n === 'hurt' && dt < 320) return `assets/enemies2/${k}/hurt0.png`;
  return `assets/enemies2/${k}/idle${Math.floor(now / 480) % 2}.png`;
}
const CHARS = { hero: { dir: 'hero2', name: '穿越者 · 林拓', h: 241, desc: '掌机 · 光弹' }, witch: { dir: 'witch2', name: '魔女 · 莉泽', h: 235, desc: '炼金瓶 · 剧毒' }, miko: { dir: 'miko2', name: '巫女 · 千早', h: 257, desc: '和弓 · 结界' }, heroine: { dir: 'heroine2', name: '穿越者 · 苏音', h: 251, desc: '耳机 · 音波', idle: [0, 3], idleMs: 520 } };
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
  if (!B || B.busy || B.over || B.anim) return; const b0 = B; B.busy = true; B.sel = -1; B.hitSet = new Set();
  if (B.p.st.ammo) { G.volley(true); render(); await sleep(350); if (B !== b0 || await checkEnd()) return; }
  B.disc.push(...B.hand); B.hand = [];
  if (B.p.st.metal) G.block(B.p.st.metal, true);
  if (B.p.st.regen && (B.p.regenN = (B.p.regenN || 0) + 1) <= 3) healP(B.p.st.regen);
  render(); await sleep(300); if (B !== b0) return;
  /* 敌人回合：本回合敌人新加给你的虚弱/易伤，不在这回合末扣层（让它们覆盖你的下一个回合） */
  const pre = { vuln: B.p.st.vuln || 0, weak: B.p.st.weak || 0 };
  for (const e of alive()) e.block = 0;
  render();
  for (const e of [...B.en]) {
    if (B !== b0) return;
    if (e.dead || B.over) continue;
    B.hitSet = new Set();
    if (e.st.aegis) addSt(e, 'aegis', -1); /* 圣盾挡住玩家的一个回合，轮到它行动时才消失 */
    if (e.st.poison && !e.st.aegis) { const pz = e.st.poison; e.hp -= pz; fx(e.id, `-${pz}`, 'dmg'); B.hitSet.add(e.id); addSt(e, 'poison', -1); if (e.hp <= 0) { killE(e); render(); await sleep(300); if (await checkEnd()) return; continue; } }
    const mv = e.d.moves[e.move]; B.lunge = mv.d != null && mv.i.startsWith('atk') && mv.d > 0 ? e.id : null;
    if (mv.d) { eAct(e, 'atk'); gv(e, 'atk'); } else if (/buff|summon/.test(mv.i)) gv(e, 'buff');
    if (mv.d) for (let k = 0; k < (mv.x || 1); k++) { hurt(B.p, atkVal(e, B.p, mv.d), e); if (e.dead) break; }
    if (mv.f && !e.dead) mv.f(e, BE);
    e.hist.push(e.move); e.d.after && e.d.after(e);
    render(); await sleep(mv.d ? 520 : 380); if (B !== b0) return;
    if (R.hp <= 0) return checkEnd();
    if (await checkEnd()) return;
  }
  B.lunge = null; B.hitSet = new Set();
  for (const k of ['vuln', 'weak']) if (pre[k] && B.p.st[k]) addSt(B.p, k, -1);
  for (const e of alive()) {
    if (e.st.ritual) addSt(e, 'str', e.st.ritual);
    if (e.st.heal) BE.healE(e, e.st.heal);
    for (const k of ['vuln', 'weak']) if (e.st[k]) addSt(e, k, -1);
    e.turn++; e.move = e.d.ai(e, BE);
  }
  startTurn(false);
}
async function checkEnd() {
  if (!B || B.over) return true; const b0 = B;
  if (R.hp <= 0) { B.over = true; heroAct('down'); render(); await sleep(1400); clearSave(); return endScreen(false); }
  if (!alive().length) {
    B.over = true; render(); await sleep(600); if (B !== b0) return true;
    if (has('gameboy') || has('phones') || has('suzu') || has('cauldron')) R.hp = Math.min(R.maxHp, R.hp + 6);
    if (B.kind === 'elite') R.elites = (R.elites || 0) + 1;
    if (B.kind === 'boss') { clearSave(); return endScreen(true); }
    delete R.pending; delete R.pendEnc; delete R.snap; save(); /* 打赢后不能刷新重打 */
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
const stsLabel = (k, n, st) => k === 'res' ? `共鸣${n}/10${n >= 9 ? '⚠' : ''}` : k === 'kek' ? `结界${n}（下回合+${n * (st.shinboku ? 2 : 1)}挡）` : k === 'poison' ? `中毒${n}（下回合-${n}）` : k === 'ammo' ? `光弹${n}（回合末${n}发）` : STATUS[k][0] + n;
const stsHTML = st => `<div class="sts">${Object.entries(st).filter(([k, n]) => n && STATUS[k]).map(([k, n]) => `<b style="border-color:${STATUS[k][2]};color:${STATUS[k][2]}" title="${esc(STATUS[k][0] + '：' + STATUS[k][1])}">${stsLabel(k, n, st)}</b>`).join('')}</div>`;
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
      <div class="sprw" ${ENEMIES[e.key].hdw ? `style="width:${ENEMIES[e.key].hdw}px"` : ''}>${hd ? `<img class="spr" decoding="async" data-eid="${e.id}" src="${eFrame(e)}" style="height:${hd}px${ENEMIES[e.key].tint ? ';filter:' + ENEMIES[e.key].tint : ''}">` : `<img class="spr px" data-k="${e.key}" src="assets/enemies/${e.key}/${img}.png" style="zoom:${h}">`}<i class="shd"></i></div>
      ${barHTML(e.hp, e.max, e.block)}${stsHTML(e.st)}<div class="uname">${e.d.name}</div></div>`;
  }).join('');
  const HZ = TOUCH ? 1.45 : 1, energy = B.p.energy, n = B.hand.length, W = TOUCH ? (SW - 560) / HZ : SW - 300, cw = 150, gap = Math.min(cw + 6, (W - cw) / Math.max(1, n - 1));
  const x0 = TOUCH ? (SW / HZ - (gap * (n - 1) + cw)) / 2 : (W - (gap * (n - 1) + cw)) / 2;
  const hand = B.hand.map((c, i) => {
    const mid = (n - 1) / 2, rot = (i - mid) * 3, dy = Math.abs(i - mid) * Math.abs(i - mid) * 2.2, sel = B.sel === i;
    const cost = cardCost(c), off = cost !== 'X' && cost > energy;
    return cardHTML(c, `${sel ? 'sel' : ''} ${off ? 'off' : ''}`, energy).replace('class="card', `data-i="${i}" style="left:${x0 + i * gap}px;transform:translateY(${sel ? -100 : dy}px) rotate(${sel ? 0 : rot}deg);z-index:${i + 1}" class="card`);
  }).join('');
  view.innerHTML = `${bgHTML(true, B.bg)}${topBar()}
   <div id="hero" class="unit ${hs.has('hero') ? 'hit' : ''} ${heroAnimCls}" data-id="hero"><div class="intent"></div><div class="sprw"><img class="spr" decoding="async" src="${heroFrame()}" style="height:${CHARS[R.char || 'hero'].h}px"><i class="shd" style="width:150px"></i></div>${barHTML(R.hp, R.maxHp, B.p.block, 1)}${stsHTML(B.p.st)}<div class="uname">${CHARS[R.char || 'hero'].name}</div></div>
   <div id="enemies">${enemies}</div>${foreHTML()}
   <div id="energy" class="${energy ? '' : 'empty'}">${energy}/${Math.max(energy, 3 + (has('crown') ? 1 : 0))}</div>
   <button class="btn" id="endturn" ${B.busy ? 'disabled' : ''}>${B.busy ? '敌人回合' : '结束回合 (E)'}</button>
   <div class="pile" id="drawp"><b>${B.draw.length}</b>抽牌堆</div><div class="pile" id="discp"><b>${B.disc.length}</b>弃牌堆</div><div class="pile" id="exhp"><b>${B.exh.length}</b>消耗</div>
   <div id="hand">${hand}</div>${B.sel >= 0 ? '<div id="tip">选择目标（Esc 取消）</div>' : ''}`;
  heroAnimCls = '';
  bindTop();
  $('#endturn').onclick = endTurn;
  $('#drawp').onclick = () => showPile('抽牌堆（顺序已打乱）', [...B.draw].sort((a, b) => a.id < b.id ? -1 : 1));
  $('#discp').onclick = () => showPile('弃牌堆', B.disc);
  $('#exhp').onclick = () => showPile('消耗', B.exh);
  view.querySelectorAll('#hand .card').forEach(el => el.onclick = ev => { ev.stopPropagation(); const i = +el.dataset.i; if (TOUCH && B.peek !== i) { B.peek = i; view.querySelectorAll('#hand .card.peek').forEach(x => x.classList.remove('peek')); el.classList.add('peek'); kwShow(el); return; } B.peek = null; kwHide(); playCard(i); });
  view.querySelectorAll('.enemy').forEach(el => el.onclick = () => { if (B.potSel != null) { const e = B.en.find(x => x.id === el.dataset.eid); if (e && !e.dead) usePotion(B.potSel, e); return; } if (B.sel >= 0) { const e = B.en.find(x => x.id === el.dataset.eid); if (e && !e.dead) playCard(B.sel, e); } });
  flushFx(); dbgPanel();
}
function flushFx() {
  const s = stage._s || 1, sr = stage.getBoundingClientRect();
  const count = {}; let shake = false;
  for (const f of B.fx) {
    const el = view.querySelector(`[data-id="${f.who}"] .spr`); if (!el) continue;
    const r = el.getBoundingClientRect(); const k = f.who;
    const cx0 = (r.left + r.width / 2 - sr.left) / s, cy0 = (r.top + r.height * .5 - sr.top) / s;
    const ring = c => { const g = document.createElement('div'); g.className = 'ring ' + c; g.style.left = cx0 + 'px'; g.style.top = cy0 + 'px'; fxl.appendChild(g); setTimeout(() => g.remove(), 650); };
    if (f.cls === 'bul') { const h = view.querySelector('[data-id="hero"] .spr'); if (h) { const hr = h.getBoundingClientRect(), hx = (hr.right - sr.left) / s - 30, hy = (hr.top + hr.height * .45 - sr.top) / s;
      const b = document.createElement('div'); b.className = 'bullet'; b.style.left = hx + 'px'; b.style.top = hy + 'px'; b.style.setProperty('--dx', (cx0 - hx) + 'px'); b.style.setProperty('--dy', (cy0 - hy) + 'px'); b.style.animationDelay = (f.n || 0) * 60 + 'ms'; fxl.appendChild(b); setTimeout(() => b.remove(), 700 + (f.n || 0) * 60); } continue; }
    const spr = (n, sz = 190, cls = '') => { const im = document.createElement('img'); im.src = 'assets/fx/' + n + '.png'; im.className = 'fximg ' + cls; im.style.left = cx0 + 'px'; im.style.top = cy0 + 'px'; im.style.width = sz + 'px'; im.style.rotate = (cls ? 0 : Math.random() * 40 - 20) + 'deg'; fxl.appendChild(im); setTimeout(() => im.remove(), 600); };
    if (f.text === '爆音！') spr('boom', 260, 'still');
    if (f.cls === 'blk' && f.who === 'hero' && f.text !== '格挡') spr(R.char === 'miko' ? 'kekkai' : 'kekkai', 200, 'still');
    if (f.cls === 'heal') spr('heal', 180, 'still');
    if (/中毒\+/.test(f.text)) spr('poison', 170, 'still');
    if (/力量\+/.test(f.text) && f.who === 'hero') spr('power', 180, 'still');
    if (/虚弱\+|易伤\+/.test(f.text) && f.who !== 'hero') spr('ice', 150, 'still');
    if (f.cls === 'dmg') spr(f.who === 'hero' ? 'claw' : ({ hero: 'zap', miko: 'arrow', witch: 'fire', heroine: 'smash' })[R.char] || 'slash', 200);
    if (false) ring('pink');
    if (f.cls === 'blk' && f.who === 'hero' && f.text !== '格挡') ring('blue');
    if (f.cls === 'heal') ring('green');
    if (/中毒\+/.test(f.text)) ring('poison');
    count[k] = (count[k] || 0) + 1;
    const d = document.createElement('div'); d.className = 'fxn ' + f.cls; d.textContent = f.text;
    d.style.left = ((r.left + r.width / 2 - sr.left) / s + (count[k] - 1) * 18) + 'px'; d.style.top = ((r.top - sr.top) / s + 10 + (count[k] - 1) * 26) + 'px';
    fxl.appendChild(d); setTimeout(() => d.remove(), 950);
    if (f.cls === 'dmg') {
      const cx = (r.left + r.width / 2 - sr.left) / s, cy = (r.top + r.height * .45 - sr.top) / s;
      for (let k = 0, nk = fxl.childElementCount > 120 ? 0 : TOUCH ? 4 : 8; k < nk; k++) { const p = document.createElement('div'); p.className = 'spark'; const an = Math.random() * 6.28, dist = 50 + Math.random() * 90;
        p.style.left = cx + 'px'; p.style.top = cy + 'px'; p.style.setProperty('--dx', Math.cos(an) * dist + 'px'); p.style.setProperty('--dy', Math.sin(an) * dist + 'px');
        if (f.who === 'hero') p.style.background = '#ff5a4a'; fxl.appendChild(p); setTimeout(() => p.remove(), 600); }
      if (false) { const sl = document.createElement('img'); sl.src = 'assets/icons/fx_slash.png'; sl.className = 'slashfx'; sl.style.left = (cx - 75) + 'px'; sl.style.top = (cy - 75) + 'px'; sl.style.rotate = (Math.random() * 60 - 30) + 'deg'; fxl.appendChild(sl); setTimeout(() => sl.remove(), 400); }
      const n = parseInt(String(f.text).replace('-', '')) || 0;
      if (f.who === 'hero' || n >= 15) shake = true;
    }
  }
  if (shake && SET.shake) { view.classList.remove('shake'); void view.offsetWidth; view.classList.add('shake'); }
  B.fx = [];
}
setInterval(() => { frame++; if (!B || B.over) return; view.querySelectorAll('.enemy:not(.dead):not(.hd) .spr').forEach(img => img.src = `assets/enemies/${img.dataset.k}/${frame % 2 ? 'b' : 'a'}.png`); }, 520);
addEventListener('keydown', e => { if (e.target && e.target.tagName === 'INPUT') return;
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
  const gold = Math.round((kind === 'elite' ? rnd(25, 35) : rnd(10, 20)) * (A_(7) ? .7 : 1));
  items.push({ html: `<img src="assets/icons/goldbag.png">${gold} 金币`, go: () => { R.gold += gold; } });
  if (has('clover')) items.push({ html: `<img src="${RELICS.clover.img}">四叶草：15 金币`, go: () => { R.gold += 15; } });
  if (kind === 'elite') { const rl = rollRelic(); if (rl) items.push({ html: `<img src="${RELICS[rl].img}"><span>遗物：</span>${RELICS[rl].name}`, go: () => gainRelic(rl) }); }
  if (Math.random() < (kind === 'elite' ? .6 : .4)) { const pid = rollPotion(); items.push({ html: `<img src="${POTIONS[pid].img}"><span>药水：</span>${POTIONS[pid].name}`, go: () => gainPotion(pid) }); }
  const cards = rollCards(3, kind === 'elite' ? .07 : 0);
  items.push({ html: `<img src="assets/icons/p_arc.png">选择一张牌加入牌组`, card: true, go: done => chooseCard(cards, ok => done(ok)) });
  const draw = () => {
    view.innerHTML = `${bgHTML()}${topBar()}<div class="panel"><h2>战利品</h2>${items.map((it, i) => `<div class="reward" data-i="${i}">${it.html}</div>`).join('')}<br><button class="btn" id="go">继续前进</button></div>`;
    bindTop();
    view.querySelectorAll('.reward').forEach(el => el.onclick = () => {
      const i = +el.dataset.i, it = items[i];
      if (it.card) it.go(ok => { if (ok) { items.splice(i, 1); } draw(); });
      else { if (it.go() === false) return; items.splice(i, 1); audio.gem(); draw(); }
    });
    $('#go').onclick = mapScreen;
  };
  draw();
}

// ---------- 营火 ----------
function restScreen() {
  const heal = Math.floor(R.maxHp * (A_(5) ? .2 : .3));
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
  const pots = [rollPotion(), rollPotion()].map(id => ({ id, p: id === 'fairy' ? 120 : rnd(45, 60) }));
  let removed = false;
  const draw = () => {
    view.innerHTML = `${bgHTML()}${topBar()}<div class="panel" style="top:53%;width:1000px;padding:14px 26px"><h2 style="margin-bottom:8px">哥布林商人</h2>
     <div class="row" style="flex-wrap:nowrap">${cards.map((x, i) => `<div class="shopitem" data-c="${i}">${x.c ? cardHTML(x.c) : '<div style="width:129px;height:181px"></div>'}<span class="price ${x.p > R.gold ? 'no' : ''}">${x.c ? '● ' + x.p : '已售出'}</span></div>`).join('')}</div>
     <div class="row" style="margin-top:14px">${rels.map((x, i) => `<div class="relicbig" data-r="${i}" title="${x.id ? esc(RELICS[x.id].desc) : ''}">${x.id ? `<img src="${RELICS[x.id].img}">${RELICS[x.id].name}<span class="price ${x.p > R.gold ? 'no' : ''}">● ${x.p}</span>` : '已售出'}</div>`).join('')}
${pots.map((x, i) => `<div class="relicbig" data-pt="${i}" title="${x.id ? esc(POTIONS[x.id].desc) : ''}">${x.id ? `<img src="${POTIONS[x.id].img}">${POTIONS[x.id].name}<span class="price ${x.p > R.gold ? 'no' : ''}">● ${x.p}</span>` : '已售出'}</div>`).join('')}
      <div class="relicbig" id="rm"><img src="assets/icons/sk_bmist.png">移除一张牌<span class="price ${R.removeCost > R.gold || removed ? 'no' : ''}">${removed ? '已使用' : '● ' + R.removeCost}</span></div>
      <div style="align-self:center;margin-left:30px"><button class="btn" id="go">离开商店</button></div></div></div>`;
    bindTop();
    view.querySelectorAll('[data-c]').forEach(el => el.onclick = () => { const x = cards[+el.dataset.c]; if (!x.c || x.p > R.gold) return; R.gold -= x.p; R.deck.push(x.c); x.c = null; audio.gem(); draw(); });
    view.querySelectorAll('[data-r]').forEach(el => el.onclick = () => { const x = rels[+el.dataset.r]; if (!x.id || x.p > R.gold) return; R.gold -= x.p; gainRelic(x.id); x.id = null; draw(); });
    view.querySelectorAll('[data-pt]').forEach(el => el.onclick = () => { const x = pots[+el.dataset.pt]; if (!x.id || x.p > R.gold) return; if (!gainPotion(x.id)) return; R.gold -= x.p; x.id = null; draw(); });
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
    pick: (m, n = 1) => setTimeout(() => { const go = k => pickDeck(m, () => k > 1 ? go(k - 1) : draw2()); go(n); }, 50), rareCard: () => setTimeout(() => chooseCard(rollCards(3, 0, true), () => draw2()), 50),
    potion: () => { const id = rollPotion(); return gainPotion(id) ? POTIONS[id].name : '（药水栏满了，没拿上）'; },
  };
  let result = null;
  const img = ev.img === 'gb' ? 'assets/icons/gb.png' : `assets/icons/${ev.img}.png`;
  const draw2 = () => {
    view.innerHTML = `${bgHTML()}${topBar()}<div class="panel" style="width:620px"><h2>${ev.title}</h2><img src="${ev.pic ? 'assets/events/' + ev.pic + '.jpg' : img}" style="${ev.pic ? 'width:360px;border-radius:10px;border:3px solid #c9a35a;margin:-4px 0 6px' : 'width:110px;margin-bottom:8px'}">
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
  const k = R.kills || 0, el = R.elites || 0, hp = Math.max(0, R.hp);
  const rows = [[`攀登的层数 (${R.floor})`, R.floor * 20], [`击杀的敌人 (${k})`, k * 3], [`击败的精英 (${el})`, el * 25], [`打败 Boss (${win ? 1 : 0})`, win ? 300 : 0], [`通关时剩余生命 (${win ? hp : 0})`, win ? hp * 2 : 0]];
  if (R.asc) rows.push([`进阶难度 ${R.asc}（×${(1 + R.asc * .1).toFixed(1)}）`, Math.round(rows.reduce((a, r) => a + r[1], 0) * R.asc * .1)]);
  const total = rows.reduce((a, r) => a + r[1], 0);
  const M = metaGet(), before = M.xp; let news = [];
  if (!DEBUG) { M.xp += total; if (win && (R.asc || 0) >= (M.asc[R.char] || 0) && (M.asc[R.char] || 0) < 8) { M.asc[R.char] = (R.asc || 0) + 1; news.push(`${CHARS[R.char].name} 解锁进阶 ${M.asc[R.char]}`); } metaSet(M); }
  UNLOCKS.forEach(u => { if (before < u.xp && M.xp >= u.xp) news.push('解锁：' + [...u.cards.map(c => CARDS[c].name), ...u.relics.map(x => RELICS[x].name)].join('、')); });
  const nx = UNLOCKS.find(u => M.xp < u.xp), left = UNLOCKS.filter(u => M.xp < u.xp).length;
  view.innerHTML = `${bgHTML(true)}<div class="endw"><div class="ribbon ${win ? 'win' : ''}">${win ? '胜利' : '失败'}</div>
   <p class="endsub" data-noi18n>${win ? `${t('{0}倒下了，翠绿之地恢复了平静。', ENEMIES[R.boss].name)}<br><b style="color:#ffe08a">${t('第一章完 · 感谢游玩！')}</b>${t('更多内容制作中，欢迎把感想告诉作者。')}` : t('{0}倒在了翠绿之地第 {1} 层。', tr(CHARS[R.char || 'hero'].name), R.floor)}</p>
   <table class="score">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}<tr class="tot"><td>分数</td><td>${total}</td></tr></table>
   <div class="xpw"><div class="xpb"><i style="width:${nx ? Math.min(100, M.xp / nx.xp * 100) : 100}%"></i></div><span>${nx ? `[${M.xp}/${nx.xp}]` : `[${M.xp}] 全部解锁`}</span><span>剩余解锁：${left}</span></div>
   ${news.map(t => `<p class="endsub" style="color:#7fe07f">★ ${t}</p>`).join('')}
   <p id="sc" class="endsub" style="color:#ffd35a">${DEBUG ? '调试模式，成绩不记录' : !ONLINE ? '试玩链接不记录成绩' : LS('tw_name') ? '正在提交成绩……' : ''}</p>
   <div class="row"><button class="btn big" id="again">主菜单</button><button class="btn" id="rk2">排行榜</button></div></div>`;
  $('#again').onclick = mainMenu; $('#rk2').onclick = rankBoard;
  submitScore(win).then(d => { const e = $('#sc'); if (!e || !d) return; e.textContent = d.ok ? `已记入排行榜（${LS('tw_name')}）` : `没能上榜：${d.error}`; });
}



// ---------- 卡牌关键词说明框（悬停 / 手机长按；设置里「显示规则提示」可关闭） ----------
const KWS = { '结界': '叠在自己身上，每回合开始按层数自动获得格挡，整场战斗不消失。', '光弹': '回合结束时自动射出，每发打随机敌人 3 点伤害，然后清零。',
  '共鸣': '叠在敌人身上，满 10 层自动爆音。', '爆音': '共鸣满 10 层时爆炸，造成 24 点伤害，之后保留 3 层。',
  '中毒': '敌人行动前掉等于层数的血（无视格挡），然后层数 -1。', '炼金瓶': '由其他牌生成的 0 费牌，用一次就没了。' };
function kwList(c) { const d = CARDS[c.id], s = d.desc(c.up) + (d.potion ? tr('炼金瓶') : '') + (d.type === 'power' ? tr('能力') : ''); const all = Object.assign({}, KW, KWS, { '能力': '打出后整场战斗持续生效。' }); return Object.keys(all).filter(k => s.includes(tr(k))).map(k => [tr(k), tr(all[k])]); }
let kwTimer = 0;
function kwShow(el) { if (!SET.kwtip) return; const c = { id: el.dataset.cid, up: +el.dataset.up }; if (!CARDS[c.id]) return; const L = kwList(c); kwHide(); if (!L.length) return;
  const s = stage._s || 1, sr = stage.getBoundingClientRect(), r = el.getBoundingClientRect(), b = document.createElement('div'); b.id = 'kwtip';
  b.innerHTML = L.map(([k, v]) => `<p><b>${k}</b>${v}</p>`).join('') + '<i>设置里可关闭提示</i>'; stage.appendChild(b);
  let x = (r.right - sr.left) / s + 8, y = (r.top - sr.top) / s; if (x + 230 > SW) x = (r.left - sr.left) / s - 238; y = Math.max(50, Math.min(y, 720 - b.offsetHeight - 8)); b.style.left = x + 'px'; b.style.top = y + 'px'; }
function tipShow(el, text) { kwHide(); const s = stage._s || 1, sr = stage.getBoundingClientRect(), r = el.getBoundingClientRect(), b = document.createElement('div'); b.id = 'kwtip';
  b.innerHTML = text.split('\n').map(t => `<p>${esc(t)}</p>`).join(''); stage.appendChild(b);
  let x = (r.left + r.width / 2 - sr.left) / s - b.offsetWidth / 2, y = (r.bottom - sr.top) / s + 6; x = Math.max(8, Math.min(x, SW - b.offsetWidth - 8)); if (y + b.offsetHeight > 712) y = (r.top - sr.top) / s - b.offsetHeight - 6;
  b.style.left = x + 'px'; b.style.top = y + 'px'; kwTimer = setTimeout(kwHide, 4000); }
if (TOUCH) stage.addEventListener('click', e => { const el = e.target.closest && e.target.closest('.sts b[title], .intent[title]'); if (!el) return; e.stopPropagation(); tipShow(el, el.title); }, true);
function kwHide() { clearTimeout(kwTimer); $('#kwtip')?.remove(); }
stage.addEventListener('mouseover', e => { const el = e.target.closest && e.target.closest('.card[data-cid]'); if (el && e.pointerType !== 'touch') kwShow(el); });
stage.addEventListener('mouseout', e => { const el = e.target.closest && e.target.closest('.card[data-cid]'); if (el && !el.contains(e.relatedTarget)) kwHide(); });
stage.addEventListener('touchstart', e => { const el = e.target.closest && e.target.closest('.card[data-cid]'); if (el) kwTimer = setTimeout(() => kwShow(el), 380); }, { passive: true });
stage.addEventListener('touchend', e => { if (e.target.closest && e.target.closest('.sts b[title], .intent[title]')) return; clearTimeout(kwTimer); setTimeout(kwHide, 1500); });
stage.addEventListener('click', e => { if (!(TOUCH && e.target.closest && e.target.closest('.sts b[title], .intent[title]'))) kwHide(); }, true);

// ---------- 药水 ----------
function gainPotion(id) { R.potions = R.potions || []; if (R.potions.length >= 3) { tip('药水栏满了'); return false; } R.potions.push(id); audio.gem(); return true; }
function rollPotion() { return Math.random() < .08 ? 'fairy' : pickOne(Object.keys(POTIONS).filter(k => k !== 'fairy')); }
function potionClick(i) {
  const id = R.potions[i], P = POTIONS[id]; if (!P) return;
  if (!B || B.over || B.busy || B.anim) { const o = overlay(`<h2>${P.name}</h2><img src="${P.img}" style="width:80px"><p>${P.desc}</p><div class="row"><button class="btn red" id="pd">丢掉</button><button class="btn" id="px">关闭</button></div>`);
    o.querySelector('#px').onclick = () => o.remove(); o.querySelector('#pd').onclick = () => { R.potions.splice(i, 1); o.remove(); B ? render() : mapScreen(); }; return; }
  if (P.tgt === 'auto') { tip('复活药水会在倒下时自动使用'); return; }
  if (P.tgt === 'one' && alive().length > 1) { B.potSel = B.potSel === i ? null : i; B.sel = -1; render(); if (B.potSel != null) tip('点一个敌人'); return; }
  usePotion(i, alive()[0]);
}
async function usePotion(i, t) {
  const id = R.potions[i]; B.potSel = null; R.potions.splice(i, 1); B.hitSet = new Set();
  POTIONS[id].use(G, t); audio.holy(); render(); await checkEnd();
}

// ---------- 图鉴 ----------
const INTENT = { atk: '攻击', def: '防御', buff: '强化', debuff: '削弱', atkdef: '攻击+防御', atkdebuff: '攻击+削弱', summon: '召唤', unknown: '未知' };
const CONCEPTS = [
  ['基础', [['能量', '出牌要花能量，每回合开始恢复为 3 点。卡牌左上角的数字就是耗能。'], ['生命', '降到 0 就输了。大部分遗物和营火可以回血。'], ['格挡', KW['格挡']], ['抽牌', '每回合开始抽 5 张牌。抽牌堆空了，会把弃牌堆洗回来。'], ['回合', '你出完牌按「结束回合」，敌人按头上的意图行动。']]],
  ['卡牌种类', [['攻击牌', '红色卡框，主要用来造成伤害。'], ['技能牌', '绿色卡框，格挡、抽牌、加状态等。'], ['能力牌', '蓝色卡框，打出后整场战斗持续生效，不进弃牌堆。'], ['消耗', KW['消耗']], ['升级', '在营火可以升级卡牌，数值变强或耗能降低，名字后面多一个 +。'], ['稀有度', '普通 / 罕见 / 稀有，越稀有越强，奖励里越难出现。']]],
  ['状态', ['str', 'dex', 'vuln', 'weak', 'thorns', 'metal', 'regen', 'poison'].map(k => [STATUS[k][0], KW[STATUS[k][0]] || STATUS[k][1]])],
  ['角色机制', [['光弹', KW['光弹']], ['共鸣', KW['共鸣']], ['爆音', KW['爆音']], ['结界', KW['结界']], ['炼金瓶', KW['炼金瓶']], ['药水', KW['药水']], ['中毒', KW['中毒']]]],
  ['地图', [['战斗', '普通的哥布林小队，赢了给金币和卡牌。'], ['精英', '强敌，赢了额外给一个遗物。'], ['未知', '随机事件，可能是好事也可能有代价。'], ['营火', '休息回血，或者升级一张卡。'], ['商店', '花金币买卡、买遗物、删卡。'], ['宝箱', '直接拿遗物和金币。'], ['Boss', '每章最后的大头目，打赢就通关。']]],
  ['分数', [['排行榜积分', '层数×20 + 击杀×3 + 精英×25；通关再加 300，以及剩余生命×2。同一个名字只记最高的一局，调试模式不记录。']]],
];
function book(tab = 'card', sub = 'miko', up = 0) {
  const tabs = [['card', '卡牌'], ['relic', '遗物'], ['pot', '药水'], ['mon', '怪物'], ['rule', '概念说明']];
  let body = '';
  if (tab === 'card') {
    const subs = [...ORDER.map(k => [k, CHARS[k].name]), ['all', '共用']];
    const list = Object.values(CARDS).filter(d => sub === 'all' ? !d.ch : d.ch === sub).sort((a, b) => ('start c u r gen'.indexOf(a.rar)) - ('start c u r gen'.indexOf(b.rar)));
    body = `<div class="bsub">${subs.map(([k, n]) => `<b class="${k === sub ? 'on' : ''}" data-sub="${k}">${n}</b>`).join('')}<label class="ck"><input type="checkbox" id="bup" ${up ? 'checked' : ''}><span>查看升级后</span></label></div>
     <div class="bgrid cards">${list.map(d => `<div class="bc">${cardHTML({ id: d.id, up, uid: 0 })}<small>${{ start: '初始', c: '普通', u: '罕见', r: '稀有', gen: '炼金瓶（由其他牌生成）' }[d.rar]}${lockedSet().has(d.id) ? ' · 🔒 ' + UNLOCKS.find(u => u.cards.includes(d.id)).xp + ' 分解锁' : ''}</small></div>`).join('')}</div>`;
  } else if (tab === 'relic') {
    const who = r => r.ch ? CHARS[r.ch].name + ' 专属' : '通用';
    body = `<div class="bgrid">${Object.values(RELICS).map(r => `<div class="bi"><img src="${r.img}"><div><b>${r.name}</b><small>${who(r)} · ${{ start: '初始', c: '普通', u: '罕见', r: '稀有' }[r.rar]}${lockedSet().has(r.id) ? ' · 🔒 ' + UNLOCKS.find(u => u.relics.includes(r.id)).xp + ' 分解锁' : ''}</small><p>${kwify(r.desc)}</p></div></div>`).join('')}</div>`;
  } else if (tab === 'pot') {
    body = `<p style="margin:0 0 10px">所有角色通用。最多带 3 瓶，战斗中点左上角的药水使用，不花能量。打完战斗有机会掉落，商店也卖。</p><div class="bgrid">${Object.values(POTIONS).map(x => `<div class="bi"><img src="${x.img}"><div><b>${x.name}</b><small>${x.rar === 'r' ? '稀有' : '普通'}</small><p>${x.desc}</p></div></div>`).join('')}</div>`;
  } else if (tab === 'mon') {
    const hpOf = k => [].concat(ENEMIES[k].hp)[0], elite = new Set(ENCOUNTERS.elite.map(g => g.reduce((x, y) => hpOf(y) > hpOf(x) ? y : x))), boss = new Set(ENCOUNTERS.boss.flat());
    body = `<div class="bgrid">${Object.entries(ENEMIES).map(([k, e]) => `<div class="bi mon"><img src="assets/enemies2/${e.art || k}/portrait.png" onerror="this.src='assets/enemies2/${e.art || k}/idle0.png'"${e.tint ? ` style="filter:${e.tint}"` : ''}><div><b>${e.name}</b><small>${boss.has(k) ? 'Boss' : elite.has(k) ? '精英' : '普通'} · 生命 ${Array.isArray(e.hp) ? e.hp.join('～') : e.hp}</small>
      <p>${Object.values(e.moves).map(m => `<span class="mv">${m.n}</span>${INTENT[m.i] || ''}${m.d ? ' ' + m.d + (m.x > 1 ? '×' + m.x : '') : ''}`).join('　')}</p></div></div>`).join('')}</div>`;
  } else {
    body = `<div class="rules">${CONCEPTS.map(([h, rows]) => `<h3>${h}</h3><table>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`).join('')}</div>`;
  }
  let o = $('#bookov'); if (!o) { o = overlay(''); o.id = 'bookov'; }
  o.innerHTML = `<div class="bookw"><div class="tabs">${tabs.map(([k, n]) => `<b class="${k === tab ? 'on' : ''}" data-t="${k}">${n}</b>`).join('')}</div><div class="bbody">${body}</div><button class="btn" id="bx">返回</button></div>`;
  o.querySelectorAll('[data-t]').forEach(b => b.onclick = () => book(b.dataset.t, sub, up));
  o.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => book(tab, b.dataset.sub, up));
  o.querySelector('#bup')?.addEventListener('change', e => book(tab, sub, e.target.checked ? 1 : 0));
  o.querySelector('#bx').onclick = () => o.remove();
}

// ---------- 调试 ----------
function dbgPanel() {
  if (!R) { $('#dbg')?.remove(); return; }
  if (!DEBUG) return; let d = $('#dbg'); if (!d) { d = document.createElement('div'); d.id = 'dbg'; d.dataset.noi18n = 1; stage.appendChild(d); }
  const btns = [['秒杀敌人', () => { if (B) { B.en.forEach(e => { if (!e.dead) killE(e); }); render(); checkEnd(); } }], ['+100金', () => { R.gold += 100; B ? render() : mapScreen(); }],
    ['满血', () => { R.hp = R.maxHp; B ? render() : mapScreen(); }], ['+3能量', () => { if (B) { B.p.energy += 3; render(); } }], ['抽5张', () => { if (B) { drawCards(5); render(); } }],
    ['全部遗物', () => { Object.keys(RELICS).forEach(id => { if (!has(id)) gainRelic(id); }); B ? render() : mapScreen(); }],
    ['跳到Boss', () => { R.pos = { r: ROWS - 1, c: R.map[ROWS - 1].findIndex(Boolean) }; R.floor = 15; mapScreen(); }],
    ['商店', () => shopScreen()], ['事件', () => eventScreen()], ['精英', () => battle(pickOne(ENCOUNTERS.elite), 'elite')], ...ENCOUNTERS.boss.map(([k]) => ['B:' + k.replace('gob_', ''), () => { R.boss = k; battle([k], 'boss'); }])];
  d.innerHTML = ''; btns.forEach(([t, f]) => { const b = document.createElement('button'); b.textContent = t; b.onclick = f; d.appendChild(b); });
}

title();
dbgPanel();
