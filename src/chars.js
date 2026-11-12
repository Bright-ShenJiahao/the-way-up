// 六个新角色：卡牌、秘宝、状态和角色机制（游戏和平衡模拟共用这一份规则）
// 设计来源：DS 评审的 20 张牌方案为主；米娅的「献祭」取自 GPT；需要玩家选择的地方做了简化（见各角色注释）
// g = 战斗接口（游戏和模拟器各自实现同名函数）
const v = (u, a, b) => (u ? b : a);
const P = g => g.p;
const cap = (x, n) => Math.max(0, Math.min(n, x));

/* ======================= 通用：控制效果 =======================
   硬控（冰冻 / 眩晕 / 束缚）：敌人跳过下一次行动；同一个敌人每场只吃 1 次，精英和 Boss 不吃硬控，改为麻痹（下一次攻击减半）。
   霜灼 N：敌人每次行动前受到 N 点伤害，然后层数减半。威吓：下一次攻击每段 -5。 */
const isBig = e => !!(e.d && (e.d.elite || e.d.boss)) || e.max >= 120;
function hardCC(g, t, k) { if (!t || t.dead) return; if (isBig(t) || t.ccU) g.apply(t, 'para', 1); else { t.ccU = 1; g.apply(t, k, 1); } }
function fburn(g, t, n) { if (t && !t.dead && n > 0) g.apply(t, 'fburn', n); }
const opt = (val, t) => ({ val, html: `<button class="btn">${t}</button>` });
/* ======================= 艾琳 · 元素层 =======================
   火、水、风各自叠层（每种最多 6 层）。「祈唤」一次兑现全部元素：每层火对目标造成 5 点伤害，每层水获得 4 点格挡，每 2 层风抽 1 张牌（单出的 1 层风留着）。
   两种打法：攒——把元素堆高再一次祈唤；花——不急着祈唤，用「每有 1 层……」的牌吃层数加成。 */
const EL = ['火', '水', '风'];
const EK = { 火: 'efire', 水: 'ewater', 风: 'ewind' };
const elCap = g => (P(g).st.emaster ? 10 : 6);
const elN = (g, k) => P(g).st[EK[k]] || 0;
const elTot = g => EL.reduce((s, k) => s + elN(g, k), 0);
const kinds = g => EL.filter(k => elN(g, k) > 0).length;
function addEl(g, k, n) { const p = P(g), a = elN(g, k), b = Math.max(0, Math.min(elCap(g), a + n)); if (b) p.st[EK[k]] = b; else delete p.st[EK[k]]; if (b >= 6 && a < 6 && g.has('lens') && !p.lensU) { p.lensU = 1; g.block(6, true); } }
function useEl(g, k, n) { const m = Math.min(n, elN(g, k)); addEl(g, k, -m); return m; }
function invoke(g, t, o = {}) { const p = P(g), f = elN(g, '火'), w = elN(g, '水'), d = elN(g, '风');
  if (!f && (o.onlyFire || (!w && d < 2))) { g.note('没有元素可以祈唤'); return 0; }
  if (g.has('prism') && !p.prU && kinds(g) === 3) { p.prU = 1; g.draw(2); g.energy(1); }
  delete p.st.efire; if (f) { const a = g.alive(); const tt = t && !t.dead ? t : a[0]; if (tt) g.attack(tt, f * (5 + (p.st.emaster ? 1 : 0)) * (o.fireX || 1)); }
  if (!o.onlyFire) { delete p.st.ewater; if (w) g.block(4 * w); const dd = Math.floor(d / 2); if (dd) { addEl(g, '风', -2 * dd); g.draw(dd); } }
  if (p.st.eseason && !p.seasT) { p.seasT = 1; g.energy(1); g.draw(p.st.eseason); }
  return f + w + d; }
