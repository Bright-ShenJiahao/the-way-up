// 异世界幸存者 · 卡牌篇 —— 主逻辑（玩法照搬杀戮尖塔第一幕）
import { ENC3, EV3, FINAL3, TRIALS, CORE3, endlessMul, RIFT, ENC3X, GATE3 } from './data.js?v=live2_11141335';
import { MECH, STARTRELIC, RULES, isFury, EVENTS2, ENCOUNTERS2, CARDS, STARTERS, RELICS, POTIONS, STATUS, ENEMIES, ENCOUNTERS, EVENTS } from './data.js?v=live2_11141335';
import { createAudio } from './audio.js?v=live2_11141335';
import { BLESS_FREE, BLESS_COST, ASC2, MODS, ACH, hashSeed, mulberry, todayKey, dailyOf } from './meta.js?v=live2_11141335';
import { t, tr, getLanguage, setLanguage, onLanguageChange, watch, missing } from './i18n.js?v=live2_11141335';

const $ = s => document.querySelector(s);
const view = $('#view'), fxl = $('#fx'), stage = $('#stage');
watch(stage); window.__i18nMissing = missing;
let SCREEN = 'title';
const TOUCH = matchMedia('(hover: none), (pointer: coarse)').matches; document.documentElement.classList.toggle('touch', TOUCH);
/* 卡牌说明放不下时自动缩小字号（最小 8px） */
const fitCard = c => { const sp = c.querySelector('.cdesc span'), box = c.querySelector('.cdesc'), nm = c.querySelector('.cname'); if (box && sp) { if (!box.clientHeight) { if ((c._fr = (c._fr || 0) + 1) < 20) requestAnimationFrame(() => fitCard(c)); return; } let f = 12; sp.style.fontSize = ''; const room = () => box.clientHeight - 6; /* 文字是上下居中的，溢出会两头冒，用文字本身的高度比 */ while (sp.offsetHeight > room() && f > 7) { f -= .5; sp.style.fontSize = f + 'px'; } } if (nm) { let f = 14; nm.style.fontSize = ''; while (nm.scrollWidth > nm.clientWidth + 1 && f > 9) { f -= .5; nm.style.fontSize = f + 'px'; } } };
try { document.fonts && document.fonts.addEventListener('loadingdone', () => stage.querySelectorAll('.card').forEach(fitCard)); } catch (e) {} addEventListener('resize', () => setTimeout(() => stage.querySelectorAll('.card').forEach(fitCard), 50));
new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(n => { if (n.nodeType !== 1) return; if (n.matches?.('.card')) fitCard(n); n.querySelectorAll?.('.card').forEach(fitCard); }); }).observe(stage, { childList: true, subtree: true });
addEventListener('error', e => { try { tip(tr('出错了，可以在设置里保存并退出后重新进入') + ' (' + (e.message || '').slice(0, 60) + ')'); } catch (_) {} });
const LANGS = [['zh', '中文'], ['en', 'English'], ['ja', '日本語']];
const langBar = () => `<div class="langbar" data-noi18n>${LANGS.map(([k, n]) => `<b class="${getLanguage() === k ? 'on' : ''}" data-lang="${k}">${n}</b>`).join('')}</div>`;
const bindLang = after => view.querySelectorAll('[data-lang]').forEach(el => el.onclick = () => { setLanguage(el.dataset.lang); after && after(); });
const applyStatic = () => { document.title = tr('通往顶端') + ' The Way Up: Otherworld Deck'; const r = document.querySelector('#rot div:nth-child(2)'); if (r) r.textContent = getLanguage() === 'zh' ? '请把手机横过来玩' : tr('请把手机横过来玩'); const r3 = document.querySelector('#rot div:nth-child(3)'); if (r3) r3.style.display = getLanguage() === 'en' ? 'none' : ''; document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : getLanguage(); };
onLanguageChange(applyStatic); applyStatic();
const DEBUG = /[?&]debug/.test(location.search) || location.hash === '#debug';
if (DEBUG) window.__dbg = { get B() { return B; }, get R() { return R; }, tr: x => tr(x), texts: () => ({ KW, KWS, TUT, CHARINFO, CONCEPTS, TRUEEND, CH3END, ASC, KEYC, NODENAME }), bless: () => blessScreen(), daily: () => dailyScreen(), achs: () => achScreen(), pickChar: () => pickChar(), trueGate: () => trueGate(), mapScreen: () => mapScreen(), rest: () => restScreen(), treasure: () => treasureScreen(), endScreen: w => endScreen(w), act3Choice: () => act3Choice(), riftChoice: () => riftChoice(), finalPrep: () => finalPrep(), endingChoice: () => endingChoice(), startEndless: () => startEndless(), layerEnd: () => layerEnd(), enterNode: k => enterNode(k), mapScreen: () => mapScreen(), newRun: (...a) => newRun(...a), battle: (...a) => battle(...a), playCard: (...a) => playCard(...a), endTurn: () => endTurn(), mkCard: (...a) => mkCard(...a), chooseCard: (...a) => chooseCard(...a) };
const audio = createAudio();
let SET = { shake: 1, fast: 0, kwtip: 1, tele: 1 }; try { Object.assign(SET, JSON.parse(localStorage.getItem('tw_set') || '{}')); } catch (e) {}
const saveSet = () => { try { localStorage.setItem('tw_set', JSON.stringify(SET)); } catch (e) {} };
const sleep = ms => new Promise(r => setTimeout(r, SET.fast ? ms / 2 : ms));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pickOne = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ---------- 缩放 ----------
let SW = 1280;
const saProbe = document.createElement('div'); saProbe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; document.body.appendChild(saProbe);
function fit() { const cs = getComputedStyle(saProbe), sl = parseFloat(cs.paddingLeft) || 0, sr = parseFloat(cs.paddingRight) || 0, st = parseFloat(cs.paddingTop) || 0, sb = parseFloat(cs.paddingBottom) || 0;
  const W = innerWidth - sl - sr, H = innerHeight - st - sb, ar = W / H; SW = Math.round(Math.max(1280, Math.min(2000, 720 * ar))); const s = Math.min(W / SW, H / 720);
  stage.style.width = SW + 'px'; const rs = document.documentElement.style; rs.setProperty('--sw', SW + 'px'); rs.setProperty('--mz', Math.max(1.22, Math.min(1.7, (SW - 300) / 1000)).toFixed(3));
  stage.style.transform = `scale(${s})`; stage.style.left = sl + (W - SW * s) / 2 + 'px'; stage.style.top = st + (H - 720 * s) / 2 + 'px'; stage._s = s; }
addEventListener('resize', fit); addEventListener('orientationchange', () => setTimeout(fit, 250)); fit();
stage.addEventListener('scroll', () => { stage.scrollTop = 0; stage.scrollLeft = 0; });

// ---------- 局 ----------
let TIPS = true; try { TIPS = localStorage.getItem('tipsOff') !== '1'; } catch (e) {}
const KW = { '鳞甲': '敌人受到的每次攻击伤害减少等同层数（最多减一半）；一次受到 10 点以上的攻击会打碎 1 层。', '冻伤': '回合结束时，手里每剩 1 张牌失去 1 生命（最多按层数算），然后减 1 层。', '灼烧': '回合结束时失去等同层数的生命，然后减 1 层。', '麻痹': '敌人下一次攻击伤害减半。冰冻、眩晕对精英和 Boss 会改成麻痹。', '电麻': '回合开始时少 1 点能量，然后减 1 层。', '飞剑': '顾清寒身上的飞剑，最多 6 把。每把让攻击牌第一击 +1（每 2 把再 +1），回合结束每 2 把给 1 点格挡；也可以射出去造成伤害。', '龙血': '希尔薇的资源，最多 8 点。攒满可以变身霜龙三回合，也能花掉换取各种效果。', '霜灼': '叠在敌人身上，敌人行动前受到等同层数的伤害，然后层数减半。', '团子': '米娅的云猫伙伴，有自己的生命。每回合可以下护卫或扑击指令。', '血蝠': '绯月召唤的蝙蝠，回合结束时各自攻击随机敌人；敌人每次行动会打掉 1 只。', '蓄力': '龙下回合要放龙息。蓄力的那个回合里打它足够多的伤害，就能打断。', '补丁': '这张牌本场伤害或格挡增加，牌面显示版本号。', '狡诈': '这张牌被弃掉时，会自动免费打出。', '格挡': '抵挡受到的伤害。你的回合开始时清零。', '易伤': '受到的攻击伤害 +50%，每回合减 1 层。', '虚弱': '造成的攻击伤害 -25%，每回合减 1 层。',
  '力量': '每次攻击伤害增加等同于力量的数值。', '敏捷': '每次获得格挡时额外增加等同于敏捷的数值。', '消耗': '打出后移出本场战斗，不进弃牌堆。',
  '荆棘': '被攻击时，对攻击者造成等同于层数的伤害。', '能量': '出牌要花能量，每回合开始恢复为 3 点。',
  '光弹': '林拓的掌机子弹。回合结束时自动射出，每发对随机敌人造成 4 点伤害（第 1、3、5… 发为 5 点），然后清零。最多 8 发。', '共鸣': '叠在敌人身上，到 10 层自动爆音。', '中毒': '敌人行动前受到等同层数的伤害（无视格挡），然后减 1 层。', '炼金瓶': '魔女的 0 费一次性牌，由其他牌生成，用完消耗。', '药水': '所有角色通用的一次性道具，最多带 3 瓶，战斗中点左上角的药水就能用，不花能量。', '结界': '叠在自己身上，每回合开始按层数获得格挡，整场战斗保留。', '爆音': '共鸣满 10 层时，对该敌人造成 18 点伤害，之后保留 3 层（多出的层数也保留）。每个敌人第一次被爆音时还会眩晕（跳过下一次行动）。' };
