// 平衡测试：机器人用每个角色跑很多局，统计胜率和死在哪里。只在 GitHub Actions 上跑。
// 规则照抄 src/game.js 的战斗逻辑（简化了地图：固定 15 层路线 + Boss）
import { MECH, NEWKEYW, OLDKEYW, STARTRELIC, RULES, isFury, CARDS, STARTERS, RELICS, ENEMIES, ENCOUNTERS, ENCOUNTERS2 } from '../src/data.js';
const N = +process.argv[2] || 1000, LOCKLV = process.argv[3] == null ? 4 : +process.argv[3], ONLY = process.argv[4], ASC = +(process.argv[5] || 0), SEED0 = +(process.env.SEED || 1);
/* 固定随机种子：第 i 局用种子 SEED0+i，失败的局可以单独重放（SEED=… node tools/sim.mjs 1 4 miko） */
let seedS = 1; const rng = () => { seedS |= 0; seedS = seedS + 0x6D2B79F5 | 0; let t = Math.imul(seedS ^ seedS >>> 15, 1 | seedS); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
Math.random = rng; /* data.js 里怪物 AI 的随机也走同一个种子 */
const A_ = n => ASC >= n;
const SHA = (process.env.GITHUB_SHA || 'local').slice(0, 7);
let DG = null; /* 诊断计数（只统计熟练机器人） */
let SMART = false; /* false=新手机器人；true=熟练机器人（会用药水、按流派选牌） */
const POTS = ['heal', 'str', 'dex', 'block', 'energy', 'fire', 'bomb', 'weak', 'draw', 'fairy'];
const KEYW = { ...OLDKEYW, ...NEWKEYW };
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pickOne = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ROUTE = ['fight', 'fight', 'fight', 'event', 'fight', 'fight', 'elite', 'rest', 'treasure', 'fight', 'shop', 'elite', 'fight', 'fight', 'rest', 'boss'];
let R, B, uid = 1;
const has = id => R.relics.includes(id);
const mine = d => (!d.ch || d.ch === R.char) && (!d.act2 || R.act === 2) && !LOCK.has(d.id) && d.ch !== 'temp';
const mk = (id, up = 0) => ({ id, up, uid: uid++ });
const addSt = (t, k, n) => { t.st[k] = (t.st[k] || 0) + n; if (t.st[k] === 0) delete t.st[k]; };
const alive = () => B.en.filter(e => !e.dead);
const atkVal = (s, t, b, m = 1) => { let d = (b + (s.st.str || 0) * m) * (s.d ? (s.dmul || 1) : 1); if (s.st.weak) d *= .75; if (t && t.st.vuln) d *= 1.5; return Math.max(0, Math.floor(d)); };
function hurt(t, amt, att, direct = true) {
  const isP = t === B.p; if (!isP && t.st.aegis) return 0; if (!isP && t.d && t.d.undead && has('silvercross')) amt = Math.floor(amt * 1.25); if (!isP && t.st.intang) amt = Math.ceil(amt / 2); if (!isP && t.st.fly) { amt = Math.ceil(amt / 2); addSt(t, 'fly', -1); if (!t.st.fly) t.grounded = 1; } if (!isP && att === B.p && direct) t.hitT = 1;
  const eAtk = isP && att && att !== B.p; if (eAtk) amt = MECH.preBlock(G, amt, att); const u = Math.min(t.block, amt); t.block -= u; let left = amt - u; if (eAtk) left = MECH.postBlock(G, left, att);
  const hpLost = isP ? left : Math.min(left, Math.max(0, t.hp));
  if (DG) { if (isP) { DG.tk += Math.max(0, left); DG.bl += u; } else DG.dm += hpLost; }
  if (isP) R.hp -= left; else t.hp -= left;
  if (att && t.st.thorns && att !== t) hurt(att, t.st.thorns);
  if (!isP && t.hp <= 0 && !t.dead) killE(t);
  if (!isP && !t.dead && left > 0 && t.d.onHurt) t.d.onHurt(t, BE);
  if (!isP && !t.dead && t.key === 'gob_wolf' && t.hp <= t.max / 2) { t.key = 'wolf'; t.d = ENEMIES.wolf; t.max = Math.max(t.hp, ENEMIES.wolf.hp[1]); t.move = t.d.ai(t, BE); const g = mkE('goblin'); g.hp = g.max = 8; g.move = g.d.ai(g, BE); B.en.splice(B.en.indexOf(t) + 1, 0, g); }
  if (isP) pDeath();
  return hpLost;
}
function killE(e) { e.dead = true; e.hp = 0; R.kills++; if (!e.rewarded && !e.fled) { e.rewarded = 1; if (has('fang')) heal(3); if (has('wolffang')) addSt(B.p, 'str', 1); if (B && B.p.st.chain) { G.ammo(3 * B.p.st.chain); drawCards(B.p.st.chain); } } const od = CARDS && e.d.onDie; if (od && !e.fled) od(e, BE); }
function pDeath() { if (R.hp > 0) return; const i = R.pots.indexOf('fairy'); if (i >= 0) { R.pots.splice(i, 1); R.hp = Math.floor(R.maxHp * .3); return; } if (has('feather') && !R.feather) { R.feather = 1; R.hp = Math.floor(R.maxHp * .3); } }
const heal = n => { if (n <= 0 || R.hp <= 0) return 0; const k = Math.min(n, R.maxHp - R.hp); R.hp += k; return k; };
function boom(t) { const d = 20 + (B.p.st.dist ? 8 : 0) + (has('mic') ? 6 : 0); t.st.res = t.st.res - 10 + 3 + (B.p.st.dist ? 3 : 0); hurt(t, d); if (has('metro') && !B.p.metroUsed) { B.p.metroUsed = 1; B.p.energy++; } }
function drawCards(n) { for (let i = 0; i < n; i++) { if (B.p.noDraw || B.hand.length >= 10) return; if (!B.draw.length) { if (!B.disc.length) return; B.draw = shuffle(B.disc); B.disc = []; } B.hand.push(B.draw.pop()); } }
const G = {
  has: id => has(id), handSize() { return B.hand.length; }, potsInHand() { return B.hand.filter(c => CARDS[c.id].potion).length; },
  kekSpend(n) { if ((B.p.st.kek || 0) < n) return false; addSt(B.p, 'kek', -n); return true; },
  execute(t) { if (t && !t.dead) { t.hp = 0; killE(t); } },
  discardPick(uid) { const i = B.hand.findIndex(c => c.uid === uid); if (i < 0) return; const c = B.hand.splice(i, 1)[0], d = CARDS[c.id]; G.discNote(1);
    if (d.sly) { const a = alive(); B.p.fh = d.type === 'atk' ? 1 : 0; try { d.play(G, c.up, d.tgt === 'one' ? a[Math.floor(Math.random() * a.length)] : null, c); } catch (e) {} postPlay(d); (d.exhaust ? B.exh : B.disc).push(c); } else B.disc.push(c); },
  discNote(k) { if (k <= 0) return; B.p.disc = 1; B.p.discN = (B.p.discN || 0) + k; if (B.p.st.loop && !B.p.loopT) { B.p.loopT = 1; G.draw(B.p.st.loop); } },
  discard(n) { const pool = [...B.hand]; let cnt = 0; for (let k = 0; k < n && pool.length; k++) { const c = pool.splice(Math.floor(Math.random() * pool.length), 1)[0], d = CARDS[c.id]; const hi = B.hand.indexOf(c); if (hi < 0) { k--; continue; } B.hand.splice(hi, 1); cnt++;
    if (d.sly) { const a = alive(); B.p.fh = d.type === 'atk' ? 1 : 0; try { d.play(G, c.up, d.tgt === 'one' ? a[Math.floor(Math.random() * a.length)] : null, c); } catch (e) {} postPlay(d); (d.exhaust ? B.exh : B.disc).push(c); } else B.disc.push(c); } G.discNote(cnt); },
  get p() { return B.p; }, get hand() { return B.hand; }, get R() { return R; }, x: 0, alive: () => alive(),
  addHand(id, up = 0) { if (B.hand.length >= 10) return false; B.hand.push(mk(id, up)); return true; }, note() {}, hitE(e, n) { if (e && !e.dead) hurt(e, n, null, false); },
  fhb() { if (!B.p.fh) return 0; B.p.fh = 0; return MECH.firstHit(G); },
  attack(t, base, times = 1, m = 1) { let s = 0; const fb = G.fhb(); for (let i = 0; i < times; i++) { if (!t || t.dead) break; s += hurt(t, atkVal(B.p, t, base + (i ? 0 : fb), m), B.p); } return s; },
  attackAll(base, times = 1) { let s = 0; const fb = G.fhb(); for (let i = 0; i < times; i++) for (const e of alive()) s += hurt(e, atkVal(B.p, e, base + (i ? 0 : fb)), B.p); return s; },
  attackRandom(base, times) { const fb = G.fhb(); for (let i = 0; i < times; i++) { const a = alive(); if (!a.length) break; const e = pickOne(a); hurt(e, atkVal(B.p, e, base + (i ? 0 : fb)), B.p); } },
  block(n, raw) { B.p.block += Math.max(0, raw ? n : n + (B.p.st.dex || 0)); },
  apply(t, k, n) { if (t && !t.dead) addSt(t, k, n); }, applyAll(k, n) { alive().forEach(e => addSt(e, k, n)); },
  self(k, n) { addSt(B.p, k, n); }, draw: n => drawCards(n), energy(n) { B.p.energy += n; },
  loseHp(n) { R.hp -= n; pDeath(); }, heal: n => heal(n), addCard(id, up, pile) { B[pile === 'discard' ? 'disc' : 'draw'].push(mk(id, up)); },
  pm() { return B.p.st.sage ? 2 : 1; }, ppm() { return B.p.st.sage ? 1.5 : 1; },
  potion(n, id) { const ps = ['p_fire', 'p_frost', 'p_heal', 'p_poison', 'p_boom']; for (let i = 0; i < n; i++) (B.hand.length < 10 ? B.hand : B.disc).push(mk(id || pickOne(ps))); },
  poison(t, n) { if (!t || t.dead || n <= 0) return; addSt(t, 'poison', n + (has('toad') ? 1 : 0)); },
  volley(clear = true, max = 99) { // 光弹齐射
    const n = Math.min(max, B.p.st.ammo || 0); if (!n) return; const dmg = 4 + (B.p.st.dual || 0) + (B.p.oc || 0);
    for (let i = 0; i < n; i++) { const a = alive(); if (!a.length) break; if (B.p.aoe && i < B.p.aoe) a.forEach(e => hurt(e, atkVal(B.p, e, dmg), B.p)); else { const e = pickOne(a); hurt(e, atkVal(B.p, e, dmg), B.p); } }
    if (B.p.st.rapid) G.block(B.p.st.rapid * n, true);
    if (clear) { B.shots = (B.shots || 0) + n; if (has('pad')) { B.p.padDraw = Math.floor(B.shots / 4); B.shots %= 4; } addSt(B.p, 'ammo', -Math.min(n, B.p.st.ammo || 0)); }
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
  allies: e => alive().filter(a => a !== e), alive: () => alive(), healE(e, n) { e.hp = Math.min(e.max, e.hp + n); }, addCard(id, n = 1) { for (let k = 0; k < n; k++) B.disc.push(mk(id)); }, revive(e, f) { e.revived = 1; e.dead = false; for (const k of ['poison', 'weak', 'vuln', 'res']) delete e.st[k]; e.hp = Math.max(1, Math.floor(e.max * f)); R.kills--; }, flee(e) { if (!e.dead) { e.fled = 1; e.dead = true; e.hp = 0; } }, say() {},
  kill(e) { killE(e); }, steal(e) { e.stoleT = e.turn; }, endPlayerTurn() { B.forceEnd = 1; },
  split(e, key, n) { const i = B.en.indexOf(e), hp = Math.max(1, Math.floor(e.hp / n)), bits = []; for (let k = 0; k < n; k++) { const b = mkE(key); b.hp = b.max = hp; b.move = b.d.ai(b, BE); bits.push(b); } e.dead = true; e.fled = 1; e.hp = 0; B.en.splice(i, 1, ...bits); }, summon(key, hp) { if (alive().length >= 5) return; const e = mkE(key); if (hp) e.hp = e.max = hp; e.move = e.d.ai(e, BE); const i = B.en.findIndex(x => x.dead && !(x.d.prePhase && !x.revived && !x.fled)); if (i >= 0) B.en[i] = e; else B.en.unshift(e); } /* 召唤物优先填进已经死掉的位置，队伍不会越排越长 */,
};
let eid = 1;
function mkE(key) { const d = ENEMIES[key], hm = 1 + (A_(1) && d.elite ? .15 : 0) + (A_(2) && !d.elite && !d.boss ? .1 : 0) + (A_(6) && d.boss ? .15 : 0), hp = Math.round(rnd(d.hp[0], d.hp[1]) * hm * (R.act === 2 ? RULES.act2Mul : 1)); const e = { key, d, hp, max: hp, dmul: (1 + (A_(3) ? .1 : 0) + (A_(8) ? .1 : 0)) * (R.act === 2 ? RULES.act2Mul : 1), block: 0, st: {}, turn: 0, hist: [], id: 'e' + eid++ }; d.init && d.init(e); return e; }
const cost0 = c => { const d = CARDS[c.id]; if (c.free) return 0; if (c.rc != null) return c.rc; const k = d.cost[c.up ? 1 : 0]; return c.disc && k !== 'X' ? Math.max(0, k - 1) : k; };
const cost = c => { const k = cost0(c); return B && typeof k === 'number' ? Math.max(0, k + MECH.costMod(G, CARDS[c.id])) : k; };
function startTurn(first) {
  B.turn++; B.forceEnd = 0; [...B.draw, ...B.disc, ...B.hand].forEach(c => delete c.rc); B.p.block = 0;
  B.p.energy = 3 + (has('crown') ? 1 : 0) + (first && has('hourglass') ? 1 : 0); B.p.noDraw = 0; B.p.disc = 0; B.p.discN = 0; B.p.loopT = 0;
  B.p.pot = 0; if (first && has('cauldron')) G.potion(1); if (B.p.st.satchel && B.turn % 2 === 1) G.potion(B.p.st.satchel);
  if (B.p.st.plague) alive().forEach(e => G.poison(e, B.p.st.plague));
  if (B.p.st.kagura) G.kek(B.p.st.kagura); if (B.p.st.kek) G.block(B.p.st.shinboku ? B.p.st.kek + Math.min(B.p.st.kek, 8) : B.p.st.kek, true);
  if (has('hamaya') && (B.p.st.kek || 0) >= 4) drawCards(1);
  B.p.oc = 0; B.p.aoe = 0; B.p.metroUsed = 0; B.p.cplays = 0; if (B.p.st.gen) G.ammo(B.p.st.gen); if (has('spare')) G.ammo(1); if (B.p.padDraw) { drawCards(B.p.padDraw); B.p.padDraw = 0; } if (has('gameboy') && B.turn % 2 === 1) G.ammo(1); if (!first && has('phones')) G.resAll(1); if (B.p.st.lowf) G.resAll(B.p.st.lowf);
  if (first && has('anchor')) B.p.block += 10;
  drawCards(5 + (first && has('scroll') ? 2 : 0));
  if (B.p.st.confuse) { B.hand.forEach(c => { if (typeof cost(c) === 'number') c.rc = rnd(0, 3); }); addSt(B.p, 'confuse', -1); }
  MECH.turnStart(G, first);
  if (first && has('dice')) { const cs = B.hand.filter(c => typeof cost(c) === 'number' && cost(c) >= 1); if (cs.length) pickOne(cs).disc = 1; }
}
function postPlay(d) { /* 打出一张牌后的通用结算（狡诈自动打出也走这里） */
  MECH.postPlay(G, d);
  alive().forEach(e => e.d.onCard && e.d.onCard(e, d.type, BE));
  if (d.type === 'atk') { B.atk++; if (has('quiver') && B.atk % 3 === 0) for (const e of alive()) hurt(e, 5); }
    if (d.type === 'skill') alive().forEach(e => { if (e.st.enrage && (e.enT = (e.enT || 0) + 1) <= 2) addSt(e, 'str', e.st.enrage); });
    if (d.potion) { B.p.pot++; if (has('hat')) G.block(2, true); }
    if (B.p.st.concert && (B.p.cplays = (B.p.cplays || 0) + 1) <= 4) G.resAll(B.p.st.concert);
}
function play(i, t) {
  const c = B.hand[i], d = CARDS[c.id]; if (d.unplay || (d.can && !d.can(G, c.up))) return false; let k = cost(c); if (k === 'X') k = B.p.energy; if (k > B.p.energy) return false;
  if (d.tgt === 'one' && !t) t = alive().sort((a, b) => a.hp - b.hp)[0];
  B.p.energy -= k; G.x = k; B.hand.splice(i, 1);
  let pk; if (d.pick) { const opts = d.pick === 1 ? B.hand.map(x => ({ val: x.uid, c: x })) : d.pick(G, c.up); if (opts.length) pk = (d.bot ? d.bot(G, opts) : botPick(opts)).val; }
  B.p.fh = d.type === 'atk' ? 1 : 0; d.play(G, c.up, t, c, pk); delete c.rc; B.p.fh = 0;
  postPlay(d);
  if (d.type !== 'power') (d.exhaust ? B.exh : B.disc).push(c);
  return true;
}
function botPick(opts) { /* 选手牌：先丢状态/诅咒，再丢最便宜的基础牌 */
  if (!opts[0].c) return opts[0];
  const v = o => { const d = CARDS[o.c.id]; return d.unplay ? -10 : d.rar === 'start' ? 1 + (cost(o.c) | 0) : 3 + TIER[d.rar] || 2; };
  return [...opts].sort((a, b) => v(a) - v(b))[0]; }
const incoming = () => alive().reduce((s, e) => { const m = e.d.moves[e.move]; return s + (m && m.d ? atkVal(e, B.p, m.d) * (m.x ? m.x + (e.xb || 0) : 1) : 0); }, 0);
const estDmg = o => { let t = ''; try { t = o.d.desc(o.c.up); } catch (e) {} const m = t.match(/造成 (\d+) 点伤害(?: (\d+) 次)?/); return m ? (+m[1] + (B.p.st.str || 0)) * (+m[2] || 1) * (o.d.tgt === 'all' ? alive().length : 1) : 0; };
const isBlock = d => /格挡/.test(d.desc(0)) && d.type !== 'atk';
// 机器人出牌：先补够格挡，再出能力牌、0 费牌、攻击牌
function usePots() {
  if (!R.pots.length || (!SMART && Math.random() > .2)) return; /* 新手大约 20% 的回合想起来用药水 */
  const big = B.kind !== 'fight', use = id => { const i = R.pots.indexOf(id); if (i < 0) return false; R.pots.splice(i, 1);
    if (id === 'heal') heal(15); else if (id === 'block') G.block(12, true); else if (id === 'str') addSt(B.p, 'str', 2); else if (id === 'dex') addSt(B.p, 'dex', 2);
    else if (id === 'energy') B.p.energy += 2; else if (id === 'draw') G.draw(3); else if (id === 'weak') alive().forEach(e => addSt(e, 'weak', 3));
    else if (id === 'fire') { const t = alive().sort((a, b) => a.hp - b.hp)[0]; if (t) hurt(t, 20, B.p); } else if (id === 'bomb') alive().forEach(e => hurt(e, 10, B.p)); return true; };
  if (R.hp < R.maxHp * .35) { use('heal') || use('block'); }
  if (big && B.turn <= 1) for (const id of ['str', 'dex', 'weak', 'energy', 'draw', 'bomb', 'fire']) use(id);
}
function botTurn() { usePots(); if (!alive().length) return; MECH.bot(G, incoming() - B.p.block);
  for (let guard = 0; guard < 30 && alive().length; guard++) {
    const need = incoming() - B.p.block;
    const opts = B.hand.map((c, i) => ({ c, i, d: CARDS[c.id], k: cost(c) === 'X' ? B.p.energy : cost(c) })).filter(o => !o.d.unplay && (!o.d.can || o.d.can(G, o.c.up)) && o.k <= B.p.energy && !(o.k === 'X' && B.p.energy === 0));
    if (!opts.length) break;
    const hpLeft = alive().reduce((m, e) => m + e.hp + e.block, 0), dmgHand = opts.filter(o => o.d.type === 'atk').reduce((m, o) => m + estDmg(o), 0), lethal = dmgHand >= hpLeft;
    const sc = o => { const d = o.d; let s = 0;
      if (d.type === 'power') s = B.turn <= 3 ? 9 : 3;
      else if (isBlock(d)) s = need > 0 ? 8 : 1;
      else if (d.type === 'atk') s = 5 + o.k + (lethal ? 6 : 0);
      else s = 4;
      if (o.k === 0) s += 2; if (d.potion) s += 3;
      if (/打出所有光弹|满格炮/.test(d.desc(0)) && (B.p.st.ammo || 0) < 4) s -= 6;
      if (/用掉|打出所有光弹/.test(d.desc(0)) && !(B.p.st.ammo || 0)) s -= 10;
      if (d.id === 'eshield' && need <= 0) s -= 10;
      if (/消耗全部结界/.test(d.desc(0)) && (B.p.st.kek || 0) < 4) s -= 6;
      if (SMART) { const tx = d.desc(o.c.up), RS = { 结界: 'kek', 鲜血: 'vblood', 龙血: 'dblood', 飞剑: 'sword', 光弹: 'ammo' };
        for (const [w, k] of Object.entries(RS)) { const have = B.p.st[k] || 0;
          if (new RegExp('(花掉|用掉|射出)[^。；]{0,8}' + w).test(tx)) s += have >= 3 ? 3 : have ? -1 : -5;
          else if (new RegExp('(得到|获得) \\d+ (层|点|把|发)' + w + '|' + w + ' \\+').test(tx)) s += 1; }
        if (/回合结束没打出就消失/.test(tx)) s += 3;
        if (/霜龙形态下/.test(tx)) s += B.p.st.dragon ? 3 : 0;
        if (/祈唤/.test(tx)) { const et = (B.p.st.efire || 0) + (B.p.st.ewater || 0) + (B.p.st.ewind || 0); s += et >= 7 ? 5 : et >= 4 ? 1 : -5; } }
      const top = alive().reduce((m, e) => Math.max(m, e.st.res || 0), 0);
      if (d.id === 'high') s += top >= 5 ? 6 : -2;                       // 女主：层数高时先打高音
      if (R.char === 'heroine' && /共鸣/.test(d.desc(0)) && d.id !== 'high' && B.hand.some(c => c.id === 'high') && top >= 5 && top < 10) s -= 3;
      if (d.id === 'cannon') s += (B.p.st.ammo || 0) >= 4 ? 4 : -6;     // 林拓：光弹多时超频
      if (d.id === 'charge') s += (B.p.st.ammo || 0) >= 4 ? 3 : -6;
      if (d.id === 'screen') s += alive().length >= 2 && (B.p.st.ammo || 0) >= 3 ? 4 : -6;
      if (/得到 \d 发光弹/.test(d.desc(0)) && (B.p.st.ammo || 0) <= 6) s += 2;
      if (['kekkai', 'shime', 'fuda', 'kagura'].includes(d.id)) s += B.turn <= 2 ? 4 : 0;
      const kek = B.p.st.kek || 0;
      if (['shinboku', 'mangetsu', 'haja', 'yumihari'].includes(d.id)) s += kek >= 4 ? 4 : -3;
      if (d.id === 'chinkon') s += need > 0 && kek >= 2 ? 4 : -2;  // 巫女：先叠结界
      if (d.id === 'hama' || d.id === 'yumihari') s += Math.min(6, B.p.st.kek || 0) - 2;
      if ((d.id === 'crack' || d.id === 'deadly' || d.id === 'catalyst') && !alive().some(e => (e.st.res || e.st.poison || 0) >= 5)) s -= 6;
      return s; };
    opts.sort((a, b) => sc(b) - sc(a));
    const o = opts[0]; if (sc(o) <= 0) break;
    let t = null; if (o.d.tgt === 'one') { const a = alive(); t = ['crack', 'high', 'wave'].includes(o.d.id) ? a.sort((x, y) => (y.st.res || 0) - (x.st.res || 0))[0] : ['deadly', 'catalyst'].includes(o.d.id) ? a.sort((x, y) => (y.st.poison || 0) - (x.st.poison || 0))[0] : a.sort((x, y) => x.hp - y.hp)[0]; }
    play(o.i, t); if (R.hp <= 0 || B.forceEnd) return; MECH.bot(G, incoming() - B.p.block);
  }
}
function endTurn() {
  if (B.p.st.ammo) G.volley(true); if (!alive().length) return;
  for (const c of B.hand) { if (CARDS[c.id].burn) { R.hp -= CARDS[c.id].burn; pDeath(); } if (CARDS[c.id].endWeak) addSt(B.p, 'weak', 1); } if (R.hp <= 0) return;
  MECH.turnEnd(G); if (!alive().length) return;
  for (const c of B.hand) (CARDS[c.id].ethereal ? B.exh : B.disc).push(c); B.hand = [];
  if (B.p.st.metal) G.block(B.p.st.metal, true); if (B.p.st.regen && (B.p.regenN = (B.p.regenN || 0) + 1) <= 3) heal(B.p.st.regen);
  for (const e of alive()) e.block = 0;
  for (const e of [...B.en]) if (e.d.prePhase) e.d.prePhase(e, BE);
  const pre = { vuln: B.p.st.vuln || 0, weak: B.p.st.weak || 0 };
  for (const e of [...B.en]) {
    if (e.dead || R.hp <= 0) continue;
    if (e.st.aegis) addSt(e, 'aegis', -1); if (e.st.intang) e.st.intang = 0;
    if (e.st.poison && !e.st.aegis) { e.hp -= e.st.poison; addSt(e, 'poison', -1); if (e.hp <= 0) { killE(e); continue; } }
    { const cc = MECH.enemyAct ? MECH.enemyAct(G, e) : null; if (e.dead) continue; if (cc === 'skip') { e.hist.push(e.move); continue; } }
    if (e.d.onTurn && e.d.onTurn(e, BE)) { e.hist.push(e.move); continue; }
    e.hitT = 0; e.enT = 0;
    const mv = e.d.moves[e.move];
    if (mv.d) for (let k = 0; k < (mv.x ? mv.x + (e.xb || 0) : 1); k++) { hurt(B.p, atkVal(e, B.p, mv.d), e); if (e.dead) break; }
    if (mv.f && !e.dead) mv.f(e, BE);
    e.hist.push(e.move); e.d.after && e.d.after(e);
  }
  for (const k of ['vuln', 'weak']) if (pre[k] && B.p.st[k]) addSt(B.p, k, -1);
  if (R.act === 2 && B.turn === RULES.bloodTurn && !B.bloodMoon) { B.bloodMoon = 1; alive().filter(e => e.d.undead).forEach(e => addSt(e, 'str', RULES.bloodStr)); }
  for (const e of alive()) { if (e.st.ritual) addSt(e, 'str', e.st.ritual); if (isFury(e.turn)) addSt(e, 'str', 1); for (const k of ['vuln', 'weak']) if (e.st[k]) addSt(e, k, -1); e.turn++; e.move = e.d.ai(e, BE); }
}
let TIMEOUT = 0;
function battle(keys, kind) {
  if (DG) DG.fights++;
  B = { kind, en: keys.map(mkE), p: { block: 0, energy: 0, st: {}, noDraw: 0 }, draw: shuffle(R.deck.map(c => ({ ...c }))), hand: [], disc: [], exh: [], turn: 0, atk: 0 };
  if (has('charm')) B.p.st.str = 1; if (has('lantern')) B.p.st.dex = (B.p.st.dex || 0) + 1; 
  if (has('suzu')) B.p.st.kek = 3 + (has('omamori') ? 2 : 0); else if (has('omamori')) B.p.st.kek = 2;
  if (has('phones')) B.en.forEach(e => e.st.res = 2); if (has('spikes')) B.p.st.thorns = 3; if (has('wardrum')) B.en.forEach(e => e.st.vuln = 1);
  B.en.filter(e => e.key === 'gob_bomb').forEach((e, i) => e.st.fuse = 3 + i);
  B.en.forEach(e => e.move = e.d.ai(e, BE));
  MECH.battleStart(G);
  startTurn(true); if (has('batcloak')) B.p.block += 8; if (has('pocketwatch')) drawCards(2);
  for (let t = 0; t < RULES.maxTurns; t++) {
    if (DG) { DG.turns++; if (kind === 'boss') DG.bt++; } botTurn(); if (R.hp <= 0 && !revive()) return false; if (!alive().length) break;
    endTurn(); if (R.hp <= 0 && !revive()) return false; if (!alive().length) break;
    startTurn(false);
  }
  if (alive().length) { TIMEOUT = 1; return false; }
  if (R.relics.some(x => RELICS[x] && RELICS[x].rar === 'start') && !has('crown')) heal(4); if (has('grail')) heal(5); MECH.victory(G);
  return true;
}
function revive() { pDeath(); return R.hp > 0; }
function dropPot(kind) { if (Math.random() < (kind === 'elite' ? .6 : .4) && R.pots.length < 3) R.pots.push(pickOne(POTS)); }
function rollCards(n, bonus = 0) { const out = []; while (out.length < n) { const x = Math.random(), rar = x < .04 + bonus ? 'r' : x < .36 + bonus ? 'u' : 'c'; const pool = Object.values(CARDS).filter(d => d.rar === rar && mine(d) && !out.includes(d.id)); if (pool.length) out.push(pickOne(pool).id); } return mixTypes(out, d => mine(d) && d.rar !== 'start' && d.rar !== 'gen'); }
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

const TIER = { r: 3, u: 2, c: 1 };
/* 每个角色的 2~3 套打法：熟练机器人看牌组里哪套最多，就往哪套拿牌 */
const ARCH = {
  hero: [/光弹/, /攻击牌/], heroine: [/共鸣|爆音/, /弃/], miko: [/结界/, /技能牌/], witch: [/炼金瓶/, /中毒/, /火焰瓶|火球/],
  erin: [/祈唤|火 \+|水 \+|风 \+/, /每有 1 层|层数|总层数/], gu: [/得到 \d 把飞剑|飞剑不少于|每有 1 把|剑阵|剑心/, /射出/],
  sylvie: [/【龙】造成|变身|龙心|龙鳞/, /花掉|霜灼|收鳞|冰盾/], mia: [/扑击/, /护卫|团子回复/], feiyue: [/吸血/, /献血|花掉/],
};
const dtxt = id => { try { return CARDS[id].desc(0); } catch (e) { return ''; } };
function archOf() { const A = ARCH[R.char] || []; const n = A.map(re => R.deck.filter(c => re.test(dtxt(c.id))).length); let b = 0; n.forEach((x, i) => { if (x > n[b]) b = i; }); return { A, b, n }; }
function smartScore(id) { const d = CARDS[id], t = dtxt(id), { A, b, n } = archOf(); let v = TIER[d.rar] + (d.ch ? .5 : 0);
  if (A[b] && n[b] >= 2 && A[b].test(t)) v += 2; else if (A.some(re => re.test(t))) v += .8;
  const blocks = R.deck.filter(c => isBlock(CARDS[c.id])).length, atks = R.deck.filter(c => CARDS[c.id].type === 'atk').length;
  if (isBlock(d) && blocks < R.deck.length * .3) v += 1; if (d.type === 'atk' && atks < R.deck.length * .4) v += 1.2; if (d.type !== 'atk' && !isBlock(d) && atks < R.deck.length * .35) v -= .8;
  if (d.type === 'power' && R.deck.filter(c => CARDS[c.id].type === 'power').length >= 3) v -= 1.5;
  v -= (R.picks[id] || 0) * (d.type === 'power' ? 3 : 1.2); return v; }
function reward(kind) { const cs = rollCards(3, kind === 'elite' ? .07 : 0);
  if (SMART) { const sc = smartScore;
    const best = cs.sort((a, b) => sc(b) - sc(a))[0]; if (sc(best) < 1.5 && R.deck.length > 18) return; R.deck.push(mk(best)); R.picks[best] = (R.picks[best] || 0) + 1; return; } if (R.deck.length > 26 && Math.random() < .5) return; const best = cs.sort((a, b) => TIER[CARDS[b].rar] - TIER[CARDS[a].rar] + (CARDS[b].ch ? .5 : 0) - (CARDS[a].ch ? .5 : 0))[0]; R.deck.push(mk(best)); R.picks[best] = (R.picks[best] || 0) + 1; }
function relic() { let pool = []; for (let k = 0; k < 30 && !pool.length; k++) { const rr = pickOne(['c', 'c', 'c', 'u', 'u', 'r']); pool = Object.values(RELICS).filter(r => r.rar === rr && mine(r) && !has(r.id) && r.id !== 'crown'); } if (!pool.length) pool = Object.values(RELICS).filter(r => r.rar !== 'start' && mine(r) && !has(r.id)); if (!pool.length) return; const r = pickOne(pool); R.relics.push(r.id); if (r.id === 'herb') { R.maxHp += 10; R.hp += 10; } if (r.id === 'crown') { R.maxHp -= 10; R.hp = Math.min(R.hp, R.maxHp); } if (r.id === 'grail') { R.maxHp -= 5; R.hp = Math.min(R.hp, R.maxHp); } }
const UNLOCKS = [{ cards: ['dual', 'concert'], relics: [] }, { cards: ['shinboku', 'sage'], relics: ['mic'] }, { cards: ['screen', 'distort', 'deadly'], relics: ['pad'] }, { cards: ['thunder'], relics: ['crown', 'feather'] }];
const LOCK = new Set(UNLOCKS.slice(LOCKLV).flatMap(u => [...u.cards, ...u.relics]));
function shop() { if (!SMART) { const i = R.deck.findIndex(c => c.id === 'defend'); if (i >= 0) R.deck.splice(i, 1); return; }
  if (R.gold >= 75) { const i = R.deck.findIndex(c => c.id === 'strike' || c.id === 'defend' || c.id === 'tstrike'); if (i >= 0) { R.deck.splice(i, 1); R.gold -= 75; } }
  if (R.gold >= 70) { const cs = rollCards(3); const d = cs.map(id => CARDS[id]).sort((a, b) => smartScore(b.id) - smartScore(a.id))[0]; if (smartScore(d.id) >= 3) { R.deck.push(mk(d.id)); R.gold -= d.rar === 'r' ? 150 : 70; } }
  if (R.gold >= 55 && R.pots.length < 3) { R.pots.push(pickOne(POTS)); R.gold -= 55; }
  if (R.gold >= 150) { relic(); R.gold -= 150; } }
function event() { const x = Math.random(); if (x < .3) heal(10); else if (x < .5) { R.gold += 60; } else if (x < .7) { if (Math.random() < .5) { R.hp = Math.max(1, R.hp - 8); } else R.deck.push(mk(Math.random() < .5 ? 'regret' : 'doubt')); relic(); } else if (x < .85) { const c = R.deck.find(c => !c.up); if (c) c.up = 1; } else { const i = R.deck.findIndex(c => CARDS[c.id].rar === 'start'); if (i >= 0) R.deck.splice(i, 1); } }
function run(char) {
  TIMEOUT = 0; uid = 1; R = { char, hp: A_(4) ? 72 : 80, maxHp: A_(4) ? 72 : 80, deck: STARTERS[char].map(id => mk(id)), relics: [STARTRELIC[char]], kills: 0, picks: {}, floor: 0, pots: [], act: 1, gold: 99 };
  for (const [act, EN] of [[1, ENCOUNTERS], [2, ENCOUNTERS2]]) {
    R.act = act; let fights = 0; if (act === 2) R.hp = Math.min(R.maxHp, R.hp + Math.floor(R.maxHp * .5));
    for (const node of ROUTE) {
      R.floor++;
      if (node === 'fight') { const enc = pickOne(fights < 3 ? EN.easy : EN.hard); fights++; if (!battle(enc, 'fight')) return { win: false, to: TIMEOUT, act, floor: R.floor, at: enc.join('+') }; reward(); dropPot('fight'); R.gold += Math.round((10 + Math.floor(Math.random() * 11)) * (A_(7) ? .7 : 1)); }
      else if (node === 'elite') { const enc = pickOne(EN.elite); if (!battle(enc, 'elite')) return { win: false, to: TIMEOUT, act, floor: R.floor, at: '精英:' + enc.join('+') }; reward('elite'); relic(); dropPot('elite'); R.gold += Math.round((25 + Math.floor(Math.random() * 11)) * (A_(7) ? .7 : 1)); }
      else if (node === 'boss') { if (DG) DG.bosses++; const bk = pickOne(EN.boss)[0]; if (!battle([bk], 'boss')) return { win: false, to: TIMEOUT, act, floor: R.floor, at: 'Boss:' + bk }; }
      else if (node === 'rest') { if (R.hp < R.maxHp * .55) heal(Math.floor(R.maxHp * (A_(5) ? .2 : .3))); else { const c = R.deck.find(c => !c.up && CARDS[c.id].rar !== 'start') || R.deck.find(c => !c.up); if (c) c.up = 1; } }
      else if (node === 'event') event();
      else if (node === 'treasure') relic();
      else if (node === 'shop') shop();
    }
  }
  return { win: true, act: 2, floor: R.floor, hp: R.hp };
}
const lines = [`# 平衡测试结果（每个角色每档 N=${N} 局，解锁档 ${LOCKLV}，进阶 ${ASC}，种子 ${SEED0}，commit ${SHA}）`, '', `生成时间：${new Date().toISOString()}`, '', '新手机器人：很少想起用药水、选牌只看稀有度。熟练机器人：会用药水、按角色流派选牌。', ''];
const diag = [];
for (const smart of [false, true]) {
  SMART = smart; lines.push(`## ${smart ? '熟练机器人（≈ 真人）' : '新手机器人'}`, '', '| 角色 | 第一章通关 | 第二章通关 | 第一章 Boss 战胜率 | 第二章通关剩余生命 | 超时 | 最常死在 |', '|---|---|---|---|---|---|---|');
  for (const ch of ['miko', 'hero', 'witch', 'heroine', 'erin', 'gu', 'sylvie', 'mia', 'feiyue'].filter(c => !ONLY || c === ONLY)) {
    let to = 0, w1 = 0, w2 = 0, hp = 0, rb = 0; const at = {};
    DG = smart ? { dm: 0, bl: 0, tk: 0, turns: 0, fights: 0, bt: 0, bosses: 0, deck: 0, pk: {} } : null;
    for (let i = 0; i < N; i++) { seedS = SEED0 * 7919 + i * 104729 + (smart ? 1 : 0); const r = run(ch); if (DG) { DG.deck += R.deck.length; for (const c of R.deck) if (CARDS[c.id].rar !== 'start') DG.pk[c.id] = (DG.pk[c.id] || 0) + 1; } const ok1 = r.win || r.act === 2; if (ok1) w1++; if (ok1 || (r.at || '').startsWith('Boss')) rb++; if (r.win) { w2++; hp += r.hp; } else if (r.to) to++; else { const k = (r.act === 2 ? '二·' : '一·') + r.at; at[k] = (at[k] || 0) + 1; } }
    const top = Object.entries(at).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}(${v})`).join('、');
    if (DG) { const f = x => (x / Math.max(1, DG.turns)).toFixed(1), tp = Object.entries(DG.pk).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${CARDS[k].name}(${v})`).join('、');
      diag.push(`| ◇${ch} | ${f(DG.dm)} | ${f(DG.bl)} | ${f(DG.tk)} | ${(DG.turns / Math.max(1, DG.fights)).toFixed(1)} | ${(DG.bt / Math.max(1, DG.bosses)).toFixed(1)} | ${(DG.deck / N).toFixed(1)} | ${tp} |`); }
    lines.push(`| ${ch} | ${(w1 / N * 100).toFixed(1)}% | ${(w2 / N * 100).toFixed(1)}% | ${rb ? (w1 / rb * 100).toFixed(0) : 0}% | ${w2 ? (hp / w2).toFixed(0) : '-'} | ${to} | ${top} |`);
  }
  lines.push('');
}
lines.push('诊断（熟练机器人，所有战斗平均）：', '', '| 角色 | 每回合造成伤害 | 每回合格挡挡下 | 每回合掉血 | 每场回合数 | Boss 战回合数 | 结束时牌组张数 | 最常拿的牌 |', '|---|---|---|---|---|---|---|---|', ...diag, '');
const out = lines.join('\n'); console.log(out);
import('fs').then(fs => { fs.mkdirSync('data', { recursive: true }); fs.writeFileSync('data/balance.md', out + '\n'); });
