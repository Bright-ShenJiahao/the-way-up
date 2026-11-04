// 平衡测试：机器人用每个角色跑很多局，统计胜率和死在哪里。只在 GitHub Actions 上跑。
// 规则照抄 src/game.js 的战斗逻辑（简化了地图：固定 15 层路线 + Boss）
import { CARDS, STARTERS, RELICS, ENEMIES, ENCOUNTERS } from '../src/data.js';
const N = +process.argv[2] || 300;
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pickOne = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ROUTE = ['fight', 'fight', 'fight', 'event', 'fight', 'fight', 'elite', 'rest', 'fight', 'fight', 'shop', 'elite', 'fight', 'fight', 'rest', 'boss'];
let R, B, uid = 1;
const has = id => R.relics.includes(id);
const mine = d => !d.ch || d.ch === R.char;
const mk = (id, up = 0) => ({ id, up, uid: uid++ });
const addSt = (t, k, n) => { t.st[k] = (t.st[k] || 0) + n; if (t.st[k] === 0) delete t.st[k]; };
const alive = () => B.en.filter(e => !e.dead);
const atkVal = (s, t, b, m = 1) => { let d = b + (s.st.str || 0) * m; if (s.st.weak) d *= .75; if (t && t.st.vuln) d *= 1.5; return Math.max(0, Math.floor(d)); };
function hurt(t, amt, att) {
  const isP = t === B.p; if (!isP && t.st.aegis) return 0;
  const u = Math.min(t.block, amt); t.block -= u; const left = amt - u;
  if (isP) R.hp -= left; else t.hp -= left;
  if (att && t.st.thorns && att !== t) hurt(att, t.st.thorns);
  if (!isP && t.hp <= 0 && !t.dead) killE(t);
  if (!isP && !t.dead && t.key === 'gob_wolf' && t.hp <= t.max / 2) { t.key = 'wolf'; t.d = ENEMIES.wolf; t.move = t.d.ai(t, BE); const g = mkE('goblin'); g.hp = g.max = 8; g.move = g.d.ai(g, BE); B.en.push(g); }
  if (isP && R.hp <= 0 && has('feather') && !R.feather) { R.feather = 1; R.hp = Math.floor(R.maxHp * .3); }
  return left;
}
function killE(e) { e.dead = true; e.hp = 0; R.kills++; if (has('fang')) heal(3); }
const heal = n => { R.hp = Math.min(R.maxHp, R.hp + n); };
function boom(t) { const d = 24 + (B.p.st.dist ? 5 : 0) + (has('mic') ? 6 : 0); t.st.res = t.st.res - 10 + 3 + (B.p.st.dist ? 3 : 0); hurt(t, d); if (has('metro') && !B.p.metroUsed) { B.p.metroUsed = 1; B.p.energy++; } }
function drawCards(n) { for (let i = 0; i < n; i++) { if (B.p.noDraw || B.hand.length >= 10) return; if (!B.draw.length) { if (!B.disc.length) return; B.draw = shuffle(B.disc); B.disc = []; } B.hand.push(B.draw.pop()); } }
const G = {
  get p() { return B.p; }, x: 0,
  attack(t, base, times = 1, m = 1) { let s = 0; for (let i = 0; i < times; i++) { if (!t || t.dead) break; s += hurt(t, atkVal(B.p, t, base, m), B.p); } return s; },
  attackAll(base, times = 1) { let s = 0; for (let i = 0; i < times; i++) for (const e of alive()) s += hurt(e, atkVal(B.p, e, base), B.p); return s; },
  attackRandom(base, times) { for (let i = 0; i < times; i++) { const a = alive(); if (!a.length) break; const e = pickOne(a); hurt(e, atkVal(B.p, e, base), B.p); } },
  block(n, raw) { B.p.block += Math.max(0, raw ? n : n + (B.p.st.dex || 0)); },
  apply(t, k, n) { if (t && !t.dead) addSt(t, k, n); }, applyAll(k, n) { alive().forEach(e => addSt(e, k, n)); },
  self(k, n) { addSt(B.p, k, n); }, draw: n => drawCards(n), energy(n) { B.p.energy += n; },
  loseHp(n) { R.hp -= n; }, heal: n => heal(n), addCard(id, up, pile) { B[pile === 'discard' ? 'disc' : 'draw'].push(mk(id, up)); },
  pm() { return B.p.st.sage ? 2 : 1; },
  potion(n, id) { const ps = ['p_fire', 'p_frost', 'p_heal', 'p_poison', 'p_boom']; for (let i = 0; i < n; i++) (B.hand.length < 10 ? B.hand : B.disc).push(mk(id || pickOne(ps))); },
  poison(t, n) { if (!t || t.dead || n <= 0) return; addSt(t, 'poison', n + (has('toad') ? 1 : 0)); },
  volley(clear = true) { // 光弹齐射：每发 3 点（+双持 +超频），打随机敌人或全体
    const n = B.p.st.ammo || 0; if (!n) return; const dmg = 3 + (B.p.st.dual || 0) + (B.p.oc || 0);
    for (let i = 0; i < n; i++) { const a = alive(); if (!a.length) break; if (B.p.aoe) a.forEach(e => hurt(e, atkVal(B.p, e, dmg), B.p)); else { const e = pickOne(a); hurt(e, atkVal(B.p, e, dmg), B.p); } }
    if (B.p.st.rapid) G.block(B.p.st.rapid * n, true);
    if (clear) { B.shots = (B.shots || 0) + n; if (has('pad')) { B.p.padDraw = Math.floor(B.shots / 4); B.shots %= 4; } delete B.p.st.ammo; }
    },
  usePotion() { const i = B.hand.findIndex(c => CARDS[c.id].potion); if (i < 0) return false; B.exh.push(B.hand.splice(i, 1)[0]); return true; },
  kek(n) { addSt(B.p, 'kek', n); },
  ammo(n) { B.p.st.ammo = Math.min(10, (B.p.st.ammo || 0) + n); },
  spend(n) { const k = Math.min(n, B.p.st.ammo || 0); if (!k) return 0; addSt(B.p, 'ammo', -k); if (B.p.st.rapid) G.block(B.p.st.rapid * k, true); B.shots = (B.shots || 0) + k; if (has('pad')) while (B.shots >= 4) { B.shots -= 4; drawCards(1); } return k; },
  fire(t, k, d) { if (k) G.attack(t, d + (B.p.st.dual || 0), k); }, fireAll(k, d) { if (k) G.attackAll(d + (B.p.st.dual || 0), k); }, fireRandom(k, d) { if (k) G.attackRandom(d + (B.p.st.dual || 0), k); },
  res(t, n) { if (!t || t.dead || n <= 0) return; addSt(t, 'res', n); for (let k = 0; k < 5 && !t.dead && t.st.res >= 10; k++) boom(t); },
  resAll(n) { alive().forEach(e => G.res(e, n)); }, resRandom(n) { const a = alive(); if (a.length) G.res(pickOne(a), n); },
  resTotal() { return alive().reduce((s, e) => s + (e.st.res || 0), 0); }, eachEnemy(f) { alive().forEach(f); },
};
const BE = {
  applyP(k, n) { addSt(B.p, k, n); }, addSt(e, k, n) { addSt(e, k, n); }, eBlock(e, n) { e.block += n; },
  allies: e => alive().filter(a => a !== e), alive: () => alive(), healE(e, n) { e.hp = Math.min(e.max, e.hp + n); },
  kill(e) { killE(e); }, summon(key, hp) { if (alive().length >= 5) return; const e = mkE(key); if (hp) e.hp = e.max = hp; e.move = e.d.ai(e, BE); B.en.unshift(e); },
};
let eid = 1;
function mkE(key) { const d = ENEMIES[key], hp = rnd(d.hp[0], d.hp[1]); const e = { key, d, hp, max: hp, block: 0, st: {}, turn: 0, hist: [], id: 'e' + eid++ }; d.init && d.init(e); return e; }
const cost = c => { const d = CARDS[c.id]; return c.free ? 0 : d.cost[c.up ? 1 : 0]; };
function startTurn(first) {
  B.turn++; if (!B.p.st.keep) B.p.block = 0;
  B.p.energy = 3 + (has('crown') ? 1 : 0) + (first && has('hourglass') ? 1 : 0); B.p.noDraw = 0;
  if (B.p.st.rage) addSt(B.p, 'str', B.p.st.rage);
  B.p.pot = 0; if (first && has('cauldron')) G.potion(1); if (B.p.st.satchel) G.potion(B.p.st.satchel);
  if (B.p.st.plague) alive().forEach(e => G.poison(e, B.p.st.plague));
  if (B.p.st.kagura) G.kek(B.p.st.kagura); if (B.p.st.kek) G.block(B.p.st.kek * (B.p.st.shinboku ? 2 : 1), true);
  if (has('hamaya') && (B.p.st.kek || 0) >= 4) drawCards(1);
  B.p.oc = 0; B.p.aoe = 0; B.p.metroUsed = 0; B.p.cplays = 0; if (B.p.st.gen) G.ammo(B.p.st.gen); if (has('spare')) G.ammo(1); if (B.p.padDraw) { drawCards(B.p.padDraw); B.p.padDraw = 0; } if (has('gameboy')) G.ammo(1); if (!first && has('phones')) G.resAll(1); if (B.p.st.lowf) G.resAll(B.p.st.lowf);
  if (first && has('anchor')) B.p.block += 10;
  drawCards(5 + (first && has('scroll') ? 2 : 0));
}
function play(i, t) {
  const c = B.hand[i], d = CARDS[c.id]; let k = cost(c); if (k === 'X') k = B.p.energy; if (k > B.p.energy) return false;
  if (d.tgt === 'one' && !t) t = alive().sort((a, b) => a.hp - b.hp)[0];
  B.p.energy -= k; G.x = k; B.hand.splice(i, 1); d.play(G, c.up, t, c);
  if (d.type === 'atk') { B.atk++; if (has('quiver') && B.atk % 3 === 0) for (const e of alive()) hurt(e, 5); }
  if (d.type === 'skill') alive().forEach(e => { if (e.st.enrage) addSt(e, 'str', e.st.enrage); });
  if (d.potion) { B.p.pot++; if (has('hat')) G.block(2, true); }
  if (B.p.st.concert && (B.p.cplays = (B.p.cplays || 0) + 1) <= 4) G.resAll(B.p.st.concert);
  if (d.type !== 'power') (d.exhaust ? B.exh : B.disc).push(c);
  return true;
}
const incoming = () => alive().reduce((s, e) => { const m = e.d.moves[e.move]; return s + (m && m.d ? atkVal(e, B.p, m.d) * (m.x || 1) : 0); }, 0);
const isBlock = d => /格挡/.test(d.desc(0)) && d.type !== 'atk';
// 机器人出牌：先补够格挡，再出能力牌、0 费牌、攻击牌
function botTurn() {
  for (let guard = 0; guard < 30 && alive().length; guard++) {
    const need = incoming() - B.p.block;
    const opts = B.hand.map((c, i) => ({ c, i, d: CARDS[c.id], k: cost(c) === 'X' ? B.p.energy : cost(c) })).filter(o => o.k <= B.p.energy && !(o.k === 'X' && B.p.energy === 0));
    if (!opts.length) break;
    const sc = o => { const d = o.d; let s = 0;
      if (d.type === 'power') s = B.turn <= 3 ? 9 : 3;
      else if (isBlock(d)) s = need > 0 ? 8 : 1;
      else if (d.type === 'atk') s = 5 + o.k;
      else s = 4;
      if (o.k === 0) s += 2; if (d.potion) s += 3;
      if (/打出所有光弹|满格炮/.test(d.desc(0)) && (B.p.st.ammo || 0) < 4) s -= 6;
      if (/用掉|打出所有光弹/.test(d.desc(0)) && !(B.p.st.ammo || 0)) s -= 10;
      if (d.id === 'eshield' && need <= 0) s -= 10;
      if (/消耗全部结界/.test(d.desc(0)) && (B.p.st.kek || 0) < 4) s -= 6;
      const top = alive().reduce((m, e) => Math.max(m, e.st.res || 0), 0);
      if (d.id === 'high') s += top >= 5 ? 6 : -2;                       // 女主：层数高时先打高音
      if (R.char === 'heroine' && /共鸣/.test(d.desc(0)) && d.id !== 'high' && B.hand.some(c => c.id === 'high') && top >= 5 && top < 10) s -= 3;
      if (d.id === 'cannon') s += (B.p.st.ammo || 0) >= 4 ? 4 : -6;     // 林拓：光弹多时超频
      if (d.id === 'charge') s += (B.p.st.ammo || 0) >= 4 ? 3 : -6;
      if (d.id === 'screen') s += alive().length >= 2 && (B.p.st.ammo || 0) >= 3 ? 4 : -6;
      if (/得到 \d 发光弹/.test(d.desc(0)) && (B.p.st.ammo || 0) <= 6) s += 2;
      if (['kekkai', 'shime', 'fuda', 'kagura'].includes(d.id)) s += B.turn <= 2 ? 4 : 0;  // 巫女：先叠结界
      if (d.id === 'hama' || d.id === 'yumihari') s += Math.min(6, B.p.st.kek || 0) - 2;
      if ((d.id === 'crack' || d.id === 'deadly' || d.id === 'catalyst') && !alive().some(e => (e.st.res || e.st.poison || 0) >= 5)) s -= 6;
      return s; };
    opts.sort((a, b) => sc(b) - sc(a));
    const o = opts[0]; if (sc(o) <= 0) break;
    let t = null; if (o.d.tgt === 'one') { const a = alive(); t = ['crack', 'high', 'wave'].includes(o.d.id) ? a.sort((x, y) => (y.st.res || 0) - (x.st.res || 0))[0] : ['deadly', 'catalyst'].includes(o.d.id) ? a.sort((x, y) => (y.st.poison || 0) - (x.st.poison || 0))[0] : a.sort((x, y) => x.hp - y.hp)[0]; }
    play(o.i, t); if (R.hp <= 0) return;
  }
}
function endTurn() {
  if (B.p.st.ammo) G.volley(true); if (!alive().length) return;
  B.disc.push(...B.hand); B.hand = [];
  if (B.p.st.metal) G.block(B.p.st.metal, true); if (B.p.st.regen && (B.p.regenN = (B.p.regenN || 0) + 1) <= 3) heal(B.p.st.regen);
  for (const e of alive()) e.block = 0;
  const pre = { vuln: B.p.st.vuln || 0, weak: B.p.st.weak || 0 };
  for (const e of [...B.en]) {
    if (e.dead || R.hp <= 0) continue;
    if (e.st.aegis) addSt(e, 'aegis', -1);
    if (e.st.poison && !e.st.aegis) { e.hp -= e.st.poison; addSt(e, 'poison', -1); if (e.hp <= 0) { killE(e); continue; } }
    const mv = e.d.moves[e.move];
    if (mv.d) for (let k = 0; k < (mv.x || 1); k++) { hurt(B.p, atkVal(e, B.p, mv.d), e); if (e.dead) break; }
    if (mv.f && !e.dead) mv.f(e, BE);
    e.hist.push(e.move); e.d.after && e.d.after(e);
  }
  for (const k of ['vuln', 'weak']) if (pre[k] && B.p.st[k]) addSt(B.p, k, -1);
  for (const e of alive()) { if (e.st.ritual) addSt(e, 'str', e.st.ritual); if (e.st.heal) e.hp = Math.min(e.max, e.hp + e.st.heal); for (const k of ['vuln', 'weak']) if (e.st[k]) addSt(e, k, -1); e.turn++; e.move = e.d.ai(e, BE); }
}
function battle(keys, kind) {
  B = { kind, en: keys.map(mkE), p: { block: 0, energy: 0, st: {}, noDraw: 0 }, draw: shuffle(R.deck.map(c => ({ ...c }))), hand: [], disc: [], exh: [], turn: 0, atk: 0 };
  if (has('charm')) B.p.st.str = 1; 
  if (has('suzu')) B.p.st.kek = 3 + (has('omamori') ? 2 : 0); else if (has('omamori')) B.p.st.kek = 2;
  if (has('phones')) B.en.forEach(e => e.st.res = 4); if (has('spikes')) B.p.st.thorns = 3; if (has('wardrum')) B.en.forEach(e => e.st.vuln = 1);
  B.en.filter(e => e.key === 'gob_bomb').forEach((e, i) => e.st.fuse = 3 + i);
  B.en.forEach(e => e.move = e.d.ai(e, BE));
  startTurn(true);
  for (let t = 0; t < 60; t++) {
    botTurn(); if (R.hp <= 0) return false; if (!alive().length) break;
    endTurn(); if (R.hp <= 0) return false; if (!alive().length) break;
    startTurn(false);
  }
  if (alive().length) return false;
  if (has('gameboy') || has('phones') || has('suzu') || has('cauldron')) heal(6);
  return true;
}
function rollCards(n) { const out = []; while (out.length < n) { const x = Math.random(), rar = x < .06 ? 'r' : x < .4 ? 'u' : 'c'; const pool = Object.values(CARDS).filter(d => d.rar === rar && mine(d) && !out.includes(d.id)); if (pool.length) out.push(pickOne(pool).id); } return out; }
const TIER = { r: 3, u: 2, c: 1 };
function reward() { const cs = rollCards(3); if (R.deck.length > 26 && Math.random() < .5) return; const best = cs.sort((a, b) => TIER[CARDS[b].rar] - TIER[CARDS[a].rar] + (CARDS[b].ch ? .5 : 0) - (CARDS[a].ch ? .5 : 0))[0]; R.deck.push(mk(best)); R.picks[best] = (R.picks[best] || 0) + 1; }
function relic() { const pool = Object.values(RELICS).filter(r => r.rar !== 'start' && mine(r) && !has(r.id)); if (!pool.length) return; const r = pickOne(pool); R.relics.push(r.id); if (r.id === 'herb') { R.maxHp += 10; R.hp += 10; } if (r.id === 'crown') { R.maxHp -= 10; R.hp = Math.min(R.hp, R.maxHp); } }
function run(char) {
  uid = 1; R = { char, hp: 80, maxHp: 80, deck: STARTERS[char].map(id => mk(id)), relics: [{ heroine: 'phones', miko: 'suzu', witch: 'cauldron' }[char] || 'gameboy'], kills: 0, picks: {}, floor: 0 };
  let fights = 0;
  for (const node of ROUTE) {
    R.floor++;
    if (node === 'fight') { const pool = fights < 3 ? ENCOUNTERS.easy : ENCOUNTERS.hard; fights++; const enc = pickOne(pool); if (!battle(enc, 'fight')) return { win: false, floor: R.floor, at: enc.join('+') }; reward(); }
    else if (node === 'elite') { const enc = pickOne(ENCOUNTERS.elite); if (!battle(enc, 'elite')) return { win: false, floor: R.floor, at: '精英:' + enc.join('+') }; reward(); relic(); }
    else if (node === 'boss') { if (!battle(['gob_king'], 'boss')) return { win: false, floor: R.floor, at: 'Boss' }; return { win: true, floor: R.floor, hp: R.hp }; }
    else if (node === 'rest') { if (R.hp < R.maxHp * .55) heal(Math.floor(R.maxHp * .3)); else { const c = R.deck.find(c => !c.up && CARDS[c.id].rar !== 'start') || R.deck.find(c => !c.up); if (c) c.up = 1; } }
    else if (node === 'event') { heal(10); }
    else if (node === 'shop') { const i = R.deck.findIndex(c => c.id === 'defend'); if (i >= 0) R.deck.splice(i, 1); }
  }
}
const lines = [`# 平衡测试结果（每个角色 ${N} 局，机器人简单策略）`, '', `生成时间：${new Date().toISOString()}`, '', '| 角色 | 胜率 | 见到 Boss | Boss 战胜率 | 通关剩余生命 | 最常死在 |', '|---|---|---|---|---|---|'];
const detail = [];
for (const ch of ['miko', 'hero', 'witch', 'heroine']) {
  let w = 0, fl = 0, hp = 0, rb = 0; const at = {};
  for (let i = 0; i < N; i++) { const r = run(ch); fl += r.floor; if (r.win || r.at === 'Boss') rb++; if (r.win) { w++; hp += r.hp; } else at[r.at] = (at[r.at] || 0) + 1; }
  const top = Object.entries(at).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}(${v})`).join('、');
  lines.push(`| ${ch} | ${(w / N * 100).toFixed(1)}% | ${(rb / N * 100).toFixed(0)}% | ${rb ? (w / rb * 100).toFixed(0) : 0}% | ${w ? (hp / w).toFixed(0) : '-'} | ${top} |`);
}
const out = lines.join('\n'); console.log(out);
import('fs').then(fs => { fs.mkdirSync('data', { recursive: true }); fs.writeFileSync('data/balance.md', out + '\n'); });