const kwify = s => { if (!TIPS) return s; const names = Object.keys(KW).map(k => [tr(k), tr(KW[k])]).sort((a, b) => b[0].length - a[0].length); const re = new RegExp(names.map(n => n[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g'); const m2 = Object.fromEntries(names); return s.replace(re, m => `<span class="kw" title="${m2[m]}">${m}</span>`); };
let R = null; // 当前一局
let uidN = 1;
const mkCard = (id, up = 0) => ({ id, up, uid: uidN++ });
function newRun(char = 'hero', asc = 0, opt = {}) {
  R = { char, hp: 80, maxHp: 80, gold: 120 - (asc >= 19 ? 60 : 0), potions: [], asc, deck: STARTERS[char].map(id => mkCard(id)), relics: [STARTRELIC[char]].filter(Boolean), map: null, pos: null,
    floor: 0, fights: 0, removeCost: 75, boss: null, feather: 0, keys: {}, mode: opt.mode || 'normal', mods: opt.mods || [], log: { picks: [], hp: [], t0: Date.now() } };
  if (opt.seed != null && opt.seed !== '') R.seed = String(opt.seed);
  R.map = genMap(); R.boss = SR(() => pickOne(ENCOUNTERS.boss)[0]);
  if (asc >= 4) { R.maxHp -= 8; R.hp = R.maxHp; }
  if (asc >= 9) R.deck.push(mkCard('regret'));
  const md = k => R.mods.includes(k);
  if (md('rich')) R.gold = 400;
  if (md('big')) SR(() => rollCards(3).forEach(c => R.deck.push(mkCard(c.id))));
  if (md('cursed')) { R.deck.push(mkCard('regret'), mkCard('regret')); gainRelic(rollRelic(['r'])); }
  if (md('glass')) { R.maxHp = Math.ceil(R.maxHp / 2); R.hp = R.maxHp; }
  if (!DEBUG) { const M = metaGet(); M.runs = (M.runs || 0) + 1; metaSet(M); if (M.runs >= 50) ach('a_runs50'); }
}
/* 种子随机：有种子的局（每日挑战 / 自定义），地图、遭遇、奖励都按种子来；每次调用按顺序换一个子种子 */
const PLAYCAP = 25; /* 每回合最多出牌数：防止 0 费抽牌无限循环 */
function SR(f, a = []) { if (!R || R.seed == null) return f(...a); const o = Math.random; R.rc = (R.rc || 0) + 1; Math.random = mulberry(hashSeed(R.seed + ':' + R.rc)); try { return f(...a); } finally { Math.random = o; } }
const MOD = k => !!(R && R.mods && R.mods.includes(k));
/* ---------- 成就 ---------- */
function ach(id) { if (DEBUG) return; const M = metaGet(); M.ach = M.ach || {}; if (M.ach[id]) return; M.ach[id] = Date.now(); metaSet(M); const a = ACH.find(x => x.id === id); if (a) setTimeout(() => tip('🏆 ' + tr('成就解锁') + '：' + tr(a.name)), 300); }
function achScreen() { const got = metaGet().ach || {}, n = ACH.filter(a => got[a.id]).length;
  const o = overlay(`<div class="panel achp" style="width:min(900px,94vw);max-height:86vh;overflow:auto"><h2>${tr('成就')} <small>${n} / ${ACH.length}</small></h2><div class="achg">${ACH.map(a => `<div class="ach ${got[a.id] ? 'on' : ''}"><i>${got[a.id] ? '🏆' : '🔒'}</i><b>${tr(a.name)}</b><span>${tr(a.desc)}</span></div>`).join('')}</div><button class="btn" id="ax">${tr('返回')}</button></div>`);
  o.querySelector('#ax').onclick = () => o.remove(); }
/* ---------- 开局祝福 ---------- */
const CHARKW = { hero: ['光弹'], heroine: ['共鸣', '爆音'], miko: ['结界'], witch: ['炼金瓶', '中毒'], erin: [], gu: ['飞剑'], sylvie: ['龙血', '霜灼'], mia: ['团子'], feiyue: ['血蝠'] };
/* 每个角色第一次出发时弹一页机制说明（之后可以在图鉴里看） */
function charIntro(done) { const M = metaGet(); M.cintro = M.cintro || {}; if (M.cintro[R.char] || !CHARINFO[R.char]) return done(); M.cintro[R.char] = 1; metaSet(M);
  const i = CHARINFO[R.char], kws = (CHARKW[R.char] || []).filter(k => KW[k]);
  const o = overlay(`<div class="panel" style="width:min(680px,92vw);max-height:92vh;overflow-y:auto;text-align:left"><h2 style="text-align:center">${tr(CHARS[R.char].name)}</h2><p>${tr(i.tip)}</p>${kws.map(k => `<p><b style="color:#ffd35a">${tr(k)}</b>：${tr(KW[k])}</p>`).join('')}
   ${i.builds ? `<p style="margin-top:8px"><b>${tr('推荐流派')}</b></p>${i.builds.map(b => `<p>· <b>${tr(b[0])}</b>：${tr(b[1])}</p>`).join('')}` : ''}<div class="row" style="justify-content:center"><button class="btn gold" id="cix">${tr('明白了')}</button></div></div>`);
  o.querySelector('#cix').onclick = () => { o.remove(); done(); }; }
function blessScreen() { if (!R.ciShown) { R.ciShown = 1; return charIntro(blessScreen); } SCREEN = 'bless'; B = null; R.wait = 'bless';
  if (!R.blessOpts) R.blessOpts = SR(() => { const f = shuffle(Object.keys(BLESS_FREE)).slice(0, 2), c = pickOne(Object.keys(BLESS_COST)); return [...f, c]; });
  save(); setMusic('menu');
  const txt = k => BLESS_FREE[k] || BLESS_COST[k];
  view.innerHTML = `${bgHTML(false, 'story_road')}${topBar()}<div class="panel" style="width:min(720px,92vw);text-align:center"><h2>${tr('出发前的祝福')}</h2><p>${tr('路边的小神龛亮了起来。选一个带上路吧。')}</p>
   <div class="col" style="display:flex;flex-direction:column;gap:10px;margin-top:10px">${R.blessOpts.map(k => `<button class="btn ${BLESS_COST[k] ? 'red' : ''}" data-b="${k}">${tr(txt(k))}</button>`).join('')}</div></div>`;
  bindTop();
  view.querySelectorAll('[data-b]').forEach(el => el.onclick = () => applyBless(el.dataset.b));
}
function applyBless(k) { const fin = () => { delete R.wait; delete R.blessOpts; R.bless = k; save(); mapScreen(); };
  const rm = (n, d) => { if (n <= 0) return d(); pickDeck('remove', () => rm(n - 1, d)); };
  if (k === 'b_hp') { R.maxHp += 8; R.hp += 8; return fin(); }
  if (k === 'b_gold') { R.gold += 100; return fin(); }
  if (k === 'b_rm') return rm(1, fin);
  if (k === 'b_up') return pickDeck('upgrade', ok => ok === false && R.deck.some(c => !c.up) ? blessScreen() : fin());
  if (k === 'b_card') return chooseCard(rollCards(3), fin);
  if (k === 'b_pot') { gainPotion(rollPotion()); gainPotion(rollPotion()); return fin(); }
  if (k === 'b_relic') { gainRelic(rollRelic(['c'])); return fin(); }
  if (k === 't_rare') { R.maxHp -= Math.floor(R.maxHp * .1); R.hp = Math.min(R.hp, R.maxHp); return chooseCard(rollCards(3, 0, true), fin); }
  if (k === 't_relic') { R.gold = 0; gainRelic(rollRelic(['r'])); return fin(); }
  if (k === 't_rm2') return rm(2, () => { R.deck.push(mkCard('regret')); fin(); }); /* 先删 2 张再塞悔意，悔意删不掉 */
  if (k === 't_gold') { R.maxHp -= 12; R.hp = Math.min(R.hp, R.maxHp); R.gold += 150; return fin(); }
  fin();
}
const has = id => R.relics.includes(id);
const snap = () => { const { snap: _, ...o } = R; R.snap = JSON.stringify(o); }; /* 进入节点前的快照：中途退出后从这里恢复 */
const mine = d => (!d.ch || d.ch === (R.char || 'hero')) && (!d.act2 || (R && R.act === 2)) && (!d.act3 || (R && R.act >= 3));
addEventListener('storage', e => { if (e.key === 'theway_run_v2' && R && SCREEN !== 'menu' && SCREEN !== 'title') { tip(tr('存档在另一个标签页里被改动了，这里先回到主菜单')); B = null; R = null; mainMenu(); } }); /* 同一存档开两个标签页时不互相覆盖 */
function save() { try { localStorage.setItem('theway_run_v2', JSON.stringify(R)); } catch (e) {} }
function clearSave() { try { localStorage.removeItem('theway_run_v2'); } catch (e) {} }
function load() { try { const s = JSON.parse(localStorage.getItem('theway_run_v2')); if (s) { if (!CHARS[s.char] || !Array.isArray(s.deck) || !Array.isArray(s.map)) return null; s.potions = (s.potions || []).filter(p => POTIONS[p]); s.deck = s.deck.filter(c => CARDS[c.id]); s.relics = (s.relics || []).filter(r => RELICS[r]); uidN = 1 + Math.max(0, ...s.deck.map(c => c.uid)); s.act = [1, 2, 3, 4].includes(s.act) ? s.act : 1; if (!ENEMIES[s.boss] || !ENEMIES[s.boss].boss) { const bl = (s.act === 4 ? ENCX() : s.act === 3 ? (s.rift ? RIFT : ENC3) : s.act === 2 ? ENCOUNTERS2 : ENCOUNTERS).boss.map(b => b[0]); s.boss = pickOne(bl); } s.floor = Math.max(0, Math.min((s.rows || ROWS) + 1, s.floor | 0)); } return s; } catch (e) { return null; } }

// ---------- 地图生成 ----------
const ROWS = 15, COLS = 7;
const ACT = () => (R && R.act) || 1, ENC = () => ACT() === 4 ? ENCX() : ACT() === 3 ? (R.rift ? RIFT : ENC3) : ACT() === 2 ? ENCOUNTERS2 : ENCOUNTERS, REGION = () => ACT() === 4 ? t('天外之塔 · 第 {0} 轮', R.endless || 1) : ACT() === 3 ? (R.rift ? t('魔界裂隙') : '永冬之巅') : ACT() === 2 ? '血月古堡' : '翠绿之地';
/* 无尽模式：三章的怪混着出 */
const ENCX = () => ({ easy: [...ENCOUNTERS.hard, ...ENCOUNTERS2.hard], hard: [...ENCOUNTERS2.hard, ...ENC3.hard, ...ENC3.easy, ...ENC3X.hard, ...RIFT.hard], elite: [...ENCOUNTERS.elite, ...ENCOUNTERS2.elite, ...ENC3.elite, ...ENC3X.elite, ...RIFT.elite], boss: [...ENCOUNTERS.boss, ...ENCOUNTERS2.boss, ...ENC3.boss] });
const RW = () => (R && R.rows) || ROWS;
function genMap(...a) { return SR(genMap0, a); }
function genMap0() { const ROWS = RW();
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
    if (r === 0) { nd.type = 'fight'; continue; } if (r === (ROWS < 15 ? 4 : 8)) { nd.type = 'treasure'; continue; } if (r === ROWS - 1) { nd.type = 'rest'; continue; }
    const parents = g[r - 1].filter(o => o && o.next.includes(nd.c)).map(o => o.type);
    for (let k = 0; k < 20; k++) {
      let tot = 0, x; const ok = Object.entries(W).filter(([t]) => !((t === 'elite' || t === 'rest') && r < (ROWS < 15 ? 2 : 5)) && !(t === 'rest' && r === ROWS - 2) && !(['elite', 'rest', 'shop'].includes(t) && parents.includes(t)));
      ok.forEach(([, w]) => tot += w); x = Math.random() * tot;
      for (const [t, w] of ok) { x -= w; if (x <= 0) { nd.type = t; break; } }
      if (nd.type) break;
    }
    nd.type = nd.type || 'fight';
  }
  if ((!R || !R.act || R.act === 1) && !(R && R.endless)) { const el = g.flat().filter(n => n && n.type === 'elite' && n.r >= 5); if (el.length) pickOne(el).burn = 1; }
  return g;
}

// ---------- 顶栏 ----------
function topBar() {
  return `<div id="top"><span class="hp">❤ ${R.hp}/${R.maxHp}</span><span class="gold">● ${R.gold}</span><span class="fl">第 ${Math.max(1, (R.floor0 || 0) + R.floor)} 层 · ${REGION()}</span>
  <div class="pots">${[0, 1, 2].map(i => { const id = (R.potions || [])[i]; return id ? `<img class="pot ${B && B.potSel === i ? 'sel' : ''}" data-pot="${i}" src="${POTIONS[id].img}" title="${esc(POTIONS[id].name + '：' + POTIONS[id].desc)}">` : '<i class="pot empty"></i>'; }).join('')}</div>
  <div class="relics">${keysHTML()}${R.relics.map(id => `<img src="${RELICS[id].img}" data-rel="${id}" title="${esc(RELICS[id].name + '：' + RELICS[id].desc)}">`).join('')}</div>
  <span class="sp"></span><button class="tb" id="tbdeck">牌组 (${R.deck.length})</button><button class="tb" id="tbtips" title="开关规则提示">提示：${TIPS ? '开' : '关'}</button><button class="tb" id="tbfs" title="全屏">⛶</button><button class="tb" id="tbmute">${audio.muted ? '🔇' : '🔊'}</button><button class="tb" id="tbset" title="设置">⚙</button></div>`;
}
const KEYC = { g: ['#5fe07a', '翡翠钥匙'], r: ['#ff5a6a', '血月钥匙'], b: ['#6ab8ff', '龙鳞钥匙'] };
const keysHTML = () => { const k = R.keys || {}; return Object.keys(k).length ? `<i class="rkeys">${['g', 'r', 'b'].map(x => `<b title="${tr(KEYC[x][1])}" style="color:${k[x] ? KEYC[x][0] : '#555'}">◆</b>`).join('')}</i>` : ''; };
function gotKey(x) { R.keys = R.keys || {}; R.keys[x] = 1; tip(tr('得到了') + tr(KEYC[x][1])); save(); if (R.keys.g && R.keys.r && R.keys.b) ach('a_keys'); }
function bindTop() { if (R && R.gold >= 600) ach('a_rich');
  $('#tbdeck')?.addEventListener('click', () => showPile('牌组', R.deck));
  $('#tbset')?.addEventListener('click', () => settings(true));
  view.querySelectorAll('[data-pot]').forEach(el => el.onclick = () => potionClick(+el.dataset.pot));
  view.querySelectorAll('[data-rel]').forEach(el => el.onclick = ev => { ev.stopPropagation(); infoPop(el, RELICS[el.dataset.rel].name, RELICS[el.dataset.rel].desc); });
  $('#tbtips')?.addEventListener('click', () => { TIPS = !TIPS; try { localStorage.setItem('tipsOff', TIPS ? '0' : '1'); } catch (e) {} if (B && !B.over) render(); else { const b = $('#tbtips'); if (b) b.textContent = tr(TIPS ? '提示：开' : '提示：关'); } });
  $('#tbfs')?.addEventListener('click', () => { const d = document.documentElement; (document.fullscreenElement ? document.exitFullscreen() : (d.requestFullscreen || d.webkitRequestFullscreen).call(d)).then?.(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch?.(() => {}); });
  $('#tbmute')?.addEventListener('click', () => { dispatchEvent(new KeyboardEvent('keydown', { key: 'm' })); setTimeout(() => { const b = $('#tbmute'); if (b) b.textContent = audio.muted ? '🔇' : '🔊'; }, 30); });
}
const BGS = ['battle_forest', 'battle_birch', 'battle_castle'];
const bgHTML = (dim, img = (typeof R !== 'undefined' && R && R.act >= 3) ? 'c3_battle' : (typeof R !== 'undefined' && R && R.act === 2) ? 'c2_exterior' : 'battle_forest') => `<div class="bg ${dim ? 'dim' : ''}"><img class="full px" src="assets/bg/${img}.jpg"><div class="light"></div><div class="vig"></div></div>`;
const foreHTML = () => `<div id="fore"><img src="assets/fg/bush.png" style="left:-90px;bottom:-70px;width:400px"><img src="assets/fg/fern.png" style="right:-80px;bottom:-60px;width:360px"></div>`;

// ---------- 卡牌显示 ----------
const TYPE = { atk: '攻击', skill: '技能', power: '能力' };
function cardCost(c) { const k0 = cardCost0(c); return B && R && typeof k0 === 'number' ? Math.max(0, k0 + MECH.costMod(G, CARDS[c.id])) : k0; }
function cardCost0(c) { const d = CARDS[c.id]; if (c.free) return 0; if (c.rc != null) return c.rc; const k = d.cost[c.up ? 1 : 0]; return c.disc && k !== 'X' ? Math.max(0, k - 1) : k; }
function cardHTML(c, extra = '', energy = 99) {
  const d = CARDS[c.id], cost = cardCost(c), no = cost !== 'X' && cost > energy;
  const rr = d.rar === 'start' || d.rar === 'gen' ? 'c' : d.rar;
  return `<div class="card t-${d.type} r-${d.rar} ${c.up ? 'up' : ''} ${extra}" data-uid="${c.uid}" data-cid="${c.id}" data-up="${c.up ? 1 : 0}">
   <div class="art"><img src="${d.img}"></div><div class="cdesc" data-noi18n><span>${kwify(d.desc(c.up))}</span></div><img class="frame" src="assets/ui2/frame_${d.type}_${rr}.png">
   <div class="cost ${no ? 'no' : ''}"${d.unplay ? ' style="visibility:hidden"' : ''}>${cost}</div><div class="cname">${d.name}${c.up ? '+' : ''}</div>${c.pt ? `<i class="ver ${c.pt < 0 ? 'neg' : ''}" title="${tr('补丁：开发者改过这张牌的数值（本场有效）')}">v1.${c.pv || 1} ${c.pt > 0 ? '+' : ''}${c.pt}</i>` : ''}${c.flip ? `<i class="flipb" title="${tr('反转：打出时效果变成反的（攻击牌改为给敌人回血，技能牌改为自己掉血）')}">${tr('反转')}</i>` : ''}${c.seal ? `<i class="sealb" title="${tr('封印：这张牌暂时不能打出')}"><img src="assets/icons2/st_seal.png" alt="">${tr(c.seal === 'perm' ? '封印到战斗结束' : '封印')}</i>` : ''}</div>`;
}
function overlay(html) { const o = document.createElement('div'); o.className = 'overlay'; o.innerHTML = html; stage.appendChild(o); return o; }
function pickOpt(title, opts, noCancel) { /* 出牌时的选择：返回所选 val，点取消返回 undefined */
  return new Promise(res => { const o = overlay(`<h2>${t(title)}</h2><div class="row pickrow">${opts.map((x, k) => `<div class="pko" data-k="${k}">${x.html || `<button class="btn">${t(x.label)}</button>`}</div>`).join('')}</div>${noCancel ? '' : `<button class="btn" id="pkx">${t('取消')}</button>`}`);
    o.querySelectorAll('.pko').forEach(el => el.onclick = () => { o.remove(); res(opts[+el.dataset.k].val); }); const x = o.querySelector('#pkx'); if (x) x.onclick = () => { o.remove(); res(undefined); }; });
}
function showPile(title, cards) {
  const o = overlay(`<h2>${title}（${cards.length}）</h2><div class="grid">${cards.map(c => cardHTML(c)).join('') || '<p>空</p>'}</div><button class="btn">关闭</button>`);
  o.querySelector('.btn').onclick = () => o.remove();
}
// 从牌组选一张牌：mode = remove / upgrade / transform
function pickDeck(mode, done) {
  const T = { remove: '选择一张牌移除', upgrade: '选择一张牌升级', transform: '选择一张牌变化', dup: '选择一张牌复制' };
  const list = mode === 'upgrade' ? R.deck.filter(c => !c.up) : R.deck;
  if (!list.length) { done && done(false); return; }
  const o = overlay(`<h2>${T[mode]}</h2><div class="grid">${list.map(c => cardHTML(c)).join('')}</div>${mode === 'upgrade' ? '<button class="btn">取消</button>' : ''}`);
  o.querySelector('.btn')?.addEventListener('click', () => { o.remove(); done && done(false); });
  o.querySelectorAll('.card').forEach(el => el.onclick = (ev, ok) => {
    const i = R.deck.findIndex(c => c.uid == el.dataset.uid), c = R.deck[i];
    if (mode === 'upgrade' && ok !== true) { /* 先预览升级效果，确认后再升级 */
      const pv = overlay(`<h2>升级预览</h2><div class="upgpv">${cardHTML(c)}<span class="arr">➜</span>${cardHTML({ ...c, up: 1 })}</div><div class="row"><button class="btn gold" id="upy">确认升级</button><button class="btn" id="upn">换一张</button></div>`);
      pv.querySelector('#upn').onclick = () => pv.remove();
      pv.querySelector('#upy').onclick = () => { pv.remove(); el.onclick(null, true); };
      return; }
    if (mode === 'remove') R.deck.splice(i, 1);
    if (mode === 'dup') R.deck.push(mkCard(c.id, c.up));
    if (mode === 'upgrade') { c.up = 1; sting('upgrade', 900); }
    if (mode === 'transform') { const pool = Object.values(CARDS).filter(d => d.rar !== 'start' && d.rar !== 'gen' && mine(d) && d.id !== c.id); R.deck[i] = mkCard(pickOne(pool).id); }
    audio.level(); o.remove(); done && done(true);
  });
}
// 卡牌奖励池
/* 三选一保底：三张全是攻击或全是非攻击时，把稀有度最低的一张换成另一类（优先同稀有度） */
function mixTypes(out, okFn) {
  if (out.length < 3) return out; const isA = id => CARDS[id].type === 'atk', RK = { c: 0, u: 1, r: 2 };
  const nA = out.filter(isA).length; if (nA > 0 && nA < out.length) return out;
  const wantA = nA === 0; let i = 0; out.forEach((id, k) => { if ((RK[CARDS[id].rar] ?? 0) < (RK[CARDS[out[i]].rar] ?? 0)) i = k; });
  const rar = CARDS[out[i]].rar, base = Object.values(CARDS).filter(d => okFn(d) && !out.includes(d.id) && (d.type === 'atk') === wantA);
  const pool = base.filter(d => d.rar === rar).length ? base.filter(d => d.rar === rar) : base;
  if (pool.length) out[i] = pool[Math.floor(Math.random() * pool.length)].id;
  for (let k = out.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [out[k], out[j]] = [out[j], out[k]]; }
  return out;
}
function rollCards(...a) { return SR(rollCards0, a); }
function rollCards0(n, rareBonus = 0, onlyRare = false) {
  const out = [], L = lockedSet(), ok = d => mine(d) && !L.has(d.id) && !out.includes(d.id) && d.rar !== 'start' && d.rar !== 'gen';
  for (let tries = 0; out.length < n && tries < 60; tries++) {
    const x = Math.random(); const rar = onlyRare ? 'r' : x < .04 + rareBonus ? 'r' : x < .36 + rareBonus ? 'u' : 'c'; /* 稀有 4%、罕见 32%、普通 64% */
    let pool = Object.values(CARDS).filter(d => d.rar === rar && ok(d));
    if (!pool.length && onlyRare) pool = Object.values(CARDS).filter(d => d.rar === 'u' && ok(d)); /* 稀有牌不够时用罕见牌补 */
    if (!pool.length) pool = Object.values(CARDS).filter(ok);
    if (!pool.length) break;
    out.push(pickOne(pool).id);
  }
  mixTypes(out, d => ok(d) && (!onlyRare || d.rar === 'r'));
  return out.map(id => mkCard(id));
}
function chooseCard(cards, done, title = '选择一张牌加入牌组') {
  const lg = R && R.log ? { f: (R.floor0 || 0) + R.floor, o: cards.map(c => c.id), p: null } : null; if (lg) R.log.picks.push(lg);
  const o = overlay(`<h2>${title}</h2><div class="row">${cards.map(c => cardHTML(c)).join('')}</div><button class="btn">跳过</button>`);
  o.querySelector('.btn').onclick = () => { o.remove(); done(false); };
  o.querySelectorAll('.card').forEach(el => el.onclick = () => { const pc = cards.find(c => c.uid == el.dataset.uid); if (lg) lg.p = pc.id; R.deck.push(pc); audio.level(); o.remove(); done(true); });
}
function rollRelic(...a) { return SR(rollRelic0, a); }
function rollRelic0(rars = ['c', 'c', 'c', 'u', 'u', 'r'], crown = false) {
  for (let k = 0; k < 30; k++) { const r = pickOne(rars); const pool = Object.values(RELICS).filter(x => x.rar === r && mine(x) && !lockedSet().has(x.id) && !has(x.id) && (crown || x.id !== 'crown')); if (pool.length) return pickOne(pool).id; }
  const pool = Object.values(RELICS).filter(x => x.rar !== 'start' && x.rar !== 'boss' && mine(x) && !lockedSet().has(x.id) && !has(x.id) && (crown || x.id !== 'crown')); return pool.length ? pickOne(pool).id : null;
}
function gainRelic(id) { if (!id) return; R.relics.push(id); if (R.relics.length >= 15) ach('a_relic15'); if (id === 'herb') { R.maxHp += 10; R.hp += 10; } if (id === 'crown') { R.maxHp -= 10; R.hp = Math.min(R.hp, R.maxHp); } if (id === 'grail') { R.maxHp -= 5; R.hp = Math.min(R.hp, R.maxHp); } if (RELICS[id] && RELICS[id].pick) RELICS[id].pick(R); audio.level(); }
const rollBossRelics = () => SR(() => shuffle(Object.values(RELICS).filter(x => x.rar === 'boss' && !has(x.id)).map(x => x.id)).slice(0, 3));
function chooseBossRelic(ids, done) { /* Boss 秘宝三选一 */
  const o = overlay(`<div class="panel" style="width:min(760px,92vw);text-align:center"><h2>${tr('Boss 秘宝：选一个')}</h2><p style="opacity:.8">${tr('力量强大，但都有代价。')}</p><div class="row" style="justify-content:center;gap:12px;flex-wrap:nowrap">${ids.map(id => `<div class="reward brel" data-id="${id}" style="width:31%;min-width:0;margin:0;flex-direction:column;text-align:center"><img src="${RELICS[id].img}" style="width:64px;height:64px"><b>${tr(RELICS[id].name)}</b><span style="font-size:14px">${tr(RELICS[id].desc)}</span></div>`).join('')}</div><br><button class="btn" id="bsk">${tr('跳过')}</button></div>`);
  o.querySelectorAll('.brel').forEach(el => el.onclick = () => { gainRelic(el.dataset.id); o.remove(); done(true); });
  o.querySelector('#bsk').onclick = () => { o.remove(); done(false); };
}

// ---------- 标题 ----------
// ---------- 玩家名字 / 口令（存在浏览器里） ----------
const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k) || ''; localStorage.setItem(k, v); } catch (e) { return ''; } };
// ---------- 局外成长：进阶难度 + 解锁 ----------
const ASC = ['标准难度', '精英血量 +15%', '普通怪血量 +10%', '敌人伤害 +10%', '开局最大生命 -8', '营火只回复 20% 生命', 'Boss 血量 +15%', '战斗金币 -30%', '敌人伤害再 +10%', '开局牌组多一张「懊悔」', '精英开局有 1 点力量', '商店价格 +20%', '药水栏只有 2 格', '每场战斗第一回合少抽 1 张牌', '营火回血再少 5 点', '所有敌人血量再 +10%'];
const UNLOCKS = [
  { xp: 300, cards: ['dual', 'concert'], relics: [] },
  { xp: 800, cards: ['shinboku', 'sage'], relics: ['mic'] },
  { xp: 1500, cards: ['screen', 'distort', 'deadly'], relics: ['pad'] },
  { xp: 2500, cards: ['thunder'], relics: ['crown', 'feather'] },
];
const metaGet = () => { try { return Object.assign({ xp: 0, asc: {} }, JSON.parse(localStorage.getItem('tw_meta') || '{}')); } catch (e) { return { xp: 0, asc: {} }; } };
const metaSet = m => { try { localStorage.setItem('tw_meta', JSON.stringify(m)); } catch (e) {} };
const lockedSet = () => new Set(); const lockedSet0 = () => { const xp = metaGet().xp, s = new Set(); UNLOCKS.forEach(u => { if (xp < u.xp) [...u.cards, ...u.relics].forEach(x => s.add(x)); }); if (DEBUG) s.clear(); return s; };
const A_ = n => (R && R.asc || 0) >= n;
ASC.push(...ASC2);
const ONLINE = !/githack|localhost|127\.0\.0\.1|^file/.test(location.href); /* 试玩链接上没有后台 */
const API = /netlify\.app$/.test(location.hostname) ? '/api/scores' : 'https://the-way-up.netlify.app/api/scores'; /* itch.io 等外部站点连 Netlify 后台 */
const CHARINFO = {
  erin: { diff: 3, tip: '三个元素位，写入火、水、风；「祈唤」按组合把 10 种法术之一放进手牌。', line: '“火、水、风……这次搓哪一个呢。”', bio: '艾琳是精灵族的年轻魔法师，天生能同时感受到火、水、风。长老总说她太急，一个元素还没练稳就想把三个搅在一起。她偏不服：元素本来就会互相说话，只是没人肯听。听说山顶的门连着所有世界，她背着法杖就上了山，想看看门那边的元素长什么样。一路上法术时灵时不灵，她最怕的不是失手，是别人那句“我早说过”。后来她才明白，组合的诀窍从来不是快，而是等对的那一个。', end: '原来元素也要等时机……下次我会慢一点的。大概吧。', builds: [['三同专精', '把三格写成同一种元素，打出陨星、冰镜、风门这类大法术。', ['纯相爆发', '三相冠冕', '冰幕', '点火']], ['混合应变', '每回合换组合，多写入、多祈唤，吃不同配方的奖励。', ['临场变式', '四季轮转', '三色光', '调和']]] },
  gu: { diff: 2, tip: '飞剑留在身上，每把让攻击牌第一击 +1（每 2 把再额外 +1）、回合结束给 1 点格挡；攒够了也能一口气射出去。', line: '“剑在，人就在。”', bio: '顾清寒是雪山剑派的弟子。门里为“先练气”还是“先练剑”吵成两派，她两边都偷学，结果两边都不认她。魔王占了山顶，剑派被赶下山，师兄们各奔东西，只有她背着剑往回走。她习惯一个人练、一个人扛，连受了伤都只在夜里偷偷运气。直到有一回，同伴替她挡了一刀，她才发现：一个人能同时会两套剑法，一支队伍也能把几个怪人拧成一股。', end: '剑宗也好，气宗也罢……能并肩的，就是同门。', builds: [['养剑流', '飞剑攒在身上，攻击牌第一击越来越重，回合结束还给格挡。', ['养剑', '唤剑', '剑阵', '剑心通明']], ['射剑流', '养够飞剑后一口气射出去，打出一回合爆发。', ['万剑归一', '并指三剑', '剑意', '剑意循环']], ['连击流', '便宜的攻击牌一张接一张，越连越痛。', ['雪径连斩', '连环剑', '风过松', '双剑']]] },
  sylvie: { diff: 2, tip: '攒满 8 点龙血点「变身」，霜龙形态的三回合打得最狠；也可以不变身，把龙血留着吃加成。', line: '“……别让我变回那个样子。”', bio: '希尔薇是远古白龙最后的后裔，平时是个话少、怕冷的安静少女。可只要情绪一激动，鳞片就会从手背长出来，等回过神，四周已经结满了冰。她不记得变成龙时做过什么，所以一直离人很远。魔王占了祖先的龙巢，她不得不下山。第一次在大家面前变身那天，她以为同伴会逃开，结果有人只是把外套披到她肩上，说：“冷吧，变回来就好。”', end: '龙也好，人也好……你们都叫我希尔薇，那就够了。', builds: [['抢变身', '尽快攒满龙血，把霜龙三回合对准敌人最凶的时候。', ['极夜龙息', '血脉回响', '龙爪二式', '冬眠苏醒']], ['霜甲反击', '不急着变身，叠霜甲挡伤害再反打。', ['雪崩之心', '冰棺', '逆鳞刺', '冰晶脊']]] },
  mia: { diff: 1, tip: '分离时给团子下护卫或扑击指令；点「合体」让团子融进米娅身上，【猫】牌合体时更强。驯养牌和灵魂恩赐能把团子养强。', line: '“团子，拜托你了喵。”', bio: '米娅是人类和猫耳族的混血，两边的族人都不太接纳她，从小只有云猫团子陪着。团子的母亲是山里的守护神，被哥布林抓走了，米娅抱着团子就上了山。她嘴上总说“拜托你了喵”，其实每次团子冲出去，她的尾巴都绷得笔直。她以为自己一直在保护团子，直到团子第一次挡在她前面，冲着比自己大十倍的怪物炸毛。原来团子也想保护她。', end: '团子，我们找到妈妈了喵……以后，换我们一起保护她。', builds: [['扑击', '团子当主攻，配合扑击目标打出加成。', ['大猫扑杀', '夹击', '追踪哨', '绕背']], ['护卫', '团子替你挡刀，再把挡下的伤害还回去。', ['云猫守门', '护主反扑', '掩护撤退', '不动如山']], ['照料', '保住团子让它一路长大。', ['猫薄荷', '暖窝', '绝不松手', '舔毛']]] },
  feiyue: { diff: 3, tip: '花自己的生命换高伤害和召唤血蝠、血骑士；所有伤害都会吸一点血回来。', line: '“……血的味道，我才不喜欢。”', bio: '绯月是日本的高中生，那道光卷走的不止三个人。她一直不知道，母亲那边流着吸血鬼的血，直到古堡的血月升起，她的眼睛在黑暗里亮了起来。伯爵一眼认出了她，说这里才是她的家。她拒绝了，可每用一次这股力量，她就离人类远一点。最让她害怕的不是血，是同伴哪天也用伯爵那样的眼神看她。后来她发现，大家看她的眼神始终没变：还是那个会把最后一口水让出去的同学。', end: '我还是我。只是……以后晚上，我来守夜吧。', builds: [['鲜血', '主动献血，攒够鲜血打出爆发。', ['破脉', '血尽天明', '血祭', '血线']], ['吸血', '靠吸血把献掉的血补回来。', ['血契', '借血还血', '夜饮', '红爪']], ['蝙蝠', '放出蝙蝠叠血痕，再全部出猎。', ['万蝠降临', '翼刃', '蝠影', '响指']]] },
  miko: { diff: 1, end: '这次换我说……谢谢你们，撑住了我。', tip: '结界越叠越厚，每回合自动加格挡。防守稳，最适合新手。', line: '“神社的铃，也能替异世界的人挡一挡灾。”', bio: '千早从小在日本的神社帮忙。祭典散场后，她常留下来收灯笼，也总记得把最靠近台阶的那盏留到最后。到了异世界，她手里的神乐铃能撑起护住同伴的结界，破魔箭能净化不死的怪物。平时她说话轻声细气，可只要还有人没撤到安全的地方，谁也劝不动她先走。一路上，最难开口的反倒是那句“我撑不住了”。她慢慢学着在手开始发抖时，就喊同伴的名字。', builds: [['结界防守流', '每回合自动叠结界，白拿格挡，稳稳磨死敌人。', ['神乐舞', '注连绳', '御神木', '护身符']], ['结界爆发流', '先把结界叠高，再一口气换成伤害。', ['破邪结界', '破魔·满月', '镇魂歌', '破魔箭']]] },
  hero: { diff: 2, end: '回家之前，谁都不许散伙——到家以后也不许。', tip: '打牌攒光弹，回合结束自动扫射。光弹越多打得越猛，规则最简单。', line: '“这关我熟！……喂，等等，咱们一起走啊。”', bio: '林拓是个爱打游戏的普通初中生。那台旧掌机的电池盖用胶带粘着，他还是天天把它塞进书包。穿越以后，掌机能射出光弹，充一次电就是装填一次弹药。他嘴上喊着“这关我熟”，等光弹打光了，才想起自己根本没问撤退路线。比起打不过的敌人，他更怕有人说“接下来各走各的”。后来有一次，他终于肯蹲在路边给掌机充电，抬头问了一句：“能等我一下吗？”', builds: [['弹幕流', '光弹越多越好，回合结束自动扫射。', ['充电', '电池扩容', '满弹连射', '全屏扫射']], ['重弹流', '光弹不用多，提高每一发的伤害。', ['双持', '超频', '速射', '连射']]] },
  witch: { diff: 2, end: '村子里的人都回来了……原来我，也算够格了吧。', tip: '随机炼金瓶 + 剧毒，慢慢把敌人磨死。每局手感都不一样。', line: '“村子里还有人在等我。跟紧，左边那条路能上山。”', bio: '莉泽是山脚村庄的小魔女，也是个还没出师的炼金学徒。药水调得不错，毒药调得更好，就是瓶塞上的记号画得太像，有时得迎着光看半天，才敢递给同伴。村民被抓走后，她把能用的瓶瓶罐罐全塞进挎包，独自上山找帮手。她认得山上每一种草，知道哪段坡下过雨就不能走。可一到自己也没去过的岔路口，她还是习惯咬着牙挑一条。直到有一次，她把地图摊在大家中间，承认自己也拿不准。', builds: [['剧毒流', '叠毒慢慢磨，再翻倍或一次引爆。', ['疫病', '毒雾', '催化剂', '毒爆']], ['炼金瓶流', '攒很多炼金瓶，配合加成连续扔。', ['药剂腰包', '调药', '贤者之石', '炼金爆发']]] },
  heroine: { diff: 3, end: '两只耳机都摘了。今天，我想听你们说话。', tip: '给敌人叠共鸣，满 10 层爆音。要算层数，玩好了伤害最高。', line: '“……耳机先摘一只。你们说，我在听。”', bio: '苏音总戴着一副粉色耳机，喜欢把同一段旋律反复听上好几遍。身边太吵的时候，只要把音量调高一点，她就能安静下来。到了异世界，耳机里的音乐能在敌人身上叠起共鸣，等震动积到足够强，她就踩着节拍将它引爆。队伍里数她最安静，可每次开打，大家都会下意识地等她那一拍落下来。有一回，她只顾数拍子，错过了同伴喊她的声音。从那以后，她开始把一边耳罩拨开。', builds: [['爆音流', '把共鸣叠到 10 层，反复触发爆音。', ['低频', '演唱会', '回声', '失真']], ['清算流', '不等爆音，直接把共鸣换成伤害。', ['重低音', '高音', '破音', '共鸣冲击']]] },
};
const ORDER = ['miko', 'hero', 'witch', 'heroine', 'erin', 'gu', 'sylvie', 'mia', 'feiyue'];
const SOON = `<div class="reward cc soon"><div class="qm">?</div><b>？？？</b><span class="cd">即将加入</span><span class="ct">那道光里，好像还有别人的影子……</span></div>`; /* 留白：以后加角色 */
function title() {
  R = null; B = null; setMusic('menu');
  view.innerHTML = `<div class="bg" style="background:url(assets/bg/title.jpg) center/cover,url(assets/bg/battle_castle.jpg) center/cover"></div><div class="tshade"></div>
   <div class="tlogo"><h1>通往顶端</h1><p class="en">THE WAY UP</p><p class="en2">OTHERWORLD DECK</p></div>
   <div class="tbox"><input id="nm" class="inp" maxlength="8" placeholder="输入你的名字（可不填）" value="${esc(LS('tw_name'))}">
    <input id="pin" class="inp sm" maxlength="6" inputmode="numeric" placeholder="口令（可选，4～6 位数字）" value="${esc(LS('tw_pin'))}">
    <button class="btn big" id="enter">进入游戏</button><p class="tkeys">设了口令，别人就不能用你的名字上排行榜</p>${langBar()}</div>`;
  bindLang(title); SCREEN = 'title';
  const go = () => { const n = $('#nm').value.trim() || ('Guest' + Math.floor(100 + Math.random() * 900)); LS('tw_name', n); LS('tw_pin', $('#pin').value.trim()); mainMenu(); };
  $('#enter').onclick = go; $('#nm').onkeydown = $('#pin').onkeydown = e => { if (e.key === 'Enter') go(); };
}
function runHistory() { /* 对局历史和统计（存在本机） */
  let H = []; try { H = JSON.parse(localStorage.getItem('tw_hist') || '[]'); } catch (e) {}
  const st = Object.keys(CHARS).map(c => { const r = H.filter(h => h.c === c); return r.length ? `<tr><td>${CHARS[c].name}</td><td>${r.length}</td><td>${r.filter(h => h.w).length}</td><td>${Math.round(r.filter(h => h.w).length / r.length * 100)}%</td><td>${Math.max(...r.map(h => h.f))}</td></tr>` : ''; }).join('');
  const rows = H.slice(0, 20).map(h => `<tr><td>${new Date(h.t).toLocaleDateString()}</td><td>${CHARS[h.c] ? CHARS[h.c].name : h.c}</td><td>${h.w ? tr('通关') : t('第 {0} 章 · 第 {1} 层', h.a, h.f)}</td><td>${h.asc}</td><td>${h.by ? h.by.split(' + ').map(n => tr(n)).join(' + ') : ''}</td></tr>`).join('');
  const o = overlay(`<div class="panel" style="width:820px;max-height:86vh;overflow:auto"><h2>${tr('战绩')}</h2>${H.length ? `<h3>${tr('各角色')}</h3><table class="hist"><tr><th>${tr('角色')}</th><th>${tr('局数')}</th><th>${tr('通关')}</th><th>${tr('胜率')}</th><th>${tr('最高层数')}</th></tr>${st}</table><h3>${tr('最近 20 局')}</h3><table class="hist"><tr><th>${tr('日期')}</th><th>${tr('角色')}</th><th>${tr('结果')}</th><th>${tr('进阶')}</th><th>${tr('倒在')}</th></tr>${rows}</table>` : `<p>${tr('还没有完成过冒险。')}</p>`}<br><button class="btn" id="hx">${tr('返回')}</button></div>`);
  o.querySelector('#hx').onclick = () => o.remove();
}
function mainMenu() {
  R = null; B = null; setMusic('menu');
  const sv = load(), nm = LS('tw_name');
  view.innerHTML = `<div class="bg" style="background:url(assets/bg/title.jpg) center/cover,url(assets/bg/battle_castle.jpg) center/cover"></div><div class="tshade"></div>
   <div class="tlogo sm"><h1>通往顶端</h1><p class="en">THE WAY UP</p></div>
   <div class="mmenu">${nm ? `<p class="who">冒险者：<b data-noi18n>${esc(nm)}</b></p>` : ''}
    ${sv ? `<button class="btn mm" id="cont">继续冒险<small>${CHARS[sv.char || 'hero'].name} · 第 ${sv.floor} 层</small></button>` : ''}
    <button class="btn mm" id="start">新的冒险</button><button class="btn mm" id="book">图鉴</button>
    <button class="btn mm" id="rank">排行榜</button><button class="btn mm" id="hist">战绩</button><button class="btn mm" id="achb">成就</button><button class="btn mm" id="set">设置</button>
    <button class="btn mm sm2" id="back">返回标题</button>${langBar()}</div>`;
  bindLang(mainMenu); SCREEN = 'menu';
  $('#start').onclick = () => askName(() => { if (!sv) return pickChar();
    const y = overlay(`<h2>开始新的冒险？</h2><p>当前存档（${CHARS[sv.char || 'hero'].name} · 第 ${sv.floor} 层）会被放弃。</p><div class="row"><button class="btn red" id="y1">放弃旧档，重新开始</button><button class="btn" id="y0">取消</button></div>`);
    y.querySelector('#y0').onclick = () => y.remove(); y.querySelector('#y1').onclick = () => { y.remove(); clearSave(); pickChar(); }; });
  $('#cont')?.addEventListener('click', () => { R = sv; if (R.pending && R.snap && ['fight', 'elite', 'boss', 'final', 'trueb'].includes(R.pending)) { try { const o = JSON.parse(R.snap); R = Object.assign(o, { snap: R.snap }); } catch (e) {} } if (R.wait === 'bless') blessScreen(); else if (R.wait === 'true') trueGate(); else if (R.act2wait) act2Choice(); else if (R.wait === 'act3') act3Choice(); else if (R.wait === 'rift') riftChoice(); else if (R.wait === 'final') finalPrep(); else if (R.wait === 'ending') endingChoice(); else if (R.wait === 'trial') pickTrial(); else if (R.wait === 'layer') layerEnd(); else if (R.wait === 'trialR') trialReward(R.trialK); else if (R.loot) rewardScreen(); else if (R.pending) enterNode(R.pending); else mapScreen(); });
  $('#book').onclick = () => book();
  $('#hist').onclick = runHistory; $('#achb').onclick = achScreen;
  if (!LS('tw_teleNote')) { LS('tw_teleNote', '1'); setTimeout(() => tip(tr('为了调整平衡，游戏会匿名上传每局的数据（不含名字），可以在设置里关闭')), 1200); }
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
    <div class="sbox"><h3>偏好</h3>${ck('tips', '显示规则提示', TIPS)}${ck('shake', '屏幕震动', SET.shake)}${ck('fast', '加速模式（动画快一倍）', SET.fast)}${ck('kwtip', '卡牌关键词说明框', SET.kwtip)}${ck('tele', '匿名上传对局数据（帮助调平衡）', SET.tele)}</div>
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
function rankBoard(daily) {
  const o = overlay(`<h2>${daily ? tr('今日排行') : '排行榜'}</h2><div id="rk" class="rk">读取中……</div><button class="btn" id="rkx">关闭</button>`);
  o.querySelector('#rkx').onclick = () => o.remove();
  const box = o.querySelector('#rk');
  if (!ONLINE) { box.innerHTML = '<p>排行榜要在正式网站上才能用（试玩链接没有后台）。</p>'; return; }
  fetch(API + (daily ? '?daily=' + daily : ''), { cache: 'no-store' }).then(r => r.json()).then(d => {
    if (!d.ok || !d.list.length) { box.innerHTML = '<p>还没有人上榜，快来当第一名！</p>'; return; }
    const me = LS('tw_name');
    box.innerHTML = `<table><tr><th>#</th><th>名字</th><th>角色</th><th>到达</th><th>击杀</th><th>积分</th></tr>${d.list.map((r, i) => `<tr class="${r.name === me ? 'me' : ''}"><td>${i + 1}</td><td data-noi18n>${esc(r.name)}</td><td><img src="assets/${CHARS[r.char].dir}/portrait.png"></td><td>${r.win ? '<b class="win">通关</b>' : '第 ' + r.floor + ' 层'}</td><td>${r.kills}</td><td><b>${r.score}</b></td></tr>`).join('')}</table>`;
  }).catch(() => { box.innerHTML = '<p>暂时连不上排行榜，稍后再试。</p>'; });
}
function submitScore(win) {
  const name = LS('tw_name'); if (DEBUG || !ONLINE || !name) return Promise.resolve(null);
  return fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, pin: LS('tw_pin'), char: R.char, asc: R.asc || 0, floor: (R.floor0 || 0) + R.floor, kills: R.kills || 0, elites: R.elites || 0, win, hp: Math.max(0, R.hp), daily: R.daily || '', bosses: R.bosses || 0, endless: R.endless || 0, trueEnd: !!R.trueEnd }) })
    .then(r => r.json()).catch(() => null);
}