const ERIN = {
  e_spark: { ch: 'erin', name: '火种', type: 'atk', rar: 'start', cost: [1, 1], icon: 'icons2/n_e_spark', tgt: 'one', desc: u => `造成 ${v(u, 6, 9)} 点伤害，火 +2。`, play: (g, u, t) => { g.attack(t, v(u, 6, 9)); addEl(g, '火', 2); } },
  e_ripple: { ch: 'erin', name: '水纹', type: 'skill', rar: 'start', cost: [1, 1], icon: 'icons2/n_e_ripple', tgt: 'self', desc: u => `获得 ${v(u, 5, 8)} 点格挡，水 +2。`, play: (g, u) => { g.block(v(u, 5, 8)); addEl(g, '水', 2); } },
  e_invoke: { ch: 'erin', name: '初阶祈唤', type: 'skill', rar: 'start', cost: [0, 0], icon: 'icons2/n_e_invoke', tgt: 'one', desc: u => `祈唤${v(u, '', '（先让火 +1）')}。`, play: (g, u, t) => { if (u) addEl(g, '火', 1); invoke(g, t); } },
  e_needle: { ch: 'erin', name: '追风针', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_needle', tgt: 'one', desc: u => `造成 ${v(u, 7, 10)} 点伤害，风 +2。`, play: (g, u, t) => { g.attack(t, v(u, 7, 10)); addEl(g, '风', 2); } },
  e_steamshot: { ch: 'erin', name: '蒸汽弹', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_steamshot', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 4, 6)} 点伤害，火 +1，水 +1。`, play: (g, u) => { g.attackAll(v(u, 4, 6)); addEl(g, '火', 1); addEl(g, '水', 1); } },
  e_tricolor: { ch: 'erin', name: '三色光', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_tricolor', tgt: 'one', desc: u => `造成 ${v(u, 5, 7)} 点伤害，火、水、风各 +1。`, play: (g, u, t) => { g.attack(t, v(u, 5, 7)); for (const k of EL) addEl(g, k, 1); } },
  e_icewall: { ch: 'erin', name: '冰幕', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_icewall', tgt: 'self', desc: u => `获得 ${v(u, 8, 11)} 点格挡，水 +1。`, play: (g, u) => { g.block(v(u, 8, 11)); addEl(g, '水', 1); } },
  e_ignite: { ch: 'erin', name: '点火', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_e_ignite', tgt: 'self', desc: u => `火 +${v(u, 2, 3)}。`, play: (g, u) => addEl(g, '火', v(u, 2, 3)) },
  e_turn: { ch: 'erin', name: '换向', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_e_turn', tgt: 'self', desc: u => `把全部风变成火${v(u, '', '，再火 +1')}。`, play: (g, u) => { const k = elN(g, '风'); delete P(g).st.ewind; addEl(g, '火', k + (u ? 1 : 0)); } },
  e_attune: { ch: 'erin', name: '调和', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_attune', tgt: 'self', desc: u => `火、水、风各 +1，抽 ${v(u, 1, 2)} 张牌。`, play: (g, u) => { for (const k of EL) addEl(g, k, 1); g.draw(v(u, 1, 2)); } },
  e_chant: { ch: 'erin', name: '防御咏唱', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_chant', tgt: 'one', desc: u => `获得 ${v(u, 5, 8)} 点格挡，然后祈唤。`, play: (g, u, t) => { g.block(v(u, 5, 8)); invoke(g, t); } },
  e_twin: { ch: 'erin', name: '双轨射线', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_e_twin', tgt: 'one', desc: u => `造成 ${v(u, 4, 6)} 点伤害 2 次；每段再加风的层数（不消耗风）。`, play: (g, u, t) => g.attack(t, v(u, 4, 6) + elN(g, '风'), 2) },
  e_pure: { ch: 'erin', name: '纯相爆发', type: 'atk', rar: 'u', cost: [2, 2], icon: 'icons2/n_e_pure', tgt: 'one', desc: u => `祈唤，这次火的伤害翻倍。${v(u, '', '先让火 +2。')}`, play: (g, u, t) => { if (u) addEl(g, '火', 2); invoke(g, t, { fireX: 2 }); } },
  e_refill: { ch: 'erin', name: '回填', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_e_refill', tgt: 'self', desc: u => `层数最多的那种元素 +${v(u, 2, 3)}，抽 1 张牌。`, play: (g, u) => { const k = EL.reduce((m, x) => elN(g, x) > elN(g, m) ? x : m, '火'); addEl(g, k, v(u, 2, 3)); g.draw(1); } },
  e_impro: { ch: 'erin', name: '临场变式', type: 'skill', rar: 'u', cost: [0, 0], icon: 'icons2/n_e_impro', tgt: 'self', desc: u => `把全部水变成火。${v(u, '', '抽 1 张牌。')}`, play: (g, u) => { const k = elN(g, '水'); delete P(g).st.ewater; addEl(g, '火', k); if (u) g.draw(1); } },
  e_split: { ch: 'erin', name: '分流', type: 'skill', rar: 'u', cost: [0, 0], icon: 'icons2/n_e_split', tgt: 'self', desc: u => `花掉 2 层风，得到 1 点能量，抽 ${v(u, 1, 2)} 张牌。`, play: (g, u) => { if (elN(g, '风') >= 2) { useEl(g, '风', 2); g.energy(1); g.draw(v(u, 1, 2)); } } },
  e_notes: { ch: 'erin', name: '元素笔记', type: 'power', rar: 'u', cost: [1, 0], icon: 'icons2/n_e_notes', tgt: 'self', desc: u => `每回合开始时，层数最少的那种元素 +1。`, play: g => { P(g).st.enotes = 1; } },
  e_rewrite: { ch: 'erin', name: '复写仪式', type: 'skill', rar: 'r', cost: [2, 1], icon: 'icons2/n_e_rewrite', tgt: 'one', exhaust: 1, desc: u => `祈唤，然后恢复祈唤前的全部元素。消耗。`, play: (g, u, t) => { const p = P(g), s = [p.st.efire, p.st.ewater, p.st.ewind]; invoke(g, t); [p.st.efire, p.st.ewater, p.st.ewind] = s; for (const k of ['efire', 'ewater', 'ewind']) if (!p.st[k]) delete p.st[k]; } },
  e_crown: { ch: 'erin', name: '三相冠冕', type: 'power', rar: 'r', cost: [2, 1], icon: 'icons2/n_e_crown', tgt: 'self', desc: u => `每回合开始时，火、水、风各 +1。`, play: g => { P(g).st.ecrown = 1; } },
  e_seasons: { ch: 'erin', name: '四季轮转', type: 'power', rar: 'r', cost: [1, 1], icon: 'icons2/n_e_seasons', tgt: 'self', desc: u => `每回合第一次祈唤后，得到 1 点能量，抽 ${v(u, 1, 2)} 张牌。`, play: (g, u) => { P(g).st.eseason = v(u, 1, 2); } },
};

/* ======================= 顾清寒 · 飞剑 =======================
   飞剑最多 6 把。留在身上：每把让攻击牌第一击 +2，回合结束每把给 1 点格挡。射出去：每把单独造成伤害（一般 4 点），射完就离开身上。
   两种打法：养剑——飞剑留着吃加成和格挡；射剑——攒够了一口气射出去，再用回剑牌补回来。 */
const sw = g => P(g).st.sword || 0;
function addSword(g, n) { const p = P(g), a = sw(g), b = Math.min(6, a + n); if (b > a) p.st.sword = b; return a + n - b; }
const live = (g, t) => (t && !t.dead ? t : g.alive()[0]);
function afterShoot(g, k) { const p = P(g); if (!k) return;
  if (p.st.grev) { const n = Math.min(k, 3 - (p.grevT || 0)); if (n > 0) { p.grevT = (p.grevT || 0) + n; g.draw(n); } if (!sw(g)) addSword(g, 2); }
  if (p.st.dualst && !p.dualT) { p.dualT = 1; g.energy(1); }
  if (g.has('jade') && !p.jadeU) { p.jadeU = 1; addSword(g, 2); } }
function swordHits(g, t, k, dmg, mode) { const p = P(g), fh = p.fh; p.fh = 0;
  for (let i = 0; i < k; i++) { const a = g.alive(); if (!a.length) break;
    if (mode === 'fall') a.forEach((e, j) => g.attack(e, j === 0 ? dmg : j === 1 ? Math.round(dmg * 2 / 3) : Math.round(dmg / 2)));
    else g.attack(t && !t.dead ? t : a[0], dmg); }
  p.fh = fh; }
/* 射出 k 把（'all' = 全部）；后发制人那回合先悬空，下回合落下 ×2.5 */
function fire(g, t, k, dmg, mode = 'one') { const p = P(g); k = k === 'all' ? sw(g) : Math.min(k, sw(g)); if (!k) return 0;
  p.st.sword -= k; if (!p.st.sword) delete p.st.sword;
  if (p.hangT) { (p.hang = p.hang || []).push({ k, dmg: Math.round(dmg * 2.5), mode }); g.block(3 * k, true); }
  else swordHits(g, t, k, dmg, mode);
  afterShoot(g, k); return k; }
const GU = {
  g_sheath: { ch: 'gu', name: '收剑式', type: 'atk', rar: 'start', cost: [1, 1], icon: 'icons2/n_g_sheath', tgt: 'one', desc: u => `造成 ${v(u, 6, 9)} 点伤害，得到 1 把飞剑。`, play: (g, u, t) => { g.attack(t, v(u, 6, 9)); addSword(g, 1); } },
  g_breath: { ch: 'gu', name: '御剑', type: 'skill', rar: 'start', cost: [1, 1], icon: 'icons2/n_g_breath', tgt: 'self', desc: u => `获得 ${v(u, 5, 8)} 点格挡，得到 1 把飞剑。`, play: (g, u) => { g.block(v(u, 5, 8)); addSword(g, 1); } },
  g_shift: { ch: 'gu', name: '试剑', type: 'skill', rar: 'start', cost: [0, 0], icon: 'icons2/n_g_shift', tgt: 'one', desc: u => `射出 1 把飞剑，抽 ${v(u, 1, 2)} 张牌。`, play: (g, u, t) => { fire(g, t, 1, 4); g.draw(v(u, 1, 2)); } },
  g_return: { ch: 'gu', name: '归鞘', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_g_return', tgt: 'self', desc: u => `得到 ${v(u, 2, 3)} 把飞剑。`, play: (g, u) => addSword(g, v(u, 2, 3)) },
  g_finger: { ch: 'gu', name: '指剑', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_g_finger', tgt: 'one', desc: u => `造成 ${v(u, 6, 9)} 点伤害，再射出 1 把飞剑。`, play: (g, u, t) => { g.attack(t, v(u, 6, 9)); fire(g, t, 1, 4); } },
  g_pine: { ch: 'gu', name: '风过松', type: 'atk', rar: 'c', cost: [0, 0], icon: 'icons2/n_g_pine', tgt: 'one', desc: u => `造成 ${v(u, 3, 4)} 点伤害 2 次。`, play: (g, u, t) => g.attack(t, v(u, 3, 4), 2) },
  g_cliff: { ch: 'gu', name: '断崖', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_g_cliff', tgt: 'one', desc: u => `造成 ${v(u, 9, 12)} 点伤害；飞剑不少于 3 把时给予 ${v(u, 1, 2)} 层易伤。`, play: (g, u, t) => { g.attack(t, v(u, 9, 12)); if (sw(g) >= 3) g.apply(live(g, t), 'vuln', v(u, 1, 2)); } },
  g_guard: { ch: 'gu', name: '剑幕', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_g_guard', tgt: 'self', desc: u => `获得 ${v(u, 6, 8)} 点格挡，每有 1 把飞剑再 +1。`, play: (g, u) => g.block(v(u, 6, 8) + sw(g)) },
  g_burn: { ch: 'gu', name: '以血饲剑', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_g_burn', tgt: 'self', desc: u => `失去 2 点生命，得到 ${v(u, 2, 3)} 把飞剑。`, play: (g, u) => { g.loseHp(2); addSword(g, v(u, 2, 3)); } },
  g_palm: { ch: 'gu', name: '剑柄击', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_g_palm', tgt: 'one', desc: u => `造成 ${v(u, 7, 10)} 点伤害，给予 ${v(u, 1, 2)} 层虚弱。`, play: (g, u, t) => { g.attack(t, v(u, 7, 10)); g.apply(live(g, t), 'weak', v(u, 1, 2)); } },
  g_qi: { ch: 'gu', name: '唤剑', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_g_qi', tgt: 'self', desc: u => `抽 ${v(u, 2, 3)} 张牌；飞剑不多于 2 把时，再得到 2 把。`, play: (g, u) => { g.draw(v(u, 2, 3)); if (sw(g) <= 2) addSword(g, 2); } },
  g_three: { ch: 'gu', name: '并指三剑', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_g_three', tgt: 'self', desc: u => `得到 ${v(u, 3, 4)} 把飞剑；超出上限的每把改为 3 点格挡。`, play: (g, u) => { const o = addSword(g, v(u, 3, 4)); if (o > 0) g.block(3 * o, true); } },
  g_rain: { ch: 'gu', name: '破釜沉舟', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_g_rain', tgt: 'all', desc: u => `射出全部飞剑：每把对第 1 个敌人造成 ${v(u, 6, 8)} 点伤害，第 2 个 ${v(u, 4, 5)} 点，其余各 ${v(u, 3, 4)} 点。`, play: (g, u) => fire(g, null, 'all', v(u, 6, 8), 'fall') },
  g_horse: { ch: 'gu', name: '回旋剑', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_g_horse', tgt: 'one', desc: u => `射出 2 把飞剑（每把 ${v(u, 4, 6)} 点伤害），回合结束时这 2 把飞回身上。`, play: (g, u, t) => { const k = fire(g, t, 2, v(u, 4, 6)); P(g).boomer = (P(g).boomer || 0) + k; } },
  g_snow: { ch: 'gu', name: '雪径连斩', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_g_snow', tgt: 'one', desc: u => `造成 ${v(u, 3, 4)} 点伤害，次数等于飞剑数（至少 1 次，不消耗飞剑）。`, play: (g, u, t) => g.attack(t, v(u, 3, 4), Math.max(1, sw(g))) },
  g_quake: { ch: 'gu', name: '横扫千军', type: 'atk', rar: 'u', cost: [2, 2], icon: 'icons2/n_g_quake', tgt: 'one', desc: u => `造成 ${v(u, 5, 7)} 点伤害 3 次，每一下都吃飞剑加成；下回合少 1 点能量。`, play: (g, u, t) => { const p = P(g); for (let i = 0; i < 3; i++) { p.fh = 1; g.attack(live(g, t), v(u, 5, 7)); } p.fh = 0; p.restE = 1; } },
  g_flow: { ch: 'gu', name: '剑气护体', type: 'power', rar: 'u', cost: [1, 0], icon: 'icons2/n_g_flow', tgt: 'self', desc: u => `回合结束时每把飞剑的格挡从 1 点变成 2 点。`, play: g => { P(g).st.gflow = 1; } },
  g_myriad: { ch: 'gu', name: '万剑归一', type: 'atk', rar: 'r', cost: [2, 2], icon: 'icons2/n_g_myriad', tgt: 'one', desc: u => `射出全部飞剑，每把造成 ${v(u, 9, 12)} 点伤害。`, play: (g, u, t) => fire(g, t, 'all', v(u, 9, 12)) },
  g_rev: { ch: 'gu', name: '剑意循环', type: 'power', rar: 'r', cost: [2, 1], icon: 'icons2/n_g_rev', tgt: 'self', desc: u => `每射出 1 把飞剑抽 1 张牌（每回合最多 3 张）；飞剑归零时再得到 2 把。`, play: g => { P(g).st.grev = 1; } },
  g_dual: { ch: 'gu', name: '剑意', type: 'power', rar: 'u', cost: [2, 1], icon: 'icons2/n_g_dual', tgt: 'self', desc: u => `每回合第一次射出飞剑后，得到 1 点能量。`, play: g => { P(g).st.dualst = 1; } },
};

/* ======================= 希尔薇 · 龙血 / 霜龙形态 =======================
   龙血最多 8 点。攒满 8 点后点「变身」：霜龙形态持续本回合和接下来两个回合（每场最多 2 次），变身时花光龙血。
   霜龙形态：变身时对所有敌人造成 10 点伤害；攻击牌的第一击 +6；每个敌方回合第一段打穿格挡的伤害 -4。退形后虚弱 1。
   每张牌都有人形和【龙】形两种效果：龙形下攻击更强、格挡更弱，得到龙血改为对所有敌人每点 2 伤害。
   两种打法：变身——攒满就变，三回合打爆发；人形——花龙血换格挡和霜灼。 */
const dr = g => !!P(g).st.dragon;
const db = g => P(g).st.dblood || 0;
function gainDB(g, n) { const p = P(g); if (n > 0 && dr(g)) { const fh = p.fh; p.fh = 0; g.attackAll(2 * n); p.fh = fh; return; } const b = Math.max(0, Math.min(8, db(g) + n)); if (b) p.st.dblood = b; else delete p.st.dblood; }
function spendDB(g, n) { if (db(g) < n) return false; gainDB(g, -n); if (P(g).st.aval) g.block(n, true); return true; }
function spendUpTo(g, n) { const k = Math.min(n, db(g)); if (k) spendDB(g, k); return k; }
const SYL = {
  s_lance: { ch: 'sylvie', name: '霜枪', type: 'atk', rar: 'start', cost: [1, 1], icon: 'icons2/n_s_lance', tgt: 'one', desc: u => `造成 ${v(u, 7, 10)} 点伤害，得到 2 点龙血。【龙】造成 ${v(u, 7, 10)}，全体 4。`, play: (g, u, t) => { g.attack(t, v(u, 7, 10)); gainDB(g, 2); } },
  s_scale: { ch: 'sylvie', name: '鳞守', type: 'skill', rar: 'start', cost: [1, 1], icon: 'icons2/n_s_scale', tgt: 'self', desc: u => `获得 ${v(u, 5, 8)} 点格挡，得到 1 点龙血。【龙】${v(u, 3, 5)} 格挡，全体 2。`, play: (g, u) => { g.block(dr(g) ? v(u, 3, 5) : v(u, 5, 8)); gainDB(g, 1); } },
  s_pulse: { ch: 'sylvie', name: '龙脉吐纳', type: 'skill', rar: 'start', cost: [1, 1], icon: 'icons2/n_s_pulse', tgt: 'self', desc: u => `得到 3 点龙血，获得 ${v(u, 3, 5)} 点格挡。【龙】全体 6，${v(u, 3, 5)} 格挡。`, play: (g, u) => { gainDB(g, 3); g.block(v(u, 3, 5)); } },
  s_crack: { ch: 'sylvie', name: '裂冰', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_s_crack', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害。【龙】造成 ${v(u, 12, 15)}，给予 2 层霜灼。`, play: (g, u, t) => { if (dr(g)) { g.attack(t, v(u, 12, 15)); fburn(g, live(g, t), 2); } else g.attack(t, v(u, 8, 11)); } },
  s_rev: { ch: 'sylvie', name: '逆鳞刺', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_s_rev', tgt: 'one', desc: u => `造成 ${v(u, 5, 7)} 点伤害；花掉最多 3 点龙血，每点给目标 3 层霜灼。【龙】造成 ${v(u, 11, 14)}。`, play: (g, u, t) => { if (dr(g)) { g.attack(t, v(u, 11, 14)); return; } g.attack(t, v(u, 5, 7)); const k = spendUpTo(g, 3); if (k) fburn(g, live(g, t), 3 * k); } },
  s_sweep: { ch: 'sylvie', name: '横扫冰原', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_s_sweep', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 6, 8)} 点伤害，得到 1 点龙血。【龙】全体 ${v(u, 6, 8)} + 2。`, play: (g, u) => { g.attackAll(v(u, 6, 8)); gainDB(g, 1); } },
  s_frost: { ch: 'sylvie', name: '结霜', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_s_frost', tgt: 'self', desc: u => `获得 ${v(u, 7, 10)} 点格挡，得到 1 点龙血。【龙】${v(u, 4, 6)} 格挡，全体 2。`, play: (g, u) => { g.block(dr(g) ? v(u, 4, 6) : v(u, 7, 10)); gainDB(g, 1); } },
  s_borrow: { ch: 'sylvie', name: '借寒', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_s_borrow', tgt: 'self', desc: u => `失去 2 点生命，得到 ${v(u, 3, 4)} 点龙血。【龙】失去 2 点生命，全体 ${v(u, 6, 8)}。`, play: (g, u) => { g.loseHp(2); gainDB(g, v(u, 3, 4)); } },
  s_breath: { ch: 'sylvie', name: '凝息', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_s_breath', tgt: 'self', desc: u => `获得 ${v(u, 8, 11)} 点格挡。【龙】${v(u, 5, 8)} 格挡，抽 1 张牌。`, play: (g, u) => { if (dr(g)) { g.block(v(u, 5, 8)); g.draw(1); } else g.block(v(u, 8, 11)); } },
  s_sneak: { ch: 'sylvie', name: '冰下潜行', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_s_sneak', tgt: 'one', desc: u => `获得 ${v(u, 6, 9)} 点格挡，给予 ${v(u, 1, 2)} 层虚弱。【龙】${v(u, 3, 5)} 格挡，冰冻目标。`, play: (g, u, t) => { if (dr(g)) { g.block(v(u, 3, 5)); hardCC(g, t, 'frozen'); } else { g.block(v(u, 6, 9)); g.apply(t, 'weak', v(u, 1, 2)); } } },
  s_shatter: { ch: 'sylvie', name: '晶碎', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_s_shatter', tgt: 'one', desc: u => `造成 ${v(u, 8, 10)} 点伤害；花 2 点龙血再 +8。【龙】造成 ${v(u, 14, 17)}。`, play: (g, u, t) => { if (dr(g)) { g.attack(t, v(u, 14, 17)); return; } g.attack(t, v(u, 8, 10) + (spendDB(g, 2) ? 8 : 0)); } },
  s_claw: { ch: 'sylvie', name: '龙爪二式', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_s_claw', tgt: 'one', desc: u => `造成 ${v(u, 5, 7)} 点伤害 2 次。【龙】打 3 次。`, play: (g, u, t) => g.attack(t, v(u, 5, 7), dr(g) ? 3 : 2) },
  s_echo: { ch: 'sylvie', name: '血脉回响', type: 'skill', rar: 'u', cost: [1, 0], icon: 'icons2/n_s_echo', tgt: 'self', exhaust: 1, desc: u => `龙血翻倍（最多 8 点）。【龙】霜龙多持续 1 回合。消耗。`, play: g => { const p = P(g); if (dr(g)) p.st.dragon++; else gainDB(g, db(g)); } },
  s_coffin: { ch: 'sylvie', name: '冰棺', type: 'skill', rar: 'u', cost: [2, 2], icon: 'icons2/n_s_coffin', tgt: 'self', desc: u => `获得 ${v(u, 15, 19)} 点格挡；龙血不少于 5 点时再 +5。【龙】${v(u, 10, 13)} 格挡。`, play: (g, u) => g.block(dr(g) ? v(u, 10, 13) : v(u, 15, 19) + (db(g) >= 5 ? 5 : 0)) },
  s_gather: { ch: 'sylvie', name: '收鳞', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_s_gather', tgt: 'self', desc: u => `花掉最多 4 点龙血，每点获得 ${v(u, 4, 5)} 点格挡。【龙】${v(u, 4, 5)} 格挡。`, play: (g, u) => { if (dr(g)) { g.block(v(u, 4, 5)); return; } const k = spendUpTo(g, 4); g.block(Math.max(1, k) * v(u, 4, 5)); } },
  s_roar: { ch: 'sylvie', name: '龙吼', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_s_roar', tgt: 'all', desc: u => `给予所有敌人 ${v(u, 1, 2)} 层虚弱。【龙】威吓所有敌人，并给予 1 层易伤。`, play: (g, u) => { if (dr(g)) { g.applyAll('awe', 1); g.applyAll('vuln', 1); } else g.applyAll('weak', v(u, 1, 2)); } },
  s_spine: { ch: 'sylvie', name: '冰晶脊', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_s_spine', tgt: 'self', desc: u => `每回合开始得到 1 点龙血${v(u, '', '，获得 2 点格挡')}。`, play: (g, u) => { P(g).st.dbgen = u ? 2 : 1; } },
  s_night: { ch: 'sylvie', name: '极夜龙息', type: 'atk', rar: 'r', cost: [2, 2], icon: 'icons2/n_s_night', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 13, 17)} 点伤害。【龙】全体 ${v(u, 21, 26)}，并给予 2 层霜灼。`, play: (g, u) => { if (dr(g)) { g.attackAll(v(u, 21, 26)); g.alive().forEach(e => fburn(g, e, 2)); } else g.attackAll(v(u, 13, 17)); } },
  s_aval: { ch: 'sylvie', name: '雪崩之心', type: 'power', rar: 'r', cost: [2, 1], icon: 'icons2/n_s_aval', tgt: 'self', desc: u => `每花掉 1 点龙血，获得 1 点格挡；变身时获得 8 点格挡。`, play: g => { P(g).st.aval = 1; } },
  s_wake: { ch: 'sylvie', name: '冬眠苏醒', type: 'power', rar: 'r', cost: [1, 1], icon: 'icons2/n_s_wake', tgt: 'self', desc: u => `退出霜龙形态时，得到 4 点龙血，抽 2 张牌${v(u, '', '，得到 1 点能量')}。`, play: (g, u) => { P(g).st.wake = u ? 2 : 1; } },
};

/* ======================= 米娅 · 云猫团子 =======================
   团子在第一章是 2 级（生命 21、攻击 9），第二章 3 级（生命 26、攻击 11），每场满血入场，倒地后这场不再回来。
   每回合有一个免费指令（默认护卫，每回合能改一次）：
   护卫：替米娅挡下一次敌人直接攻击的前 8 点（受团子剩余生命限制，团子自己只受一半）；扑击：回合结束攻击目标。
   两种打法：护卫——加强团子挡刀和回血；扑击——加强团子出手和追打扑击目标。 */
function catDid(g, k) { const p = P(g), c = p.cat; if (c.did[k]) return; c.did[k] = 1; if (p.st.mjump) g.block(p.st.mjump, true); if (Object.keys(c.did).length >= 2 && g.has('lynx') && !p.lynxU) { p.lynxU = 1; p.lynxD = 1; } }
const CATLV = [null, { max: 16, atk: 7 }, { max: 21, atk: 9 }, { max: 26, atk: 11 }];
const cat = g => P(g).cat;
const catGuarded = g => { const c = cat(g); return !!(c && !c.down && (c.took || 0) > 0); }; /* 上一轮护卫时真的挡下过伤害 */
const catUp = g => cat(g) && !cat(g).down;
const healCat = (g, n) => { const c = cat(g); if (!c || c.down) return 0; const k = Math.min(n, c.max - c.hp); c.hp += k; return k; };
const isPT = (g, t) => t && catUp(g) && cat(g).cmd === 'pounce' && cat(g).pt === t.id;
const MIA = {
  m_staff: { ch: 'mia', name: '猫杖点射', type: 'atk', rar: 'start', cost: [1, 1], icon: 'icons2/n_m_staff', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害。团子在扑击时，扑击目标改成这个敌人。`, play: (g, u, t) => { g.attack(t, v(u, 8, 11)); const c = cat(g); if (c && c.cmd === 'pounce' && t) c.pt = t.id; } },
  m_side: { ch: 'mia', name: '并肩防守', type: 'skill', rar: 'start', cost: [1, 1], icon: 'icons2/n_m_side', tgt: 'self', desc: u => `获得 ${v(u, 7, 9)} 点格挡。团子在护卫时，本轮能多挡 ${v(u, 3, 4)} 点。`, play: (g, u) => { g.block(v(u, 7, 9)); if (cat(g)) cat(g).gB = (cat(g).gB || 0) + v(u, 3, 4); } },
  m_snack: { ch: 'mia', name: '递零食', type: 'skill', rar: 'start', cost: [1, 1], icon: 'icons2/n_m_snack', tgt: 'self', desc: u => `团子回复 ${v(u, 4, 5)} 生命，米娅获得 ${v(u, 5, 7)} 点格挡。`, play: (g, u) => { healCat(g, v(u, 4, 5)); g.block(v(u, 5, 7)); } },
  m_flank: { ch: 'mia', name: '绕背', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_m_flank', tgt: 'one', desc: u => `造成 ${v(u, 7, 9)} 点伤害；目标是团子的扑击目标时再 +${v(u, 4, 5)}。`, play: (g, u, t) => g.attack(t, v(u, 7, 9) + (isPT(g, t) ? v(u, 4, 5) : 0)) },
  m_bell: { ch: 'mia', name: '铃铛波', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_m_bell', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 5, 7)} 点伤害；上一轮团子护卫挡下过伤害时，再 +${v(u, 2, 3)}。`, play: (g, u) => g.attackAll(v(u, 5, 7) + (catGuarded(g) ? v(u, 2, 3) : 0)) },
  m_rope: { ch: 'mia', name: '弹跳绳', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_m_rope', tgt: 'self', desc: u => `获得 ${v(u, 7, 10)} 点格挡。本回合可以再改一次团子的指令。`, play: (g, u) => { g.block(v(u, 7, 10)); if (cat(g)) cat(g).set = 0; } },
  m_scarf: { ch: 'mia', name: '双层围巾', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_m_scarf', tgt: 'self', desc: u => `获得 ${v(u, 7, 9)} 点格挡。团子护卫时，它自己受到的伤害 -${v(u, 2, 3)}。`, play: (g, u) => { g.block(v(u, 7, 9)); if (cat(g)) cat(g).sR = v(u, 2, 3); } },
  m_whistle: { ch: 'mia', name: '追踪哨', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_m_whistle', tgt: 'self', exhaust: 1, desc: u => `本回合团子扑击 +${v(u, 3, 5)} 点伤害，抽 1 张牌。消耗。`, play: (g, u) => { if (cat(g)) cat(g).pB = (cat(g).pB || 0) + v(u, 3, 5); g.draw(1); } },
  m_nest: { ch: 'mia', name: '暖窝', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_m_nest', tgt: 'self', desc: u => `获得 ${v(u, 8, 11)} 点格挡，团子回复 ${v(u, 4, 6)} 生命。`, play: (g, u) => { g.block(v(u, 8, 11)); healCat(g, v(u, 4, 6)); } },
  m_duck: { ch: 'mia', name: '一起蹲下', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_m_duck', tgt: 'self', desc: u => `获得 ${v(u, 9, 11)} 点格挡。团子还在场时抽 1 张牌。`, play: (g, u) => { g.block(v(u, 9, 11)); if (catUp(g)) g.draw(1); } },
  m_pat: { ch: 'mia', name: '拍拍背', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_m_pat', tgt: 'self', exhaust: 1, desc: u => `团子回复 ${v(u, 3, 4)} 生命，米娅获得 ${v(u, 3, 5)} 点格挡。消耗。`, play: (g, u) => { healCat(g, v(u, 3, 4)); g.block(v(u, 3, 5)); } },
  m_pincer: { ch: 'mia', name: '夹击', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_pincer', tgt: 'one', desc: u => `造成 ${v(u, 9, 12)} 点伤害；目标是团子的扑击目标时给予 1 层易伤。`, play: (g, u, t) => { if (isPT(g, t)) g.apply(t, 'vuln', 1); g.attack(t, v(u, 9, 12)); } },
  m_revenge: { ch: 'mia', name: '护主反扑', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_revenge', tgt: 'one', desc: u => `造成 ${v(u, 8, 10)} 点伤害，再加上上一轮团子替你挡下的伤害（最多 +${v(u, 8, 10)}）。`, play: (g, u, t) => g.attack(t, v(u, 8, 10) + Math.min(v(u, 8, 10), (cat(g) && cat(g).took) || 0)) },
  m_swap: { ch: 'mia', name: '交换站位', type: 'skill', rar: 'u', cost: [0, 0], icon: 'icons2/n_m_swap', tgt: 'self', exhaust: 1, desc: u => `把团子的指令改成护卫，米娅获得 ${v(u, 6, 9)} 点格挡。消耗。`, play: (g, u) => { const c = cat(g); if (c && !c.down) { c.cmd = 'guard'; c.did = c.did || {}; } g.block(v(u, 6, 9)); } },
  m_mint: { ch: 'mia', name: '猫薄荷团', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_mint', tgt: 'self', desc: u => `团子回复 ${v(u, 5, 7)} 生命；实际回复不少于 3 点时，得到 1 点能量。`, play: (g, u) => { if (healCat(g, v(u, 5, 7)) >= 3) g.energy(1); } },
  m_jump: { ch: 'mia', name: '练习跳台', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_jump', tgt: 'self', desc: u => `每场战斗每种指令第一次执行时，米娅获得 ${v(u, 4, 6)} 点格挡。`, play: (g, u) => { P(g).st.mjump = v(u, 4, 6); } },
  m_cloud: { ch: 'mia', name: '云步', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_cloud', tgt: 'self', desc: u => `获得 ${v(u, 10, 13)} 点格挡。团子倒地时再获得 5 点格挡并抽 1 张牌。`, play: (g, u) => { g.block(v(u, 10, 13)); if (cat(g) && cat(g).down) { g.block(5); g.draw(1); } } },
  m_bigpounce: { ch: 'mia', name: '大猫扑杀', type: 'skill', rar: 'r', cost: [2, 2], icon: 'icons2/n_m_bigpounce', tgt: 'self', exhaust: 1, desc: u => `本回合团子的指令是扑击时，扑击改为造成 ${v(u, 14, 17)} 点伤害 2 次（追踪哨的加成每次都算）。消耗。`, play: (g, u) => { if (cat(g)) cat(g).big = v(u, 14, 17); } },
  m_hold: { ch: 'mia', name: '绝不松手', type: 'skill', rar: 'r', cost: [1, 1], icon: 'icons2/n_m_hold', tgt: 'self', exhaust: 1, desc: u => `获得 ${v(u, 10, 13)} 点格挡。团子倒地时，让它带着 ${v(u, 6, 9)} 生命回到场上。消耗。`, play: (g, u) => { g.block(v(u, 10, 13)); const c = cat(g); if (c && c.down) { c.down = 0; c.hp = Math.min(c.max, v(u, 6, 9)); c.cmd = 'guard'; c.set = 0; c.big = 0; c.pB = 0; } } },
  m_gate: { ch: 'mia', name: '云猫守门', type: 'power', rar: 'r', cost: [2, 1], icon: 'icons2/n_m_gate', tgt: 'self', desc: () => `团子护卫时多挡 3 点；团子护卫真的受了伤，下回合米娅抽 1 张牌。`, play: g => { P(g).st.mgate = 1; } },
  m_sac: { ch: 'mia', can: g => catUp(g), name: '献祭', type: 'atk', rar: 'r', cost: [2, 2], icon: 'icons2/n_m_sac', tgt: 'all', exhaust: 1, desc: u => `团子失去 ${v(u, 5, 3)} 生命（最多降到 1，不会倒地），对所有敌人造成团子攻击 ×2 的伤害。消耗。`, play: (g, u) => { const c = cat(g); if (!c || c.down) return; c.hp = Math.max(1, c.hp - v(u, 5, 3)); g.attackAll(c.atk * 2); } },
};

/* ======================= 绯月 · 鲜血 / 吸血 =======================
   献血 N：失去 N 生命，得到 N 鲜血（最多 12；生命不够时不献）。出牌「花掉」鲜血换效果。
   吸血 N：按这一击实际打掉的生命回复，最多 N；每场战斗吸血合计最多 30。吸血真的回到血时，还得到 1 点鲜血。
   两种打法：吸血——低血量靠攻击回本；放血——献血攒鲜血，再一口气花掉打爆发或叠格挡。 */
const vb = g => P(g).st.vblood || 0;
function addB(g, n) { const p = P(g), b = Math.max(0, Math.min(12, vb(g) + n)); if (b) p.st.vblood = b; else delete p.st.vblood; }
function donate(g, n) { const R = g.R; if (R.hp <= n) return false; g.loseHp(n); addB(g, n); const p = P(g); p.donT = 1; if (p.st.vpulse && !p.vpT) { p.vpT = 1; g.block(p.st.vpulse, true); } return true; }
function spendB(g, n) { const p = P(g); if (vb(g) < n) return false; addB(g, -n); if (n >= 4 && p.st.vdawn && !p.vdT) { p.vdT = 1; g.energy(1); g.block(p.st.vdawn, true); } if (n >= 4 && g.has('cup') && !p.cupU) { p.cupU = 1; g.draw(2); } return true; }
function leech(g, dealt, n) { const p = P(g); let k = Math.min(dealt, n, 30 - (p.ls || 0)); if (k <= 0) return; const pin = g.has('redpin') && !p.pinU; if (pin) k = Math.min(k + 2, 30 - (p.ls || 0)); const got = g.heal(k) || 0; if (got <= 0) return; if (pin) p.pinU = 1; p.ls = (p.ls || 0) + got; p.lsT = 1; /* 满血时回不到血，不扣额度也不触发 */ addB(g, 1); if (p.st.vhunger) g.block(p.st.vhunger, true); if (p.st.vowb && !p.vowT) { p.vowT = 1; addB(g, 1); g.draw(1); } }
const FEI = {
  f_claw: { ch: 'feiyue', name: '红爪', type: 'atk', rar: 'start', cost: [1, 1], icon: 'icons2/n_f_claw', tgt: 'one', desc: u => `造成 ${v(u, 11, 14)} 点伤害，吸血 ${v(u, 3, 4)}。`, play: (g, u, t) => leech(g, g.attack(t, v(u, 11, 14)), v(u, 3, 4)) },
  f_sleeve: { ch: 'feiyue', name: '挽袖', type: 'skill', rar: 'start', cost: [1, 1], icon: 'icons2/n_f_sleeve', tgt: 'self', desc: u => `获得 ${v(u, 7, 10)} 点格挡，献血 2。`, play: (g, u) => { g.block(v(u, 7, 10)); donate(g, 2); } },
  f_bats: { ch: 'feiyue', name: '放蝠', type: 'skill', rar: 'start', cost: [1, 1], icon: 'icons2/n_f_bats', tgt: 'self', desc: u => `获得 ${v(u, 6, 9)} 点格挡，得到 1 点鲜血。`, play: (g, u) => { g.block(v(u, 6, 9)); addB(g, 1); } },
  f_line: { ch: 'feiyue', name: '血线', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_f_line', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害；鲜血不少于 2 时，花掉 2 点再造成 9 点伤害。`, play: (g, u, t) => { g.attack(t, v(u, 8, 11)); if (spendB(g, 2)) g.attack(live(g, t), 9); } },
  f_moon: { ch: 'feiyue', name: '血月飞刃', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_f_moon', tgt: 'all', desc: u => `献血 1，对所有敌人造成 ${v(u, 6, 8)} 点伤害。`, play: (g, u) => { donate(g, 1); g.attackAll(v(u, 6, 8)); } },
  f_gap: { ch: 'feiyue', name: '寻隙', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_f_gap', tgt: 'one', desc: u => `造成 ${v(u, 7, 10)} 点伤害；打穿了目标的格挡时，获得 5 点格挡并得到 1 点鲜血。`, play: (g, u, t) => { const b = t && t.block; g.attack(t, v(u, 7, 10)); if (b && t && !t.block) { g.block(5); addB(g, 1); } } },
  f_drink: { ch: 'feiyue', name: '夜饮', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_f_drink', tgt: 'one', desc: u => `造成 ${v(u, 7, 10)} 点伤害，吸血 3。`, play: (g, u, t) => leech(g, g.attack(t, v(u, 7, 10)), 3) },
  f_gauze: { ch: 'feiyue', name: '纱布', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_f_gauze', tgt: 'self', desc: u => `获得 ${v(u, 8, 11)} 点格挡；鲜血不少于 2 时，花掉 2 点再获得 6 点格挡。`, play: (g, u) => { g.block(v(u, 8, 11)); if (spendB(g, 2)) g.block(6); } },
  f_shade: { ch: 'feiyue', name: '蝠影', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_f_shade', tgt: 'self', desc: u => `献血 3，抽 ${v(u, 1, 2)} 张牌。`, play: (g, u) => { donate(g, 3); g.draw(v(u, 1, 2)); } },
  f_snap: { ch: 'feiyue', name: '响指', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_f_snap', tgt: 'self', desc: u => `花掉 2 点鲜血，抽 ${v(u, 2, 3)} 张牌。`, play: (g, u) => { if (spendB(g, 2)) g.draw(v(u, 2, 3)); } },
  f_thirst: { ch: 'feiyue', name: '止渴', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_f_thirst', tgt: 'self', exhaust: 1, desc: u => `献血 2，抽 1 张牌。${v(u, '', '获得 4 点格挡。')}消耗。`, play: (g, u) => { donate(g, 2); g.draw(1); if (u) g.block(4); } },
  f_curtain: { ch: 'feiyue', name: '红幕', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_f_curtain', tgt: 'self', desc: u => `花掉最多 4 点鲜血，每点获得 3 点格挡；另获得 ${v(u, 4, 7)} 点格挡。`, play: (g, u) => { const k = Math.min(4, vb(g)); if (k) spendB(g, k); g.block(3 * k + v(u, 4, 7)); } },
  f_vein: { ch: 'feiyue', name: '破脉', type: 'atk', rar: 'u', cost: [2, 2], icon: 'icons2/n_f_vein', tgt: 'one', desc: u => `造成 ${v(u, 16, 20)} 点伤害；鲜血不少于 4 时，花掉 4 点再打 1 次。`, play: (g, u, t) => { g.attack(t, v(u, 16, 20)); if (spendB(g, 4)) g.attack(live(g, t), v(u, 16, 20)); } },
  f_wing: { ch: 'feiyue', name: '翼刃', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_f_wing', tgt: 'one', desc: u => `造成 ${v(u, 5, 7)} 点伤害 2 次，吸血 2。`, play: (g, u, t) => leech(g, g.attack(t, v(u, 5, 7), 2), 2) },
  f_repay: { ch: 'feiyue', name: '借血还血', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_f_repay', tgt: 'one', desc: u => `造成 ${v(u, 9, 12)} 点伤害；本回合献过血时，吸血 4。`, play: (g, u, t) => { const d = g.attack(t, v(u, 9, 12)); if (P(g).donT) leech(g, d, 4); } },
  f_fold: { ch: 'feiyue', name: '收翼', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_f_fold', tgt: 'self', desc: u => `花掉全部鲜血，每点获得 ${v(u, 3, 4)} 点格挡。`, play: (g, u) => { const k = vb(g); if (k) { spendB(g, k); g.block(k * v(u, 3, 4)); } } },
  f_pulse: { ch: 'feiyue', name: '夜行脉搏', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_f_pulse', tgt: 'self', desc: u => `每回合第一次献血后，获得 ${v(u, 5, 7)} 点格挡。`, play: (g, u) => { P(g).st.vpulse = v(u, 5, 7); } },
  f_vow: { ch: 'feiyue', name: '血色誓约', type: 'power', rar: 'r', cost: [2, 1], icon: 'icons2/n_f_vow', tgt: 'self', desc: u => `每回合第一次吸血成功后，得到 1 点鲜血，抽 1 张牌。`, play: g => { P(g).st.vowb = 1; } },
  f_swarm: { ch: 'feiyue', name: '万翼降临', type: 'atk', rar: 'r', cost: [2, 1], icon: 'icons2/n_f_swarm', tgt: 'all', exhaust: 1, desc: u => `花掉全部鲜血，每点对所有敌人造成 5 点伤害。消耗。`, play: (g, u) => { const k = vb(g); if (k) { spendB(g, k); g.attackAll(5 * k); } } },
  f_dawn: { ch: 'feiyue', name: '血尽天明', type: 'power', rar: 'r', cost: [1, 1], icon: 'icons2/n_f_dawn', tgt: 'self', desc: u => `每回合第一次一口气花掉至少 4 点鲜血时，得到 1 点能量，获得 ${v(u, 5, 8)} 点格挡。`, play: (g, u) => { P(g).st.vdawn = v(u, 5, 8); } },
};

/* ======================= 老角色扩充（每人 35 张，至少两套打法） =======================
   林拓：囤弹扫射 / 连射速攻（攻击牌连打）/ 护盾卸弹
   千早：结界防守 / 破界速攻（花结界换伤害）/ 神乐连舞（连打技能牌）
   苏音：共鸣爆音 / 切歌弃牌 / 群体扩散
   莉泽：剧毒 / 炼金瓶 / 火焰 */
const cmb = g => P(g).combo || 0, skN = g => P(g).skillN || 0, dN = g => P(g).discN || 0;
const kspend = (g, n) => { const p = P(g), k = Math.min(n, p.st.kek || 0); if (k) { p.st.kek -= k; if (!p.st.kek) delete p.st.kek; } return k; };
const potH = g => g.hand.filter(c => CARDS_[c.id] && CARDS_[c.id].potion);
let CARDS_ = {}; export const bindCards = C => { CARDS_ = C; };
const OLD = {
  // ---- 林拓 ----
  h_jab: { ch: 'hero', name: '点射', type: 'atk', rar: 'c', cost: [0, 0], icon: 'icons2/n_h_jab', tgt: 'one', desc: u => `造成 ${v(u, 3, 4)} 点伤害。${v(u, '', '得到 1 发光弹。')}`, play: (g, u, t) => { g.attack(t, v(u, 3, 4)); if (u) g.ammo(1); } },
  h_double: { ch: 'hero', name: '双连打', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_h_double', tgt: 'one', desc: u => `造成 ${v(u, 4, 4)} 点伤害 2 次。${v(u, '', '得到 1 发光弹。')}`, play: (g, u, t) => { g.attack(t, 4, 2); if (u) g.ammo(1); } },
  h_spray: { ch: 'hero', name: '乱射', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_h_spray', tgt: 'all', desc: u => `对随机敌人造成 3 点伤害 ${v(u, 3, 4)} 次。`, play: (g, u) => g.attackRandom(3, v(u, 3, 4)) },
  h_combo: { ch: 'hero', name: '连段射击', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_h_combo', tgt: 'one', desc: u => `造成 ${v(u, 5, 7)} 点伤害；本回合每打出过 1 张攻击牌，再 +2。`, play: (g, u, t) => g.attack(t, v(u, 5, 7) + 2 * cmb(g)) },
  h_quick: { ch: 'hero', name: '快枪手', type: 'power', rar: 'r', cost: [1, 1], icon: 'icons2/n_h_quick', tgt: 'self', desc: u => `每回合打出第 3 张攻击牌后，得到 1 点能量${v(u, '', '，抽 1 张牌')}。`, play: (g, u) => { P(g).st.quick = u ? 2 : 1; } },
  h_finish: { ch: 'hero', name: '终结一击', type: 'atk', rar: 'r', cost: [2, 2], icon: 'icons2/n_h_finish', tgt: 'one', desc: u => `造成 ${v(u, 8, 12)} 点伤害；本回合每打出过 1 张攻击牌，再 +3。`, play: (g, u, t) => g.attack(t, v(u, 8, 12) + 3 * cmb(g)) },
  h_field: { ch: 'hero', name: '力场', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_h_field', tgt: 'self', desc: u => `获得 ${v(u, 6, 9)} 点格挡；光弹不少于 3 发时再 +3。`, play: (g, u) => g.block(v(u, 6, 9) + ((P(g).st.ammo || 0) >= 3 ? 3 : 0)) },
  h_cover: { ch: 'hero', name: '掩护射击', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_h_cover', tgt: 'self', desc: u => `获得 ${v(u, 6, 9)} 点格挡。得到 1 发光弹。`, play: (g, u) => { g.block(v(u, 6, 9)); g.ammo(1); } },
  h_shell: { ch: 'hero', name: '金属外壳', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_h_shell', tgt: 'self', desc: u => `每回合结束时获得 ${v(u, 3, 4)} 点格挡。`, play: (g, u) => g.self('metal', v(u, 3, 4)) },
  h_mag: { ch: 'hero', name: '扩容弹匣', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_h_mag', tgt: 'self', desc: u => `得到 2 发光弹，获得 ${v(u, 4, 7)} 点格挡。`, play: (g, u) => { g.ammo(2); g.block(v(u, 4, 7)); } },
  h_overshot: { ch: 'hero', name: '过载射击', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_h_overshot', tgt: 'one', desc: u => `光弹不少于 3 发时，用掉 3 发造成 ${v(u, 18, 24)} 点伤害；否则造成 6 点。`, play: (g, u, t) => { const p = P(g); if ((p.st.ammo || 0) >= 3) { p.st.ammo -= 3; if (!p.st.ammo) delete p.st.ammo; g.attack(t, v(u, 18, 24)); } else g.attack(t, 6); } },
  h_save: { ch: 'hero', name: '存档读档', type: 'skill', rar: 'u', cost: [1, 0], icon: 'icons2/n_h_save', tgt: 'self', pick: 1, pickT: '选 1 张手牌弃掉', desc: () => `抽 3 张牌，再选 1 张手牌弃掉。`, play: (g, u, t, c, k) => { g.draw(3); g.discardPick(k); } },
  h_lag: { ch: 'hero', name: '卡顿', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_h_lag', tgt: 'one', desc: u => `给予 1 层虚弱${v(u, '', '和 1 层易伤')}。得到 1 发光弹。`, play: (g, u, t) => { g.apply(t, 'weak', 1); if (u) g.apply(t, 'vuln', 1); g.ammo(1); } },
  h_bonus: { ch: 'hero', name: '隐藏关卡', type: 'skill', rar: 'r', cost: [0, 0], icon: 'icons2/n_h_bonus', tgt: 'self', exhaust: 1, desc: u => `失去 3 点生命，得到 ${v(u, 2, 3)} 点能量，抽 1 张牌。消耗。`, play: (g, u) => { g.loseHp(3); g.energy(v(u, 2, 3)); g.draw(1); } },
  h_rain: { ch: 'hero', name: '弹雨', type: 'atk', rar: 'r', cost: [2, 2], icon: 'icons2/n_h_rain', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 6, 8)} 点伤害；本回合每打出过 1 张攻击牌，再打 1 次（最多 2 次）。`, play: (g, u) => g.attackAll(v(u, 6, 8), 1 + Math.min(2, cmb(g))) },
  // ---- 千早 ----
  k_breakarrow: { ch: 'miko', name: '破界一箭', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_k_breakarrow', tgt: 'one', desc: u => `造成 ${v(u, 7, 9)} 点伤害；花掉 1 层结界，再造成 ${v(u, 7, 9)} 点。`, play: (g, u, t) => { g.attack(t, v(u, 7, 9)); if (kspend(g, 1)) g.attack(t, v(u, 7, 9)); } },
  k_seal: { ch: 'miko', name: '封魔', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_k_seal', tgt: 'one', desc: u => `花掉最多 2 层结界，每层给予目标 1 层易伤和 1 层虚弱。${v(u, '', '获得 4 点格挡。')}`, play: (g, u, t) => { const k = kspend(g, 2); if (k) { g.apply(t, 'vuln', k); g.apply(t, 'weak', k); } if (u) g.block(4); } },
  k_volley: { ch: 'miko', name: '箭雨', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_k_volley', tgt: 'all', desc: u => `对随机敌人造成 ${v(u, 5, 6)} 点伤害 2 次；花掉最多 3 层结界，每层多射 1 次。`, play: (g, u) => g.attackRandom(v(u, 5, 6), 2 + kspend(g, 3)) },
  k_burst: { ch: 'miko', name: '结界爆裂', type: 'atk', rar: 'r', cost: [2, 2], icon: 'icons2/n_k_burst', tgt: 'all', exhaust: 1, desc: u => `花掉全部结界（最多 7 层），对所有敌人每层造成 ${v(u, 5, 6)} 点伤害。消耗。`, play: (g, u) => { const k = kspend(g, 7); if (k) g.attackAll(k * v(u, 5, 6)); } },
  k_bell: { ch: 'miko', name: '铃音', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_k_bell', tgt: 'self', desc: u => `获得 ${v(u, 3, 5)} 点格挡；本回合每打出过 1 张技能牌，再 +2。`, play: (g, u) => g.block(v(u, 3, 5) + 2 * skN(g)) },
  k_dance: { ch: 'miko', name: '神乐连舞', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_k_dance', tgt: 'one', desc: u => `造成 ${v(u, 5, 7)} 点伤害；本回合每打出过 1 张技能牌，再打 1 次（最多再 4 次）。`, play: (g, u, t) => g.attack(t, v(u, 5, 7), 1 + Math.min(4, skN(g))) },
  k_offer: { ch: 'miko', name: '献舞', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_k_offer', tgt: 'self', desc: u => `抽 2 张牌，获得 ${v(u, 3, 5)} 点格挡；这是本回合第 2 张或之后的技能牌时，结界 +1。`, play: (g, u) => { g.draw(2); g.block(v(u, 3, 5)); if (skN(g) >= 1) g.kek(1); } },
  k_heart: { ch: 'miko', name: '巫女之心', type: 'power', rar: 'r', cost: [1, 1], icon: 'icons2/n_k_heart', tgt: 'self', desc: u => `每回合打出第 3 张技能牌后，得到 1 点能量${v(u, '', '，抽 1 张牌')}。`, play: (g, u) => { P(g).st.mheart = u ? 2 : 1; } },
  k_charm: { ch: 'miko', name: '平安符', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_k_charm', tgt: 'self', desc: u => `获得 ${v(u, 5, 7)} 点格挡，结界 +1；结界不少于 5 层时抽 1 张牌。`, play: (g, u) => { g.block(v(u, 5, 7)); g.kek(1); if ((P(g).st.kek || 0) >= 5) g.draw(1); } },
  k_torii: { ch: 'miko', name: '鸟居', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_k_torii', tgt: 'self', desc: u => `每回合结束时，结界不少于 3 层就获得 ${v(u, 4, 6)} 点格挡。`, play: (g, u) => { P(g).st.torii = v(u, 4, 6); } },
  k_descend: { ch: 'miko', name: '神降', type: 'skill', rar: 'r', cost: [2, 2], icon: 'icons2/n_k_descend', tgt: 'self', exhaust: 1, desc: u => `结界 +${v(u, 3, 4)}，获得 12 点格挡。消耗。`, play: (g, u) => { g.kek(v(u, 3, 4)); g.block(12); } },
  // ---- 苏音 ----
  s_sample: { ch: 'heroine', name: '采样', type: 'skill', rar: 'c', cost: [1, 0], icon: 'icons2/n_s_sample', tgt: 'self', pick: 1, pickT: '选 1 张手牌弃掉', desc: () => `抽 2 张牌，再选 1 张手牌弃掉。`, play: (g, u, t, c, k) => { g.draw(2); g.discardPick(k); } },
  s_loop: { ch: 'heroine', name: '循环播放', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_s_loop', tgt: 'self', desc: u => `每回合第一次弃牌后，抽 ${v(u, 1, 2)} 张牌。`, play: (g, u) => { P(g).st.loop = v(u, 1, 2); } },
  s_feedback: { ch: 'heroine', name: '回授', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_s_feedback', tgt: 'one', desc: u => `造成 ${v(u, 7, 9)} 点伤害；本回合弃过牌时，再造成 ${v(u, 5, 7)} 点。`, play: (g, u, t) => { g.attack(t, v(u, 7, 9)); if (dN(g)) g.attack(t, v(u, 5, 7)); } },
  s_crowd: { ch: 'heroine', name: '大合唱', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_s_crowd', tgt: 'all', desc: u => `其他敌人各得到共鸣最多的敌人一半的共鸣${v(u, '', '，再各 +2')}；只有一个敌人时改为给它 ${v(u, 3, 4)} 层共鸣。`, play: (g, u) => { const a = g.alive(); if (!a.length) return; if (a.length === 1) { g.res(a[0], v(u, 3, 4)); return; } const top = a.reduce((m, e) => (e.st.res || 0) > (m.st.res || 0) ? e : m, a[0]); const h = Math.floor((top.st.res || 0) / 2); a.filter(e => e !== top).forEach(e => g.res(e, h + (u ? 2 : 0))); } },
  s_surround: { ch: 'heroine', name: '环绕声', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_s_surround', tgt: 'all', desc: u => `给予所有敌人 2 层共鸣，获得 ${v(u, 4, 7)} 点格挡。`, play: (g, u) => { g.resAll(2); g.block(v(u, 4, 7)); } },
  s_sub: { ch: 'heroine', name: '低音炮', type: 'atk', rar: 'u', cost: [2, 2], icon: 'icons2/n_s_sub', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 6, 8)} 点伤害；共鸣不少于 5 层的敌人受到双倍。`, play: (g, u) => g.eachEnemy(e => g.attack(e, v(u, 6, 8) * ((e.st.res || 0) >= 5 ? 2 : 1))) },
  s_shuffle: { ch: 'heroine', name: '随机播放', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_s_shuffle', tgt: 'self', desc: u => `随机弃 1 张牌，抽 ${v(u, 2, 3)} 张牌。`, play: (g, u) => { g.discard(1); g.draw(v(u, 2, 3)); } },
  s_encore: { ch: 'heroine', name: '返场', type: 'atk', rar: 'r', cost: [1, 1], icon: 'icons2/n_s_encore', tgt: 'one', desc: u => `造成 ${v(u, 5, 7)} 点伤害；本回合每弃过 1 张牌，再造成 ${v(u, 5, 7)} 点（最多再 5 次）。`, play: (g, u, t) => g.attack(t, v(u, 5, 7), 1 + Math.min(5, dN(g))) },
  // ---- 莉泽 ----
  w_bolt: { ch: 'witch', name: '瓶装闪电', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_w_bolt', tgt: 'one', desc: u => `造成 ${v(u, 7, 9)} 点伤害；手里每有 1 个炼金瓶，再 +2（最多算 3 个）。`, play: (g, u, t) => g.attack(t, v(u, 7, 9) + 2 * Math.min(3, g.potsInHand())) },
  w_wall: { ch: 'witch', name: '瓶墙', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_w_wall', tgt: 'self', desc: u => `获得 ${v(u, 4, 6)} 点格挡；手里每有 1 个炼金瓶，再 +2（最多算 4 个）。`, play: (g, u) => g.block(v(u, 4, 6) + 2 * Math.min(4, g.potsInHand())) },
  w_notes: { ch: 'witch', name: '学徒笔记', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_w_notes', tgt: 'self', desc: u => `每回合第一次用掉炼金瓶后，抽 ${v(u, 1, 2)} 张牌。`, play: (g, u) => { P(g).st.wnotes = v(u, 1, 2); } },
  w_copy: { ch: 'witch', name: '二次调配', type: 'skill', rar: 'u', cost: [1, 0], icon: 'icons2/n_w_copy', tgt: 'self', desc: () => `把手里随机 1 个炼金瓶复制一份（没有就随机获得 1 个）。`, play: g => { const ps = potH(g); g.potion(1, ps.length ? ps[Math.floor(Math.random() * ps.length)].id : undefined); } },
  w_cauldron: { ch: 'witch', name: '翻滚的坩埚', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_w_cauldron', tgt: 'all', desc: u => `给予所有敌人 ${v(u, 2, 3)} 层中毒，随机获得 1 个炼金瓶。`, play: (g, u) => { g.eachEnemy(e => g.poison(e, v(u, 2, 3))); g.potion(1); } },
  w_ignite: { ch: 'witch', name: '点燃', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_w_ignite', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害，获得 1 瓶火焰瓶。`, play: (g, u, t) => { g.attack(t, v(u, 8, 11)); g.potion(1, 'p_fire'); } },
  w_fireball: { ch: 'witch', name: '火球术', type: 'atk', rar: 'u', cost: [2, 2], icon: 'icons2/n_w_fireball', tgt: 'one', desc: u => `造成 ${v(u, 14, 18)} 点伤害；本回合每用过 1 瓶火焰瓶，再 +6。`, play: (g, u, t) => g.attack(t, v(u, 14, 18) + 6 * (P(g).fireN || 0)) },
  w_inferno: { ch: 'witch', name: '业火', type: 'power', rar: 'r', cost: [2, 1], icon: 'icons2/n_w_inferno', tgt: 'self', desc: () => `火焰瓶的伤害永久 +4。`, play: g => g.self('inferno', 4) },
  w_ember: { ch: 'witch', name: '余烬', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_w_ember', tgt: 'self', exhaust: 1, desc: u => `获得 ${v(u, 1, 2)} 瓶火焰瓶。消耗。`, play: (g, u) => g.potion(v(u, 1, 2), 'p_fire') },
  w_firewall: { ch: 'witch', name: '火墙', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_w_firewall', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 4, 6)} 点伤害，获得 ${v(u, 6, 8)} 点格挡；本回合用过火焰瓶时伤害再 +3。`, play: (g, u) => { g.attackAll(v(u, 4, 6) + ((P(g).fireN || 0) ? 3 : 0)); g.block(v(u, 6, 8)); } },
  w_toxblade: { ch: 'witch', name: '毒刃', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_w_toxblade', tgt: 'one', desc: u => `造成 ${v(u, 5, 7)} 点伤害，给予 ${v(u, 3, 4)} 层中毒。`, play: (g, u, t) => { g.attack(t, v(u, 5, 7)); g.poison(t, v(u, 3, 4)); } },
  w_spread: { ch: 'witch', name: '毒素扩散', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_w_spread', tgt: 'one', desc: u => `给予目标 ${v(u, 3, 4)} 层中毒，其他敌人各得到目标一半的中毒（最多 ${v(u, 6, 8)} 层）。`, play: (g, u, t) => { g.poison(t, v(u, 3, 4)); const n = Math.min(v(u, 6, 8), Math.floor((t.st.poison || 0) / 2)); if (n) g.alive().filter(e => e !== t).forEach(e => g.poison(e, n)); } },
  w_corrode: { ch: 'witch', name: '腐蚀', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_w_corrode', tgt: 'one', desc: u => `给予 ${v(u, 3, 5)} 层中毒和 1 层虚弱。`, play: (g, u, t) => { g.poison(t, v(u, 3, 5)); g.apply(t, 'weak', 1); } },
  w_nshade: { ch: 'witch', name: '颠茄', type: 'power', rar: 'r', cost: [1, 1], icon: 'icons2/n_w_nshade', tgt: 'self', desc: u => `每回合开始时，给中毒最多的敌人 ${v(u, 3, 5)} 层中毒。`, play: (g, u) => { P(g).st.nshade = v(u, 3, 5); } },
  w_reserve: { ch: 'witch', name: '库存清点', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_w_reserve', tgt: 'self', desc: u => `随机获得 ${v(u, 2, 3)} 个炼金瓶。`, play: (g, u) => g.potion(v(u, 2, 3)) },
};

/* ======================= 新角色扩充到 35 张 ======================= */
const NEW2 = {
  // ---- 艾琳：三同专精 / 混合应变 ----
  e_flare: { ch: 'erin', name: '闪焰', type: 'atk', rar: 'c', cost: [0, 0], icon: 'icons2/n_e_flare', tgt: 'one', desc: u => `造成 ${v(u, 4, 6)} 点伤害，火 +1。`, play: (g, u, t) => { g.attack(t, v(u, 4, 6)); addEl(g, '火', 1); } },
  e_mist: { ch: 'erin', name: '雾帘', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_e_mist', tgt: 'self', desc: u => `获得 ${v(u, 4, 6)} 点格挡，水 +1。`, play: (g, u) => { g.block(v(u, 4, 6)); addEl(g, '水', 1); } },
  e_gust: { ch: 'erin', name: '疾风', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_gust', tgt: 'self', desc: u => `风 +2，抽 2 张牌。${v(u, '', '获得 3 点格挡。')}`, play: (g, u) => { addEl(g, '风', 2); g.draw(2); if (u) g.block(3); } },
  e_prismshot: { ch: 'erin', name: '三棱射线', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_prismshot', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 5, 7)} 点伤害；三种元素都有时抽 1 张牌。`, play: (g, u) => { g.attackAll(v(u, 5, 7)); if (kinds(g) === 3) g.draw(1); } },
  e_resonate: { ch: 'erin', name: '元素共振', type: 'skill', rar: 'u', cost: [1, 0], icon: 'icons2/n_e_resonate', tgt: 'self', desc: u => `火的层数翻倍（不超过上限）。`, play: g => addEl(g, '火', elN(g, '火')) },
  e_focus: { ch: 'erin', name: '专注', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_e_focus', tgt: 'self', desc: u => `每回合结束时，每有 1 层水获得 ${v(u, 1, 2)} 点格挡（不消耗水）。`, play: (g, u) => { P(g).st.efocus = v(u, 1, 2); } },
  e_mix: { ch: 'erin', name: '混合咒', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_e_mix', tgt: 'one', desc: u => `造成 ${v(u, 6, 8)} 点伤害；元素总层数每有 1 层再 +1（不消耗元素）。`, play: (g, u, t) => g.attack(t, v(u, 6, 8) + elTot(g)) },
  e_overload: { ch: 'erin', name: '元素过载', type: 'atk', rar: 'r', cost: [2, 2], icon: 'icons2/n_e_overload', tgt: 'one', desc: u => `造成 ${v(u, 8, 12)} 点伤害；元素总层数每有 1 层再 +3（不消耗元素）。`, play: (g, u, t) => g.attack(t, v(u, 8, 12) + 3 * elTot(g)) },
  e_reserve: { ch: 'erin', name: '元素储备', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_reserve', tgt: 'self', desc: u => `获得 ${v(u, 6, 9)} 点格挡；身上每有 1 种元素再 +2（不消耗元素）。`, play: (g, u) => g.block(v(u, 6, 9) + 2 * kinds(g)) },
  e_echo: { ch: 'erin', name: '回响祈唤', type: 'skill', rar: 'r', cost: [1, 0], icon: 'icons2/n_e_echo', tgt: 'one', desc: u => `祈唤，但只用掉火，水和风保留。`, play: (g, u, t) => invoke(g, t, { onlyFire: 1 }) },
  e_staff: { ch: 'erin', name: '法杖格挡', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_staff', tgt: 'self', desc: u => `获得 ${v(u, 7, 10)} 点格挡；元素总层数不少于 6 时再 +4。`, play: (g, u) => g.block(v(u, 7, 10) + (elTot(g) >= 6 ? 4 : 0)) },
  e_tide: { ch: 'erin', name: '潮汐', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_e_tide', tgt: 'self', desc: u => `水 +${v(u, 2, 3)}，获得 ${v(u, 6, 8)} 点格挡。`, play: (g, u) => { addEl(g, '水', v(u, 2, 3)); g.block(v(u, 6, 8)); } },
  e_blaze: { ch: 'erin', name: '烈焰', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_e_blaze', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害；每有 1 层火再 +2（不消耗火）。`, play: (g, u, t) => g.attack(t, v(u, 8, 11) + 2 * elN(g, '火')) },
  e_cyclone: { ch: 'erin', name: '旋风', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_e_cyclone', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 6, 8)} 点伤害；风不少于 3 层时抽 2 张牌。`, play: (g, u) => { g.attackAll(v(u, 6, 8)); if (elN(g, '风') >= 3) g.draw(2); } },
  e_master: { ch: 'erin', name: '元素宗师', type: 'power', rar: 'r', cost: [2, 1], icon: 'icons2/n_e_master', tgt: 'self', desc: u => `元素上限从 6 层提到 10 层；祈唤时每层火的伤害 +1。`, play: g => { P(g).st.emaster = 1; } },
  // ---- 顾清寒：剑宗 / 气宗 / 剑势 ----
  g_unsheath: { ch: 'gu', name: '拔剑', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_g_unsheath', tgt: 'one', desc: u => `造成 ${v(u, 7, 10)} 点伤害；飞剑不少于 3 把时抽 1 张牌。`, play: (g, u, t) => { g.attack(t, v(u, 7, 10)); if (sw(g) >= 3) g.draw(1); } },
  g_twin: { ch: 'gu', name: '双剑', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_g_twin', tgt: 'one', desc: u => `造成 ${v(u, 4, 5)} 点伤害 2 次，得到 1 把飞剑。`, play: (g, u, t) => { g.attack(t, v(u, 4, 5), 2); addSword(g, 1); } },
  g_sit: { ch: 'gu', name: '养剑', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_g_sit', tgt: 'self', desc: u => `获得 ${v(u, 7, 10)} 点格挡，得到 1 把飞剑。`, play: (g, u) => { g.block(v(u, 7, 10)); addSword(g, 1); } },
  g_parry: { ch: 'gu', name: '格剑', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_g_parry', tgt: 'self', desc: u => `获得 ${v(u, 8, 11)} 点格挡；飞剑满 6 把时再 +4。`, play: (g, u) => g.block(v(u, 8, 11) + (sw(g) >= 6 ? 4 : 0)) },
  g_galestep: { ch: 'gu', name: '杀气诀', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_g_galestep', tgt: 'self', desc: u => `之后 ${v(u, 3, 4)} 回合，攻击牌命中后，对另一个随机敌人造成等于飞剑加成的伤害。`, play: (g, u) => { P(g).st.kaura = v(u, 3, 4); } },
  g_rooted: { ch: 'gu', name: '剑壁', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_g_rooted', tgt: 'self', desc: u => `获得 ${v(u, 9, 12)} 点格挡；飞剑不少于 3 把时再得到 1 把。`, play: (g, u) => { g.block(v(u, 9, 12)); if (sw(g) >= 3) addSword(g, 1); } },
  g_array: { ch: 'gu', name: '剑阵', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_g_array', tgt: 'self', desc: u => `每回合开始得到 1 把飞剑${v(u, '', '，获得 2 点格挡')}。`, play: (g, u) => { P(g).st.swordgen = u ? 2 : 1; } },
  g_surge: { ch: 'gu', name: '剑鸣', type: 'skill', rar: 'u', cost: [0, 0], icon: 'icons2/n_g_surge', tgt: 'self', desc: u => `得到 2 把飞剑，抽 ${v(u, 1, 2)} 张牌。`, play: (g, u) => { addSword(g, 2); g.draw(v(u, 1, 2)); } },
  g_heavy: { ch: 'gu', name: '风林火山', type: 'skill', rar: 'u', cost: [1, 0], icon: 'icons2/n_g_heavy', tgt: 'self', pick: () => [opt('e', '风：下回合 +1 能量'), opt('a', '火：下回合攻击 +20%'), opt('d', '山：下回合受伤 -20%')], pickT: '风林火山：选一种', bot: (g, o) => o[0], desc: u => `下回合三选一：得到 1 点能量 / 攻击伤害 +20% / 受到伤害 -20%。`, play: (g, u, t, c, k) => { P(g).flhsN = k || 'e'; } },
  g_chain: { ch: 'gu', name: '连环剑', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_g_chain', tgt: 'one', desc: u => `造成 ${v(u, 3, 4)} 点伤害；本回合每打过 1 张攻击牌再打 1 次（最多再 4 次）。`, play: (g, u, t) => g.attack(t, v(u, 3, 4), 1 + Math.min(4, P(g).combo || 0)) },
  g_crush: { ch: 'gu', name: '收剑归鞘', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_g_crush', tgt: 'one', desc: u => `射出全部飞剑（每把 ${v(u, 4, 6)} 点伤害），然后得到 3 把。`, play: (g, u, t) => { fire(g, t, 'all', v(u, 4, 6)); addSword(g, 3); } },
  g_recall: { ch: 'gu', name: '回剑', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_g_recall', tgt: 'one', desc: u => `射出 1 把飞剑，再得到 2 把，获得 ${v(u, 3, 5)} 点格挡。`, play: (g, u, t) => { fire(g, t, 1, 4); addSword(g, 2); g.block(v(u, 3, 5)); } },
  g_immortal: { ch: 'gu', name: '天外飞仙', type: 'atk', rar: 'r', cost: [3, 2], icon: 'icons2/n_g_immortal', tgt: 'one', exhaust: 1, desc: u => `射出全部飞剑（每把 7 点伤害），然后得回同样数量。消耗。`, play: (g, u, t) => { const k = fire(g, t, 'all', 7); addSword(g, k); } },
  g_zen: { ch: 'gu', name: '剑心通明', type: 'power', rar: 'r', cost: [1, 0], icon: 'icons2/n_g_zen', tgt: 'self', desc: u => `每把飞剑给攻击牌第一击的加成从 +2 变成 +3。`, play: g => { P(g).st.zen = 1; } },
  g_qiarmor: { ch: 'gu', name: '后发制人', type: 'skill', rar: 'r', cost: [1, 0], icon: 'icons2/n_g_qiarmor', tgt: 'self', desc: u => `本回合射出的飞剑先悬在空中，每把给 3 点格挡；下回合开始时落下，伤害 ×2.5。`, play: g => { P(g).hangT = 1; } },
  // ---- 希尔薇：抢变身 / 霜甲反击 ----
  s_icicle: { ch: 'sylvie', name: '冰锥', type: 'atk', rar: 'c', cost: [0, 0], icon: 'icons2/n_s_icicle', tgt: 'one', desc: u => `造成 ${v(u, 4, 6)} 点伤害，得到 1 点龙血。【龙】造成 ${v(u, 4, 6)}，全体 2。`, play: (g, u, t) => { g.attack(t, v(u, 4, 6)); gainDB(g, 1); } },
  s_fang: { ch: 'sylvie', name: '龙牙', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_s_fang', tgt: 'one', desc: u => `造成 ${v(u, 9, 12)} 点伤害。【龙】造成 ${v(u, 14, 17)}，给予 2 层霜灼。`, play: (g, u, t) => { if (dr(g)) { g.attack(t, v(u, 14, 17)); fburn(g, live(g, t), 2); } else g.attack(t, v(u, 9, 12)); } },
  s_iceshield: { ch: 'sylvie', name: '冰盾', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_s_iceshield', tgt: 'self', desc: u => `获得 ${v(u, 8, 11)} 点格挡；再花 2 点龙血额外 +8。【龙】${v(u, 5, 7)} 格挡。`, play: (g, u) => { if (dr(g)) { g.block(v(u, 5, 7)); return; } g.block(v(u, 8, 11) + (spendDB(g, 2) ? 8 : 0)); } },
  s_rage: { ch: 'sylvie', name: '龙怒', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_s_rage', tgt: 'self', desc: u => `得到 3 点龙血，抽 ${v(u, 1, 2)} 张牌。【龙】全体 6，抽 ${v(u, 1, 2)} 张牌。`, play: (g, u) => { gainDB(g, 3); g.draw(v(u, 1, 2)); } },
  s_nova: { ch: 'sylvie', name: '霜爆', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_s_nova', tgt: 'all', desc: u => `花掉全部龙血，每点给所有敌人 ${v(u, 2, 3)} 层霜灼。【龙】所有敌人的霜灼翻倍。`, play: (g, u) => { if (dr(g)) { g.alive().forEach(e => { if (e.st.fburn) fburn(g, e, e.st.fburn); }); return; } const k = spendUpTo(g, 8); if (k) g.alive().forEach(e => fburn(g, e, k * v(u, 2, 3))); } },
  s_awaken: { ch: 'sylvie', name: '觉醒', type: 'skill', rar: 'u', cost: [1, 0], icon: 'icons2/n_s_awaken', tgt: 'self', desc: u => `得到 5 点龙血；龙血满 8 点时抽 2 张牌。【龙】全体 10，抽 1 张牌。`, play: g => { const d = dr(g); gainDB(g, 5); if (d) g.draw(1); else if (db(g) >= 8) g.draw(2); } },
  s_dscale: { ch: 'sylvie', name: '龙鳞', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_s_dscale', tgt: 'self', desc: u => `霜龙形态下，每回合开始获得 ${v(u, 6, 8)} 点格挡。`, play: (g, u) => { P(g).st.dscale = v(u, 6, 8); } },
  s_glacier: { ch: 'sylvie', name: '冰川', type: 'skill', rar: 'u', cost: [2, 2], icon: 'icons2/n_s_glacier', tgt: 'self', desc: u => `获得 ${v(u, 12, 15)} 点格挡，得到 2 点龙血。【龙】${v(u, 8, 10)} 格挡，全体 4。`, play: (g, u) => { g.block(dr(g) ? v(u, 8, 10) : v(u, 12, 15)); gainDB(g, 2); } },
  s_tail: { ch: 'sylvie', name: '龙尾扫', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_s_tail', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 6, 8)} 点伤害。【龙】全体 ${v(u, 8, 10)}，并给予 1 层虚弱。`, play: (g, u) => { if (dr(g)) { g.attackAll(v(u, 8, 10)); g.applyAll('weak', 1); } else g.attackAll(v(u, 6, 8)); } },
  s_dheart: { ch: 'sylvie', name: '龙心', type: 'power', rar: 'r', cost: [1, 0], icon: 'icons2/n_s_dheart', tgt: 'self', desc: u => `每次变身时，得到 2 点能量，抽 1 张牌。`, play: g => { P(g).st.dheart = 2; } },
  s_permafrost: { ch: 'sylvie', name: '永冻', type: 'power', rar: 'r', cost: [1, 0], icon: 'icons2/n_s_permafrost', tgt: 'self', desc: u => `身上有霜灼的敌人，攻击伤害 -2。`, play: g => { P(g).st.permaf = 2; } },
  s_mirror: { ch: 'sylvie', name: '冰反射', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_s_mirror', tgt: 'self', desc: u => `获得 ${v(u, 5, 8)} 点格挡；龙血不少于 5 点时抽 2 张牌。【龙】${v(u, 3, 5)} 格挡，抽 2 张牌。`, play: (g, u) => { if (dr(g)) { g.block(v(u, 3, 5)); g.draw(2); } else { g.block(v(u, 5, 8)); if (db(g) >= 5) g.draw(2); } } },
  s_dive: { ch: 'sylvie', name: '俯冲', type: 'atk', rar: 'r', cost: [2, 2], icon: 'icons2/n_s_dive', tgt: 'one', desc: u => `造成 ${v(u, 18, 24)} 点伤害。【龙】造成 ${v(u, 30, 38)}，冰冻目标。`, play: (g, u, t) => { if (dr(g)) { g.attack(t, v(u, 30, 38)); hardCC(g, live(g, t), 'frozen'); } else g.attack(t, v(u, 18, 24)); } },
  s_chill: { ch: 'sylvie', name: '寒息', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_s_chill', tgt: 'one', desc: u => `给予 ${v(u, 2, 3)} 层虚弱，得到 2 点龙血。【龙】冰冻目标，全体 4。`, play: (g, u, t) => { if (dr(g)) hardCC(g, t, 'frozen'); else g.apply(t, 'weak', v(u, 2, 3)); gainDB(g, 2); } },
  s_calm: { ch: 'sylvie', name: '平静', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_s_calm', tgt: 'self', desc: u => `获得 ${v(u, 4, 6)} 点格挡，得到 1 点龙血。【龙】${v(u, 2, 3)} 格挡，全体 2。`, play: (g, u) => { g.block(dr(g) ? v(u, 2, 3) : v(u, 4, 6)); gainDB(g, 1); } },
  // ---- 米娅：扑击 / 护卫 / 照料 ----
  m_claw: { ch: 'mia', name: '猫抓', type: 'atk', rar: 'c', cost: [0, 0], icon: 'icons2/n_m_claw', tgt: 'one', desc: u => `造成 ${v(u, 4, 6)} 点伤害；上一轮团子护卫挡下过伤害时，再 +${v(u, 3, 4)}。`, play: (g, u, t) => g.attack(t, v(u, 4, 6) + (catGuarded(g) ? v(u, 3, 4) : 0)) },
  m_toy: { ch: 'mia', name: '逗猫棒', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_m_toy', tgt: 'self', desc: u => `团子回复 3 生命，本回合扑击 +${v(u, 3, 5)} 点伤害。`, play: (g, u) => { healCat(g, 3); if (cat(g)) cat(g).pB = (cat(g).pB || 0) + v(u, 3, 5); } },
  m_fluff: { ch: 'mia', name: '炸毛', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_m_fluff', tgt: 'self', desc: u => `获得 ${v(u, 8, 11)} 点格挡。团子护卫时本轮多挡 2 点。`, play: (g, u) => { g.block(v(u, 8, 11)); if (cat(g)) cat(g).gB = (cat(g).gB || 0) + 2; } },
  m_whistle2: { ch: 'mia', name: '口哨', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_m_whistle2', tgt: 'self', exhaust: 1, desc: u => `抽 1 张牌；本回合可以再改一次团子的指令。${v(u, '', '获得 3 点格挡。')}消耗。`, play: (g, u) => { if (cat(g)) cat(g).set = 0; g.draw(1); if (u) g.block(3); } },
  m_twice: { ch: 'mia', name: '二连扑', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_twice', tgt: 'self', desc: u => `本回合团子的普通扑击多扑一次（大猫扑杀不会重复）。${v(u, '', '抽 1 张牌。')}`, play: (g, u) => { if (cat(g)) cat(g).twice = 1; if (u) g.draw(1); } },
  m_bond: { ch: 'mia', name: '羁绊', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_bond', tgt: 'self', desc: u => `每回合开始时，团子回复 ${v(u, 2, 3)} 生命。`, play: (g, u) => { P(g).st.mbond = v(u, 2, 3); } },
  m_sharpen: { ch: 'mia', name: '磨爪', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_sharpen', tgt: 'self', desc: u => `本场战斗团子的攻击 +${v(u, 2, 3)}。`, play: (g, u) => { if (cat(g)) cat(g).atk += v(u, 2, 3); } },
  m_leap: { ch: 'mia', name: '飞扑', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_leap', tgt: 'one', desc: u => `造成 ${v(u, 7, 10)} 点伤害；团子在场时，把它的指令改成扑击这个敌人。`, play: (g, u, t) => { g.attack(t, v(u, 7, 10)); const c = cat(g); if (c && !c.down && t && !t.dead) { c.cmd = 'pounce'; c.pt = t.id; } } },
  m_catshield: { ch: 'mia', name: '猫咪盾', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_m_catshield', tgt: 'self', desc: u => `获得 ${v(u, 6, 9)} 点格挡，团子回复 ${v(u, 2, 3)} 生命。`, play: (g, u) => { g.block(v(u, 6, 9)); healCat(g, v(u, 2, 3)); } },
  m_herd: { ch: 'mia', name: '猫群来袭', type: 'atk', rar: 'r', cost: [2, 2], icon: 'icons2/n_m_herd', tgt: 'all', exhaust: 1, desc: u => `团子在场时，对所有敌人造成团子攻击 ×${v(u, 3, 4)} 的伤害。消耗。`, play: (g, u) => { const c = cat(g); if (c && !c.down) g.attackAll(c.atk * v(u, 3, 4)); } },
  m_pact: { ch: 'mia', name: '守护契约', type: 'power', rar: 'r', cost: [1, 0], icon: 'icons2/n_m_pact', tgt: 'self', desc: () => `团子护卫时，它挡下的伤害一半变成米娅的格挡。`, play: g => { P(g).st.mpact = 1; } },
  m_nap: { ch: 'mia', name: '打盹', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_m_nap', tgt: 'self', desc: u => `团子回复 ${v(u, 6, 8)} 生命，米娅获得 ${v(u, 4, 6)} 点格挡。`, play: (g, u) => { healCat(g, v(u, 6, 8)); g.block(v(u, 4, 6)); } },
  m_yarn: { ch: 'mia', name: '毛线球', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_yarn', tgt: 'one', desc: u => `造成 ${v(u, 5, 6)} 点伤害 2 次；团子在场时给予 1 层易伤。`, play: (g, u, t) => { if (catUp(g)) g.apply(t, 'vuln', 1); g.attack(t, v(u, 5, 6), 2); } },
  m_trust: { ch: 'mia', name: '信任', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_trust', tgt: 'self', desc: u => `抽 ${v(u, 2, 3)} 张牌；团子生命不少于一半时得到 1 点能量。`, play: (g, u) => { g.draw(v(u, 2, 3)); const c = cat(g); if (c && !c.down && c.hp * 2 >= c.max) g.energy(1); } },
  // ---- 绯月：鲜血 / 吸血 / 蝙蝠 ----
  f_nick: { ch: 'feiyue', name: '划伤', type: 'atk', rar: 'c', cost: [0, 0], icon: 'icons2/n_f_nick', tgt: 'one', desc: u => `造成 ${v(u, 4, 6)} 点伤害，吸血 ${v(u, 1, 2)}。`, play: (g, u, t) => leech(g, g.attack(t, v(u, 4, 6)), v(u, 1, 2)) },
  f_drop: { ch: 'feiyue', name: '血滴', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_f_drop', tgt: 'self', desc: u => `献血 1，获得 ${v(u, 4, 6)} 点格挡。`, play: (g, u) => { donate(g, 1); g.block(v(u, 4, 6)); } },
  f_flock: { ch: 'feiyue', name: '蝠群', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_f_flock', tgt: 'self', desc: u => `献血 2，抽 2 张牌。${v(u, '', '获得 3 点格挡。')}`, play: (g, u) => { donate(g, 2); g.draw(2); if (u) g.block(3); } },
  f_feast: { ch: 'feiyue', name: '盛宴', type: 'atk', rar: 'u', cost: [2, 2], icon: 'icons2/n_f_feast', tgt: 'one', desc: u => `造成 ${v(u, 16, 20)} 点伤害，吸血 ${v(u, 6, 7)}；没能回到血时获得 5 点格挡。`, play: (g, u, t) => { const h0 = g.R.hp; leech(g, g.attack(t, v(u, 16, 20)), v(u, 6, 7)); if (g.R.hp <= h0) g.block(5); } },
  f_mark: { ch: 'feiyue', name: '猎印', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_f_mark', tgt: 'one', desc: u => `给予 ${v(u, 1, 2)} 层易伤，得到 1 点鲜血。`, play: (g, u, t) => { g.apply(t, 'vuln', v(u, 1, 2)); addB(g, 1); } },
  f_cloak: { ch: 'feiyue', name: '夜之斗篷', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_f_cloak', tgt: 'self', desc: u => `获得 ${v(u, 9, 12)} 点格挡；鲜血不少于 3 时再 +4；本回合吸过血时抽 1 张牌。`, play: (g, u) => { g.block(v(u, 9, 12) + (vb(g) >= 3 ? 4 : 0)); if (P(g).lsT) g.draw(1); } },
  f_dash: { ch: 'feiyue', name: '血之冲刺', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_f_dash', tgt: 'one', desc: u => `造成 ${v(u, 6, 8)} 点伤害；花掉最多 3 点鲜血，每点再 +${v(u, 6, 7)}。`, play: (g, u, t) => { const k = Math.min(3, vb(g)); if (k) spendB(g, k); g.attack(t, v(u, 6, 8) + k * v(u, 6, 7)); } },
  f_nest: { ch: 'feiyue', name: '蝠巢', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_f_nest', tgt: 'self', desc: u => `每回合开始时，得到 1 点鲜血${v(u, '', '，获得 2 点格挡')}。`, play: (g, u) => { P(g).st.batgen = u ? 2 : 1; } },
  f_dance: { ch: 'feiyue', name: '绯红之舞', type: 'atk', rar: 'r', cost: [2, 2], icon: 'icons2/n_f_dance', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 9, 12)} 点伤害，吸血 ${v(u, 5, 6)}。`, play: (g, u) => leech(g, g.attackAll(v(u, 9, 12)), v(u, 5, 6)) },
  f_hunger: { ch: 'feiyue', name: '饥渴', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_f_hunger', tgt: 'self', desc: u => `每次吸血成功后，获得 ${v(u, 2, 3)} 点格挡。`, play: (g, u) => { P(g).st.vhunger = v(u, 2, 3); } },
  f_rite: { ch: 'feiyue', name: '血祭', type: 'skill', rar: 'r', cost: [1, 1], icon: 'icons2/n_f_rite', tgt: 'self', exhaust: 1, desc: u => `失去 6 点生命，得到 ${v(u, 6, 8)} 点鲜血和 2 点能量。消耗。`, play: (g, u) => { g.loseHp(6); addB(g, v(u, 6, 8)); g.energy(2); } },
  f_echo: { ch: 'feiyue', name: '回声定位', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_f_echo', tgt: 'self', desc: u => `获得 ${v(u, 6, 9)} 点格挡；鲜血不少于 3 时再 +4。`, play: (g, u) => g.block(v(u, 6, 9) + (vb(g) >= 3 ? 4 : 0)) },
  f_fangs: { ch: 'feiyue', name: '獠牙', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_f_fangs', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害；目标有易伤时吸血 ${v(u, 3, 4)}。`, play: (g, u, t) => { const vu = t && t.st.vuln; const d = g.attack(t, v(u, 8, 11)); if (vu) leech(g, d, v(u, 3, 4)); } },
  f_moon2: { ch: 'feiyue', name: '月升', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_f_moon2', tgt: 'self', desc: u => `得到 3 点鲜血，获得 ${v(u, 5, 8)} 点格挡。`, play: (g, u) => { addB(g, 3); g.block(v(u, 5, 8)); } },
  f_undying: { ch: 'feiyue', name: '不死之身', type: 'power', rar: 'r', cost: [1, 1], icon: 'icons2/n_f_undying', tgt: 'self', desc: u => `每回合结束时，鲜血不少于 2 点就花掉 2 点，回复 ${v(u, 4, 6)} 生命（不算吸血）。`, play: (g, u) => { P(g).st.undying = v(u, 4, 6); } },
};

for (const k of Object.keys(ERIN)) if (k.startsWith('sp_')) ERIN[k].icon = 'icons2/n_' + k;
export const NEWCARDS = { ...ERIN, ...GU, ...SYL, ...MIA, ...FEI, ...OLD, ...NEW2 };
for (const c of Object.values(NEWCARDS)) c.noart = 1;
// 机器人估值：sim 的熟练机器人按这些词判断「流派牌」
export const OLDKEYW = { miko: /结界|技能牌/, hero: /光弹|攻击牌/, witch: /中毒|炼金瓶|火焰瓶/, heroine: /共鸣|爆音|弃/ };
export const NEWKEYW = { erin: /元素|祈唤|火|水|风/, gu: /飞剑/, sylvie: /龙血|霜龙/, mia: /团子|扑击|护卫/, feiyue: /鲜血|吸血|献血/ };
const B5 = ['tstrike', 'tstrike', 'tstrike', 'tstrike', 'defend', 'defend', 'defend'];
export const NEWSTARTERS = {
  erin: ['tstrike', 'tstrike', 'tstrike', 'defend', 'defend', 'defend', 'e_spark', 'e_ripple', 'e_needle', 'e_invoke'], gu: [...B5, 'g_sheath', 'g_breath', 'g_shift'], sylvie: [...B5, 's_lance', 's_scale', 's_pulse'],
  mia: [...B5, 'm_staff', 'm_side', 'm_snack'], feiyue: [...B5, 'f_claw', 'f_sleeve', 'f_bats'],
};
export const NEWSTARTRELIC = { erin: 'oldstaff', gu: 'swordtassel', sylvie: 'eggshard', mia: 'catbell', feiyue: 'ribbon' };
export const NEWRELICS = {
  oldstaff: { ch: 'erin', name: '旧世界法杖', icon: 'ic_rune', rar: 'start', desc: '战斗开始时火、水、风各 +1。战斗结束时回复 4 点生命。' },
  lens: { ch: 'erin', name: '定相透镜', icon: 'ic_crystal', rar: 'u', desc: '每场战斗第一次某种元素达到 6 层时，获得 6 点格挡。' },
  prism: { ch: 'erin', name: '裂色棱镜', icon: 'ic_hexa', rar: 'r', desc: '每场战斗第一次在火、水、风都有时祈唤，抽 2 张牌，得到 1 点能量。' },
  swordtassel: { ch: 'gu', name: '雪纹剑穗', icon: 'ic_sword', rar: 'start', desc: '战斗开始时得到 1 把飞剑。战斗结束时回复 4 点生命。' },
  jade: { ch: 'gu', name: '护脉玉', icon: 'ic_aura', rar: 'u', desc: '每场战斗第一次射出飞剑后，再得到 2 把飞剑。' },
  manual: { ch: 'gu', name: '旧剑谱', icon: 'b_dur', rar: 'r', desc: '每场战斗第一次一回合打出 3 张攻击牌后，下回合多抽 2 张牌。' },
  eggshard: { ch: 'sylvie', name: '寒卵碎片', icon: 'ic_crystal', rar: 'start', desc: '战斗开始时得到 2 点龙血。战斗结束时回复 4 点生命。' },
  horn: { ch: 'sylvie', name: '断角护符', icon: 'm_ward', rar: 'u', desc: '每场战斗第一次变身时，获得 8 点格挡。' },
  dayscale: { ch: 'sylvie', name: '极昼鳞', icon: 'p_tough', rar: 'r', desc: '每场战斗第一次退出霜龙形态时不会虚弱，并得到 3 点龙血。' },
  catbell: { ch: 'mia', name: '团子的铃铛', icon: 'ic_bell', rar: 'start', desc: '云猫团子和你并肩作战，每回合可以给它一个指令。战斗结束时回复 4 点生命。' },
  catbed: { ch: 'mia', name: '旅行猫窝', icon: 'box', rar: 'u', desc: '每回合开始时，团子回复 2 生命。' },
  lynx: { ch: 'mia', name: '山猫纹章', icon: 'sk_wolf', rar: 'r', desc: '每场战斗第一次护卫和扑击都执行过后，下回合抽 1 张牌，得到 1 点能量。' },
  ribbon: { ch: 'feiyue', name: '家书缎带', icon: 'b_vamp', rar: 'start', desc: '战斗开始时得到 2 点鲜血。战斗结束时回复 4 点生命。' },
  redpin: { ch: 'feiyue', name: '红银针', icon: 'ic_stake', rar: 'u', desc: '每场战斗第一次吸血时多回复 2 生命（仍算进每场 30 点的上限）。' },
  cup: { ch: 'feiyue', name: '倒悬杯', icon: 'pot', rar: 'r', desc: '每场战斗第一次一口气花掉至少 4 点鲜血后，抽 2 张牌。' },
};
export const NEWSTATUS = {
  efire: ['火', '祈唤时每层对目标造成 5 点伤害（最多 6 层）', '#ff9050'], ewater: ['水', '祈唤时每层获得 4 点格挡（最多 6 层）', '#70c0ff'], ewind: ['风', '祈唤时每 2 层抽 1 张牌（最多 6 层）', '#9fffd0'],
  enotes: ['元素笔记', '每回合开始时层数最少的元素 +1', '#ffd060'], efocus: ['水之心', '每回合结束时按水的层数获得格挡', '#70c0ff'], ecrown: ['三相冠冕', '每回合开始时火、水、风各 +1', '#ffd060'], eseason: ['四季轮转', '每回合第一次祈唤后得到能量并抽牌', '#ffd060'], emaster: ['元素宗师', '元素上限 10 层，祈唤时每层火伤害 +1', '#ffd060'],
  sword: ['飞剑', '每把让攻击牌的第一击 +2 伤害，回合结束每把给 1 点格挡；可以射出（最多 6 把）', '#9fd8ff'], swordgen: ['剑阵', '每回合开始得到 1 把飞剑', '#9fd8ff'], zen: ['剑心通明', '每把飞剑的第一击加成变成 +3', '#9fd8ff'], 
  gflow: ['剑气护体', '回合结束时每把飞剑给 2 点格挡', '#9fd8ff'], grev: ['剑意循环', '每射出 1 把飞剑抽 1 张牌（每回合最多 3 张）；飞剑归零时再得到 2 把', '#9fd8ff'], dualst: ['剑意', '每回合第一次射出飞剑后得到 1 点能量', '#9fd8ff'],
  dblood: ['龙血', '攒满 8 点后可以变身霜龙', '#ff9090'], dragon: ['霜龙形态', '变身时对所有敌人造成 10 点伤害；攻击牌第一击 +6；每个敌方回合第一段打穿格挡的伤害 -4。数字是剩余回合', '#c8f0ff'],
  dbgen: ['冰晶脊', '每回合开始得到 1 点龙血', '#ff9090'], dscale: ['龙鳞', '霜龙形态下每回合开始获得格挡', '#c8f0ff'], dheart: ['龙心', '变身时得到 2 点能量并抽 1 张牌', '#c8f0ff'], perma: ['永冻', '龙血满 8 点时攻击牌第一击额外加成', '#a8e8ff'],
  aval: ['雪崩之心', '每花掉 1 点龙血获得 1 点格挡；变身时获得 8 点格挡', '#a8e8ff'], wake: ['冬眠苏醒', '退出霜龙形态时得到龙血并抽牌', '#a8e8ff'],
  mbond: ['羁绊', '每回合开始团子回血', '#ffc0e0'], mpact: ['守护契约', '团子挡下的伤害一半变成米娅的格挡', '#ffc0e0'], mjump: ['练习跳台', '每种指令第一次执行时获得格挡', '#ffc0e0'], mgate: ['云猫守门', '团子护卫多挡 3 点，受伤后下回合抽牌', '#ffc0e0'],
  vblood: ['鲜血', '献血或吸血得到，由牌花掉（最多 12）', '#ff5070'], batgen: ['蝠巢', '每回合开始得到 1 点鲜血', '#c080ff'], vhunger: ['饥渴', '每次吸血后获得格挡', '#ff5070'], undying: ['不死之身', '回合结束时花鲜血回血', '#ff5070'],
  vpulse: ['夜行脉搏', '每回合第一次献血后获得格挡', '#ff5070'], vowb: ['血色誓约', '每回合第一次吸血后得到鲜血并抽牌', '#ff5070'], vdawn: ['血尽天明', '每回合第一次一口气花 4 点以上鲜血时得到能量和格挡', '#ff5070'],
  quick: ['快枪手', '每回合第 3 张攻击牌后得到能量', '#ffd060'], mheart: ['巫女之心', '每回合第 3 张技能牌后得到能量', '#ffd060'], torii: ['鸟居', '回合结束时结界不少于 3 层就获得格挡', '#ffd060'],
  loop: ['循环播放', '每回合第一次弃牌后抽牌', '#ffd060'], wnotes: ['学徒笔记', '每回合第一次用掉炼金瓶后抽牌', '#ffd060'], nshade: ['颠茄', '每回合开始给中毒最多的敌人加中毒', '#ffd060'], inferno: ['业火', '火焰瓶伤害增加', '#ff9050'],
  kaura: ['杀气诀', '攻击牌命中后，对另一个随机敌人造成等于飞剑加成的伤害。数字是剩余回合', '#ff8080'],
  permaf: ['永冻', '身上有霜灼的敌人攻击伤害 -2', '#a8e8ff'],
  fburn: ['霜灼', '每次行动前受到等于层数的伤害，然后层数减半', '#7fd4ff', 'icons2/st_fburn'],
  frozen: ['冰冻', '跳过下一次行动', '#bfefff', 'icons2/st_frozen'],
  stun: ['眩晕', '跳过下一次行动', '#ffe070', 'icons2/st_stun'],
  bind: ['束缚', '跳过下一次行动', '#80d070', 'icons2/st_bind'],
  bindD: ['藤蔓', '每次行动前受到 4 点伤害。数字是剩余次数', '#80d070', 'icons2/st_bind'],
  para: ['麻痹', '下一次攻击伤害减半', '#ffd860', 'icons2/st_para'],
  awe: ['威吓', '下一次攻击每段 -5', '#e0e0ff', 'icons2/st_awe'],
};

/* ---------- 角色机制钩子（两个引擎在固定时机调用） ---------- */
export const MECH = {
  battleStart(g) { const p = P(g), R = g.R, c = R.char;
    if (c === 'erin' && g.has('oldstaff')) for (const k of EL) addEl(g, k, 1);
    if (c === 'gu' && g.has('swordtassel')) addSword(g, 1);
    if (c === 'sylvie' && g.has('eggshard')) gainDB(g, 2);
    if (c === 'mia' && g.has('catbell')) { R.cat = { lv: Math.min(3, (R.act || 1) + 1) }; const L = CATLV[R.cat.lv]; p.cat = { hp: L.max, max: L.max, atk: L.atk, cmd: 'guard', set: 0, did: {}, took: 0 }; }
    if (c === 'feiyue' && g.has('ribbon')) p.st.vblood = 2;
  },
  turnStart(g, first) { const p = P(g);
    for (const k of ['invN', 'seasT', 'gateT', 'noteT', 'spells', 'windT', 'mtnT', 'windDisc', 'mtnB', 'dualT', 'combo', 'burnT', 'qiT', 'frostT', 'donT', 'vpT', 'vowT', 'vdT', 'setT', 'patT', 'syT', 'syR', 'rzT', 'drawnT', 'avT', 'drHit', 'crT', 'lsT', 'grevT', 'hangT', 'skillN', 'fireN', 'wnT', 'discN', 'loopT', 'zenT']) delete p[k];
    if (p.st.ecrown) for (const k of EL) addEl(g, k, 1);
    if (p.st.enotes) addEl(g, EL.reduce((m, x) => elN(g, x) < elN(g, m) ? x : m, '火'), 1);
    if (p.hang && p.hang.length) { const q = p.hang; p.hang = []; for (const h of q) swordHits(g, null, h.k, h.dmg, h.mode); }
    delete p.dmul; delete p.flhsD; if (p.flhsN) { if (p.flhsN === 'e') g.energy(1); else if (p.flhsN === 'a') p.dmul = 1.2; else p.flhsD = 1; delete p.flhsN; }
    if (p.restE) { g.energy(-1); p.restE = 0; }
    if (p.st.kaura && !first) { p.st.kaura--; if (!p.st.kaura) delete p.st.kaura; }
    if (p.st.dbgen) { gainDB(g, 1); if (p.st.dbgen > 1) g.block(2, true); }
    if (p.cat && g.has('catbed')) healCat(g, 2);
    if (p.st.swordgen) { addSword(g, 1); if (p.st.swordgen > 1) g.block(2, true); }
    if (p.st.dscale && p.st.dragon) g.block(p.st.dscale, true);
    if (p.st.mbond && p.cat) healCat(g, p.st.mbond);
    if (p.st.batgen) { addB(g, 1); if (p.st.batgen > 1) g.block(2, true); }
    if (p.st.nshade) { const a = g.alive(); if (a.length) g.poison(a.reduce((m, e) => (e.st.poison || 0) > (m.st.poison || 0) ? e : m, a[0]), p.st.nshade); }
    if (p.st.dragon && !first) { p.st.dragon--; if (!p.st.dragon) { delete p.st.dragon; if (g.has('dayscale') && !p.dsU) { p.dsU = 1; gainDB(g, 3); } else g.self('weak', 1); if (p.st.wake) { gainDB(g, 4); g.draw(2); if (p.st.wake > 1) g.energy(1); } } }
    if (p.manualD) { g.draw(2); p.manualD = 0; }
    const c = p.cat; if (c) { c.set = 0; c.gB = 0; c.sR = 0; c.pB = 0; c.big = 0; c.twice = 0; c.took = c.tookN || 0; c.tookN = 0; if (!c.down) c.cmd = c.cmd === 'pounce' && g.alive().some(e => e.id === c.pt) ? 'pounce' : 'guard'; if (p.gateD) { g.draw(1); p.gateD = 0; } }
    if (p.lynxD) { p.lynxD = 0; g.draw(1); g.energy(1); }
  },
  /* 玩家回合结束、敌人行动前 */
  turnEnd(g) { const p = P(g), c = p.cat;
    if (c && !c.down) { const did = k => catDid(g, k);
      if (c.cmd === 'pounce') { const a = g.alive(), t = a.find(e => e.id === c.pt) || a[0]; if (t) { c.fx = { k: 'atk', t: Date.now() }; p.fh = 0; for (let n = 0; n < (c.twice && !c.big ? 2 : 1); n++) { const a2 = g.alive(), t2 = t.dead ? a2[0] : t; if (!t2) break; if (c.big) g.attack(t2, c.big + (c.pB || 0), 2); else g.attack(t2, c.atk + (c.pB || 0)); } } did('pounce'); }
      else if (c.cmd === 'guard') c.guardOn = 1; }
    if (p.st.torii && (p.st.kek || 0) >= 3) g.block(p.st.torii, true);
    if (p.st.efocus && elN(g, '水')) g.block(p.st.efocus * elN(g, '水'), true);
    if (p.boomer) { addSword(g, p.boomer); p.boomer = 0; }
    if (sw(g)) g.block((p.st.gflow ? 2 : 1) * sw(g), true);
    if (p.st.undying && vb(g) >= 2) { spendB(g, 2); g.heal(p.st.undying); }
    p.ePhase = 1;
  },
  /* 敌人攻击打到玩家：格挡之前（团子护卫） */
  preBlock(g, amt, e) { const p = P(g), c = p.cat;
    if (e) { if (e.cutH) amt = Math.floor(amt / 2); if (e.cutS) amt = Math.max(0, amt - e.cutS); if (p.st.permaf && e.st && e.st.fburn) amt = Math.max(0, amt - p.st.permaf); }
    if (p.flhsD) amt = Math.floor(amt * .8);
    if (c && !c.down && c.cmd === 'guard' && c.guardOn && amt > 0) { c.guardOn = 0; const capN = 8 + (c.gB || 0) + (p.st.mgate ? 3 : 0), k = Math.min(amt, capN, c.hp); if (k > 0) { const hurtC = Math.max(0, Math.ceil(k / 2) - (c.sR || 0)); c.fx = { k: 'hit', t: Date.now() }; c.hp -= hurtC; c.tookN = (c.tookN || 0) + k; amt -= k; catDid(g, 'guard'); if (p.st.mpact) g.block(Math.floor(k / 2), true); g.note(`团子挡下 ${k}`); if (hurtC > 0 && p.st.mgate) p.gateD = 1; if (c.hp <= 0) { c.hp = 0; c.down = 1; g.note('团子倒下了'); } } }
    return amt; },
  /* 格挡之后（霜龙减伤） */
  postBlock(g, left, e) { const p = P(g); if (left <= 0) return left;
    if (p.st.dragon && !p.drHit) { p.drHit = 1; left = Math.max(0, left - 4); }
    return left; },
  /* 敌人行动前：霜灼、藤蔓、硬控、麻痹、威吓。返回 'skip' 表示这次不行动 */
  enemyAct(g, e) { e.cutH = 0; e.cutS = 0;
    if (e.st.fburn) { const n = e.st.fburn; g.hitE(e, n); if (e.dead) return; const h = Math.floor(n / 2); if (h) e.st.fburn = h; else delete e.st.fburn; }
    if (e.st.bindD) { g.hitE(e, 4); e.st.bindD--; if (!e.st.bindD) delete e.st.bindD; if (e.dead) return; }
    for (const k of ['frozen', 'stun', 'bind']) if (e.st[k]) { delete e.st[k]; return 'skip'; }
    if (e.st.para) { delete e.st.para; e.cutH = 1; }
    if (e.st.awe) { delete e.st.awe; e.cutS = 5; } },
  /* 攻击牌第一击的加成 */
  firstHit(g) { const p = P(g); let b = (p.st.sword || 0) * (p.st.zen ? 3 : 2) + (p.st.dragon ? 6 : 0) + (p.fhx || 0); p.fhx = 0; return b; },
  costMod(g, d) { const p = P(g); return 0; },
  postPlay(g, d) { const p = P(g);
    if (d.type === 'skill' && !d.potion) { p.skillN = (p.skillN || 0) + 1; if (p.skillN === 3 && p.st.mheart) { g.energy(1); if (p.st.mheart > 1) g.draw(1); } }
    if (d.id === 'p_fire') p.fireN = (p.fireN || 0) + 1;
    if (d.potion && p.st.wnotes && !p.wnT) { p.wnT = 1; g.draw(p.st.wnotes); }
    if (d.type === 'atk' && p.st.kaura && sw(g)) { const a = g.alive(); if (a.length) g.hitE(a[Math.floor(Math.random() * a.length)], sw(g) * (p.st.zen ? 3 : 2)); }
    if (d.type === 'atk') { p.combo = (p.combo || 0) + 1; if (p.combo === 3 && p.st.quick) { g.energy(1); if (p.st.quick > 1) g.draw(1); } if (p.combo >= 3 && g.has('manual') && !p.manU) { p.manU = 1; p.manualD = 1; } }
  },
  /* 胜利后 */
  victory() { return null; },
  /* 角色按钮 */
  actions(g) { const p = P(g), out = [], c = p.cat;
    if (c) { if (c.down) out.push({ id: 'x', label: '团子倒地', dis: 1 }); else for (const [k, n] of [['guard', '护卫'], ['pounce', '扑击']]) out.push({ id: 'cmd_' + k, label: n, on: c.cmd === k, dis: c.set && c.cmd !== k }); }
    if (g.R.char === 'sylvie') out.push({ id: 'drake', label: p.st.dragon ? `霜龙 ${p.st.dragon} 回合` : `变身（龙血 ${p.st.dblood || 0}/8）`, dis: p.st.dragon || (p.st.dblood || 0) < 8 || (p.drN || 0) >= 2, on: !!p.st.dragon });
    return out; },
  /* 执行按钮：返回需要选目标的种类 */
  act(g, id, val) { const p = P(g), c = p.cat;
    if (id.startsWith('cmd_') && c && !c.down) { const k = id.slice(4); if (c.set && c.cmd !== k) return; if (k === 'pounce' && val == null) return 'enemy'; c.cmd = k; c.set = 1; if (k === 'pounce') c.pt = val; return; }
    if (id === 'drake' && (p.st.dblood || 0) >= 8 && !p.st.dragon && (p.drN || 0) < 2) { p.st.dragon = 3; delete p.st.dblood; p.drN = (p.drN || 0) + 1; g.alive().forEach(e => { if (e.st.fburn) e.st.fburn *= 2; }); if (p.st.aval) g.block(8, true); if (p.st.dheart) { g.energy(p.st.dheart); g.draw(1); } if (g.has('horn') && !p.hornU) { p.hornU = 1; g.block(8, true); } g.attackAll(10); g.note('霜龙形态！'); return; } },
  /* 机器人用的按钮策略 */
  bot(g, incoming) { const p = P(g), c = p.cat, a = g.alive(); if (!a.length) return;
    if (c && !c.down && !c.set) { const low = [...a].sort((x, y) => x.hp - y.hp)[0]; if (incoming >= 12 && c.hp > 3) MECH.act(g, 'cmd_guard'); else MECH.act(g, 'cmd_pounce', low.id); }
    if (g.R.char === 'sylvie') MECH.act(g, 'drake'); },
  /* 头顶显示：团子 */
  chips(g) { const p = P(g), out = [];
    if (p.cat) out.push({ h: p.cat.down ? '<span>团子倒地</span>' : `<span>团子</span> ${p.cat.hp}/${p.cat.max} · <span>${{ guard: '护卫', pounce: '扑击' }[p.cat.cmd]}</span>`, c: '#ffc0e0', tip: `团子 ${g.R.cat ? g.R.cat.lv : 1} 级，攻击 ${p.cat.atk}` });
    return out; },
  rack() { return null; },
};