function dailyScreen() { const key = todayKey(), dd = dailyOf(key, ORDER.filter(k => !CHARS[k].temp)); let best = {}; try { best = JSON.parse(LS('tw_daily') || '{}'); } catch (e) {}
  const o = overlay(`<div class="panel" style="width:min(620px,92vw);text-align:center"><h2>${tr('每日挑战')} <small data-noi18n>${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6)}</small></h2><p>${tr('今天所有人用同一个角色、同一张地图、同样的修正。')}</p>
   <img src="assets/${CHARS[dd.char].dir}/portrait.png" style="height:120px"><p><b>${tr(CHARS[dd.char].name)}</b></p>
   ${dd.mods.map(k => `<p><b>${tr(MODS[k][0])}</b>：${tr(MODS[k][1])}</p>`).join('')}
   ${best[key] ? `<p style="color:#ffd35a">${tr('今天的最好成绩')}：${best[key]}</p>` : ''}
   <div class="row" style="justify-content:center"><button class="btn gold" id="dgo">${tr('开始挑战')}</button><button class="btn" id="drk">${tr('今日排行')}</button><button class="btn" id="dx">${tr('返回')}</button></div></div>`);
  o.querySelector('#dx').onclick = () => o.remove(); o.querySelector('#drk').onclick = () => rankBoard(key);
  o.querySelector('#dgo').onclick = () => { o.remove(); clearSave(); newRun(dd.char, 0, { mode: 'daily', seed: dd.seed, mods: dd.mods }); R.daily = key; save(); blessScreen(); }; }
function pickChar() {
  view.innerHTML = `${bgHTML()}<div class="panel csel"><h2>选择角色</h2><div class="row">${ORDER.map(k => { const c = CHARS[k], i = CHARINFO[k];
    const lk = c.temp && !DEBUG; return `<div class="reward cc${lk ? ' locked' : ''}" ${lk ? '' : `data-c="${k}"`}>${lk ? `<i class="lockb">${t('即将推出')}</i>` : c.temp ? `<i class="lockb">${t('测试中')}</i>` : ''}<img src="assets/${c.dir}/portrait.png"${c.tint ? ` style="filter:${c.tint}"` : ''}><b>${tr(c.name)}</b><span class="cl">${i.line}</span><span class="cd">${tr(c.desc)}</span>
     <span class="diff">上手难度 <i>${'★'.repeat(i.diff)}${'☆'.repeat(3 - i.diff)}</i> ${['', '简单', '普通', '困难'][i.diff]}</span><span class="ct">${i.tip}</span></div>`; }).join('')}</div>
   <div class="ascbar">进阶难度 <button class="btn" id="am">−</button><b id="av"></b><button class="btn" id="ap">＋</button><span id="ad"></span></div>
   <div class="modebar"><button class="btn gold" id="daily">${tr('每日挑战')}</button><button class="btn" id="cust">${tr('自定义模式')}</button><span id="mdx"></span></div>
   <button class="btn" id="back">返回</button></div>`;
  let opt = {};
  const showOpt = () => { $('#mdx').innerHTML = opt.mode === 'custom' ? `${tr('自定义')}：${opt.seed ? tr('种子') + ' <b data-noi18n>' + esc(opt.seed) + '</b> · ' : ''}${opt.mods.length ? opt.mods.map(k => tr(MODS[k][0])).join('、') : tr('无修正')} <a id="mclr">✕</a>` : ''; $('#mclr')?.addEventListener('click', () => { opt = {}; showOpt(); }); };
  $('#daily').onclick = () => dailyScreen();
  $('#cust').onclick = () => { const o = overlay(`<div class="panel" style="width:min(640px,92vw)"><h2>${tr('自定义模式')}</h2><p>${tr('种子相同，地图和奖励就相同。可以和朋友比同一局。')}</p>
     <label class="sl"><span>${tr('种子')}</span><input id="cseed" class="inp sm" maxlength="16" value="${esc(opt.seed || '')}" placeholder="${tr('留空 = 随机')}"></label>
     <div class="modl">${Object.entries(MODS).map(([k, m]) => `<label class="ck"><input type="checkbox" data-m="${k}" ${(opt.mods || []).includes(k) ? 'checked' : ''}><span><b>${tr(m[0])}</b>：${tr(m[1])}</span></label>`).join('')}</div>
     <div class="row"><button class="btn gold" id="cok">${tr('确定，去选角色')}</button><button class="btn" id="cx">${tr('取消')}</button></div></div>`);
    o.querySelector('#cx').onclick = () => o.remove();
    o.querySelector('#cok').onclick = () => { opt = { mode: 'custom', seed: o.querySelector('#cseed').value.trim(), mods: [...o.querySelectorAll('[data-m]:checked')].map(x => x.dataset.m) }; o.remove(); showOpt(); }; };
  const M = metaGet(); let asc = 0, cur = 'miko';
  const mx = k => 20; /* 全部解锁 */
  const show = () => { asc = Math.min(asc, mx(cur)); $('#av').textContent = asc; $('#ad').textContent = asc ? tr(ASC[asc]) + (asc > 1 ? tr('（并包含之前所有进阶）') : '') : tr('标准难度'); };
  view.querySelectorAll('[data-c]').forEach(el => { el.onmouseenter = () => { cur = el.dataset.c; show(); }; el.onclick = () => { newRun(el.dataset.c, Math.min(asc, mx(el.dataset.c)), opt); save(); story('story_intro', ['放学路上，三个互不相识的少年少女，被一道光卷进了异世界。', '迎接他们的，是本地的小魔女莉泽——她的村民被哥布林抓上了山。', '“回家的方法，也许就在山顶。”四个人，一起出发吧。'], blessScreen, 'introSeen'); }; });
  $('#am').onclick = () => { asc = Math.max(0, asc - 1); show(); }; $('#ap').onclick = () => { asc = Math.min(mx(cur), asc + 1); show(); }; show();
  $('#back').onclick = mainMenu;
}
// ---------- 地图 ----------
const NODEICON = Object.fromEntries(['fight', 'elite', 'event', 'rest', 'shop', 'treasure'].map(k => [k, `<img src="assets/ui2/node_${k}.png">`]));
const NODENAME = { fight: '战斗', elite: '精英', event: '未知', rest: '营火', shop: '商店', treasure: '宝箱' };
function available() {
  if (!R.pos) return R.map[0].filter(Boolean);
  if (R.pos.r === RW() - 1) return ['boss'];
  const cur = R.map[R.pos.r][R.pos.c]; return cur.next.map(c => R.map[R.pos.r + 1][c]);
}
const NSET = () => ACT() === 2 ? 'node2' : ACT() === 3 ? 'node3' : '';
function mapScreen() { SCREEN = 'map'; delete R.shopStock; delete R.evPick;
  setMusic('menu'); delete R.pending; delete R.pendEnc; delete R.snap; save();
  const ROWS = RW(), av = available(), H = ROWS * 92 + 320, LC = ACT() === 3 ? '#3c4f78' : '#5a3a1a';
  let lines = '';
  for (const row of R.map) for (const nd of row) if (nd) for (const c of nd.next) { const t = R.map[nd.r + 1][c]; lines += `<line x1="${nd.x}" y1="${nd.y}" x2="${t.x}" y2="${t.y}" stroke="${LC}" stroke-width="3" stroke-dasharray="4 8" stroke-linecap="round" opacity=".75"/>`; }
  for (const nd of R.map[ROWS - 1]) if (nd) lines += `<line x1="${nd.x}" y1="${nd.y}" x2="500" y2="110" stroke="${LC}" stroke-width="3" stroke-dasharray="4 8" stroke-linecap="round" opacity=".75"/>`;
  const visited = R.path || [];
  let nodes = '';
  for (const row of R.map) for (const nd of row) if (nd) {
    const isAv = av.includes(nd), done = visited.some(p => p.r === nd.r && p.c === nd.c), cur = R.pos && R.pos.r === nd.r && R.pos.c === nd.c;
    nodes += `<div class="node ${isAv ? 'av' : ''} ${done ? 'done' : ''} ${cur ? 'cur' : ''}" style="left:${nd.x}px;top:${nd.y}px" data-r="${nd.r}" data-c="${nd.c}" title="${NODENAME[nd.type]}${nd.burn && !(R.keys || {}).g ? ' · ' + tr('燃烧的精英：更强，打赢得到翡翠钥匙') : ''}">${nd.burn && !(R.keys || {}).g ? '<i class="burn">🔥</i>' : ''}${NSET() && ['fight', 'elite'].includes(nd.type) ? `<img src="assets/ui2/${NSET()}_${nd.type}.png">` : NODEICON[nd.type]}</div>`;
  }
  const bk = R.boss;
  nodes += `<div class="node boss ${av[0] === 'boss' ? 'av' : ''}" style="left:500px;top:110px" title="Boss：${ENEMIES[bk].name}"><img src="assets/ui2/${NSET() ? NSET() + '_boss' : 'node_boss'}.png"></div>`;
  view.innerHTML = `${topBar()}<div id="map"><div id="mapin" style="height:${H}px${ACT() === 3 ? ';background-image:url(assets/bg/map3_parchment.jpg)' : ''}"><svg width="1000" height="${H}">${lines}</svg>${nodes}
   <div style="position:absolute;left:500px;top:186px;transform:translateX(-50%);font-size:18px;font-weight:bold;color:#6a1a10;text-shadow:0 0 4px #f6e6c0">${ENEMIES[bk].name}</div></div></div>
   <div id="legend">${Object.keys(NODENAME).map(k => `<div>${NSET() && ['fight', 'elite'].includes(k) ? `<img src="assets/ui2/${NSET()}_${k}.png">` : NODEICON[k]}${NODENAME[k]}</div>`).join('')}</div>`;
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
  if (t === 'final') { battle([FINAL3], 'boss'); B.final = 1; return; }
  if (t === 'trueb') { battle([TRUEB], 'boss'); B.trueB = 1; B.final = 1; return; }
  if (t === 'fight' || t === 'elite') { // 记住这场遭遇，中途退出再进来还是同一批怪
    R.log && R.log.hp.push([(R.floor0 || 0) + R.floor, R.hp, t]);
    if (!R.pendEnc) { R.pendEnc = SR(() => t === 'elite' ? pickOne(ENC().elite) : pickOne(R.fights < 3 ? ENC().easy : ENC().hard)); if (t === 'fight') R.fights++; snap(); save(); }
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
  try { const M = metaGet(); M.seen = M.seen || {}; if (!M.seen[key]) { M.seen[key] = 1; metaSet(M); if (Object.keys(ENEMIES).every(k => M.seen[k] || ENEMIES[k].hide)) ach('a_codex'); } } catch (e) {}
  const d = ENEMIES[key], hp = rnd(d.hp[0], d.hp[1]);
  const hm = 1 + (A_(1) && d.elite ? .15 : 0) + (A_(2) && !d.elite && !d.boss ? .1 : 0) + (A_(6) && d.boss ? .15 : 0) + (A_(15) ? .1 : 0) + (A_(18) && d.elite ? .1 : 0) + (A_(20) && d.boss ? .1 : 0) + (MOD('heavy') ? .25 : 0);
  const xm = R && R.endless ? endlessMul(R.endless) : { hp: 1, dmg: 1 }, tr2 = R && R.trials || [];
  const hp1 = Math.round(hp * hm * (ACT() === 2 ? RULES.act2Mul : ACT() === 3 ? RULES.act3Hp : 1) * xm.hp * (d.elite && tr2.includes('blood') ? 1.25 : 1));
  const e = { key, d, name: d.name, hp: hp1, max: hp1, dmul: (1 + (A_(3) ? .1 : 0) + (A_(8) ? .1 : 0) + (A_(17) && !d.elite && !d.boss ? .1 : 0)) * (ACT() === 2 ? RULES.act2Mul : ACT() === 3 ? RULES.act3Dmg : 1) * xm.dmg * (d.boss && tr2.includes('tyrant') ? 1.15 : 1), block: 0, st: {}, turn: 0, hist: [], id: 'e' + eid++, move: null };
  if (A_(10) && d.elite) e.st.str = 1; if (A_(20) && d.boss) e.st.str = (e.st.str || 0) + 1;
  d.init && d.init(e); return e;
}
const alive = () => B.en.filter(e => !e.dead);
function battle(keys, kind) {
  preloadExtra(R.char); const burnN = kind === 'elite' && R.pos && R.map[R.pos.r] && R.map[R.pos.r][R.pos.c] && R.map[R.pos.r][R.pos.c].burn && !(R.keys || {}).g;
  hst = { n: 'idle', t: performance.now() };
  if (kind === 'fight' && R.trials && R.trials.includes('swarm') && keys.length < 4) keys = [...keys, 'd_egg'];
  const bg = ACT() === 3 && R.rift ? (kind === 'boss' && keys[0] !== FINAL3 ? 'c3_hall' : RIFTBG) : ACT() >= 3 ? (kind === 'boss' ? 'c3_hall' : 'c3_battle') : ACT() === 2 ? (kind === 'boss' ? 'c2_hall' : pickOne(['c2_exterior', 'c2_crypt'])) : kind === 'boss' ? 'battle_castle' : pickOne(BGS);
  B = { kind, bg, en: SR(() => keys.map(mkEnemy)), p: { block: 0, energy: 0, st: {}, noDraw: 0 }, draw: SR(() => shuffle(R.deck.map(c => ({ ...c })))), hand: [], disc: [], exh: [], turn: 0, atkCnt: 0, sel: -1, busy: false, fx: [], over: false };
  setMusic(kind === 'boss' ? (keys[0] === FINAL3 ? 'final' : keys[0] === 'dev_debug' ? 'true' : 'boss') : kind === 'elite' ? 'elite' : 'battle'); setTimeout(() => B && B.en[0] && gv(B.en[0], 'laugh'), 500); if (kind === 'boss') audio.boss();
  if (has('charm')) B.p.st.str = 1; if (has('lantern')) B.p.st.dex = (B.p.st.dex || 0) + 1;
  
  if (has('suzu')) B.p.st.kek = 5 + (has('omamori') ? 2 : 0); else if (has('omamori')) B.p.st.kek = 2;
  if (has('phones')) B.en.forEach(e => e.st.res = 2);
  if (has('spikes')) B.p.st.thorns = 3;
  if (has('wardrum')) B.en.forEach(e => e.st.vuln = 1);
  B.en.filter(e => e.key === 'gob_bomb').forEach((e, i) => e.st.fuse = 3 + i); // 多个炸弹兵错开倒计时
  B.hp0 = R.hp; if (burnN) { B.burn = 1; B.en.forEach(e => { e.hp = e.max = Math.round(e.max * 1.3); e.st.str = (e.st.str || 0) + 2; }); setTimeout(() => say(tr('燃烧的精英：更强了！打赢可以得到翡翠钥匙')), 1600); }
  B.en.forEach(e => e.move = e.d.ai(e, BE));
  CORE3.battleStart(B, has, R);
  MECH.battleStart(G);
  startTurn(true);
  if (has('batcloak')) B.p.block += 8;
  if (has('pocketwatch')) drawCards(2);
  setTimeout(tutorial, 1300);
  banner(kind === 'boss' ? `Boss · ${ENEMIES[keys[0]].name}` : kind === 'elite' ? '精英战斗' : '战斗开始');
  if (ENEMIES[keys[0]].intro) setTimeout(() => say(ENEMIES[keys[0]].intro), 1300);
  if (keys.some(k => k === 'dev_boss' || k === 'dev_debug')) setTimeout(() => tip(tr('弱点：一回合打出 3 张 0 费牌，或者打出 6 张牌，他会程序崩溃，晕一回合')), 3200);
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
function say(t) { stage.querySelectorAll('.say').forEach(x => x.remove()); const b = document.createElement('div'); b.className = 'say'; b.textContent = t; stage.appendChild(b); setTimeout(() => b.remove(), 3600); }
function banner(t) { const b = document.createElement('div'); b.id = 'banner'; b.textContent = t; stage.appendChild(b); setTimeout(() => b.remove(), 1200); }

// 伤害计算
function atkVal(src, tgt, base, strMul = 1) {
  let d = (base + (src.st.str || 0) * strMul) * (src.dmul || 1); if (src.st.weak) d *= .75; if (tgt && tgt.st.vuln) d *= 1.5; return Math.max(0, Math.floor(d));
}
function fx(who, text, cls) { B.fx.push({ who, text, cls }); }
// 对目标造成伤害（已计算好的数值），返回未被格挡的伤害
function hurt(tgt, amt, attacker, direct = true) {
  const isP = tgt === B.p;
  if (!isP && attacker === B.p && MOD('glass')) amt = Math.floor(amt * 1.5);  if (!isP && tgt.st.aegis) { fx(tgt.id, '免疫', 'blk'); return 0; } if (!isP && tgt.d && tgt.d.undead && has('silvercross')) amt = Math.floor(amt * 1.25); if (!isP && tgt.st.intang) amt = Math.ceil(amt / 2); if (!isP && tgt.st.fly) { amt = Math.ceil(amt / 2); addSt(tgt, 'fly', -1); if (!tgt.st.fly) { tgt.grounded = 1; fx(tgt.id, '坠落！', 'st'); } } if (!isP && attacker === B.p && direct) tgt.hitT = 1; const eAtk = isP && attacker && attacker !== B.p; amt = CORE3.pre(B, tgt, amt, isP, attacker, has); if (eAtk) amt = MECH.preBlock(G, amt, attacker); let blk = !isP && B.p.pierce && attacker === B.p ? 0 : tgt.block, left = amt;
  const used = Math.min(blk, left); tgt.block -= used; left -= used; if (eAtk) left = MECH.postBlock(G, left, attacker);
  const hpLost = isP ? left : Math.min(left, Math.max(0, tgt.hp)); /* 实际打掉的生命（不算溢出） */
  if (!isP && attacker === B.p && left >= 60) ach('a_hit60'); if (isP && left > 0) B.hurtT = 1;
  if (isP) { R.hp -= left; } else { tgt.hp -= left; } CORE3.after(tgt, left, isP, attacker, B);
  fx(isP ? 'hero' : tgt.id, left > 0 ? `-${left}` : '格挡', left > 0 ? 'dmg' : 'blk'); B.hitSet.add(isP ? 'hero' : tgt.id);
  if (attacker && tgt.st.thorns && attacker !== tgt) { const th = tgt.st.thorns; hurt(attacker, th); }
  if (!isP && left > 0) { eAct(tgt, 'hurt'); if (tgt.hp > 0) gv(tgt, 'hurt'); }
  if (!isP && tgt.hp <= 0 && !tgt.dead) killE(tgt);
  if (!isP && !tgt.dead && left > 0 && tgt.d.onHurt) tgt.d.onHurt(tgt, BE);
  if (!isP && !tgt.dead && tgt.key === 'gob_wolf' && tgt.hp <= tgt.max / 2) dismount(tgt);
  if (isP) pDeath();
  if (false && isP && R.hp <= 0 && (R.potions || []).includes('fairy')) { R.potions.splice(R.potions.indexOf('fairy'), 1); R.hp = Math.floor(R.maxHp * .3); fx('hero', '复活药水！', 'heal'); }
  if (false && isP && R.hp <= 0) { if (has('feather') && !R.feather) { R.feather = 1; R.hp = Math.floor(R.maxHp * .3); fx('hero', '凤凰重生！', 'heal'); } }
  if (left > 0) { if (isP) { audio.hurt(); heroAct('hurt'); } else audio.hit('mel'); }
  return hpLost;
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
function killE(e) { const od = ENEMIES[e.key].onDie; gv(e, 'die'); if (R) R.kills = (R.kills || 0) + 1; eAct(e, 'down'); e.dead = true; e.hp = 0; e.deadAt = Date.now(); audio.kill(); if (!e.rewarded && !e.fled) { e.rewarded = 1; if (has('fang')) { healP(3); } if (has('wolffang') && B) addSt(B.p, 'str', 1); if (B && B.p.st.chain) { G.ammo(3 * B.p.st.chain); drawCards(B.p.st.chain); } } if (e.stolen && !e.fled) { R.gold += e.stolen; fx('hero', `+${e.stolen} 金币`, 'heal'); e.stolen = 0; } if (od && !e.fled) od(e, BE); }
function boom(t) { // 爆音：伤害后保留 3 层（失真再 +3），多出的层数也保留
  const d = 18 + (B.p.st.dist ? 8 : 0) + (has('mic') ? 6 : 0); if (!t.boomCC) { t.boomCC = 1; MECH.cc(G, t, 'stun'); }
  t.st.res = t.st.res - 10 + 3 + (B.p.st.dist ? 3 : 0);
  fx(t.id, '爆音！', 'st'); hurt(t, d); if (has('metro') && !B.p.metroUsed) { B.p.metroUsed = 1; B.p.energy++; } }
function healP(n) { if (n <= 0 || R.hp <= 0) return 0; const k = Math.min(n, R.maxHp - R.hp); R.hp += k; if (k > 0) fx('hero', `+${k}`, 'heal'); return k; } /* 生命已归零时普通回复无效 */
function addSt(t, k, n) { t.st[k] = (t.st[k] || 0) + n; if (t.st[k] === 0) delete t.st[k]; }

// 卡牌用的接口
const G = {
  has: id => has(id), handSize() { return B.hand.length; }, potsInHand() { return B.hand.filter(c => CARDS[c.id].potion).length; },
  kekSpend(n) { if ((B.p.st.kek || 0) < n) return false; addSt(B.p, 'kek', -n); if (B.p.st.sakaki && (B.p.sakT || 0) < B.p.st.sakaki) { B.p.sakT = (B.p.sakT || 0) + 1; G.draw(1); } return true; },
  execute(t) { if (t && !t.dead) { t.hp = 0; killE(t); } },
  discardPick(uid) { const i = B.hand.findIndex(c => c.uid === uid); if (i < 0) return; const c = B.hand.splice(i, 1)[0], d = CARDS[c.id]; G.discNote(1);
    if (d.sly) { const a = alive(); B.p.fh = d.type === 'atk' ? 1 : 0; try { d.play(G, c.up, d.tgt === 'one' ? a[Math.floor(Math.random() * a.length)] : null, c); } catch (e) {} postPlay(d); (d.exhaust ? B.exh : B.disc).push(c); } else B.disc.push(c); },
  discNote(k) { if (k <= 0) return; B.p.disc = 1; B.p.discN = (B.p.discN || 0) + k; if (B.p.st.loop && !B.p.loopT) { B.p.loopT = 1; G.draw(B.p.st.loop); } },
  discard(n) { const pool = [...B.hand]; let cnt = 0; for (let k = 0; k < n && pool.length; k++) { const c = pool.splice(Math.floor(Math.random() * pool.length), 1)[0], d = CARDS[c.id]; const hi = B.hand.indexOf(c); if (hi < 0) { k--; continue; } B.hand.splice(hi, 1); cnt++;
    if (d.sly) { const a = alive(); B.p.fh = d.type === 'atk' ? 1 : 0; try { d.play(G, c.up, d.tgt === 'one' ? a[Math.floor(Math.random() * a.length)] : null, c); } catch (e) {} postPlay(d); (d.exhaust ? B.exh : B.disc).push(c); } else B.disc.push(c); } G.discNote(cnt); },
  get p() { return B.p; }, get hand() { return B.hand; }, get R() { return R; }, x: 0, alive: () => alive(),
  addHand(id, up = 0) { if (B.hand.length >= 10) return false; B.hand.push(mkCard(id, up)); return true; },
  note(t) { fx('hero', t, 'st'); }, hitE(e, n) { if (e && !e.dead) hurt(e, n, null, false); },
  fhb() { const pt = B.p.ptP || 0; B.p.ptP = 0; if (!B.p.fh) return pt; B.p.fh = 0; return MECH.firstHit(G) + pt; },
  patch(c, n) { if (!c) return; const d = CARDS[c.id]; n *= d.dbl ? 2 : 1; c.pt = (c.pt || 0) + n; c.pv = (c.pv || 0) + 1; B.p.ptN = (B.p.ptN || 0) + 1; fx('hero', `${d.name} +${n}`, 'st'); if (has('mug') && !B.p.mugU) { B.p.mugU = 1; B.p.energy++; } },
  cardOf: c => CARDS[c.id], costOf: c => cardCost(c),
  topOpts(n) { return B.draw.slice(-n).reverse().map(c => ({ val: c.uid, html: cardHTML(c) })); },
  takeTop(n, pk) { const top = B.draw.splice(-Math.min(n, B.draw.length)); for (const c of top) (c.uid === pk && B.hand.length < 10 ? B.hand : B.disc).push(c); },
  revert() { const c = B.p.lastC; if (!c) return; for (const pile of [B.disc, B.exh]) { const i = pile.indexOf(c); if (i >= 0) { pile.splice(i, 1); c.rc = 0; B.hand.push(c); return; } } },
  copyCard(x) { if (B.hand.length >= 10) return; B.hand.push({ ...x, uid: mkCard(x.id).uid, tmpEx: 1 }); },
  fromDisc(f) { const cs = B.disc.filter(f).sort((a, b) => (b.pt || 0) - (a.pt || 0)); if (cs.length && B.hand.length < 10) { B.disc.splice(B.disc.indexOf(cs[0]), 1); B.hand.push(cs[0]); } },
  discardAll() { B.disc.push(...B.hand); B.hand = []; }, /* 攻击牌第一击的角色加成（飞剑、破岳、霜龙） */
  attack(t, base, times = 1, strMul = 1) { let s = 0; const fb = G.fhb(); for (let i = 0; i < times; i++) { if (!t || t.dead) break; s += hurt(t, atkVal(B.p, t, base + (i ? 0 : fb), strMul), B.p); } audio.slash(); return s; },
  attackAll(base, times = 1) { let s = 0; const fb = G.fhb(); for (let i = 0; i < times; i++) for (const e of alive()) s += hurt(e, atkVal(B.p, e, base + (i ? 0 : fb)), B.p); audio.slash(); return s; },
  attackRandom(base, times) { const fb = G.fhb(); for (let i = 0; i < times; i++) { const a = alive(); if (!a.length) break; const e = pickOne(a); hurt(e, atkVal(B.p, e, base + (i ? 0 : fb)), B.p); } audio.slash(); },
  block(n, raw) { if (!raw && B.p.ptP) { n += B.p.ptP; B.p.ptP = 0; } const v = Math.max(0, raw ? n : n + (B.p.st.dex || 0)); B.p.block += v; if (v) { fx('hero', `+${v}`, 'blk'); audio.holy(); heroAct('block'); } },
  apply(t, k, n) { if (t && !t.dead) { addSt(t, k, n); fx(t.id, stf(k, n), 'st'); } },
  applyAll(k, n) { alive().forEach(e => G.apply(e, k, n)); },
  self(k, n) { addSt(B.p, k, n); fx('hero', stf(k, n), 'st'); },
  draw(n) { drawCards(n); }, energy(n) { B.p.energy += n; },
  loseHp(n) { R.hp -= n; fx('hero', `-${n}`, 'dmg'); B.hitSet.add('hero'); pDeath(); },
  heal(n) { return healP(n); },
  pm() { return B.p.st.sage ? 2 : 1; }, ppm() { return B.p.st.sage ? 1.5 : 1; },
  potion(n, id) { const ps = ['p_fire', 'p_frost', 'p_heal', 'p_poison', 'p_boom', 'p_vine']; for (let i = 0; i < n; i++) { const c = mkCard(id || pickOne(ps)); (B.hand.length < 10 ? B.hand : B.disc).push(c); } fx('hero', `药瓶+${n}`, 'st'); },
  poison(t, n) { if (!t || t.dead || n <= 0) return; n += has('toad') ? 1 : 0; addSt(t, 'poison', n); fx(t.id, `中毒+${n}`, 'st'); },
  volley(clear = true, max = 99) { // 光弹齐射：每发 4 点（+双持 +超频），打随机敌人或全体
    const n = Math.min(max, B.p.st.ammo || 0); if (!n) return; const dmg = 4 + (B.p.st.dual || 0) + (B.p.oc || 0);
    for (let i = 0; i < n; i++) { const a = alive(); if (!a.length) break; const ao = B.p.aoe && i < B.p.aoe; (ao ? a : []).forEach(e => B.fx.push({ who: e.id, cls: 'bul', n: i })); if (ao) a.forEach(e => hurt(e, atkVal(B.p, e, dmg + (i % 2 ? 0 : 1)), B.p)); else { const e = pickOne(a); B.fx.push({ who: e.id, cls: 'bul', n: i }); hurt(e, atkVal(B.p, e, dmg + (i % 2 ? 0 : 1)), B.p); } }
    if (B.p.st.rapid) G.block(B.p.st.rapid * n, true);
    if (clear) { B.shots = (B.shots || 0) + n; if (has('pad')) { B.p.padDraw = Math.floor(B.shots / 4); B.shots %= 4; } addSt(B.p, 'ammo', -Math.min(n, B.p.st.ammo || 0)); } /* 齐射途中“连锁反应”新得到的光弹留到下回合 */
    audio.slash && audio.slash(); },
  usePotion() { const i = B.hand.findIndex(c => CARDS[c.id].potion); if (i < 0) return false; B.exh.push(B.hand.splice(i, 1)[0]); return true; },
  hit(t, n) { if (t && !t.dead) hurt(t, n, B.p, false); }, /* 药水伤害：不算“打到”监工 */
  kek(n) { addSt(B.p, 'kek', n); fx('hero', `结界+${n}`, 'st'); },
  ammo(n) { const a = Math.min(8, (B.p.st.ammo || 0) + n); if (a !== B.p.st.ammo) { B.p.st.ammo = a; fx('hero', `光弹+${n}`, 'st'); } },
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
const stf = (k, n) => `${STATUS[k] ? STATUS[k][0] : k}${n >= 0 ? '+' : ''}${n}`;
const BE = {
  get sylvie() { return R.char === 'sylvie'; },
  transform(e, key, f = 1) { const i = B.en.indexOf(e); if (i < 0) return null; const n = mkEnemy(key); n.hp = Math.max(1, Math.round(n.max * f)); n.st = { ...n.st, ...Object.fromEntries(Object.entries(e.st).filter(([k]) => ['poison', 'weak', 'vuln', 'res', 'fburn'].includes(k))) }; n.move = n.d.ai(n, BE); B.en[i] = n; fx(n.id, tr(n.d.name), 'st'); return n; },
  addHand(id, n = 1) { for (let k = 0; k < n; k++) if (B.hand.length < 10) B.hand.push(mkCard(id)); else B.disc.push(mkCard(id)); fx('hero', `+${CARDS[id].name}${n > 1 ? '×' + n : ''}`, 'st'); },
  discardRand(n) { for (let k = 0; k < n && B.hand.length; k++) B.disc.push(B.hand.splice(Math.floor(Math.random() * B.hand.length), 1)[0]); fx('hero', t('被删了 {0} 张牌', n), 'dmg'); },
  swapHigh() { const cs = B.hand.filter(c => typeof cardCost(c) === 'number' && !CARDS[c.id].unplay).sort((a, b) => cardCost(b) - cardCost(a)); if (!cs.length) return null; const c = cs[0]; B.hand.splice(B.hand.indexOf(c), 1); B.hand.push(mkCard('draft')); return CARDS[c.id].name; },
  flipRand() { const cs = B.hand.filter(c => !CARDS[c.id].unplay); if (cs.length) pickOne(cs).flip = 1; },
  nerfTop(n) { const pc = B.pc || {}, id = Object.keys(pc).sort((a, b) => pc[b] - pc[a])[0]; if (!id || CARDS[id].unplay) return null; [...B.draw, ...B.disc, ...B.hand, ...B.exh].filter(c => c.id === id).forEach(c => { c.pt = (c.pt || 0) - n; }); return CARDS[id].name; },
  sealType(e, ty) { const cs = B.hand.filter(c => !c.seal && !CARDS[c.id].unplay && (ty === 'atk' ? CARDS[c.id].type === 'atk' : CARDS[c.id].type !== 'atk')); if (!cs.length) return null; const c = pickOne(cs); c.seal = e.id; fx('hero', tr('断点'), 'dmg'); return CARDS[c.id].name; },
  exhRand(n) { let nm = null; for (let k = 0; k < n; k++) { const atkLeft = [...B.draw, ...B.disc, ...B.hand].filter(c => CARDS[c.id].type === 'atk').length; const all = B.hand.filter(c => !CARDS[c.id].unplay); const cs = all.filter(c => CARDS[c.id].type !== 'atk' || atkLeft > 2); if (!cs.length) break; const c = pickOne(cs); /* 不会删到只剩 2 张攻击牌以下：防止打不赢的死局 */ B.hand.splice(B.hand.indexOf(c), 1); B.exh.push(c); nm = CARDS[c.id].name; } if (nm) fx('hero', tr('被删除'), 'dmg'); return nm; },
  seal(e, perm) { const cs = B.hand.filter(c => !c.seal && !CARDS[c.id].unplay); if (!cs.length) return null; const c = pickOne(cs); c.seal = perm ? 'perm' : e.id; fx('hero', tr('封印'), 'dmg'); return CARDS[c.id].name; },
  unseal(e) { [...B.draw, ...B.disc, ...B.hand, ...B.exh].forEach(c => { if (c.seal === e.id) delete c.seal; }); },
  zc: () => B.p.zc || 0, handTypes() { return { atk: B.hand.filter(c => CARDS[c.id].type === 'atk').length, skill: B.hand.filter(c => CARDS[c.id].type !== 'atk').length }; },
  applyP(k, n) { addSt(B.p, k, n); fx('hero', stf(k, n), 'st'); },
  addSt(e, k, n) { addSt(e, k, n); fx(e.id, stf(k, n), 'st'); },
  eBlock(e, n) { e.block += n; fx(e.id, `+${n}`, 'blk'); },
  allies: e => alive().filter(a => a !== e), alive: () => alive(),
  healE(e, n) { e.hp = Math.min(e.max, e.hp + n); fx(e.id, `+${n}`, 'heal'); },
  revive(e, f) { e.revived = 1; e.dead = false; for (const k of ['poison', 'weak', 'vuln', 'res']) delete e.st[k]; e.hp = Math.max(1, Math.floor(e.max * f)); e.anim = null; if (R) R.kills--; fx(e.id, '复活', 'heal'); if (e.key === 'skeleton') say('（骨头咔嚓咔嚓地重新拼了起来）'); },
  flee(e) { if (e.dead) return; e.fled = 1; e.dead = true; e.hp = 0; e.deadAt = Date.now(); fx(e.id, '逃跑', 'st'); }, say: t => say(t),
  addCard(id, n = 1) { for (let k = 0; k < n; k++) B.disc.push(mkCard(id)); fx('hero', `+${CARDS[id].name}${n > 1 ? '×' + n : ''}`, 'st'); },
  kill(e) { killE(e); B.hitSet.add(e.id); },
  steal(e, n) { const k = Math.min(n, R.gold); R.gold -= k; e.stolen = (e.stolen || 0) + k; e.stoleT = e.turn; fx('hero', `-${k} 金币`, 'dmg'); },
  split(e, key, n) { const i = B.en.indexOf(e), hp = Math.max(1, Math.floor(e.hp / n)), bits = []; for (let k = 0; k < n; k++) { const b = mkEnemy(key); b.hp = b.max = hp; b.move = b.d.ai(b, BE); bits.push(b); } e.dead = true; e.fled = 1; e.hp = 0; B.en.splice(i, 1, ...bits); say('（缝合怪裂成了两块！）'); },
  endPlayerTurn() { B.forceEnd = 1; },
  summon(key, hp) { if (alive().length >= 5) return null; const e = mkEnemy(key); if (hp) e.hp = e.max = hp; e.move = e.d.ai(e, BE); const i = B.en.findIndex(x => x.dead && !(x.d.prePhase && !x.revived && !x.fled)); if (i >= 0) B.en[i] = e; else B.en.unshift(e); return e; } /* 召唤物优先填进已经死掉的位置，队伍不会越排越长 */,
};

function drawCards(n) {
  for (let i = 0; i < n; i++) {
    if (B.p.noDraw) return; if (B.hand.length >= 10) return;
    if (!B.draw.length) { if (!B.disc.length) return; B.draw = shuffle(B.disc); B.disc = []; }
    B.hand.push(B.draw.pop());
  }
}
function startTurn(first) {
  setTimeout(() => { if (B && !B.over && !alive().length) checkEnd(); }, 0); /* 回合开始的共鸣/中毒/秘宝伤害若打死最后一个敌人，也要结算胜利 */
  B.turn++; B.tc = 0; B.hitSet = new Set(); if (B.turn > RULES.maxTurns) { say(tr('战斗拖得太久，你筋疲力尽了……')); R.hp = 0; setTimeout(checkEnd, 0); return; } B.forceEnd = 0; [...B.draw, ...B.disc, ...B.hand].forEach(c => delete c.rc);
  B.p.block = 0;
  B.p.energy = 3 + (has('crown') ? 1 : 0) + (first && has('hourglass') ? 1 : 0) + (first && MOD('swift') ? 1 : 0);
  B.p.noDraw = 0; B.p.disc = 0; B.p.discN = 0; B.p.loopT = 0; B.p.cpt = 0; B.p.lastC = null; B.p.loopU = 0;
  CORE3.pStart(B, { has, loseHp: n => G.loseHp(n), energy: n => G.energy(n) }); pDeath(); if (R.hp <= 0) { setTimeout(checkEnd, 0); return; }
  B.p.pot = 0;
  if (first && has('cauldron')) G.potion(1);
  if (B.p.st.satchel && B.turn % 2 === 1) G.potion(B.p.st.satchel);
  if (B.p.st.plague) alive().forEach(e => G.poison(e, B.p.st.plague));
  if (B.p.st.kagura) G.kek(B.p.st.kagura);
  if (B.p.st.kek) G.block(B.p.st.shinboku ? B.p.st.kek + Math.min(B.p.st.kek, 8) : B.p.st.kek, true);
  if (has('hamaya') && (B.p.st.kek || 0) >= 4) drawCards(1);
  B.p.oc = 0; B.p.aoe = 0; B.p.metroUsed = 0; B.p.cplays = 0; if (B.p.st.gen) G.ammo(B.p.st.gen); if (has('spare')) G.ammo(1); if (B.p.padDraw) { drawCards(B.p.padDraw); B.p.padDraw = 0; } if (has('gameboy') && B.turn % 2 === 1) G.ammo(1); if (!first && has('phones')) G.resAll(1);
  if (B.p.st.lowf) G.resAll(B.p.st.lowf);
  if (first && has('anchor')) B.p.block += 10;
  drawCards(5 + (first && has('scroll') ? 2 : 0) - (first && R.trials && R.trials.includes('wind') ? 1 : 0) - Math.min(4, B.p.st.drowsy || 0) - (first && A_(13) ? 1 : 0) - (first && has('b_star') ? 1 : 0));
  if (B.p.slept) { B.p.slept = 0; setTimeout(() => banner(tr('你睡着了：这回合没有能量')), 300); }
  if (B.p.st.confuse) { B.hand.forEach(c => { if (typeof cardCost(c) === 'number') c.rc = rnd(0, 3); }); addSt(B.p, 'confuse', -1); }
  MECH.turnStart(G, first);
  for (const e of alive()) if (e.d.onPTurn) e.d.onPTurn(e, BE);
  if (first && has('dice')) { const cs = B.hand.filter(c => typeof cardCost(c) === 'number' && cardCost(c) >= 1); if (cs.length) pickOne(cs).disc = 1; }
  B.sel = -1; B.busy = false; render();
}
function postPlay(d) { /* 打出一张牌后的通用结算（狡诈自动打出也走这里） */
  MECH.postPlay(G, d);
  alive().forEach(e => e.d.onCard && e.d.onCard(e, d.type, BE));
  if (d.type === 'atk') { B.atkCnt++; if (has('quiver') && B.atkCnt % 3 === 0) for (const e of alive()) hurt(e, 5); heroAct('shoot'); }
    if (d.potion) { B.p.pot = (B.p.pot || 0) + 1; if (has('hat')) G.block(2, true); }
    if (B.p.st.concert && (B.p.cplays = (B.p.cplays || 0) + 1) <= 4) G.resAll(B.p.st.concert);
    if (d.type === 'skill') alive().forEach(e => { if (e.st.enrage && (e.enT = (e.enT || 0) + 1) <= 2) BE.addSt(e, 'str', e.st.enrage); });
}
async function playCard(i, tgt) {
  if (B && B.forceEnd) return;
  if (!B || B.busy || B.over || B.anim) return; const b0 = B;
  if ((B.tc || 0) >= PLAYCAP) { tip(t('这回合出的牌太多了（上限 {0} 张），结束回合吧', PLAYCAP)); return; }
  const c = B.hand[i], d = CARDS[c.id]; let cost = cardCost(c);
  setTimeout(() => { if (B && B.hand && !B.hand.includes(c)) { B.tc = (B.tc || 0) + 1; if (B.tc >= 10) ach('a_turn10'); } }, 0);
  if (d.unplay) { tip('这张牌不能打出'); return; }
  if (c.seal) { tip(tr('这张牌被封印了')); return; }
  if (cost === 'X') cost = B.p.energy; if (cost > B.p.energy) { tip('能量不足'); return; }
  if (d.tgt === 'one' && !tgt) { const a = alive(); if (a.length === 1) tgt = a[0]; else { B.mechAim = null; B.sel = B.sel === i ? -1 : i; B.aimI = 0; render(); return; } }
  if (d.can && !d.can(G, c.up)) { fx('hero', '现在打不出', 'st'); flushFx(); return; }
  let pk; if (d.pick) { const opts = d.pick === 1 ? B.hand.filter(x => x !== c).map(x => ({ val: x.uid, html: cardHTML(x) })) : d.pick(G, c.up); if (opts.length) { B.anim = true; pk = await pickOpt(d.pickT || '选择一张手牌', opts, d.noCancel); B.anim = false; if (pk === undefined) return; i = B.hand.indexOf(c); if (i < 0) return; } }
  B.hitSet = new Set();
  const el = view.querySelector(`#hand .card[data-i="${i}"]`);
  B.p.energy -= cost; G.x = cost; B.hand.splice(i, 1); B.sel = -1; B.anim = true;
  if (el) flyCard(el, d.type); render(); await sleep(260);
  if (B !== b0) return; B.anim = false; B.hitSet = new Set();
  B.p.cpt = (B.p.cpt || 0) + 1; B.p.lastZero = cost === 0; if (cost === 0) B.p.zc = (B.p.zc || 0) + 1; B.pc = B.pc || {}; B.pc[c.id] = (B.pc[c.id] || 0) + 1; B.p.lastC = c;
  if (c.flip) { delete c.flip; if (d.type === 'atk') { alive().forEach(e => BE.healE(e, 8)); } else G.loseHp(5); fx('hero', tr('正负反转！'), 'dmg'); }
  else { const reps = 1 + (cost === 0 && B.p.thr > 0 ? (B.p.thr--, 1) : 0) + (cost === 0 && B.p.st.vloop && !B.p.loopU ? (B.p.loopU = 1, 1) : 0);
  for (let r = 0; r < reps; r++) { if (r && (tgt && tgt.dead)) tgt = alive()[0]; B.p.fh = d.type === 'atk' ? 1 : 0; B.p.ptP = c.pt || 0;
  try { d.play(G, c.up, tgt, c, pk); } catch (err) { console.error(err); tip(tr('这张牌出错了，已跳过')); } } }
  delete c.rc; B.p.fh = 0; B.p.ptP = 0;

  postPlay(d);
  if (d.type === 'power') {} else if (d.exhaust || c.tmpEx) B.exh.push(c); else B.disc.push(c);
  pDeath();
  render(); await checkEnd();
  if (B === b0 && B.forceEnd && !B.over) { banner(tr('时间停止：回合被强制结束')); await sleep(500); if (B === b0 && !B.over) endTurn(); } /* forceEnd 保持到下回合开始，等待期间不能再出牌 */
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
function eAct(e, n, f) { if (ENEMIES[e.key].hd) e.anim = { n, t: performance.now(), f }; }
const ONEIDLE = new Set(['d_rock', 'dk_mage', 'dk_elder']); /* 这几套只画了一张待机 */
function eFrame(e) {
  const k = e.art || ENEMIES[e.key].art || e.key, now = performance.now(), a = e.anim, dt = a ? now - a.t : 1e9;
  if (e.dead) return `assets/enemies2/${ENEMIES[e.key].deadArt && !e.art ? ENEMIES[e.key].deadArt : k}/${(a && a.n === 'down' && dt < 260) ? 'down0' : 'down1'}.png`;
  if (a && a.n === 'atk' && dt < 420) return `assets/enemies2/${k}/${a.f ? a.f[Math.min(a.f.length - 1, Math.floor(dt / 210))] : dt < 160 ? 'atk0' : 'atk1'}.png`;
  if (a && a.n === 'hurt' && dt < 320) return `assets/enemies2/${k}/hurt0.png`;
  if (e.pose && ENEMIES[e.key].hd && (!ENEMIES[e.key].poses || ENEMIES[e.key].poses.includes(e.pose))) return `assets/enemies2/${k}/${e.pose}.png`;
  return `assets/enemies2/${k}/${ONEIDLE.has(k) ? 'idle0' : 'idle' + (Math.floor(now / 480) % 2)}.png`;
}
const CHARS = { hero: { dir: 'hero2', name: '穿越者 · 林拓', h: 241, desc: '掌机 · 光弹' }, witch: { dir: 'witch2', name: '魔女 · 莉泽', h: 235, desc: '炼金瓶 · 剧毒' }, miko: { dir: 'miko2', name: '巫女 · 千早', h: 257, desc: '和弓 · 结界' }, heroine: { dir: 'heroine2', name: '穿越者 · 苏音', h: 251, desc: '耳机 · 音波', idle: [0, 3], idleMs: 520 }, erin: { dir: 'erin', name: '元素使 · 艾琳', h: 276, desc: '法杖 · 元素', idle: [0, 3], idleMs: 650 }, gu: { dir: 'gu', name: '剑客 · 顾清寒', h: 297, desc: '长剑 · 飞剑', idle: [0, 3], idleMs: 650 }, sylvie: { dir: 'sylvie', name: '霜龙裔 · 希尔薇', h: 270, desc: '冰枪 · 变身', idle: [0, 3], idleMs: 650 }, mia: { dir: 'mia', name: '猫耳族 · 米娅', h: 263, desc: '魔杖 · 云猫', idle: [0, 3], idleMs: 650 }, feiyue: { dir: 'feiyue', name: '半吸血鬼 · 绯月', h: 257, desc: '血爪 · 蝙蝠', idle: [0, 3], idleMs: 650 } };
const isDragon = () => R && R.char === 'sylvie' && B && B.p && B.p.st.dragon && hst.n !== 'down';
const isMerged = () => R && R.char === 'mia' && B && B.p && B.p.cat && B.p.cat.merged && !B.p.cat.down;
const cdir = () => isDragon() ? 'sylvie_dragon' : isMerged() ? 'mia_merge' : CHARS[(R && R.char) || 'hero'].dir;
const heroH = () => isDragon() ? 210 : CHARS[R.char || 'hero'].h;
/* 团子：按等级一行，待机两帧交替，扑击/挨打各一帧 */
const CATH = [0, 112, 125, 145];
function catFrame() { const c = B && B.p && B.p.cat; if (!c) return ''; const lv = (R.cat && R.cat.lv) || 1, f = c.fx && Date.now() - c.fx.t < 650 ? c.fx.k : c.down ? 'hit' : performance.now() % 2900 < 2400 ? 'idle0' : 'idle1'; return `assets/dango/lv${lv}_${f}.png`; }
const sumFrame = (k, n) => { const p = B.p, t = performance.now(); if (k === 'bats') return `assets/feiyue_summon/bats_${p.batFx && Date.now() - p.batFx < 500 ? 'atk' + (Math.floor(t / 180) % 2) : 'idle' + (Math.floor(t / 260) % 2)}.png`; const b = p.big; if (b.kind === 'thrall') return `assets/enemies2/${ENEMIES[b.key].art || b.key}/${b.hp <= 0 ? 'down1' : (p.bigFx && Date.now() - p.bigFx < 450 ? 'atk1' : 'idle' + (Math.floor(t / 500) % 2))}.png`; return `assets/feiyue_summon/knight_${p.bigFx && Date.now() - p.bigFx < 600 ? 'atk' + Math.min(3, Math.floor((Date.now() - p.bigFx) / 150)) : 'idle' + (Math.floor(t / 300) % 4)}.png`; };
const sumHTML = () => { const p = B && B.p; if (!p || (!p.big && !p.bats)) return ''; let h = ''; if (p.big) h += `<div class="allyw a1"><img class="sumspr big ${p.big.kind}" src="${sumFrame('big')}" style="height:${p.big.kind === 'knight' ? 150 : 120}px"><div class="cathp"><i style="width:${Math.max(0, p.big.hp) / p.big.max * 100}%"></i><span>${Math.max(0, p.big.hp)}/${p.big.max}</span></div></div>`; if (p.bats) h += `<div class="allyw a2"><img class="sumspr bats" src="${sumFrame('bats')}" style="height:78px"><span class="batn">×${p.bats}</span></div>`; return h; };
const catHTML = () => { const c = B && B.p && B.p.cat; if (!c || (c.merged && !c.down)) return ''; return `<div class="catw"><img class="catspr ${c.down ? 'down' : ''}" src="${catFrame()}" style="height:${CATH[(R.cat && R.cat.lv) || 1]}px"><div class="cathp"><i style="width:${Math.max(0, c.hp) / c.max * 100}%"></i><span>${Math.max(0, c.hp)}/${c.max}</span></div></div>`; };
const HA = { idle: [4, 200, 1], shoot: [4, 75, 0], hurt: [2, 130, 0], block: [1, 380, 0], down: [3, 220, 2], xform: [1, 700, 0] }; // 帧数, 每帧毫秒, 1=循环 2=停在最后
let hst = { n: 'idle', t: 0 };
const heroImgs = []; const decodeAll = () => heroImgs.forEach(i => i.decode && i.decode().catch(() => {})); for (const [n, [c]] of Object.entries(HA)) for (let k = 0; k < c; k++) { if (n === 'xform') continue; for (const c of Object.values(CHARS)) { const im = new Image(); im.src = `assets/${c.dir}/${n}${k}.png`; heroImgs.push(im); } }
setTimeout(decodeAll, 500);
const extraImgs = []; const preloadExtra = ch => { if (ch === 'sylvie') ['idle0', 'idle1', 'idle2', 'idle3', 'shoot0', 'shoot1', 'shoot2', 'shoot3', 'hurt0', 'hurt1', 'block0', 'xform0'].forEach(n => { const im = new Image(); im.src = `assets/sylvie_dragon/${n}.png`; extraImgs.push(im); }); if (ch === 'mia') ['idle0', 'idle1', 'idle2', 'idle3', 'shoot0', 'shoot1', 'shoot2', 'shoot3', 'hurt0', 'hurt1', 'block0', 'down0', 'down1', 'down2'].forEach(n => { const im = new Image(); im.src = `assets/mia_merge/${n}.png`; extraImgs.push(im); }); if (ch === 'feiyue') ['knight_idle0', 'knight_idle1', 'knight_idle2', 'knight_idle3', 'knight_atk0', 'knight_atk1', 'knight_atk2', 'knight_atk3', 'bats_idle0', 'bats_idle1', 'bats_atk0', 'bats_atk1'].forEach(n => { const im = new Image(); im.src = `assets/feiyue_summon/${n}.png`; extraImgs.push(im); }); if (ch === 'mia') for (const lv of [1, 2, 3]) for (const n of ['idle0', 'idle1', 'atk', 'hit']) { const im = new Image(); im.src = `assets/dango/lv${lv}_${n}.png`; extraImgs.push(im); } };
let wasDragon = 0;
function heroAct(n) { if (hst.n === 'down') return; if (n === 'block' && hst.n === 'shoot') return; hst = { n, t: performance.now() }; }
function heroFrame() {
  const [c, ms, mode] = HA[hst.n]; let k = Math.floor((performance.now() - hst.t) / ms);
  if (k >= c) { if (mode === 1) k %= c; else if (mode === 2) k = c - 1; else { hst = { n: 'idle', t: performance.now() }; k = 0; } }
  const C = CHARS[(R && R.char) || 'hero'];
  if (hst.n === 'idle' && C.idle) { const j = Math.floor((performance.now() - hst.t) / C.idleMs) % C.idle.length; return `assets/${cdir()}/idle${C.idle[j]}.png`; }
  return `assets/${cdir()}/${hst.n}${k}.png`;
}
let lastT = 0;
(function loop(t) { requestAnimationFrame(loop); if (!B || t - lastT < 80) return; lastT = t; const dr = isDragon() ? 1 : 0; if (dr !== wasDragon) { if (dr) hst = { n: 'xform', t: performance.now() }; wasDragon = dr; } const h = view.querySelector('#hero .spr'); if (h) { const f = heroFrame(); if (!h.src.endsWith(f)) { h.src = f; h.style.height = heroH() + 'px'; } }
  view.querySelectorAll('#hero .sumspr').forEach(im => { if (!B.p) return; const f = im.classList.contains('bats') ? (B.p.bats ? sumFrame('bats') : '') : (B.p.big ? sumFrame('big') : ''); if (f && !im.src.endsWith(f)) im.src = f; });
  const cs = view.querySelector('#hero .catspr'); if (cs) { const f = catFrame(); if (!cs.src.endsWith(f)) cs.src = f; cs.classList.toggle('down', !!B.p.cat.down); }
  view.querySelectorAll('.enemy.hd .spr').forEach(img => { const e = B.en.find(x => x.id === img.dataset.eid); if (e) { const f = eFrame(e); if (!img.src.endsWith(f)) img.src = f; } });
})(0);
function heroAnim(c) { heroAnimCls = c; }
async function endTurn() {
  if (!B || B.busy || B.over || B.anim) return; const b0 = B; B.busy = true; B.sel = -1; B.hitSet = new Set();
  if (B.p.st.ammo) { G.volley(true); render(); await sleep(350); if (B !== b0 || await checkEnd()) return; }
  for (const c of B.hand) { if (CARDS[c.id].burn) G.loseHp(CARDS[c.id].burn); if (CARDS[c.id].endWeak) addSt(B.p, 'weak', 1); } /* 烧伤、诅咒 */
  pDeath(); if (R.hp <= 0) { B.busy = false; return checkEnd(); }
  MECH.turnEnd(G); if (!alive().length) { render(); await sleep(300); B.busy = false; return checkEnd(); }
  CORE3.pEnd(B, { has, loseHp: n => G.loseHp(n) }); if (R.hp <= 0) { B.busy = false; return checkEnd(); }
  { const kept = []; for (const c of B.hand) { delete c.flip; if (c.keep) { delete c.keep; kept.push(c); continue; } (CARDS[c.id].ethereal ? B.exh : B.disc).push(c); } B.hand = kept; }
  if (B.p.st.metal) G.block(B.p.st.metal, true);
  if (B.p.st.regen && (B.p.regenN = (B.p.regenN || 0) + 1) <= 3) healP(B.p.st.regen);
  render(); await sleep(300); if (B !== b0) return;
  /* 敌人回合：本回合敌人新加给你的虚弱/易伤，不在这回合末扣层（让它们覆盖你的下一个回合） */
  const pre = { vuln: B.p.st.vuln || 0, weak: B.p.st.weak || 0 };
  for (const e of alive()) e.block = 0;
  for (const e of [...B.en]) if (e.d.prePhase) e.d.prePhase(e, BE);
  render();
  for (const e of [...B.en]) {
    if (B !== b0) return;
    if (e.dead || B.over) continue;
    B.hitSet = new Set();
    if (e.st.aegis) addSt(e, 'aegis', -1); /* 圣盾挡住玩家的一个回合，轮到它行动时才消失 */
    if (e.st.intang) e.st.intang = 0; /* 虚化同理 */
    if (e.st.poison && !e.st.aegis) { const pz = e.st.poison; e.hp -= pz; fx(e.id, `-${pz}`, 'dmg'); B.hitSet.add(e.id); addSt(e, 'poison', -1); if (e.hp <= 0) { e.diedPoison = 1; killE(e); render(); await sleep(300); if (await checkEnd()) return; continue; } }
    { const cc = MECH.enemyAct ? MECH.enemyAct(G, e) : null; if (e.dead) { render(); await sleep(300); if (await checkEnd()) return; continue; } if (cc === 'skip') { fx(e.id, tr('无法行动'), 'st'); e.hist.push(e.move); render(); await sleep(380); continue; } }
    const otr = e.d.onTurn && e.d.onTurn(e, BE); if (otr) { if (otr === 'skip' && !e.dead && !e.fled) fx(e.id, e.d.key === 'dev_boss' || e.key === 'dev_boss' ? tr('程序报错·无法行动') : '坠地·无法行动', 'st'); e.hist.push(e.move); render(); await sleep(300); if (await checkEnd()) return; continue; }
    e.hitT = 0; e.enT = 0;
    const mv = e.d.moves[e.move]; B.lunge = mv.d != null && mv.i.startsWith('atk') && mv.d > 0 ? e.id : null;
    if (mv.d) { eAct(e, 'atk', mv.af); gv(e, 'atk'); } else if (/buff|summon/.test(mv.i)) gv(e, 'buff');
    if (mv.d) for (let k = 0; k < hitsOf(e, mv); k++) { hurt(B.p, atkVal(e, B.p, mv.d), e); if (e.dead || R.hp <= 0) break; }
    if (mv.f && !e.dead) mv.f(e, BE);
    e.hist.push(e.move); e.d.after && e.d.after(e);
    render(); await sleep(mv.d ? 520 : 380); if (B !== b0) return;
    if (R.hp <= 0) return checkEnd();
    if (await checkEnd()) return;
  }
  B.lunge = null; B.hitSet = new Set();
  if (ACT() === 2 && B.turn === RULES.bloodTurn && !B.bloodMoon) { B.bloodMoon = 1; banner(tr('血月当空：不死系敌人力量 +1（从它们下一次攻击开始）')); alive().filter(e => e.d.undead).forEach(e => BE.addSt(e, 'str', RULES.bloodStr)); }
  for (const k of ['vuln', 'weak']) if (pre[k] && B.p.st[k]) addSt(B.p, k, -1);
  for (const e of alive()) {
    if (e.st.ritual) addSt(e, 'str', e.st.ritual);
    if (isFury(e.turn)) { addSt(e, 'str', 1); if (!B.rageShown) { B.rageShown = 1; banner(tr('战意：战斗拖得太久，敌人从现在起每两回合力量 +1（从下一次攻击开始）')); } } /* 拖得越久敌人越强 */
    for (const k of ['vuln', 'weak']) if (e.st[k]) addSt(e, k, -1);
    e.turn++; e.move = e.d.ai(e, BE);
  }
  startTurn(false);
}
async function checkEnd() {
  if (!B || B.over) return true; const b0 = B;
  if (R.hp <= 0) { B.over = true; heroAct('down'); render(); sting('lose', 2600); await sleep(1400); clearSave(); return endScreen(false); }
  if (!alive().length) {
    B.over = true; render(); sting(B.kind === 'boss' ? 'bossWin' : 'win', B.kind === 'boss' ? 2600 : 1400); await sleep(600); if (B !== b0) return true;
    if (R.relics.some(x => RELICS[x] && RELICS[x].rar === 'start') && !has('crown')) R.hp = Math.min(R.maxHp, R.hp + 4);
    { const m = MECH.victory(G, B.kind); if (m) say(tr(m)); const bo = MECH.boonOpts && MECH.boonOpts(G, B.kind); if (bo) { bo.forEach(o => { o.html = `<button class="btn"><b>${tr(o.name)}</b>：${tr(o.desc)}</button>`; }); const k = await pickOpt(tr('团子的灵魂恩赐：选一个（整局有效）'), bo, true); MECH.boonPick(G, k); } } if (has('grail')) R.hp = Math.min(R.maxHp, R.hp + 5);
    if (B.en.some(e => (e.st.hostage || 0) > 0)) { R.gold += 40; say(tr('（被救下的村民塞给你 40 金币：“谢谢你们！”）')); }
    if (B.kind === 'elite') R.elites = (R.elites || 0) + 1; if (B.burn) gotKey('g');
    if (B.kind === 'boss' && !B.hurtT) ach('a_bossclean'); if (B.en.some(e => e.key === 'dev_boss')) ach('a_dev');
    if (B.trueB) { B = null; clearSave(); R.trueEnd = 1; ach('a_true'); return story('story_gate', ['门的后面，是一间亮着屏幕的小房间。', '开发者摘下眼镜，揉了揉眼睛：“……好吧，你们赢了。”', '屏幕上跳出一行字：「游戏结束——这次是真的。」', '光涌了上来。再睁开眼时，是放学路上的那条街。'], () => story(trueArt(), [...(TRUEEND[R.char] || []), '开发者在屏幕前敲下最后一行注释：// 谢谢你们，陪我把这个游戏打通。'], () => endScreen(true))); }
    if (B.kind === 'boss') { R.bosses = (R.bosses || 0) + 1; if (ACT() === 1) { delete R.pending; delete R.pendEnc; delete R.snap; R.after = 'act2'; save(); rewardScreen(); return true; }
      if (ACT() >= 2) { delete R.pending; delete R.pendEnc; delete R.snap;
        if (ACT() === 2) R.after = 'act3';
        else if (ACT() === 3 && !B.final && !R.rift) { R.after = 'rift'; R.deck.push(mkCard('devperm')); }
        else if (ACT() === 3 && !B.final) R.after = 'final';
        else if (ACT() === 3) { B = null; R.kingDown = 1; R.wait = 'ending'; save(); return endingChoice(); }
        else R.after = 'layer';
        save(); rewardScreen(); return true; }
      clearSave(); B = null; return story('story_end2', [R.boss === 'vamp_count' ? '伯爵化为了灰烬，天终于亮了。被关押的村民们，终于重获自由。' : t('{0}倒下了。古堡的血月熄灭，天终于亮了。被关押的村民们重获自由。', tr((ENEMIES[R.boss] || {}).name || '')), '可是窗外，更高的雪山顶上，一双紫色的眼睛睁开了。', '“回家的路……还在更高的地方。”'], () => story('story_party', ['天亮了。大家并肩站在晨光里，笑得满脸是灰。', '“走吧，往上。”'], () => endScreen(true))); }
    delete R.pending; delete R.pendEnc; delete R.snap; save(); /* 打赢后不能刷新重打 */
    rewardScreen(); return true;
  }
  return false;
}
function tip(t) { const o = document.createElement('div'); o.id = 'tip'; o.textContent = t; stage.appendChild(o); setTimeout(() => o.remove(), 900); }

// 意图文字
const II = n => `<img src="assets/ui2/int_${n}.png">`;
const ICON = { atk: II('atk'), def: II('def'), buff: II('buff'), debuff: II('debuff'), atkdef: II('atk') + II('def'), atkdebuff: II('atk') + II('debuff'), atkbuff: II('atk') + II('buff'), summon: II('summon'), unknown: II('unknown') };
function intentHTML(e) {
  const mv = e.d.moves[e.move]; let num = '';
  if (mv.d != null && mv.i.startsWith('atk') && mv.d > 0) { const v = atkVal(e, B.p, mv.d); num = mv.x ? `${v}×${hitsOf(e, mv)}` : `${v}`; }
  const IT = { atk: '攻击你', def: '给自己或队友加格挡', buff: '强化自己', debuff: '给你施加负面状态', atkdef: '攻击你并加格挡', atkdebuff: '攻击你并施加负面状态', atkbuff: '攻击你并强化队友', summon: '召唤援兵', unknown: '意图不明' };
  const tip = `${mv.n}：下回合将${IT[mv.i]}${num ? `，伤害 ${num}` : ''}`;
  return `<div class="intent" title="${esc(tip)}">${ICON[mv.i]}${num}<small>${mv.n}</small></div>`;
}
const stsLabel = (k, n, st) => k === 'res' ? `共鸣${n}/10${n >= 9 ? '⚠' : ''}` : k === 'kek' ? `结界${n}（下回合+${st.shinboku ? n + Math.min(n, 8) : n}挡）` : k === 'poison' ? `中毒${n}（下回合-${n}）` : k === 'ammo' ? `光弹${n}（回合末${n}发）` : STATUS[k][0] + n;
const stsHTML = st => `<div class="sts">${Object.entries(st).filter(([k, n]) => n && STATUS[k]).map(([k, n]) => `<b style="border-color:${STATUS[k][2]};color:${STATUS[k][2]}" title="${esc(STATUS[k][0] + '：' + STATUS[k][1])}">${STATUS[k][3] ? `<img class="sti" src="assets/${STATUS[k][3]}.png" alt="">` : ''}${stsLabel(k, n, st)}</b>`).join('')}</div>`;
function incoming() { const hits = []; for (const e of alive()) { const mv = e.d.moves[e.move]; if (mv.d && mv.i.startsWith('atk')) { const a = atkVal(e, B.p, mv.d); for (let k = 0; k < hitsOf(e, mv); k++) hits.push({ amt: a, e }); } } try { return MECH.estimate ? MECH.estimate(G, hits) : hits.reduce((s, h) => s + h.amt, 0); } catch (err) { return hits.reduce((s, h) => s + h.amt, 0); } }
function hitsOf(e, mv) { return mv.x ? mv.x + (e.xb || 0) : 1; }
function barHTML(hp, max, blk, me) {
  let cls = '', tip = '';
  if (me && TIPS && B && !B.busy) { const inc = incoming(); if (inc > 0) { cls = blk >= inc ? 'ok' : 'low'; tip = `敌人下回合共 ${inc} 点伤害，你有 ${blk} 格挡${blk >= inc ? '，足够' : `，还差 ${inc - blk}`}`; } }
  return `<div class="bar ${blk ? 'blk' : ''}" title="${tip}"><i style="width:${Math.max(0, hp) / max * 100}%"></i><span>${Math.max(0, hp)}/${max}</span>${blk || cls === 'low' ? `<div class="blkv ${cls}">${blk}</div>` : ''}</div>${cls ? `<div class="inc ${cls}">受到 ${inc_(blk)}</div>` : ''}`;
  function inc_(b) { let loss = 0; for (const e of alive()) { const mv = e.d.moves[e.move]; if (!(mv.d && mv.i.startsWith('atk'))) continue; for (let k = 0; k < hitsOf(e, mv); k++) { const d = atkVal(e, B.p, mv.d); const h = mv.br && b > 1 ? Math.floor(b / 2) : 0; const use = Math.min(b - h, d); b -= use; loss += d - use; } } return loss; } /* 龙息只吃一半格挡 */
}
let frame = 0;
function render() {
  if (!B) return;
  const hs = B.hitSet || new Set();
  const enemies = B.en.filter(e => !(e.dead && e.deadAt && Date.now() - e.deadAt > 1500 && !(e.d.prePhase && !e.revived && !e.fled))).map(e => { /* 死透的敌人 1.5 秒后不再占位置（骷髅等会复活的除外） */
    const img = e.dead ? 'a' : (frame % 2 ? 'b' : 'a'), h = ENEMIES[e.key].sc * 1.3, hd = e.hd || ENEMIES[e.key].hd, tint = e.tint != null ? e.tint : ENEMIES[e.key].tint;
    const tg = (B.sel >= 0 || B.mechAim) && !e.dead;
    return `<div class="unit enemy ${hd ? 'hd' : ''} ${tg ? 'tg' : ''} ${hs.has(e.id) ? 'hit' : ''} ${B.lunge === e.id ? 'lunge' : ''} ${e.dead ? 'dead' : ''}" data-id="${e.id}" data-eid="${e.id}">
      ${e.dead ? '<div class="intent"></div>' : intentHTML(e)}
      <div class="sprw" ${ENEMIES[e.key].hdw ? `style="width:${ENEMIES[e.key].hdw}px"` : ''}>${hd ? `<img class="spr" decoding="async" data-eid="${e.id}" src="${eFrame(e)}" style="height:${hd}px${tint ? ';filter:' + tint : ''}">` : `<img class="spr px" data-k="${e.key}" src="assets/enemies/${e.key}/${img}.png" style="zoom:${h}">`}<i class="shd"></i></div>
      ${barHTML(e.hp, e.max, e.block)}${stsHTML(e.st)}<div class="uname">${e.d.name}</div>${(e.key === 'dev_boss' || e.key === 'dev_debug') && !e.dead && !e.bugT ? `<div class="crashc">${tr('离崩溃：出牌')} ${e.cc || 0}/6 · ${tr('0 费牌')} ${Math.min(3, B.p.zc || 0)}/3</div>` : ''}</div>`;
  }).join('');
  const HZ = TOUCH ? 1.45 : 1, energy = B.p.energy, n = B.hand.length, W = TOUCH ? (SW - 560) / HZ : SW - 300, cw = 150, gap = Math.min(cw + 6, (W - cw) / Math.max(1, n - 1));
  const x0 = TOUCH ? (SW / HZ - (gap * (n - 1) + cw)) / 2 : (W - (gap * (n - 1) + cw)) / 2;
  const hand = B.hand.map((c, i) => {
    const mid = (n - 1) / 2, rot = (i - mid) * 3, dy = Math.abs(i - mid) * Math.abs(i - mid) * 2.2, sel = B.sel === i;
    const cost = cardCost(c), off = cost !== 'X' && cost > energy;
    return cardHTML(c, `${sel ? 'sel' : ''} ${off ? 'off' : ''}`, energy).replace('class="card', `data-i="${i}" style="left:${x0 + i * gap}px;transform:translateY(${sel ? -100 : dy}px) rotate(${sel ? 0 : rot}deg);z-index:${i + 1}" class="card`);
  }).join('');
  view.innerHTML = `${bgHTML(true, B.bg)}${topBar()}
   <div id="hero" class="unit ${hs.has('hero') ? 'hit' : ''} ${heroAnimCls}" data-id="hero"><div class="intent"></div><div class="sprw"><img class="spr" decoding="async" src="${heroFrame()}" style="height:${heroH()}px${CHARS[R.char].tint && !isDragon() && !isMerged() ? ';filter:' + CHARS[R.char].tint : ''}"><i class="shd" style="width:150px"></i>${catHTML()}${sumHTML()}</div>${barHTML(R.hp, R.maxHp, B.p.block, 1)}${stsHTML(B.p.st)}${mechChips()}<div class="uname">${CHARS[R.char || 'hero'].name}</div></div>
   <div id="enemies">${enemies}</div>${foreHTML()}
   <div id="energy" class="${energy ? '' : 'empty'}">${energy}/${Math.max(energy, 3 + (has('crown') ? 1 : 0))}</div>
   <button class="btn" id="endturn" ${B.busy ? 'disabled' : ''}>${B.busy ? '敌人回合' : '结束回合 (E)'}</button>
   <div class="pile" id="drawp"><b>${B.draw.length}</b>抽牌堆</div><div class="pile" id="discp"><b>${B.disc.length}</b>弃牌堆</div><div class="pile" id="exhp"><b>${B.exh.length}</b>消耗</div>
   ${mechUI()}<div id="hand">${hand}</div>${B.sel >= 0 ? '<div id="tip">选择目标（Esc 取消）</div>' : B.mechAim ? '<div id="tip">点击敌人选择扑击目标（Esc 取消）</div>' : ''}`;
  heroAnimCls = '';
  bindTop();
  $('#endturn').onclick = endTurn;
  bindMech(); fixIntents();
  $('#drawp').onclick = () => showPile('抽牌堆（顺序已打乱）', [...B.draw].sort((a, b) => a.id < b.id ? -1 : 1));
  $('#discp').onclick = () => showPile('弃牌堆', B.disc);
  $('#exhp').onclick = () => showPile('消耗', B.exh);
  view.querySelectorAll('#hand .card').forEach(el => el.onclick = ev => { ev.stopPropagation(); if (DRAGGED) return; kwHide(); playCard(+el.dataset.i); });
  view.querySelectorAll('.enemy').forEach(el => el.onclick = () => { if (B.mechAim) { const e = B.en.find(x => x.id === el.dataset.eid); if (e && !e.dead) { const id = B.mechAim; B.mechAim = null; MECH.act(G, id, e.id); audio.gem && audio.gem(); render(); } return; } if (B.potSel != null) { const e = B.en.find(x => x.id === el.dataset.eid); if (e && !e.dead) usePotion(B.potSel, e); return; } if (B.sel >= 0) { const e = B.en.find(x => x.id === el.dataset.eid); if (e && !e.dead) playCard(B.sel, e); } });
  flushFx(); dbgPanel(); aimMark();
}
/* 新角色的头顶显示、角色按钮、麻将牌架 */
function mechChips() { const cs = MECH.chips(G); return cs.length ? `<div class="sts">${cs.map(c => `<b class="mchip" style="border-color:${c.c};color:${c.c}" title="${esc(c.tip)}">${c.h}</b>`).join('')}</div>` : ''; }
function mechUI() {
  const as = MECH.actions(G), rk = MECH.rack(G);
  const btns = as.length ? `<div id="mechb">${as.map(a => `<button class="btn mb${a.on ? ' on' : ''}" data-a="${a.id}" ${a.dis || B.busy ? 'disabled' : ''}>${a.label}</button>`).join('')}</div>` : '';
  const rack = rk ? `<div id="rack"><span class="rl">麻将</span>${rk.tiles.map(x => `<b class="tile">${x}</b>`).join('')}${rk.eighth ? `<b class="tile t8" title="本回合最后摸到的牌，只能用来凑小胡">${rk.eighth}</b>` : ''}<span class="rp">${rk.set ? '本回合已结算' : rk.pats.length ? rk.pats.map(x => `<i>${x}</i>`).join('') : '还没有牌型'}</span><span class="rn">牌池 ${rk.pool}</span></div>` : '';
  return btns + rack;
}
function fitEnemies() { const row = $('#enemies'), hero = $('#hero'); if (!row || !hero) return; row.style.transform = '';
  const rr = row.getBoundingClientRect(), hr = hero.getBoundingClientRect(), room = rr.right - (hr.right + 16);
  if (rr.width > room && room > 50) { row.style.transformOrigin = 'right bottom'; row.style.transform = `scale(${Math.max(.55, room / rr.width)})`; } }
function fixIntents() { fitEnemies(); /* 高个子敌人的意图文字被顶栏挡住时，往下挪到顶栏下面（压在头上也比看不到好） */
  const tb = $('#top'); if (!tb) return; const lim = tb.getBoundingClientRect().bottom + 4, sc = stage.getBoundingClientRect().width / (stage.offsetWidth || 1) || 1;
  view.querySelectorAll('.enemy .intent').forEach(el => { el.style.transform = ''; const r = el.getBoundingClientRect(); if (r.height && r.top < lim) { el.style.transform = `translateY(${(lim - r.top) / sc}px)`; el.classList.add('pushed'); } });
}
function bindMech() {
  view.querySelectorAll('#mechb [data-a]').forEach(el => el.onclick = async ev => { ev.stopPropagation(); if (!B || B.busy || B.anim || B.over) return; const id = el.dataset.a;
    if (B.mechAim === id) { B.mechAim = null; render(); return; }
    if (MECH.act(G, id) === 'enemy') { const a = alive(); if (a.length === 1) MECH.act(G, id, a[0].id); else { B.sel = -1; B.mechAim = id; render(); return; } }
    audio.gem && audio.gem(); render(); });
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
setInterval(() => { frame++; if (!B || B.over) return; if (!B.busy && !alive().length) { checkEnd(); return; } /* 兜底：任何途径打死最后一个敌人都能结算 */ view.querySelectorAll('.enemy:not(.dead):not(.hd) .spr').forEach(img => img.src = `assets/enemies/${img.dataset.k}/${frame % 2 ? 'b' : 'a'}.png`); }, 520);
addEventListener('keydown', e => { if (e.target && e.target.tagName === 'INPUT') return;
  if (!B || B.over || document.querySelector('.overlay') || !view.querySelector('#hand')) return;
  if (e.key === 'e' || e.key === 'E') endTurn();
  else if (e.key === 'Escape') { B.sel = -1; B.mechAim = null; render(); }
  else if (/^[0-9]$/.test(e.key)) { const i = (+e.key + 9) % 10; if (i < B.hand.length) playCard(i); }
  else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && B.sel >= 0) { const a = alive(); B.aimI = ((B.aimI || 0) + (e.key === 'ArrowRight' ? 1 : -1) + a.length) % a.length; aimMark(); e.preventDefault(); }
  else if ((e.key === 'Enter' || e.key === ' ') && B.sel >= 0) { const a = alive(); e.preventDefault(); playCard(B.sel, a[(B.aimI || 0) % a.length]); }
  else if (e.key === 'q' || e.key === 'Q') $('#tbdeck')?.click();
});
function aimMark(id) { view.querySelectorAll('.enemy.aim').forEach(x => x.classList.remove('aim')); if (!B) return; if (id === undefined) { if (B.sel < 0) return; const a = alive(); const e = a[(B.aimI || 0) % a.length]; id = e && e.id; } if (id) view.querySelector(`.enemy[data-eid="${id}"]`)?.classList.add('aim'); }
/* 拖动出牌：手机只拖动，电脑点击和拖动都可以 */
let DR = null, DRAGGED = false;
const stXY = ev => { const s = stage._s || 1, r = stage.getBoundingClientRect(); return [(ev.clientX - r.left) / s, (ev.clientY - r.top) / s]; };
const enemyAt = ev => { const el = document.elementFromPoint(ev.clientX, ev.clientY); const en = el && el.closest && el.closest('.enemy'); const e = en && B && B.en.find(x => x.id === en.dataset.eid); return e && !e.dead ? e : null; };
function dragEnd(cancel) { if (!DR) return; $('#aimline')?.remove(); aimMark(null); const d = DR; DR = null; if (cancel || !B) { render(); return; } }
view.addEventListener('pointerdown', ev => { const el = ev.target.closest && ev.target.closest('#hand .card'); if (!el || !B || B.busy || B.over || B.anim || ev.button > 0) return;
  const i = +el.dataset.i, c = B.hand[i]; if (!c) return; const [x, y] = stXY(ev), r = el.getBoundingClientRect(), s = stage._s || 1, sr = stage.getBoundingClientRect();
  DR = { i, el, x0: x, y0: y, moved: false, tgt: CARDS[c.id].tgt === 'one', cx: (r.left + r.width / 2 - sr.left) / s, cy: (r.top - sr.top) / s + 20 };
  ev.preventDefault(); DRAGGED = false; if (TOUCH) { view.querySelectorAll('#hand .card.peek').forEach(x => x.classList.remove('peek')); el.classList.add('peek'); kwShow(el); } });
addEventListener('pointermove', ev => { if (!DR || !B) return; const [x, y] = stXY(ev); if (!DR.moved && Math.hypot(x - DR.x0, y - DR.y0) < 14) return;
  if (!DR.moved) { DR.moved = true; DRAGGED = true; kwHide(); DR.el.classList.remove('peek'); DR.el.classList.add('dragging'); }
  if (DR.tgt) { DR.el.style.setProperty('--dt', 'translateY(-40px) scale(1.05) rotate(0deg)'); let ln = $('#aimline');
    if (!ln) { ln = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); ln.id = 'aimline'; ln.setAttribute('style', `position:absolute;left:0;top:0;width:${SW}px;height:720px;z-index:85;pointer-events:none;overflow:visible`); stage.appendChild(ln); }
    /* 杀戮尖塔式箭头：沿贝塞尔曲线排一串由小变大的箭头块，末端大箭头；指到敌人时变红 */
    const e = enemyAt(ev), col = e ? '#ff5a4a' : '#ffd35a', x0 = DR.cx, y0 = DR.cy - 40, cx = (x0 + x) / 2, cy = Math.min(y0, y) - 160, N = 11;
    const P = t => [(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y];
    let h = '';
    for (let k = 1; k < N; k++) { const t = k / N, [px, py] = P(t), [qx, qy] = P(t + .01), a = Math.atan2(qy - py, qx - px) * 180 / Math.PI, sz = 9 + 15 * t;
      h += `<path d="M${-sz},${-sz} L${sz * .6},0 L${-sz},${sz} L${-sz * .4},0 Z" fill="${col}" stroke="#2a1a08" stroke-width="3" transform="translate(${px},${py}) rotate(${a})"/>`; }
    const [ex, ey] = P(.97), ang = Math.atan2(y - ey, x - ex) * 180 / Math.PI;
    h += `<path d="M-38,-38 L30,0 L-38,38 L-18,0 Z" fill="${col}" stroke="#2a1a08" stroke-width="3" transform="translate(${x},${y}) rotate(${ang})"/>`;
    ln.innerHTML = h; aimMark(e ? e.id : null); }
  else { DR.el.style.setProperty('--dt', `translate(${x - DR.x0}px,${y - DR.y0}px) scale(1.08)`); DR.el.classList.toggle('ready', y < 470); } });
addEventListener('pointerup', ev => { if (!DR || !B) { DR = null; return; } const d = DR, [x, y] = stXY(ev);
  if (!d.moved) { DR = null; if (TOUCH) { d.el.classList.remove('peek'); kwHide(); } return; }
  const e = d.tgt ? enemyAt(ev) : null; dragEnd(true); setTimeout(() => { DRAGGED = false; }, 50);
  if (d.tgt) { const a = alive(); if (e) playCard(d.i, e); else if (a.length === 1 && y < 470) playCard(d.i, a[0]); } else if (y < 470) playCard(d.i); });
addEventListener('pointercancel', () => dragEnd(true));
view.addEventListener('contextmenu', e => { if (B && B.sel >= 0) { e.preventDefault(); B.sel = -1; render(); } });

// ---------- 战后奖励 ----------
function rewardScreen(...a) { return SR(rewardScreen0, a); }
function rewardScreen0() { /* 战利品先存进存档（R.loot），刷新页面也不会丢 */
  if (B) { const kind = B.kind; B = null; const L = [];
    L.push({ t: 'gold', n: Math.round((kind === 'boss' ? rnd(90, 110) : kind === 'elite' ? rnd(25, 35) : rnd(10, 20)) * (A_(7) ? .7 : 1) * (MOD('midas') ? 2 : 1)) });
    if (has('clover')) L.push({ t: 'clover' });
    if (kind === 'elite') { const rl = rollRelic(); if (rl) L.push({ t: 'relic', id: rl }); if (has('b_star')) { const r2 = rollRelic(); if (r2 && r2 !== rl) L.push({ t: 'relic', id: r2 }); } }
    if (kind === 'boss' && (R.after === 'act2' || R.after === 'act3')) { /* 打完第一、二章 Boss 各一次 */ const ids = rollBossRelics(); if (ids.length) L.push({ t: 'brelic', ids }); }
    if (kind === 'boss') { const rl = rollRelic(['r']); if (rl) L.push({ t: 'relic', id: rl }); if (R.bonusRelic) { delete R.bonusRelic; let r2 = null; for (let k = 0; k < 10 && (!r2 || r2 === rl); k++) r2 = rollRelic(); if (r2 && r2 !== rl) L.push({ t: 'relic', id: r2 }); } }
    if (Math.random() < (kind === 'elite' ? .6 : .4)) L.push({ t: 'potion', id: rollPotion() });
    L.push({ t: 'cards', ids: (kind === 'boss' ? rollCards(3 + (has('b_cards') ? 1 : 0), 0, true) : rollCards(3 + (has('b_cards') ? 1 : 0), kind === 'elite' ? .07 : 0)).map(c => c.id) }); /* Boss：三选一稀有牌 */
    R.loot = L; save(); }
  setMusic('menu');
  const L = R.loot || [];
  const html = it => it.t === 'gold' ? `<img src="assets/icons/goldbag.png">${it.n} 金币` : it.t === 'clover' ? `<img src="${RELICS.clover.img}">四叶草：15 金币` : it.t === 'relic' ? `<img src="${RELICS[it.id].img}"><span>秘宝：</span>${RELICS[it.id].name}` : it.t === 'brelic' ? `<img src="${RELICS[it.ids[0]].img}"><span>Boss 秘宝：</span>三选一` : it.t === 'potion' ? `<img src="${POTIONS[it.id].img}"><span>药水：</span>${POTIONS[it.id].name}` : `<img src="assets/icons/p_arc.png">选择一张牌加入牌组`;
  const take = i => { L.splice(i, 1); save(); draw(); };
  const draw = () => {
    view.innerHTML = `${bgHTML()}${topBar()}<div class="panel"><h2>战利品</h2>${L.map((it, i) => `<div class="reward" data-i="${i}">${html(it)}</div>`).join('')}<br><button class="btn" id="go">继续前进</button></div>`;
    bindTop();
    view.querySelectorAll('.reward').forEach(el => el.onclick = () => {
      const i = +el.dataset.i, it = L[i];
      if (it.t === 'brelic') return chooseBossRelic(it.ids, ok => { if (ok) take(i); else draw(); });
      if (it.t === 'cards') return chooseCard(it.ids.map(id => mkCard(id)), ok => { if (ok) take(i); else draw(); });
      if (it.t === 'gold') R.gold += it.n; else if (it.t === 'clover') R.gold += 15; else if (it.t === 'relic') gainRelic(it.id); else if (it.t === 'potion') { if (gainPotion(it.id) === false) return; }
      audio.gem(); take(i);
    });
    $('#go').onclick = () => { delete R.loot; const af = R.after; delete R.after; if (af === 'act2') { save(); return act2Choice(); } if (af === 'act3') { R.wait = 'act3'; save(); return act3Choice(); } if (af === 'rift') { R.wait = 'rift'; save(); return riftChoice(); } if (af === 'final') { R.wait = 'final'; save(); return finalPrep(); } if (af === 'layer') { save(); return layerEnd(); } save(); mapScreen(); };
  };
  draw();
}

// ---------- 营火 ----------
function restScreen() {
  const heal = Math.floor(R.maxHp * ((A_(5) ? .2 : .3) - (R.trials && R.trials.includes('hunger') ? .15 : 0))) + (has('stove') ? 10 : 0) - (A_(14) ? 5 : 0);
  view.innerHTML = `${bgHTML(false, 'c' + Math.min(3, ACT()) + '_rest')}${topBar()}<div class="panel"><h2>营火</h2><p>篝火噼啪作响，难得的安宁。</p><div class="row">
   <button class="btn" id="rest" ${has('b_core') ? 'disabled' : ''}>${has('b_core') ? tr('熔火之心：不能休息') : `休息：回复 ${heal} 生命`}</button><button class="btn" id="smith" ${R.deck.some(c => !c.up) ? '' : 'disabled'}>锻造：升级一张牌</button>${ACT() === 2 && !(R.keys || {}).r ? `<button class="btn red" id="rkey">${tr('取得血月钥匙（这次不休息也不锻造）')}</button>` : ''}</div></div>`;
  bindTop(); $('#rkey')?.addEventListener('click', () => { gotKey('r'); mapScreen(); });
  $('#rest').onclick = () => { R.rested = 1; R.hp = Math.min(R.maxHp, R.hp + heal); audio.holy(); mapScreen(); };
  $('#smith').onclick = () => pickDeck('upgrade', ok => { if (ok) mapScreen(); });
}

// ---------- 宝箱 ----------
function treasureScreen() {
  view.innerHTML = `${bgHTML()}${topBar()}<div class="panel"><h2>宝箱</h2><img src="assets/icons/box.png" style="width:120px;cursor:pointer" id="chest"><p>点击打开</p>${ACT() === 3 && !R.rift && !(R.keys || {}).b ? `<button class="btn red" id="bkey">${tr('不开宝箱，取走龙鳞钥匙')}</button>` : ''}</div>`;
  bindTop(); $('#bkey')?.addEventListener('click', () => { gotKey('b'); mapScreen(); });
  $('#chest').onclick = () => { sting('chest', 900);
    const [rl, g] = SR(() => [rollRelic(), rnd(20, 40)]); gainRelic(rl); R.gold += g; delete R.pending; delete R.snap; save(); /* 开了就结算，退出重进不能再开 */
    view.innerHTML = `${bgHTML()}${topBar()}<div class="panel"><h2>宝箱</h2>${rl ? `<img src="${RELICS[rl].img}" style="width:90px"><p><b>${RELICS[rl].name}</b><br>${RELICS[rl].desc}</p>` : ''}<p>以及 ${g} 金币。</p><button class="btn" id="go">继续前进</button></div>`;
    bindTop(); $('#go').onclick = mapScreen;
  };
}

// ---------- 商店 ----------
function shopScreen() {
  const gm = (R.trials && R.trials.includes('greed') ? 1.5 : 1) * (A_(11) ? 1.2 : 1) * (MOD('midas') ? 2 : 1) * (has('b_cards') ? 1.2 : 1), PR = { c: 50 * gm, u: 75 * gm, r: 150 * gm }, RP = { c: 150 * gm, u: 200 * gm, r: 280 * gm };
  /* 商店货物进店时生成一次并存档：退出重进还是同一批货（不能刷新重抽） */
  if (!R.shopStock) R.shopStock = SR(() => { const cards = rollCards(5).map(c => ({ c, p: Math.round(PR[CARDS[c.id].rar] * (0.9 + Math.random() * .2)) }));
    const rels = []; for (let k = 0; k < 2; k++) { const id = rollRelic(['c', 'u', 'u', 'r'], true); if (id && !rels.some(x => x.id === id)) rels.push({ id, p: RP[RELICS[id].rar] + rnd(-10, 10) }); }
    const pots = [rollPotion(), rollPotion()].map(id => ({ id, p: Math.round((id === 'fairy' ? 120 : POTIONS[id] && POTIONS[id].rar === 'r' ? rnd(90, 110) : POTIONS[id] && POTIONS[id].rar === 'u' ? rnd(60, 75) : rnd(45, 60)) * gm) }));
    return { cards, rels, pots, removed: false }; });
  const ST = R.shopStock, { cards, rels, pots } = ST, rmc = () => Math.round(R.removeCost * gm); save();
  const draw = () => {
    view.innerHTML = `${bgHTML(false, 'c' + Math.min(3, ACT()) + '_shop')}${topBar()}<div class="panel" style="top:53%;width:1000px;padding:14px 26px"><h2 style="margin-bottom:8px">哥布林商人</h2>
     <div class="row" style="flex-wrap:nowrap">${cards.map((x, i) => `<div class="shopitem" data-c="${i}">${x.c ? cardHTML(x.c) : '<div style="width:129px;height:181px"></div>'}<span class="price ${x.p > R.gold ? 'no' : ''}">${x.c ? '● ' + x.p : '已售出'}</span></div>`).join('')}</div>
     <div class="row" style="margin-top:14px">${rels.map((x, i) => `<div class="relicbig" data-r="${i}" title="${x.id ? esc(RELICS[x.id].desc) : ''}">${x.id ? `<img src="${RELICS[x.id].img}">${RELICS[x.id].name}<span class="price ${x.p > R.gold ? 'no' : ''}">● ${x.p}</span>` : '已售出'}</div>`).join('')}
${pots.map((x, i) => `<div class="relicbig" data-pt="${i}" title="${x.id ? esc(POTIONS[x.id].desc) : ''}">${x.id ? `<img src="${POTIONS[x.id].img}">${POTIONS[x.id].name}<span class="price ${x.p > R.gold ? 'no' : ''}">● ${x.p}</span>` : '已售出'}</div>`).join('')}
      <div class="relicbig" id="rm"><img src="assets/icons/sk_bmist.png">移除一张牌<span class="price ${rmc() > R.gold || ST.removed ? 'no' : ''}">${ST.removed ? '已使用' : '● ' + rmc()}</span></div>
      <div style="align-self:center;margin-left:30px"><button class="btn" id="go">离开商店</button></div></div></div>`;
    bindTop();
    view.querySelectorAll('[data-c]').forEach(el => el.onclick = () => { const x = cards[+el.dataset.c]; if (!x.c || x.p > R.gold) return; R.gold -= x.p; R.deck.push(x.c); x.c = null; audio.gem(); save(); draw(); });
    view.querySelectorAll('[data-r]').forEach(el => el.onclick = () => { const x = rels[+el.dataset.r]; if (!x.id || x.p > R.gold) return; R.gold -= x.p; gainRelic(x.id); x.id = null; save(); draw(); });
    view.querySelectorAll('[data-pt]').forEach(el => el.onclick = () => { const x = pots[+el.dataset.pt]; if (!x.id || x.p > R.gold) return; if (!gainPotion(x.id)) return; R.gold -= x.p; x.id = null; save(); draw(); });
    $('#rm').onclick = () => { if (ST.removed || rmc() > R.gold) return; pickDeck('remove', ok => { if (ok === false) return draw(); R.gold -= rmc(); R.removeCost += 25; ST.removed = true; save(); draw(); }); };
    $('#go').onclick = () => { delete R.shopStock; mapScreen(); };
  };
  draw();
}

// ---------- 事件 ----------
/* 事件选项的通用前提：做不到的选项直接灰掉（全升级了不能再升级、牌太少不能删、药水栏满、血不够付） */
function evOk(t) { let m;
  if (/升级/.test(t) && !R.deck.some(c => !c.up)) return false;
  if ((m = t.match(/删除 (\d+) 张/)) && R.deck.length <= +m[1] + 4) return false;
  if (/(得到|获得|买).{0,6}药水|药水[:：]|瓶药水/.test(t) && !/失去.{0,4}药水/.test(t) && (MOD('nopot') || (R.potions || []).length >= (A_(12) ? 2 : 3))) return false;
  if ((m = t.match(/失去 (\d+) (点)?生命/)) && R.hp <= +m[1]) return false;
  return true; }
function eventScreen() {
  const POOL = ACT() >= 3 ? EV3 : ACT() === 2 ? EVENTS2 : EVENTS;
  if (R.evPick == null || !POOL[R.evPick]) { R.evPick = SR(() => Math.floor(Math.random() * POOL.length)); save(); } /* 记住是哪个事件：退出重进还是它 */
  const ev = POOL[R.evPick];
  const A = {
    heal: n => { R.hp = Math.min(R.maxHp, R.hp + n); }, gold: n => { R.gold += n; }, hurt: n => { R.hp = Math.max(1, R.hp - n); },
    maxHp: n => { R.maxHp += n; R.hp = Math.min(R.hp, R.maxHp); }, relic: () => { const id = rollRelic(); gainRelic(id); return id ? RELICS[id].name : '（空）'; },
    pick: (m, n = 1) => setTimeout(() => { const go = k => pickDeck(m, () => k > 1 ? go(k - 1) : draw2()); go(n); }, 50), curse: id => { R.deck.push(mkCard(id)); }, rareCard: () => setTimeout(() => chooseCard(rollCards(3, 0, true), () => draw2()), 50), card: () => setTimeout(() => chooseCard(rollCards(3), () => draw2()), 50),
    potion: () => { const id = rollPotion(); return gainPotion(id) ? POTIONS[id].name : '（药水栏满了，没拿上）'; },
  };
  let result = null;
  const img = ev.img === 'gb' ? 'assets/icons/gb.png' : `assets/icons/${ev.img}.png`;
  const draw2 = () => {
    view.innerHTML = `${bgHTML()}${topBar()}<div class="panel evp" style="width:620px"><h2>${ev.title}</h2><img src="${ev.pic ? 'assets/events/' + ev.pic + '.jpg' : img}" style="${ev.pic ? 'width:360px;border-radius:10px;border:3px solid #c9a35a;margin:-4px 0 6px' : 'width:110px;margin-bottom:8px'}">
     <p>${result || ev.text}</p>${result ? '<button class="btn" id="go">继续前进</button>' : ev.opts.map((o, i) => `<button class="btn opt" data-i="${i}" ${(o.ok && !o.ok(R)) || !evOk(o.t) ? 'disabled' : ''}>${o.t}</button>`).join('')}</div>`;
    bindTop();
    view.querySelectorAll('.opt').forEach(el => el.onclick = () => { result = SR(() => ev.opts[+el.dataset.i].go(R, A)); delete R.evPick; delete R.pending; delete R.snap; save(); draw2(); });
    $('#go')?.addEventListener('click', mapScreen);
  };
  draw2();
}

// ---------- 结束 ----------
function story(img, lines, done, once) {
  stage.querySelectorAll('.say').forEach(x => x.remove());
  if (once && LS(once)) return done(); if (once) localStorage.setItem(once, '1');
  view.innerHTML = `<div class="bg"><img class="full px" src="assets/bg/${img}.jpg" style="object-fit:cover"></div><div class="storybox"><p></p><div class="row" style="justify-content:flex-end;gap:12px"><button class="btn" id="stskip">${t('跳过')}</button><button class="btn gold" id="stnext">${t('继续')}</button></div></div>`;
  let i = 0; const show = () => { view.querySelector('.storybox p').textContent = t(lines[i]); };
  show(); $('#stskip').onclick = done; $('#stnext').onclick = () => { if (++i >= lines.length) done(); else show(); };
}
/* 外部曲子（Pixabay 许可，可商用）：标题 / 每章的地图、战斗、Boss 各一首 */
const BGM = {}; let bgmNow = null, duckT = 0; const M3 = new Set(['c3_map', 'c3_battle', 'c3_elite', 'c3_boss', 'c3_rift', 'c3_final', 'c3_true']);
function sting(k, ms) { try { audio[k] && audio[k](); } catch (e) {} duckT = performance.now() + ms; }
function setMusic(m) {
  const a = ACT() >= 2 ? 'c2' : 'c1'; let want = !R && m === 'menu' ? 'title' : m === 'menu' ? a + '_map' : m === 'boss' || m === 'final' ? a + '_boss' : m === 'elite' ? a + '_elite' : a + '_battle';
  if (R && ACT() === 3) { const c = m === 'true' ? 'c3_true' : R.rift ? (m === 'final' ? 'c3_final' : m === 'boss' ? 'c3_elite' : 'c3_rift') : m === 'menu' ? 'c3_map' : m === 'boss' ? 'c3_boss' : m === 'elite' ? 'c3_elite' : 'c3_battle'; if (M3.has(c)) want = c; } /* 第三章的曲子到了哪首用哪首，没到的先用第二章的 */
  if (bgmNow && bgmNow !== want) { BGM[bgmNow].pause(); bgmNow = null; }
  if (!want) { audio.setMode(m); return; }
  audio.setMode('silent');
  const el = BGM[want] || (BGM[want] = Object.assign(new Audio(`assets/music/${want}.mp3?v=2`), { loop: true }));
  const V = audio.vol || { m: 1, mu: 1 }; el.volume = audio.muted ? 0 : Math.min(1, .55 * (V.m ?? 1) * (V.mu ?? 1));
  if (bgmNow !== want) { el.currentTime = 0; el.play().catch(() => {}); bgmNow = want; }
}
addEventListener('pointerdown', () => { if (bgmNow && BGM[bgmNow].paused) BGM[bgmNow].play().catch(() => {}); }); /* 浏览器要求先点一下才能播放 */
setInterval(() => { if (bgmNow) { const V = audio.vol || {}; BGM[bgmNow].volume = audio.muted ? 0 : Math.min(1, .55 * (V.m ?? 1) * (V.mu ?? 1)) * (performance.now() < duckT ? .25 : 1); } }, 150);
function act2Choice() { sting('act2', 2600);
  B = null; delete R.pending; delete R.pendEnc; delete R.snap; R.act2wait = 1; save(); setMusic('menu'); const bn = tr((ENEMIES[R.boss] || {}).name || '哥布林大王');
  view.innerHTML = `${bgHTML(false, 'story_road')}<div class="panel" style="width:760px;text-align:center;top:auto;bottom:40px;transform:translateX(-50%)"><h2>${t('{0}倒下了', bn)}</h2>
   <p>${t('远处山顶的古堡亮起了血红的光。被抓走的村民，就关在那里。')}</p><p style="color:#ffb0b0">${t('进入第二章：血月古堡（回复 {0}% 生命）', A_(16) ? 40 : 50)}</p>
   <div class="row" style="justify-content:center;gap:16px;margin-top:14px"><button class="btn gold" id="go2">${t('前往古堡')}</button><button class="btn" id="end1">${t('到此为止')}</button></div></div>`;
  $('#go2').onclick = () => { delete R.act2wait; R.floor0 = R.floor; R.floor = 0; R.act = 2; R.hp = Math.min(R.maxHp, R.hp + Math.floor(R.maxHp * (A_(16) ? .4 : .5))); R.map = genMap(); delete R.pos; R.path = []; R.fights = 0; R.boss = SR(() => pickOne(ENCOUNTERS2.boss)[0]);
    delete R.pending; delete R.pendEnc; delete R.snap; save(); mapScreen(); };
  $('#end1').onclick = () => { delete R.act2wait; clearSave(); endScreen(true); };
  /* 第二章通关结局：先看结局插图 */
}

/* ---------- 第三章 · 结局 · 无尽模式 ---------- */
const END2 = () => [R.boss === 'vamp_count' ? '伯爵化为了灰烬，天终于亮了。被关押的村民们，终于重获自由。' : t('{0}倒下了。古堡的血月熄灭，天终于亮了。被关押的村民们重获自由。', tr((ENEMIES[R.boss] || {}).name || '')), '可是窗外，更高的雪山顶上，一双紫色的眼睛睁开了。', '“回家的路……还在更高的地方。”'];
function act3Choice() { sting('act2', 2600);
  B = null; delete R.pending; delete R.pendEnc; delete R.snap; R.wait = 'act3'; save(); setMusic('menu');
  view.innerHTML = `${bgHTML(false, 'story_end2')}<div class="panel" style="width:780px;text-align:center;top:auto;bottom:40px;transform:translateX(-50%)"><h2>${t('{0}倒下了', tr((ENEMIES[R.boss] || {}).name || ''))}</h2>
   <p>${t('古堡的血月熄灭了，被关押的村民们重获自由。')}</p><p>${t('可是窗外，更高的雪山顶上，一双紫色的眼睛睁开了。')}</p><p style="color:#a8dcff">${t('进入第三章：永冬之巅（回复 {0}% 生命）', A_(16) ? 40 : 50)}</p>
   <div class="row" style="justify-content:center;gap:16px;margin-top:14px"><button class="btn gold" id="go3">${t('前往雪山')}</button><button class="btn" id="end2">${t('到此为止')}</button></div></div>`;
  $('#go3').onclick = () => { delete R.wait; delete R.rift; delete R.rows; R.floor0 = (R.floor0 || 0) + R.floor; R.floor = 0; R.act = 3; R.hp = Math.min(R.maxHp, R.hp + Math.floor(R.maxHp * (A_(16) ? .4 : .5))); R.map = genMap(); delete R.pos; R.path = []; R.fights = 0; R.boss = ENC3.boss[0][0];
    save(); story('story_snow', ['古堡后面的山路，一直通向终年不化的雪峰。', '风里传来龙的长啸，一声接着一声。', '“那双紫色的眼睛……就在山顶。”'], mapScreen); };
  $('#end2').onclick = () => { delete R.wait; clearSave(); story('story_end2', END2(), () => story('story_party', ['天亮了。大家并肩站在晨光里，笑得满脸是灰。', '“走吧，往上。”'], () => endScreen(true))); };
}
const RIFTBG = 'c3_rift';
function riftChoice() { sting('act2', 2600);
  B = null; delete R.pending; delete R.pendEnc; delete R.snap; R.wait = 'rift'; save(); setMusic('menu');
  view.innerHTML = `${bgHTML(false, 'story_gate')}<div class="panel" style="width:780px;text-align:center;top:auto;bottom:40px;transform:translateX(-50%)"><h2>${t('门后的裂隙')}</h2>
   <p>${t('开发者让开了路。山顶的门半开着，门缝里涌出紫红色的光和硫磺味。')}</p><p>${t('紫瞳霜龙就守在门的另一头——可门和它之间，空间已经裂开了。')}</p><p style="color:#ffb0c8">${t('进入第三章·下半：魔界裂隙（回复 30% 生命）')}</p>
   <div class="row" style="justify-content:center;margin-top:14px"><button class="btn gold" id="gor">${t('踏进裂隙')}</button></div></div>`;
  $('#gor').onclick = () => { delete R.wait; R.rift = 1; R.rows = 8; R.floor0 = (R.floor0 || 0) + R.floor; R.floor = 0; R.hp = Math.min(R.maxHp, R.hp + Math.floor(R.maxHp * .3)); R.map = genMap(); delete R.pos; R.path = []; R.fights = 0; R.boss = GATE3;
    save(); story('story_gate', ['裂隙里没有风雪，只有烧焦的岩石和低语声。', '小小的、抱着锁链的影子，在岩缝里咯咯地笑。', '“门那边漏出来的东西……原来是这些。”'], mapScreen); };
}
function finalPrep() {
  B = null; R.wait = 'final'; save(); setMusic('menu');
  view.innerHTML = `${bgHTML(false, 'story_gate')}<div class="panel" style="width:760px;text-align:center;top:auto;bottom:40px;transform:translateX(-50%)"><h2>${t('门开了')}</h2>
   <p>${t('霜龙倒在门前，门的那一边，黑色的铠甲缓缓走了出来。')}</p><p>${t('「龙守着门，就是为了关住我。」')}</p><p style="color:#a8dcff">${t('回复 30% 生命')}</p>
   <div class="row" style="justify-content:center;margin-top:14px"><button class="btn gold" id="gof">${t('迎战魔王')}</button></div></div>`;
  $('#gof').onclick = () => { delete R.wait; R.hp = Math.min(R.maxHp, R.hp + Math.floor(R.maxHp * .3)); R.floor++; R.pending = 'final'; snap(); save(); enterNode('final'); };
}
const CH3END = { hero: '存档……保存好了。下次再来，我还带掌机。', heroine: '回去以后，我想把这一路的声音写成歌。', miko: '神社的铃铛响了……我到家了。', witch: '你们走吧。村子……我会替你们守着的。', erin: '火、水、风……都归于平静了。', gu: '剑收入鞘。这一程，走完了。', sylvie: '我不是龙，也不只是人。我是你们的同伴。', mia: '团子，我们也回家吧喵。', feiyue: '天亮了。……原来我也能站在太阳底下。', dev: '这一关，总算是通了。下个版本见。' };
function endingChoice() {
  B = null; R.wait = 'ending'; save(); setMusic('menu'); sting('act2', 2600);
  view.innerHTML = `${bgHTML(false, 'story_gate')}<div class="panel" style="width:780px;text-align:center;top:auto;bottom:40px;transform:translateX(-50%)"><h2>${t('门亮了起来')}</h2>
   <p>${t('深渊之主化成了黑烟。门的对面，是放学路上的那条街。')}</p><p>${t('门的上方，还有一节台阶。')}</p>
   <div class="row" style="justify-content:center;gap:16px;margin-top:14px"><button class="btn gold" id="home">${t('回家')}</button><button class="btn" id="up">${t('继续往上（无尽模式）')}</button>${R.keys && R.keys.g && R.keys.r && R.keys.b ? `<button class="btn red" id="tru">${t('用三把钥匙打开更上面的门')}</button>` : ''}</div></div>`;
  $('#tru')?.addEventListener('click', trueGate);
  { const k = R.keys || {}, miss = [['g', '翡翠钥匙（第一章燃烧的精英）'], ['r', '血月钥匙（第二章营火放弃休息）'], ['b', '龙鳞钥匙（第三章宝箱放弃秘宝）']].filter(([x]) => !k[x]); if (Object.keys(k).length && miss.length) { const pp = document.createElement('p'); pp.style.cssText = 'color:#9fb4d8;font-size:14px;margin-top:8px'; pp.textContent = tr('门的更上方还有一道锁。还差：') + miss.map(m => tr(m[1])).join('、'); view.querySelector('.panel')?.appendChild(pp); } }
  $('#home').onclick = () => { delete R.wait; R.home = 1; clearSave(); story(homeArt(), ['门对面，是放学路上的那条街。', '大家互相看了一眼，谁也没先迈步。', '“……走吧，回家。”'], () => endScreen(true)); };
  $('#up').onclick = () => { delete R.wait; startEndless(); };
}
/* 真结局：三把钥匙打开「源代码之间」（真 Boss 待定，先用加强版开发者占位） */
const TRUEB = 'dev_debug'; /* 真结局插图：千早回日本的街道；其他人回中国小镇（图到了改成 story_true_cn） */
const CN_ART = true, CN_TRUE = true; /* 中国小镇：普通结局图已到；真结局图 story_true_cn 到了把 CN_TRUE 改成 true */
const HOMEART = { miko: 'story_home', hero: 'story_home_cn', heroine: 'story_home_cn', witch: 'story_party', mia: 'story_party', erin: 'story_gate', gu: 'story_snow', sylvie: 'story_snow', feiyue: 'story_end2' };
const homeArt = () => { const a = HOMEART[R && R.char] || 'story_home'; return a.endsWith('_cn') && !CN_ART ? 'story_home' : a; };
const trueArt = () => { const c = R && R.char; if (c === 'miko') return 'story_true_jp'; if (c === 'hero' || c === 'heroine') return CN_TRUE ? 'story_true_cn' : 'story_home_cn'; return homeArt(); };
const TRUEEND = {
  hero: ['林拓回到了街口。掌机屏幕上，跳出了从没见过的两个字：「通关」。', '他把存档拷了好几份。“……下次，换我来做一个游戏。”'],
  heroine: ['苏音摘下耳机，异世界的声音还在耳朵里回响。', '那天晚上，她录下了自己的第一首歌，歌名叫《通往顶端》。'],
  miko: ['神社的铃铛在风里响着。千早在绘马上写下“愿大家平安”，挂在了最高的那根绳子上。', '她偶尔会对着山的方向拉一次空弦。那边的人，大概也听得到吧。'],
  witch: ['门的这一边，莉泽送走了三个异世界来的朋友。', '她回到村子，把炼金铺的招牌换成了「通往顶端」。架子最高处，留着三个永远不卖的空瓶。'],
  erin: ['艾琳在门边找到了第四种元素。它没有颜色，也没有温度，长老们叫它“回忆”。', '她把它写进了魔法书的第一页。'],
  gu: ['剑派的人重新聚在了山下。师兄们看见她身后那群奇怪的同伴，第一次没有吵架。', '“练气还是练剑？”有人又问。顾清寒笑了：“一起练。”'],
  sylvie: ['希尔薇不再害怕变身了。', '后来，雪山上多了一条会朝登山的人点头打招呼的白龙。'],
  mia: ['团子在门口打了个大大的哈欠，米娅把它抱了起来。', '“我们的家，就是有你在的地方喵。”'],
  feiyue: ['绯月站在晨光里，没有被灼伤。', '“原来……太阳是这样的温度。”她眯起眼睛，第一次不想躲。'],
};
function trueGate() { delete R.wait; R.wait = 'true'; save();
  story('story_gate', ['三把钥匙同时亮了起来，门的上方又裂开了一道缝。', '缝里传来敲键盘的声音。', '“……你们怎么找到这里的？”'], () => { delete R.wait; R.hp = R.maxHp; R.floor++; R.pending = 'trueb'; snap(); save(); enterNode('trueb'); }); }
function startEndless() { delete R.rift; R.act = 4; R.endless = 1; R.rows = 8; R.trials = []; R.floor0 = (R.floor0 || 0) + R.floor; R.floor = 0; newLayer(); }
function newLayer() { R.map = genMap(); delete R.pos; R.path = []; R.fights = 0; R.boss = R.endless % 5 === 0 ? FINAL3 : SR(() => pickOne(ENCX().boss)[0]); R.wait = 'trial'; save(); pickTrial(); }
function pickTrial() { B = null; R.wait = 'trial'; save(); setMusic('menu');
  const left = Object.keys(TRIALS).filter(k => !R.trials.includes(k)); if (!left.length) { delete R.wait; save(); return mapScreen(); }
  const opts = shuffle(left).slice(0, 3);
  view.innerHTML = `${bgHTML()}${topBar()}<div class="panel" style="width:820px"><h2>${t('天外之塔 · 第 {0} 轮', R.endless)}</h2><p>${t('天之试炼：选一条（之后一直生效，会叠加）')}</p>
   ${opts.map(k => `<div class="reward trial" data-k="${k}"><b>${tr(TRIALS[k].name)}</b><span style="color:#ff9a8a">${tr(TRIALS[k].bad)}</span><span style="color:#8fe08f">${t('奖励：')}${tr(TRIALS[k].good)}</span></div>`).join('')}</div>`;
  bindTop();
  view.querySelectorAll('.trial').forEach(el => el.onclick = () => { const k = el.dataset.k; R.trials.push(k); R.wait = 'trialR'; R.trialK = k; save(); trialReward(k); });
}
function trialReward(k) { /* 试炼奖励：领完才清掉等待标记，中途刷新会重新发 */ const done = () => { delete R.wait; delete R.trialK; save(); mapScreen(); };
    if (k === 'scale') return chooseCard(rollCards(3, 0, true), () => done());
    if (k === 'blood') gainRelic(rollRelic());
    if (k === 'cold') return pickDeck('remove', () => pickDeck('remove', () => done()));
    if (k === 'greed') R.gold += 150;
    if (k === 'wind') return pickDeck('upgrade', () => pickDeck('upgrade', () => done()));
    if (k === 'hunger') { R.maxHp += 10; R.hp += 10; }
    if (k === 'swarm') { gainPotion(rollPotion()); gainPotion(rollPotion()); }
    if (k === 'tyrant') R.bonusRelic = 1;
    done();
}
function layerEnd() { B = null; if (R.layerHeal !== R.endless) { R.layerHeal = R.endless; R.hp = Math.min(R.maxHp, R.hp + Math.floor(R.maxHp * .3)); } R.wait = 'layer'; save();
  try { const M = metaGet(); M.endless = M.endless || {}; M.endless[R.char] = Math.max(M.endless[R.char] || 0, R.endless); if (!DEBUG) metaSet(M); } catch (e) {}
  view.innerHTML = `${bgHTML()}${topBar()}<div class="panel"><h2>${t('第 {0} 轮通过', R.endless)}</h2><p>${t('回复了 30% 生命。再选一项：')}</p><div class="row"><button class="btn" id="lu">${t('升级 1 张牌')}</button><button class="btn" id="lr">${t('删除 1 张牌')}</button></div></div>`;
  bindTop();
  const next = () => { delete R.wait; R.endless++; R.floor0 = (R.floor0 || 0) + R.floor; R.floor = 0; newLayer(); };
  $('#lu').onclick = () => pickDeck('upgrade', () => next()); $('#lr').onclick = () => pickDeck('remove', () => next());
}
function endAch(win) { if (!R || R.achDone) return; R.achDone = 1;
  const a1 = win || ACT() >= 2, a2 = (win && ACT() >= 2) || ACT() >= 3, king = !!(R.kingDown || R.trueEnd || ACT() === 4);
  if (a1) ach('a_act1'); if (a2) ach('a_act2');
  if (R.mode === 'daily' && a1) ach('a_daily');
  if (R.endless >= 3) ach('a_endless3'); if (R.endless >= 10) ach('a_endless10');
  if (!king) return;
  ach('a_act3'); ach('a_win_' + R.char);
  const M = metaGet(); M.kings = M.kings || {}; M.kings[R.char] = 1; metaSet(M); if (Object.keys(CHARS).filter(c => c !== 'dev' && !CHARS[c].temp).every(c => M.kings[c])) ach('a_all9');
  if ((R.asc || 0) >= 5) ach('a_asc5'); if ((R.asc || 0) >= 10) ach('a_asc10'); if ((R.asc || 0) >= 20) ach('a_asc20');
  if (R.deck.length <= 15) ach('a_thin'); if (R.deck.length >= 40) ach('a_fat');
  if (!R.potUsed) ach('a_nopot'); if (!R.rested) ach('a_norest');
}
/* 真人数据：每局结束匿名上传一条（设置里可关）。只有正式网站会发。 */
const VER = (import.meta.url.match(/v=([\w]+)/) || [])[1] || 'dev';
function devId() { let d = LS('tw_dev'); if (!d) { d = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); LS('tw_dev', d); } return d; }
function sendRun(win, killer) { try { if (DEBUG || !ONLINE || SET.tele === 0 || !R || R.sent) return; R.sent = 1;
  const body = { v: VER, dev: devId(), char: R.char, asc: R.asc || 0, mode: R.mode || 'normal', mods: R.mods || [], bless: R.bless || '', win: !!win, act: ACT(), king: !!(R.kingDown || ACT() === 4), trueEnd: !!R.trueEnd, endless: R.endless || 0,
    floor: (R.floor0 || 0) + R.floor, by: killer || [], deck: R.deck.map(c => c.id + (c.up ? '+' : '')), relics: R.relics, picks: (R.log && R.log.picks || []).slice(-80), hp: (R.log && R.log.hp || []).slice(-80), dur: R.log ? Math.round((Date.now() - R.log.t0) / 1000) : 0, keys: Object.keys(R.keys || {}) };
  fetch(API.replace('/scores', '/runs'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => {}); } catch (e) {} }
function endScreen(win) {
  stage.querySelectorAll('.say').forEach(x => x.remove());
  if (!DEBUG && !R.histed) { R.histed = 1; try { const H = JSON.parse(localStorage.getItem('tw_hist') || '[]'); H.unshift({ c: R.char, w: (win || ACT() === 4) ? 1 : 0, a: ACT(), f: (R.floor0 || 0) + R.floor, asc: R.asc || 0, by: !win && B ? B.en.filter(e => !e.dead).map(e => e.d.name).join(' + ') : '', t: Date.now() }); localStorage.setItem('tw_hist', JSON.stringify(H.slice(0, 50))); } catch (e) {} }
  const killer = !win && B ? B.en.filter(e => !e.dead).map(e => e.key) : [];
  B = null; setMusic('menu'); endAch(win); sendRun(win, killer);
  const k = R.kills || 0, el = R.elites || 0, hp = Math.max(0, R.hp);
  if (ACT() === 4) win = true;
  const tf = (R.floor0 || 0) + R.floor; const rows = [[`攀登的层数 (${tf})`, tf * 20], [`击杀的敌人 (${k})`, k * 3], [`击败的精英 (${el})`, el * 25], [`打败 Boss (${R.bosses || 0})`, (R.bosses || 0) * 300], [`通关时剩余生命 (${win ? hp : 0})`, win ? hp * 2 : 0]];
  if (ACT() === 4) rows.push([t('无尽轮数 ({0})', R.endless || 1), (R.endless || 1) * 200]);
  if (R.trueEnd) rows.push([t('真结局'), 500]);
  if (R.asc) rows.push([`进阶难度 ${R.asc}（×${(1 + R.asc * .1).toFixed(1)}）`, Math.round(rows.reduce((a, r) => a + r[1], 0) * R.asc * .1)]);
  const total = rows.reduce((a, r) => a + r[1], 0);
  const M = metaGet(), before = M.xp; let news = [];
  if (R.daily && !DEBUG) { try { const bs = JSON.parse(LS('tw_daily') || '{}'); if (!(bs[R.daily] >= total)) { bs[R.daily] = total; LS('tw_daily', JSON.stringify(bs)); } } catch (e) {} }
  if (!DEBUG) { M.xp += total; if (win && ACT() >= 2 && (R.asc || 0) >= (M.asc[R.char] || 0) && (M.asc[R.char] || 0) < 15) { M.asc[R.char] = (R.asc || 0) + 1; } metaSet(M); }
  const nx = UNLOCKS.find(u => M.xp < u.xp), left = UNLOCKS.filter(u => M.xp < u.xp).length;
  view.innerHTML = `${win && ACT() === 3 ? bgHTML(true, R.trueEnd ? trueArt() : homeArt()) : win && ACT() === 2 ? bgHTML(true, 'story_end2') : bgHTML(true)}<div class="endw"><div class="ribbon ${win ? 'win' : ''}">${win ? '胜利' : '失败'}</div>
   <p class="endsub" data-noi18n>${R.trueEnd ? `${t('开发者合上了电脑。这一次，是真的回家了。')}<br><b style="color:#ffe08a">${t('真结局 · 感谢游玩！')}</b>` : ACT() === 4 ? `${t('在天外之塔爬到了第 {0} 轮。', R.endless || 1)}<br><b style="color:#ffe08a">${t('感谢游玩！')}</b>` : win && ACT() === 3 ? `${t('深渊之主倒下了，回家的门打开了。')}<br><b style="color:#ffe08a">${t('全部通关 · 感谢游玩！')}</b>` : win && ACT() === 2 ? `${t('{0}化为了灰烬，古堡的血月熄灭了。', ENEMIES[R.boss].name)}<br><b style="color:#ffe08a">${t('第二章完 · 感谢游玩！')}</b>${t('山顶上，还有更深的黑暗在等待……')}` : win ? `${t('{0}倒下了，翠绿之地恢复了平静。', ENEMIES[R.boss].name)}<br><b style="color:#ffe08a">${t('第一章完 · 感谢游玩！')}</b>${t('远处山顶的古堡，亮起了血红的光……')}<br><b style="color:#ff8a8a">${t('第二章：血月古堡（制作中）')}</b>` : t(ACT() === 3 ? '{0}倒在了永冬之巅第 {1} 层。' : ACT() === 2 ? '{0}倒在了血月古堡第 {1} 层。' : '{0}倒在了翠绿之地第 {1} 层。', tr(CHARS[R.char || 'hero'].name), R.floor)}</p>
   ${win && ACT() === 3 && CH3END[R.char] ? `<p class="endsub endq"><b>${CHARS[R.char].name}</b>：“<span>${tr(CH3END[R.char])}</span>”</p>` : ''}${win && ACT() === 2 && CHARINFO[R.char] && CHARINFO[R.char].end ? `<p class="endsub endq"><b>${CHARS[R.char].name}</b>：“<span>${CHARINFO[R.char].end}</span>”</p>` : ''}
   <table class="score">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}<tr class="tot"><td>分数</td><td>${total}</td></tr></table>
   ${news.map(t => `<p class="endsub" style="color:#7fe07f">★ ${t}</p>`).join('')}
   <p id="sc" class="endsub" style="color:#ffd35a">${DEBUG ? '调试模式，成绩不记录' : !ONLINE ? '试玩链接不记录成绩' : LS('tw_name') ? '正在提交成绩……' : ''}</p>
   <div class="row"><button class="btn big" id="again">主菜单</button><button class="btn" id="rk2">排行榜</button></div></div>`;
  $('#again').onclick = mainMenu; $('#rk2').onclick = rankBoard;
  submitScore(win).then(d => { const e = $('#sc'); if (!e || !d) return; e.textContent = d.ok ? `已记入排行榜（${LS('tw_name')}）` : `没能上榜：${d.error}`; });
}



// ---------- 卡牌关键词说明框（悬停 / 手机长按；设置里「显示规则提示」可关闭） ----------
const KWS = { '结界': '叠在自己身上，每回合开始按层数自动获得格挡，整场战斗不消失。', '光弹': '回合结束时自动射出，每发打随机敌人 4~5 点伤害，然后清零。',
  '共鸣': '叠在敌人身上，满 10 层自动爆音。', '爆音': '共鸣满 10 层时爆炸，造成 18 点伤害，之后保留 3 层；每个敌人第一次被爆音时还会眩晕。',
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
function gainPotion(id) { R.potions = R.potions || []; if (MOD('nopot')) { tip(tr('禁药令：这一局拿不到药水')); return false; } if (R.potions.length >= (A_(12) ? 2 : 3)) { tip('药水栏满了'); return false; } R.potions.push(id); audio.gem(); return true; }
function rollPotion(...a) { return SR(rollPotion0, a); }
function rollPotion0() { return Math.random() < .08 ? 'fairy' : pickOne(Object.keys(POTIONS).filter(k => k !== 'fairy')); }
function potionClick(i) {
  const id = R.potions[i], P = POTIONS[id]; if (!P) return;
  if (!B || B.over || B.busy || B.anim) { const o = overlay(`<h2>${P.name}</h2><img src="${P.img}" style="width:80px"><p>${P.desc}</p><div class="row"><button class="btn red" id="pd">丢掉</button><button class="btn" id="px">关闭</button></div>`);
    o.querySelector('#px').onclick = () => o.remove(); o.querySelector('#pd').onclick = () => { R.potions.splice(i, 1); o.remove(); save(); if (B && !B.over) render(); else { const tp = view.querySelector('#top'); if (tp) { tp.outerHTML = topBar(); bindTop(); } } }; return; }
  if (B.potSel === i) { B.potSel = null; render(); return; }
  potPop(i);
}
function infoPop(el, name, desc, btns = '') { /* 贴着图标弹出的说明小框，点框外关闭 */
  const sr = stage.getBoundingClientRect(), sc = sr.width / (stage.offsetWidth || 1) || 1, r = el.getBoundingClientRect(), z = TOUCH ? 1.35 : 1;
  const w = document.createElement('div'); w.className = 'potpopw';
  w.innerHTML = `<div class="potpop" style="left:${Math.max(8, (r.left - sr.left) / sc - 20) / z}px;top:${((r.bottom - sr.top) / sc + 8) / z}px"><b>${name}</b><p>${desc}</p>${btns ? `<div class="row">${btns}</div>` : ''}</div>`;
  stage.appendChild(w); w.onclick = ev => { if (ev.target === w) w.remove(); }; return w;
}
function potPop(i) { /* 药水说明小框：贴着药水栏，点框外关闭 */
  const id = R.potions[i], P = POTIONS[id], el = view.querySelector(`[data-pot="${i}"]`); if (!P || !el) return;
  const auto = P.tgt === 'auto';
  const w = infoPop(el, P.name, P.desc, `${auto ? `<span class="pa">${t('倒下时自动使用')}</span>` : `<button class="btn" id="pu">${t('使用')}</button>`}<button class="btn red" id="pdx">${t('丢掉')}</button>`);
  w.querySelector('#pdx').onclick = () => { w.remove(); R.potions.splice(i, 1); render(); };
  const u = w.querySelector('#pu'); if (u) u.onclick = () => { w.remove(); if (!B || B.over || B.busy || B.anim) return;
    if (P.tgt === 'one' && alive().length > 1) { B.potSel = i; B.sel = -1; render(); tip('点一个敌人'); return; }
    usePotion(i, alive()[0]); };
}
async function usePotion(i, t) {
  const id = R.potions[i]; B.potSel = null; R.potions.splice(i, 1); B.hitSet = new Set(); R.potUsed = 1;
  B.potUse = 1; try { POTIONS[id].use(G, t); } finally { B.potUse = 0; } audio.holy(); render(); await checkEnd();
}

// ---------- 图鉴 ----------
const INTENT = { atk: '攻击', def: '防御', buff: '强化', debuff: '削弱', atkdef: '攻击+防御', atkdebuff: '攻击+削弱', atkbuff: '攻击+强化', summon: '召唤', unknown: '未知' };
const CONCEPTS = [
  ['基础', [['能量', '出牌要花能量，每回合开始恢复为 3 点。卡牌左上角的数字就是耗能。'], ['生命', '降到 0 就输了。大部分秘宝和营火可以回血。'], ['格挡', KW['格挡']], ['抽牌', '每回合开始抽 5 张牌。抽牌堆空了，会把弃牌堆洗回来。'], ['回合', '你出完牌按「结束回合」，敌人按头上的意图行动。']]],
  ['卡牌种类', [['攻击牌', '红色卡框，主要用来造成伤害。'], ['技能牌', '绿色卡框，格挡、抽牌、加状态等。'], ['能力牌', '蓝色卡框，打出后整场战斗持续生效，不进弃牌堆。'], ['消耗', KW['消耗']], ['升级', '在营火可以升级卡牌，数值变强或耗能降低，名字后面多一个 +。'], ['稀有度', '普通 / 罕见 / 稀有，越稀有越强，奖励里越难出现。']]],
  ['状态', ['str', 'dex', 'vuln', 'weak', 'thorns', 'metal', 'regen', 'poison'].map(k => [STATUS[k][0], KW[STATUS[k][0]] || STATUS[k][1]])],
  ['角色机制', [['光弹', KW['光弹']], ['共鸣', KW['共鸣']], ['爆音', KW['爆音']], ['结界', KW['结界']], ['炼金瓶', KW['炼金瓶']], ['药水', KW['药水']], ['中毒', KW['中毒']]]],
  ['地图', [['战斗', '普通的哥布林小队，赢了给金币和卡牌。'], ['精英', '强敌，赢了额外给一个秘宝。'], ['未知', '随机事件，可能是好事也可能有代价。'], ['营火', '休息回血，或者升级一张卡。'], ['商店', '花金币买卡、买秘宝、删卡。'], ['宝箱', '直接拿秘宝和金币。'], ['Boss', '每章最后的大头目，打赢就通关。']]],
  ['冒险规则', [['开局祝福', '每局出发前，路边的神龛给三个选项：两个免费，一个有代价。只能选一个。'], ['进阶难度', '选角色时可以调 0～20 级，每一级都会叠加之前所有的难度。'],
    ['燃烧的精英', '第一章地图上有一个带火焰标记的精英：血更多、力量 +2，打赢就能拿到翡翠钥匙。'], ['三把钥匙', '翡翠钥匙（第一章燃烧的精英）、血月钥匙（第二章营火放弃休息换取）、龙鳞钥匙（第三章宝箱放弃秘宝换取）。集齐后打倒魔王，可以打开通往真结局的门。'],
    ['断点', '真结局 Boss 的招式：指定一种牌，你手里那种牌会有一张这回合被封住打不出。'], ['每日挑战', '每天所有人用同一个角色、同一张地图和同样的修正，有单独的今日排行。'],
    ['自定义模式', '可以填种子（种子相同，地图和奖励就相同），也可以勾选各种修正规则。'], ['成就', '主菜单的「成就」页可以看到全部成就和解锁情况，只记录在这台设备上。']]],
  ['分数', [['排行榜积分', '层数×20 + 击杀×3 + 精英×25；通关再加 300，以及剩余生命×2。同一个名字只记最高的一局，调试模式不记录。']]],
];

/* 图鉴：把怪物招式的效果自动翻成一句话（用假的战场记录它会做什么） */
function moveText(m, key) {
  const SELF = { me: 1 }, ALLY = { al: 1 }, ALL = { all: 1 }, out = [];
  const who = x => x === SELF ? '自身' : x === ALLY ? '一个同伴' : '所有怪物';
  const SN = k => STATUS[k] ? STATUS[k][0] : k;
  if (m.d) out.push(m.x > 1 ? t('造成 {0} 点伤害 × {1} 次', m.d, m.x) : t('造成 {0} 点伤害', m.d));
  const add = x => { if (!out.includes(x)) out.push(x); };
  const MB = { applyP: (k, n) => add(t(`给你 {0} 层${SN(k)}`, n)), addSt: (x, k, n) => add(k === 'str' ? t(`${who(x)}力量 +{0}`, n) : t(`${who(x)}获得${SN(k)}`)),
    eBlock: (x, n) => add(x === SELF ? t('获得 {0} 点格挡', n) : t(`给${who(x)} {0} 点格挡`, n)), healE: (x, n) => add(t(`${who(x)}回复 {0} 点生命`, n)),
    addCard: (id, n) => add(t('塞给你 {0} 张「{1}」', n || 1, tr(CARDS[id] ? CARDS[id].name : id))), summon: k => add(t('召唤「{0}」', tr(ENEMIES[k] ? ENEMIES[k].name : k))),
    kill: () => add(t('自己也会死掉')), revive: (e, f) => add(t('第一次被打倒时，带着 {0}% 生命复活（负面状态清空）', Math.round(f * 100))), flee: () => add(t('同伴会逃跑')),
    allies: () => [ALLY], alive: () => [ALL], say: () => {} };
  if (m.f) try { m.f(Object.assign(SELF, { st: { fuse: 1 }, turn: 1, hp: 10, max: 20, key, hist: [] }), MB); } catch (e) {}
  return out.join(t('，'));
}
function book(tab = 'card', sub = 'miko', up = 0) {
  const tabs = [['who', '人物'], ['card', '卡牌'], ['relic', '秘宝'], ['pot', '药水'], ['mon', '怪物'], ['rule', '概念说明']];
  let body = '';
  if (tab === 'who') {
    body = `<div class="bgrid who">${ORDER.map(k => `<div class="bi"><img src="assets/${CHARS[k].dir}/portrait.png"><div><b>${CHARS[k].name}</b><p class="cl">${CHARINFO[k].line}</p><p>${CHARINFO[k].bio}</p><div class="skill"><p><b>${CHARS[k].desc}</b>　${t('上手难度')} ${'★'.repeat(CHARINFO[k].diff)}${'☆'.repeat(3 - CHARINFO[k].diff)}</p><p>${CHARINFO[k].tip}</p>${STARTRELIC[k] ? `<p>${t('初始秘宝')} · <b>${RELICS[STARTRELIC[k]].name}</b>：${RELICS[STARTRELIC[k]].desc}</p>` : ''}</div><div class="skill"><p><b>${t('推荐流派')}</b></p>${CHARINFO[k].builds.map(([n, d, cs]) => `<p><b>${n}</b>：${d}</p><p class="core">${t('核心牌')}：${cs.map(c => `<span class="chip">${tr(c)}</span>`).join('')}</p>`).join('')}</div></div></div>`).join('')}<div class="bi soon"><div class="qm">?</div><div><b>？？？</b><p>那道光里，好像还有别人的影子……</p></div></div></div>`;
  } else if (tab === 'card') {
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
    const hpOf = k => [].concat(ENEMIES[k].hp)[0], elite = new Set([...ENCOUNTERS.elite, ...ENCOUNTERS2.elite].map(g => g.reduce((x, y) => hpOf(y) > hpOf(x) ? y : x))), boss = new Set([...ENCOUNTERS.boss.flat(), ...ENCOUNTERS2.boss.flat()]);
    const seen = metaGet().seen || {}, ents = Object.entries(ENEMIES), nSeen = ents.filter(([k]) => seen[k] || DEBUG).length;
    body = `<p style="margin:0 0 10px">${t('已遇到 {0} / {1} 种怪物', nSeen, ents.length)}</p><div class="bgrid">${ents.map(([k, e]) => !(seen[k] || DEBUG) ? `<div class="bi mon unk"><div class="qm">?</div><div><b>？？？</b><small>${t('尚未遇到')}</small></div></div>` : `<div class="bi mon"><img src="assets/enemies2/${e.art || k}/portrait.png" onerror="this.src='assets/enemies2/${e.art || k}/idle0.png'"${e.tint ? ` style="filter:${e.tint}"` : ''}><div><b>${e.name}</b><small>${boss.has(k) ? 'Boss' : elite.has(k) ? '精英' : '普通'} · 生命 ${Array.isArray(e.hp) ? e.hp.join('～') : e.hp}</small>
      ${Object.values(e.moves).map(m => `<p class="mvl"><span class="mv">${m.n}</span>：${moveText(m, k) || t('无')}</p>`).join('')}${e.onDie ? (x => x ? `<p class="mvl"><span class="mv">${t('死亡时')}</span>：${x}</p>` : '')(moveText({ f: e.onDie }, k)) : ''}${e.lore ? `<p class="lore">${e.lore}</p>` : ''}</div></div>`).join('')}</div>`;
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
    ['全部秘宝', () => { Object.keys(RELICS).forEach(id => { if (!has(id)) gainRelic(id); }); B ? render() : mapScreen(); }],
    ['跳到Boss', () => { R.pos = { r: RW() - 1, c: R.map[RW() - 1].findIndex(Boolean) }; R.floor = 15; mapScreen(); }],
    ['全卡牌', () => { R.deck = Object.keys(CARDS).filter(k => CARDS[k].ch === R.char && CARDS[k].rar !== 'gen').map((id, i) => mkCard(id, i % 2 ? 1 : 0)); B ? render() : mapScreen(); }], ['商店', () => shopScreen()], ['事件', () => eventScreen()], ['精英', () => battle(pickOne(ENC().elite), 'elite')], ['第二章', () => { R.act = 2; R.map = genMap(); delete R.pos; R.path = []; R.fights = 0; R.boss = 'vamp_count'; mapScreen(); }], ['第三章', () => { R.act = 3; delete R.rift; delete R.rows; R.map = genMap(); delete R.pos; R.path = []; R.fights = 0; R.boss = 'dev_boss'; mapScreen(); }], ['裂隙', () => { R.act = 3; riftChoice(); }], ['终战', () => { R.act = 3; R.rift = 1; enterNode('final'); }], ['无尽', () => { startEndless(); }], ['结局', () => endingChoice()], ...[...ENCOUNTERS.boss, ...ENCOUNTERS2.boss, ...ENC3.boss, [GATE3], [FINAL3]].map(([k]) => ['B:' + k.replace('gob_', ''), () => { R.boss = k; battle([k], 'boss'); }])];
  d.innerHTML = ''; btns.forEach(([t, f]) => { const b = document.createElement('button'); b.textContent = t; b.onclick = f; d.appendChild(b); });
}

title();
dbgPanel();
