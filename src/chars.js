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
/* ======================= 艾琳 · 元素位 =======================
   三个元素位开场是火、水、风。写入新元素时挤掉最早的一格（简化：DS 原案是玩家选一格替换）。
   祈唤：按当前三格的组合，把对应法术放进手牌（0 费、消耗、回合结束没打就消失），元素保留。每回合最多祈唤 3 次。 */
const EL = ['火', '水', '风'];
const btn = h => `<button class="btn">${h}</button>`;
export const RECIPE = { 火火火: 'sp_meteor', 火火水: 'sp_steam', 火火风: 'sp_whirl', 火水水: 'sp_warm', 火水风: 'sp_prism', 火风风: 'sp_arrow', 水水水: 'sp_mirror', 水水风: 'sp_fog', 水风风: 'sp_wave', 风风风: 'sp_gate' };
export const elKey = el => [...el].sort((a, b) => EL.indexOf(a) - EL.indexOf(b)).join('');
const kinds = g => new Set(P(g).el || []).size;
function writeEl(g, x) {
  const p = P(g); p.el = p.el || [...EL]; p.el.shift(); p.el.push(x); elCheck(g);
}
function elCheck(g) { const p = P(g);
  if (kinds(g) === 3 && !p.noteT && p.st.enote) { p.noteT = 1; g.draw(1); if (p.st.enote > 1) g.block(3); }
  if (kinds(g) === 1 && g.has('lens') && !p.lensU) { p.lensU = 1; g.block(6, true); }
}
function invoke(g, free) {
  const p = P(g); p.el = p.el || [...EL];
  if (!free && (p.invN || 0) >= 3) { g.note('本回合已祈唤 3 次'); return false; }
  if (g.handSize() >= 10) { g.note('手牌满了'); return false; }
  if (!free) p.invN = (p.invN || 0) + 1; g.addHand(RECIPE[elKey(p.el)]); return true;
}
const elPick = g => EL.map(x => ({ val: x, html: btn(`<span>写入</span> <span>${x}</span>`) }));
const elBot = (g, opts) => { const el = P(g).el || EL, c = x => el.filter(y => y === x).length; return [...opts].sort((a, b) => c(b.val) - c(a.val))[0]; };
const spell = (name, type, tgt, desc, play) => ({ ch: 'erin', spell: 1, name, type, rar: 'gen', cost: [0, 0], icon: type === 'atk' ? 'ic_flame' : 'ic_water', tgt, exhaust: 1, ethereal: 1, desc: () => desc + '回合结束没打出就消失。消耗。', play });
const ERIN = {
  sp_meteor: spell('陨星', 'atk', 'one', '造成 30 点伤害。', (g, u, t) => g.attack(t, 30)),
  sp_steam: spell('蒸爆', 'atk', 'all', '对所有敌人造成 14 点伤害，给予 1 层虚弱。', g => { g.attackAll(14); g.applyAll('weak', 1); }),
  sp_whirl: spell('火旋', 'atk', 'one', '造成 16 点伤害，给予 2 层易伤。', (g, u, t) => { g.attack(t, 16); g.apply(live(g, t), 'vuln', 2); }),
  sp_warm: spell('沸雾', 'atk', 'all', '对所有敌人造成 8 点伤害，给予 2 层虚弱。', g => { g.attackAll(8); g.applyAll('weak', 2); }),
  sp_prism: spell('虹闪', 'atk', 'one', '造成 14 点伤害，给予 1 层易伤，抽 1 张牌。', (g, u, t) => { g.attack(t, 14); g.apply(live(g, t), 'vuln', 1); g.draw(1); }),
  sp_arrow: spell('炎矢', 'atk', 'one', '造成 9 点伤害 3 次。', (g, u, t) => g.attack(t, 9, 3)),
  sp_mirror: spell('冰镜', 'skill', 'self', '获得 22 点格挡。', g => g.block(22)),
  sp_fog: spell('寒雾', 'skill', 'all', '获得 10 点格挡，给予所有敌人 2 层虚弱。', g => { g.block(10); g.applyAll('weak', 2); }),
  sp_wave: spell('冰缚', 'skill', 'one', '给予 2 层虚弱和 2 层易伤，抽 1 张牌。', (g, u, t) => { g.apply(t, 'weak', 2); g.apply(t, 'vuln', 2); g.draw(1); }),
  sp_gate: spell('风门', 'skill', 'self', '抽 2 张牌，得到 1 点能量（每回合只有第一张风门给能量）。', g => { g.draw(2); if (!P(g).gateT) { P(g).gateT = 1; g.energy(1); } }),
  e_spark: { ch: 'erin', name: '火种', type: 'atk', rar: 'start', cost: [1, 1], icon: 'icons2/n_e_spark', tgt: 'one', desc: u => `造成 ${v(u, 9, 12)} 点伤害。写入火。`, play: (g, u, t) => { g.attack(t, v(u, 9, 12)); writeEl(g, '火'); } },
  e_ripple: { ch: 'erin', name: '水纹', type: 'skill', rar: 'start', cost: [1, 1], icon: 'icons2/n_e_ripple', tgt: 'self', desc: u => `获得 ${v(u, 8, 11)} 点格挡。写入水。`, play: (g, u) => { g.block(v(u, 8, 11)); writeEl(g, '水'); } },
  e_invoke: { ch: 'erin', invoke: 1, name: '初阶祈唤', type: 'skill', rar: 'start', cost: [0, 0], icon: 'icons2/n_e_invoke', tgt: 'self', desc: u => `${v(u, '', '获得 3 点格挡，')}祈唤：把当前元素组合的法术放进手牌。`, play: (g, u) => { if (u) g.block(3); invoke(g); } },
  e_needle: { ch: 'erin', name: '追风针', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_needle', tgt: 'one', desc: u => `造成 ${v(u, 9, 12)} 点伤害。写入风。`, play: (g, u, t) => { g.attack(t, v(u, 9, 12)); writeEl(g, '风'); } },
  e_steamshot: { ch: 'erin', name: '蒸汽弹', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_steamshot', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 5, 7)} 点伤害；元素位里同时有火和水时改为 ${v(u, 7, 9)} 点。`, play: (g, u) => { const el = P(g).el || EL; g.attackAll(el.includes('火') && el.includes('水') ? v(u, 7, 9) : v(u, 5, 7)); } },
  e_tricolor: { ch: 'erin', name: '三色光', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_tricolor', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害。三种元素齐全时抽 1 张牌。`, play: (g, u, t) => { g.attack(t, v(u, 8, 11)); if (kinds(g) === 3) g.draw(1); } },
  e_icewall: { ch: 'erin', name: '冰幕', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_icewall', tgt: 'self', desc: u => `获得 ${v(u, 7, 10)} 点格挡。写入水。`, play: (g, u) => { g.block(v(u, 7, 10)); writeEl(g, '水'); } },
  e_ignite: { ch: 'erin', name: '点火', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_e_ignite', tgt: 'self', exhaust: 1, desc: u => `写入火，抽 1 张牌。${v(u, '', '获得 3 点格挡。')}消耗。`, play: (g, u) => { writeEl(g, '火'); g.draw(1); if (u) g.block(3); } },
  e_turn: { ch: 'erin', name: '换向', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_e_turn', tgt: 'self', exhaust: 1, desc: u => `写入风，获得 ${v(u, 3, 5)} 点格挡。消耗。`, play: (g, u) => { writeEl(g, '风'); g.block(v(u, 3, 5)); } },
  e_attune: { ch: 'erin', name: '调和', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_attune', tgt: 'self', pick: elPick, pickT: '选择要写入的元素', bot: elBot, desc: u => `写入任一元素，抽 2 张牌。${v(u, '', '获得 3 点格挡。')}`, play: (g, u, t, c, k) => { writeEl(g, k || '火'); g.draw(2); if (u) g.block(3); } },
  e_chant: { ch: 'erin', invoke: 1, name: '防御咏唱', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_chant', tgt: 'self', desc: u => `获得 ${v(u, 5, 8)} 点格挡。把最早一格的元素再写入一次（三种元素不变、顺序轮转），然后祈唤。`, play: (g, u) => { g.block(v(u, 5, 8)); const el = P(g).el || EL; writeEl(g, el[0]); invoke(g); } },
  e_twin: { ch: 'erin', name: '双轨射线', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_e_twin', tgt: 'one', desc: u => `造成 ${v(u, 8, 10)} 点伤害。元素位里恰好有两种元素时，再造成 ${v(u, 5, 6)} 点伤害。`, play: (g, u, t) => { g.attack(t, v(u, 8, 10)); if (kinds(g) === 2) g.attack(t, v(u, 5, 6)); } },
  e_pure: { ch: 'erin', name: '纯相爆发', type: 'atk', rar: 'u', cost: [2, 2], icon: 'icons2/n_e_pure', tgt: 'one', desc: u => `造成 ${v(u, 17, 21)} 点伤害；三格元素相同时改为 ${v(u, 26, 31)} 点。`, play: (g, u, t) => g.attack(t, kinds(g) === 1 ? v(u, 26, 31) : v(u, 17, 21)) },
  e_refill: { ch: 'erin', name: '回填', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_e_refill', tgt: 'self', desc: u => `把最早的一格改成最新一格的元素，获得 ${v(u, 8, 11)} 点格挡。`, play: (g, u) => { const p = P(g); p.el = p.el || [...EL]; p.el[0] = p.el[2]; elCheck(g); g.block(v(u, 8, 11)); } },
  e_impro: { ch: 'erin', invoke: 1, name: '临场变式', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_e_impro', tgt: 'self', pick: elPick, pickT: '选择要写入的元素', bot: elBot, desc: u => `${v(u, '', '抽 1 张牌，')}写入任一元素，然后祈唤。`, play: (g, u, t, c, k) => { if (u) g.draw(1); writeEl(g, k || '火'); invoke(g); } },
  e_split: { ch: 'erin', name: '分流', type: 'skill', rar: 'u', cost: [0, 0], icon: 'icons2/n_e_split', tgt: 'self', exhaust: 1, pick: elPick, pickT: '选择要写入的元素', bot: elBot, desc: u => `写入任一元素，得到 1 点能量。${v(u, '', '获得 3 点格挡。')}消耗。`, play: (g, u, t, c, k) => { writeEl(g, k || '火'); g.energy(1); if (u) g.block(3); } },
  e_notes: { ch: 'erin', name: '元素笔记', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_e_notes', tgt: 'self', desc: u => `每回合第一次凑齐三种不同元素时，抽 1 张牌${v(u, '', '，获得 3 点格挡')}。`, play: (g, u) => { P(g).st.enote = u ? 2 : 1; } },
  e_rewrite: { ch: 'erin', invoke: 1, name: '复写仪式', type: 'skill', rar: 'r', cost: [2, 1], icon: 'icons2/n_e_rewrite', tgt: 'self', exhaust: 1, pick: elPick, pickT: '第二次祈唤前写入哪种元素', bot: elBot, desc: () => `祈唤；再写入任一元素，再祈唤一次（这张不占每回合 3 次的上限）。消耗。`, play: (g, u, t, c, k) => { invoke(g, true); writeEl(g, k || '火'); invoke(g, true); } },
  e_crown: { ch: 'erin', name: '三相冠冕', type: 'power', rar: 'r', cost: [1, 1], icon: 'icons2/n_e_crown', tgt: 'self', desc: u => `每回合打出第一张三格相同的法术（陨星、冰镜、风门）后，获得 ${v(u, 5, 8)} 点格挡，抽 1 张牌。`, play: (g, u) => { P(g).st.ecrown = v(u, 5, 8); } },
  e_seasons: { ch: 'erin', name: '四季轮转', type: 'power', rar: 'r', cost: [1, 1], icon: 'icons2/n_e_seasons', tgt: 'self', desc: u => `每回合第一次打出和上一张法术配方不同的法术后，对所有敌人造成 ${v(u, 6, 8)} 点伤害，抽 1 张牌。`, play: (g, u) => { P(g).st.eseason = v(u, 6, 8); } },
};

/* ======================= 顾清寒 · 飞剑 =======================
   飞剑最多 6 把。留在身上：每把让攻击牌第一击 +1，回合结束每 2 把给 1 点格挡。射出去：每把单独造成伤害（一般 4 点），射完就离开身上。
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
  g_flow: { ch: 'gu', name: '剑气护体', type: 'power', rar: 'u', cost: [1, 0], icon: 'icons2/n_g_flow', tgt: 'self', desc: u => `回合结束时每把飞剑都给 1 点格挡（原来是每 2 把 1 点）。`, play: g => { P(g).st.gflow = 1; } },
  g_myriad: { ch: 'gu', name: '万剑归一', type: 'atk', rar: 'r', cost: [2, 2], icon: 'icons2/n_g_myriad', tgt: 'one', desc: u => `射出全部飞剑，每把造成 ${v(u, 9, 12)} 点伤害。`, play: (g, u, t) => fire(g, t, 'all', v(u, 9, 12)) },
  g_rev: { ch: 'gu', name: '剑意循环', type: 'power', rar: 'r', cost: [2, 1], icon: 'icons2/n_g_rev', tgt: 'self', desc: u => `每射出 1 把飞剑抽 1 张牌（每回合最多 3 张）；飞剑归零时再得到 2 把。`, play: g => { P(g).st.grev = 1; } },
  g_dual: { ch: 'gu', name: '剑意', type: 'power', rar: 'u', cost: [2, 1], icon: 'icons2/n_g_dual', tgt: 'self', desc: u => `每回合第一次射出飞剑后，得到 1 点能量。`, play: g => { P(g).st.dualst = 1; } },
};

/* ======================= 希尔薇 · 龙血 / 霜龙形态 =======================
   龙血最多 8 点。攒满 8 点后点「变身」：霜龙形态持续本回合和接下来两个回合（每场最多 2 次），变身时花光龙血。
   霜龙形态：变身时对所有敌人造成 14 点伤害；攻击牌的第一击 +8；每个敌方回合第一段打穿格挡的伤害 -4。退形后虚弱 1。
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
   团子第一章 1 级、第二章 2 级。分离时每回合免费下一个指令：护卫（替米娅挡下一次攻击的前 5 点）或扑击（回合结束攻击目标）。
   界面上的「合体 / 分离」按钮每回合可以免费切换一次。合体时团子不在场、每回合回复 1 生命；【猫】牌合体时更强。米娅攻击 + 团子攻击力的三分之一，每回合开始 3 点格挡。
   驯养牌给团子的强化本场有效；灵魂恩赐（打完精英或 Boss 三选一）整局有效。 */
function catDid(g, k) { const p = P(g), c = p.cat; if (c.did[k]) return; c.did[k] = 1; if (p.st.mjump) g.block(p.st.mjump, true); if (Object.keys(c.did).length >= 2 && g.has('lynx') && !p.lynxU) { p.lynxU = 1; p.lynxD = 1; } }
const CATLV = [null, { max: 16, atk: 7 }, { max: 21, atk: 9 }, { max: 26, atk: 11 }];
const cat = g => P(g).cat;
function catFall(g) { const p = P(g), c = cat(g); c.hp = 0; c.merged = 0; if (c.hold) { c.hold = 0; c.hp = 6; g.note('团子又站起来了'); return; } if (hasBoon(g, 'nine') && !p.nineB) { p.nineB = 1; c.hp = 5; g.note('九命猫：团子又站起来了'); return; } c.down = 1; g.note('团子倒下了'); }
const merged = g => { const c = cat(g); return !!(c && !c.down && c.merged); };
function setForm(g, f) { const c = cat(g); if (!c || c.down) return; const m = f === 'cat' ? 1 : 0; if (!!c.merged !== !!m) { c.merged = m; g.note(m ? '合体！' : '分离'); } }
const BOONS = { claw: ['利爪', '团子攻击 +2'], fur: ['厚毛', '团子生命上限 +6'], guard: ['守护本能', '护卫多挡 4 点'], hunt: ['猎手', '扑击附带 1 层虚弱'], agile: ['敏捷', '每场第一回合团子额外扑击一次'], heart: ['心灵相通', '合体时每回合格挡从 3 变 6'], nine: ['九命猫', '每场第一次倒地时以 5 生命站起来'], gift: ['猫之馈赠', '战斗胜利时团子在场，额外 +5 金币'] };
const hasBoon = (g, k) => (g.R.boons || []).includes(k);
const catGuarded = g => { const c = cat(g); return !!(c && !c.down && (c.took || 0) > 0); }; /* 上一轮护卫时真的挡下过伤害 */
const catUp = g => cat(g) && !cat(g).down;
const healCat = (g, n) => { const c = cat(g); if (!c || c.down) return 0; const k = Math.min(n, c.max - c.hp); c.hp += k; return k; };
function rageLock(g) { const c = cat(g), a = g.alive(); if (!c || c.down || !a.length) return; c.cmd = 'pounce'; c.pt = [...a].sort((x, y) => x.hp - y.hp)[0].id; c.set = 1; }
const isPT = (g, t) => t && catUp(g) && cat(g).cmd === 'pounce' && cat(g).pt === t.id;
const MIA = {
  m_staff: { ch: 'mia', name: '猫杖点射', type: 'atk', rar: 'start', cost: [1, 1], icon: 'icons2/n_m_staff', tgt: 'one', form: 'hum', desc: u => `造成 ${v(u, 8, 11)} 点伤害；团子的扑击目标改成这个敌人。`, play: (g, u, t, c, k) => { ((g, u, t) => { g.attack(t, v(u, 8, 11)); const c = cat(g); if (c && !c.down && t && !t.dead) c.pt = t.id; })(g, u, t, c, k); } },
  m_side: { ch: 'mia', name: '并肩防守', type: 'skill', rar: 'start', cost: [1, 1], icon: 'icons2/n_m_side', tgt: 'self', form: 'hum', desc: u => `获得 ${v(u, 7, 10)} 点格挡；团子本轮护卫多挡 3 点。`, play: (g, u, t, c, k) => { ((g, u) => { g.block(v(u, 7, 10)); const c = cat(g); if (c) c.gB = (c.gB || 0) + 3; })(g, u, t, c, k); } },
  m_snack: { ch: 'mia', name: '猫爪拳', type: 'atk', rar: 'start', cost: [1, 1], icon: 'icons2/n_m_snack', tgt: 'one', form: 'cat', desc: u => `【猫】造成 ${v(u, 6, 8)} 点伤害；合体时再 +3。`, play: (g, u, t, c, k) => { g.attack(t, v(u, 6, 8) + (merged(g) ? 3 : 0)); } },
  m_flank: { ch: 'mia', name: '绕背', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_m_flank', tgt: 'one', desc: u => `造成 ${v(u, 7, 9)} 点伤害；目标是团子的扑击目标时再 +4。`, play: (g, u, t) => g.attack(t, v(u, 7, 9) + (isPT(g, t) ? 4 : 0)) },
  m_bell: { ch: 'mia', name: '铃铛波', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_m_bell', tgt: 'all', form: 'hum', desc: u => `对所有敌人造成 ${v(u, 5, 7)} 点伤害；上一轮团子护卫挡下过伤害时再 +2。`, play: (g, u, t, c, k) => { ((g, u) => g.attackAll(v(u, 5, 7) + (catGuarded(g) ? 2 : 0)))(g, u, t, c, k); } },
  m_rope: { ch: 'mia', name: '弹跳绳', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_m_rope', tgt: 'self', form: 'hum', desc: u => `获得 ${v(u, 7, 10)} 点格挡；本回合可以再改一次团子的指令。`, play: (g, u, t, c, k) => { ((g, u) => { g.block(v(u, 7, 10)); const c = cat(g); if (c) c.set = 0; })(g, u, t, c, k); } },
  m_scarf: { ch: 'mia', name: '猫粮', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_m_scarf', tgt: 'self', desc: u => `驯养：团子本场生命上限 +${v(u, 5, 8)}，并回复 ${v(u, 5, 8)}。`, play: (g, u) => { const c = cat(g); if (c) { c.max += v(u, 5, 8); healCat(g, v(u, 5, 8)); } } },
  m_whistle: { ch: 'mia', name: '追踪哨', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_m_whistle', tgt: 'self', exhaust: 1, desc: u => `本回合团子扑击 +${v(u, 3, 5)} 点伤害，抽 1 张牌。消耗。`, play: (g, u) => { const c = cat(g); if (c) c.pB = (c.pB || 0) + v(u, 3, 5); g.draw(1); } },
  m_nest: { ch: 'mia', name: '暖窝', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_m_nest', tgt: 'self', form: 'hum', desc: u => `获得 ${v(u, 8, 11)} 点格挡，团子回复 ${v(u, 4, 6)} 生命。`, play: (g, u, t, c, k) => { ((g, u) => { g.block(v(u, 8, 11)); healCat(g, v(u, 4, 6)); })(g, u, t, c, k); } },
  m_duck: { ch: 'mia', name: '铃铛项圈', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_m_duck', tgt: 'self', desc: u => `驯养：团子本场护卫多挡 4 点；米娅获得 ${v(u, 4, 7)} 点格挡。`, play: (g, u) => { const c = cat(g); if (c) c.gP = (c.gP || 0) + 4; g.block(v(u, 4, 7)); } },
  m_pat: { ch: 'mia', name: '递零食', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_m_pat', tgt: 'self', form: 'hum', desc: u => `团子回复 ${v(u, 4, 6)} 生命，米娅获得 ${v(u, 5, 7)} 点格挡。`, play: (g, u, t, c, k) => { ((g, u) => { healCat(g, v(u, 4, 6)); g.block(v(u, 5, 7)); })(g, u, t, c, k); } },
  m_pincer: { ch: 'mia', name: '夹击', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_pincer', tgt: 'one', desc: u => `造成 ${v(u, 9, 12)} 点伤害；目标是团子的扑击目标时给予 1 层易伤。`, play: (g, u, t) => { const pt = isPT(g, t); g.attack(t, v(u, 9, 12)); if (pt) g.apply(live(g, t), 'vuln', 1); } },
  m_revenge: { ch: 'mia', name: '护主反扑', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_revenge', tgt: 'one', form: 'hum', desc: u => `造成 ${v(u, 8, 10)} 点伤害，再加上一轮团子替你挡下的伤害（最多 +8）。`, play: (g, u, t, c, k) => { ((g, u, t) => { const c = cat(g); g.attack(t, v(u, 8, 10) + Math.min(8, (c && c.took) || 0)); })(g, u, t, c, k); } },
  m_swap: { ch: 'mia', name: '九命', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_swap', tgt: 'self', exhaust: 1, form: 'cat', desc: u => `【猫】获得 ${v(u, 10, 13)} 点格挡；本场合体时受到致命伤害，改为分离：团子替你倒下，米娅保留 1 生命。消耗。`, play: (g, u, t, c, k) => { ((g, u) => { g.block(v(u, 10, 13)); P(g).nineL = 1; })(g, u, t, c, k); } },
  m_mint: { ch: 'mia', name: '猫薄荷', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_mint', tgt: 'self', desc: u => `驯养：团子本场攻击 +1，回复 ${v(u, 4, 6)} 生命。`, play: (g, u) => { const c = cat(g); if (c) { c.atk += 1; healCat(g, v(u, 4, 6)); } } },
  m_jump: { ch: 'mia', name: '野性', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_jump', tgt: 'self', desc: u => `合体时，攻击的加成从团子攻击力的三分之一变成三分之二${v(u, '', '；合体时每回合多 3 点格挡')}。`, play: (g, u) => { P(g).st.wild = u ? 2 : 1; } },
  m_cloud: { ch: 'mia', name: '云步', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_cloud', tgt: 'self', form: 'cat', desc: u => `【猫】获得 ${v(u, 10, 13)} 点格挡；合体时再 +5。`, play: (g, u, t, c, k) => { ((g, u) => g.block(v(u, 10, 13) + (merged(g) ? 5 : 0)))(g, u, t, c, k); } },
  m_bigpounce: { ch: 'mia', name: '大猫扑杀', type: 'skill', rar: 'r', cost: [2, 2], icon: 'icons2/n_m_bigpounce', tgt: 'self', exhaust: 1, desc: u => `本回合团子的扑击改为造成 ${v(u, 14, 18)} 点伤害 2 次。消耗。`, play: (g, u) => { const c = cat(g); if (c) c.big = v(u, 14, 18); } },
  m_hold: { ch: 'mia', name: '绝不松手', type: 'skill', rar: 'r', cost: [1, 1], icon: 'icons2/n_m_hold', tgt: 'self', exhaust: 1, desc: u => `获得 ${v(u, 10, 13)} 点格挡；团子倒地时，带 6 生命回到场上。消耗。`, play: (g, u) => { g.block(v(u, 10, 13)); const c = cat(g); if (c && c.down) { c.down = 0; c.hp = 6; c.merged = 0; } else if (c) c.hold = 1; } },
  m_gate: { ch: 'mia', name: '云猫守门', type: 'power', rar: 'r', cost: [2, 1], icon: 'icons2/n_m_gate', tgt: 'self', desc: u => `团子护卫多挡 3 点；护卫时真的受了伤，下回合米娅抽 1 张牌。`, play: g => { P(g).st.mgate = 1; } },
  m_sac: { ch: 'mia', name: '猫神降临', type: 'atk', rar: 'r', cost: [2, 2], icon: 'icons2/n_m_sac', tgt: 'all', exhaust: 1, form: 'cat', desc: u => `【猫】对所有敌人造成团子攻击力 ×${v(u, 3, 4)} 的伤害。消耗。`, play: (g, u, t, c, k) => { ((g, u) => { const c = cat(g); g.attackAll((c ? c.atk : 7) * v(u, 3, 4)); })(g, u, t, c, k); } },
};

/* ======================= 绯月 · 费血 / 召唤 =======================
   没有额外资源，直接花生命。绯月和召唤物造成的伤害 1/5 自动回成生命（每场合计最多 30）。
   召唤物：血蝠最多 8 只，每只回合结束打随机敌人 3 点，敌人每次行动会打掉 1 只；大召唤位同时只能 1 个——血骑士（每回合替你挡下第一次攻击）或初拥转化的眷属。 */
const bats = g => P(g).bats || 0;
function healLS(g, k) { const p = P(g); k = Math.min(k, 20 - (p.ls || 0)); if (k <= 0) return 0; if (g.has('redpin') && !p.pinU) { p.pinU = 1; k = Math.min(k + 2, 20 - (p.ls || 0)); } const got = g.heal(k) || 0; if (got > 0) { p.ls = (p.ls || 0) + got; p.lsT = 1; if (p.st.vhunger) g.block(p.st.vhunger, true); } return got; }
function lsHeal(g, dealt) { const p = P(g); if (!(dealt > 0)) return; p.lsC = (p.lsC || 0) + dealt; const k = Math.floor(p.lsC / 5); p.lsC %= 5; if (k) healLS(g, k); }
const fa = (g, t, n, x = 1) => { const d = g.attack(t, n, x); lsHeal(g, d); return d; };
const faAll = (g, n, x = 1) => { const d = g.attackAll(n, x); lsHeal(g, d); return d; };
const bite = (g, d, f) => { if (d > 0) healLS(g, Math.floor(d * f)); };
function bleed(g, n) { const p = P(g); if (g.R.hp <= 1) return; n = Math.min(n, g.R.hp - 1); g.loseHp(n); p.lostT = (p.lostT || 0) + n; p.lostF = (p.lostF || 0) + n;
  if (p.st.vdawn && !p.vdT) { p.vdT = 1; g.energy(1); }
  if (g.has('ribbon') && !p.ribU) { p.ribU = 1; addBats(g, 2); } }
function addBats(g, n) { const p = P(g); p.bats = Math.min(8, bats(g) + n); if (p.bats >= 8 && g.has('cup') && !p.cupU) { p.cupU = 1; g.draw(2); } }
function summonKnight(g, hp) { const p = P(g); if (p.big && p.big.kind === 'knight') { p.big.max = Math.max(p.big.max, hp); p.big.hp = p.big.max; } else p.big = { kind: 'knight', name: '血骑士', hp, max: hp, atk: 8 }; }
function embrace(g, t, cap) { const p = P(g); if (!t || t.dead || isBig(t) || t.hp > cap) { g.note('无法转化这个敌人'); return; }
  const atk = Math.max(4, ...Object.values(t.d.moves || {}).map(m => m.d || 0)); p.big = { kind: 'thrall', name: t.d.name, key: t.key, hp: t.hp, max: t.max, atk };
  t.fled = 1; t.dead = true; t.hp = 0; g.note(`${t.d.name} 成为了眷属`); }
function summonsAttack(g) { const p = P(g), fh = p.fh; p.fh = 0; let d = 0;
  if (bats(g)) p.batFx = Date.now();
  for (let i = 0; i < bats(g); i++) { const a = g.alive(); if (!a.length) break; d += g.attack(a[Math.floor(Math.random() * a.length)], 3 + (p.batB || 0)); }
  if (p.big && p.big.hp > 0) { const a = g.alive(); if (a.length) d += g.attack(a[0], p.big.atk); p.bigFx = Date.now(); }
  p.fh = fh; lsHeal(g, d); if (p.st.bpact) bite(g, d, .5); }
const FEI = {
  f_claw: { ch: 'feiyue', name: '红爪', type: 'atk', rar: 'start', cost: [1, 1], icon: 'icons2/n_f_claw', tgt: 'one', desc: u => `造成 ${v(u, 9, 12)} 点伤害。`, play: (g, u, t) => fa(g, t, v(u, 9, 12)) },
  f_sleeve: { ch: 'feiyue', name: '挽袖', type: 'skill', rar: 'start', cost: [1, 1], icon: 'icons2/n_f_sleeve', tgt: 'self', desc: u => `失去 2 点生命，获得 ${v(u, 10, 13)} 点格挡。`, play: (g, u) => { bleed(g, 2); g.block(v(u, 10, 13)); } },
  f_bats: { ch: 'feiyue', name: '放蝠', type: 'skill', rar: 'start', cost: [1, 1], icon: 'icons2/n_f_bats', tgt: 'self', desc: u => `失去 2 点生命，召唤 ${v(u, 3, 4)} 只血蝠。`, play: (g, u) => { bleed(g, 2); addBats(g, v(u, 3, 4)); } },
  f_line: { ch: 'feiyue', name: '血线', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_f_line', tgt: 'one', desc: u => `造成 ${v(u, 8, 10)} 点伤害；生命低于一半时再 +${v(u, 8, 10)}。`, play: (g, u, t) => fa(g, t, v(u, 8, 10) + (g.R.hp * 2 < g.R.maxHp ? v(u, 8, 10) : 0)) },
  f_moon: { ch: 'feiyue', name: '血月飞刃', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_f_moon', tgt: 'all', desc: u => `失去 2 点生命，对所有敌人造成 ${v(u, 7, 9)} 点伤害。`, play: (g, u) => { bleed(g, 2); faAll(g, v(u, 7, 9)); } },
  f_gap: { ch: 'feiyue', name: '寻隙', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_f_gap', tgt: 'one', desc: u => `造成 ${v(u, 7, 10)} 点伤害；打穿目标的格挡时获得 5 点格挡。`, play: (g, u, t) => { const b = t && t.block; fa(g, t, v(u, 7, 10)); if (b && t && !t.block) g.block(5); } },
  f_drink: { ch: 'feiyue', name: '夜饮', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_f_drink', tgt: 'one', desc: u => `造成 ${v(u, 7, 10)} 点伤害，这一击伤害的一半回成生命。`, play: (g, u, t) => bite(g, g.attack(t, v(u, 7, 10)), .5) },
  f_gauze: { ch: 'feiyue', name: '纱布', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_f_gauze', tgt: 'self', desc: u => `获得 ${v(u, 8, 11)} 点格挡；生命低于一半时再 +4。`, play: (g, u) => g.block(v(u, 8, 11) + (g.R.hp * 2 < g.R.maxHp ? 4 : 0)) },
  f_shade: { ch: 'feiyue', name: '蝠影', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_f_shade', tgt: 'self', desc: u => `召唤 2 只血蝠，获得 ${v(u, 4, 7)} 点格挡。`, play: (g, u) => { addBats(g, 2); g.block(v(u, 4, 7)); } },
  f_snap: { ch: 'feiyue', name: '响指', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_f_snap', tgt: 'self', desc: u => `失去 2 点生命，抽 ${v(u, 2, 3)} 张牌。`, play: (g, u) => { bleed(g, 2); g.draw(v(u, 2, 3)); } },
  f_thirst: { ch: 'feiyue', name: '血刃', type: 'atk', rar: 'c', cost: [0, 0], icon: 'icons2/n_f_thirst', tgt: 'one', desc: u => `失去 3 点生命，造成 ${v(u, 10, 13)} 点伤害。`, play: (g, u, t) => { bleed(g, 3); fa(g, t, v(u, 10, 13)); } },
  f_curtain: { ch: 'feiyue', name: '血骑士', type: 'skill', rar: 'u', cost: [2, 2], icon: 'icons2/n_f_curtain', tgt: 'self', desc: u => `失去 4 点生命，召唤血骑士（生命 ${v(u, 20, 26)}，攻击 8，每回合替你挡下第一次攻击）；已经在场就回满它的生命。`, play: (g, u) => { bleed(g, 4); summonKnight(g, v(u, 20, 26)); } },
  f_vein: { ch: 'feiyue', name: '破脉', type: 'atk', rar: 'u', cost: [2, 2], icon: 'icons2/n_f_vein', tgt: 'one', desc: u => `失去 5 点生命，造成 ${v(u, 26, 32)} 点伤害。`, play: (g, u, t) => { bleed(g, 5); fa(g, t, v(u, 26, 32)); } },
  f_wing: { ch: 'feiyue', name: '翼刃', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_f_wing', tgt: 'one', desc: u => `造成 ${v(u, 5, 7)} 点伤害 2 次；有血蝠时打 3 次。`, play: (g, u, t) => fa(g, t, v(u, 5, 7), bats(g) ? 3 : 2) },
  f_repay: { ch: 'feiyue', name: '借血还血', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_f_repay', tgt: 'one', desc: u => `造成 ${v(u, 9, 12)} 点伤害；本回合失去过生命时，这一击伤害的一半回成生命。`, play: (g, u, t) => { const d = g.attack(t, v(u, 9, 12)); if (P(g).lostT) bite(g, d, .5); else lsHeal(g, d); } },
  f_fold: { ch: 'feiyue', name: '血月号令', type: 'skill', rar: 'u', cost: [1, 0], icon: 'icons2/n_f_fold', tgt: 'self', desc: u => `所有召唤物立刻额外攻击一次。`, play: g => summonsAttack(g) },
  f_pulse: { ch: 'feiyue', name: '嗜血', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_f_pulse', tgt: 'self', desc: u => `本场每失去 10 点生命，攻击牌伤害 +1${v(u, '', '；现在获得 5 点格挡')}。`, play: (g, u) => { P(g).st.bloodlust = 1; if (u) g.block(5); } },
  f_vow: { ch: 'feiyue', name: '血契', type: 'power', rar: 'r', cost: [2, 1], icon: 'icons2/n_f_vow', tgt: 'self', desc: u => `召唤物造成伤害的一半回成生命（算进每场吸血上限）。`, play: g => { P(g).st.bpact = 1; } },
  f_swarm: { ch: 'feiyue', name: '万蝠降临', type: 'skill', rar: 'r', cost: [2, 1], icon: 'icons2/n_f_swarm', tgt: 'self', exhaust: 1, desc: u => `召唤血蝠到 8 只；本回合每只血蝠伤害 +2。消耗。`, play: g => { addBats(g, 8); P(g).batB = 2; } },
  f_dawn: { ch: 'feiyue', name: '血尽天明', type: 'power', rar: 'r', cost: [1, 0], icon: 'icons2/n_f_dawn', tgt: 'self', desc: u => `每回合第一次因为自己的牌失去生命时，得到 1 点能量。`, play: g => { P(g).st.vdawn = 1; } },
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
  k_descend: { ch: 'miko', name: '式神返魂', type: 'power', rar: 'r', cost: [2, 1], icon: 'icons2/n_k_descend', tgt: 'self', desc: u => `式神每挡下一次攻击，结界 +2${v(u, '', '；现在召唤 1 个式神')}。`, play: (g, u) => { P(g).st.shikiR = 1; if (u) MECH.shiki(g, 1); } },
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
  w_copy: { ch: 'witch', name: '炼金师之眼', type: 'power', rar: 'r', cost: [1, 1], icon: 'icons2/n_w_copy', tgt: 'self', desc: u => `每用炼金瓶打倒一个敌人，获得 5 金币，抽 1 张牌${v(u, '', '；现在随机获得 1 个炼金瓶')}。`, play: (g, u) => { P(g).st.aleye = 1; if (u) g.potion(1); } },
  w_cauldron: { ch: 'witch', name: '翻滚的坩埚', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_w_cauldron', tgt: 'all', desc: u => `给予所有敌人 ${v(u, 2, 3)} 层中毒，随机获得 1 个炼金瓶。`, play: (g, u) => { g.eachEnemy(e => g.poison(e, v(u, 2, 3))); g.potion(1); } },
  w_ignite: { ch: 'witch', name: '点燃', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_w_ignite', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害，获得 1 瓶火焰瓶。`, play: (g, u, t) => { g.attack(t, v(u, 8, 11)); g.potion(1, 'p_fire'); } },
  w_fireball: { ch: 'witch', name: '火球术', type: 'atk', rar: 'u', cost: [2, 2], icon: 'icons2/n_w_fireball', tgt: 'one', desc: u => `造成 ${v(u, 14, 18)} 点伤害；本回合每用过 1 瓶火焰瓶，再 +6。`, play: (g, u, t) => g.attack(t, v(u, 14, 18) + 6 * (P(g).fireN || 0)) },
  w_inferno: { ch: 'witch', name: '业火', type: 'power', rar: 'r', cost: [2, 1], icon: 'icons2/n_w_inferno', tgt: 'self', desc: () => `火焰瓶的伤害永久 +4。`, play: g => g.self('inferno', 4) },
  w_ember: { ch: 'witch', name: '余烬', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_w_ember', tgt: 'self', exhaust: 1, desc: u => `获得 ${v(u, 1, 2)} 瓶火焰瓶。消耗。`, play: (g, u) => g.potion(v(u, 1, 2), 'p_fire') },
  w_firewall: { ch: 'witch', name: '火墙', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_w_firewall', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 4, 6)} 点伤害，获得 ${v(u, 6, 8)} 点格挡；本回合用过火焰瓶时伤害再 +3。`, play: (g, u) => { g.attackAll(v(u, 4, 6) + ((P(g).fireN || 0) ? 3 : 0)); g.block(v(u, 6, 8)); } },
  w_toxblade: { ch: 'witch', name: '毒刃', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_w_toxblade', tgt: 'one', desc: u => `造成 ${v(u, 6, 8)} 点伤害，给予 ${v(u, 4, 5)} 层中毒。`, play: (g, u, t) => { g.attack(t, v(u, 6, 8)); g.poison(t, v(u, 4, 5)); } },
  w_spread: { ch: 'witch', name: '毒素扩散', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_w_spread', tgt: 'one', desc: u => `给予目标 ${v(u, 3, 4)} 层中毒，其他敌人各得到目标一半的中毒（最多 ${v(u, 6, 8)} 层）。`, play: (g, u, t) => { g.poison(t, v(u, 3, 4)); const n = Math.min(v(u, 6, 8), Math.floor((t.st.poison || 0) / 2)); if (n) g.alive().filter(e => e !== t).forEach(e => g.poison(e, n)); } },
  w_corrode: { ch: 'witch', name: '腐蚀', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_w_corrode', tgt: 'one', desc: u => `给予 ${v(u, 3, 5)} 层中毒和 1 层虚弱。`, play: (g, u, t) => { g.poison(t, v(u, 3, 5)); g.apply(t, 'weak', 1); } },
  w_nshade: { ch: 'witch', name: '颠茄', type: 'power', rar: 'r', cost: [1, 1], icon: 'icons2/n_w_nshade', tgt: 'self', desc: u => `每回合开始时，给中毒最多的敌人 ${v(u, 3, 5)} 层中毒。`, play: (g, u) => { P(g).st.nshade = v(u, 3, 5); } },
  w_reserve: { ch: 'witch', name: '库存清点', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_w_reserve', tgt: 'self', desc: u => `随机获得 ${v(u, 2, 3)} 个炼金瓶。`, play: (g, u) => g.potion(v(u, 2, 3)) },
};

/* ======================= 新角色扩充到 35 张 ======================= */
const NEW2 = {
  // ---- 艾琳：三同专精 / 混合应变 ----
  e_flare: { ch: 'erin', name: '闪焰', type: 'atk', rar: 'c', cost: [0, 0], icon: 'icons2/n_e_flare', tgt: 'one', desc: u => `造成 ${v(u, 4, 6)} 点伤害。写入火。`, play: (g, u, t) => { g.attack(t, v(u, 4, 6)); writeEl(g, '火'); } },
  e_mist: { ch: 'erin', name: '雾帘', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_e_mist', tgt: 'self', desc: u => `写入水，获得 ${v(u, 4, 6)} 点格挡。`, play: (g, u) => { writeEl(g, '水'); g.block(v(u, 4, 6)); } },
  e_gust: { ch: 'erin', name: '疾风', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_gust', tgt: 'self', desc: u => `写入风，抽 2 张牌。${v(u, '', '获得 3 点格挡。')}`, play: (g, u) => { writeEl(g, '风'); g.draw(2); if (u) g.block(3); } },
  e_prismshot: { ch: 'erin', name: '三棱射线', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_prismshot', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 5, 7)} 点伤害；三种元素齐全时抽 1 张牌。`, play: (g, u) => { g.attackAll(v(u, 5, 7)); if (kinds(g) === 3) g.draw(1); } },
  e_resonate: { ch: 'erin', invoke: 1, name: '元素共振', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_e_resonate', tgt: 'self', desc: u => `祈唤；三格元素相同时再抽 1 张牌。${v(u, '', '获得 4 点格挡。')}`, play: (g, u) => { if (u) g.block(4); const same = kinds(g) === 1; invoke(g); if (same) g.draw(1); } },
  e_focus: { ch: 'erin', name: '专注', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_e_focus', tgt: 'self', desc: u => `每回合开始时，再写入一次最新一格的元素${v(u, '', '，获得 3 点格挡')}。`, play: (g, u) => { P(g).st.efocus = u ? 2 : 1; } },
  e_mix: { ch: 'erin', name: '混合咒', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_e_mix', tgt: 'one', desc: u => `造成 ${v(u, 6, 8)} 点伤害；元素位里每有 1 种不同元素，再 +${v(u, 3, 4)}。`, play: (g, u, t) => g.attack(t, v(u, 6, 8) + kinds(g) * v(u, 3, 4)) },
  e_overload: { ch: 'erin', name: '元素过载', type: 'atk', rar: 'r', cost: [2, 2], icon: 'icons2/n_e_overload', tgt: 'one', desc: u => `造成 ${v(u, 8, 12)} 点伤害；本回合每打出过 1 张法术，再 +7。`, play: (g, u, t) => g.attack(t, v(u, 8, 12) + 7 * ((P(g).spells || []).length)) },
  e_reserve: { ch: 'erin', name: '元素储备', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_reserve', tgt: 'self', desc: u => `获得 ${v(u, 7, 10)} 点格挡；本回合打出过法术时再 +4。`, play: (g, u) => g.block(v(u, 7, 10) + ((P(g).spells || []).length ? 4 : 0)) },
  e_echo: { ch: 'erin', can: g => (P(g).spells || []).length > 0 && (P(g).invN || 0) < 3, name: '回响祈唤', type: 'skill', rar: 'r', cost: [1, 0], icon: 'icons2/n_e_echo', tgt: 'self', exhaust: 1, desc: () => `把本回合打出的上一张法术再放一张进手牌，算 1 次祈唤（本回合没打过法术或祈唤已满 3 次时不能打出）。消耗。`, play: g => { const p = P(g), sp = p.spells || []; if (sp.length) { g.addHand(sp[sp.length - 1]); p.invN = (p.invN || 0) + 1; } } },
  e_staff: { ch: 'erin', name: '法杖格挡', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_e_staff', tgt: 'self', desc: u => `获得 ${v(u, 7, 10)} 点格挡；元素位恰好有两种元素时再 +3。`, play: (g, u) => g.block(v(u, 7, 10) + (kinds(g) === 2 ? 3 : 0)) },
  e_tide: { ch: 'erin', name: '潮汐', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_e_tide', tgt: 'self', desc: u => `写入水两次，获得 ${v(u, 6, 9)} 点格挡。`, play: (g, u) => { writeEl(g, '水'); writeEl(g, '水'); g.block(v(u, 6, 9)); } },
  e_blaze: { ch: 'erin', name: '烈焰', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_e_blaze', tgt: 'one', desc: u => `造成 ${v(u, 11, 14)} 点伤害；三格都是火时改为打所有敌人。`, play: (g, u, t) => { const el = P(g).el || EL; if (el.every(x => x === '火')) g.attackAll(v(u, 11, 14)); else g.attack(t, v(u, 11, 14)); } },
  e_cyclone: { ch: 'erin', name: '旋风', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_e_cyclone', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 7, 9)} 点伤害；三格都是风时抽 2 张牌。`, play: (g, u) => { g.attackAll(v(u, 7, 9)); const el = P(g).el || EL; if (el.every(x => x === '风')) g.draw(2); } },
  e_master: { ch: 'erin', name: '元素宗师', type: 'power', rar: 'r', cost: [2, 1], icon: 'icons2/n_e_master', tgt: 'self', desc: () => `每打出 1 张法术，获得 3 点格挡。`, play: g => { P(g).st.emaster = 3; } },
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
  g_zen: { ch: 'gu', name: '剑心通明', type: 'power', rar: 'r', cost: [1, 0], icon: 'icons2/n_g_zen', tgt: 'self', desc: u => `每把飞剑给攻击牌第一击的加成从 +1 变成 +2（每 2 把仍再额外 +1）。`, play: g => { P(g).st.zen = 1; } },
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
  m_claw: { ch: 'mia', name: '猫抓', type: 'atk', rar: 'c', cost: [0, 0], icon: 'icons2/n_m_claw', tgt: 'one', form: 'cat', desc: u => `【猫】造成 ${v(u, 4, 6)} 点伤害；合体时 +3。`, play: (g, u, t, c, k) => { ((g, u, t) => g.attack(t, v(u, 4, 6) + (merged(g) ? 3 : 0)))(g, u, t, c, k); } },
  m_toy: { ch: 'mia', name: '猫扑', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_m_toy', tgt: 'one', form: 'cat', desc: u => `【猫】造成 ${v(u, 8, 11)} 点伤害；合体时给予 1 层易伤。`, play: (g, u, t, c, k) => { ((g, u, t) => { g.attack(t, v(u, 8, 11)); if (merged(g)) g.apply(live(g, t), 'vuln', 1); })(g, u, t, c, k); } },
  m_whistle2: { ch: 'mia', name: '口哨', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_m_whistle2', tgt: 'self', exhaust: 1, desc: u => `抽 ${v(u, 1, 2)} 张牌；本回合可以再改一次团子的指令。消耗。`, play: (g, u) => { g.draw(v(u, 1, 2)); const c = cat(g); if (c) c.set = 0; } },
  m_twice: { ch: 'mia', name: '二连扑', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_twice', tgt: 'self', desc: u => `本回合团子扑击多打 1 次${v(u, '', '，抽 1 张牌')}。`, play: (g, u) => { const c = cat(g); if (c) c.twice = 1; if (u) g.draw(1); } },
  m_bond: { ch: 'mia', name: '羁绊', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_bond', tgt: 'self', desc: u => `每回合开始团子回复 ${v(u, 2, 3)} 生命。`, play: (g, u) => { P(g).st.mbond = v(u, 2, 3); } },
  m_sharpen: { ch: 'mia', name: '磨爪', type: 'power', rar: 'u', cost: [1, 0], icon: 'icons2/n_m_sharpen', tgt: 'self', desc: u => `驯养：团子本场攻击 +2。`, play: g => { const c = cat(g); if (c) c.atk += 2; } },
  m_leap: { ch: 'mia', name: '飞扑', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_leap', tgt: 'one', form: 'hum', desc: u => `造成 ${v(u, 7, 10)} 点伤害；团子的指令改成扑击这个敌人。`, play: (g, u, t, c, k) => { ((g, u, t) => { g.attack(t, v(u, 7, 10)); const c = cat(g); if (c && !c.down && t && !t.dead) { c.cmd = 'pounce'; c.pt = t.id; } })(g, u, t, c, k); } },
  m_herd: { ch: 'mia', name: '默契', type: 'power', rar: 'r', cost: [2, 1], icon: 'icons2/n_m_herd', tgt: 'self', desc: u => `驯养：本场团子每回合同时执行护卫和扑击。`, play: g => { P(g).st.mtwin = 1; } },
  m_pact: { ch: 'mia', name: '守护契约', type: 'power', rar: 'r', cost: [1, 0], icon: 'icons2/n_m_pact', tgt: 'self', desc: u => `团子护卫挡下的伤害，一半变成米娅的格挡。`, play: g => { P(g).st.mpact = 1; } },
  m_rage: { ch: 'mia', can: g => catUp(g), name: '狂暴', type: 'skill', rar: 'u', cost: [1, 0], icon: 'icons2/n_m_rage', tgt: 'self', exhaust: 1, desc: u => `接下来 2 回合团子失控：只会扑击生命最少的敌人，扑击伤害翻倍；这期间团子不护卫，米娅受到的伤害 +50%。合体时打出会先分离。消耗。`, play: g => { const p = P(g), c = cat(g); if (!c || c.down) return; c.merged = 0; p.rage = 2; p.mount = 0; rageLock(g); } },
  m_mount: { ch: 'mia', can: g => catUp(g), name: '不动如山', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_mount', tgt: 'self', desc: u => `接下来 2 回合团子只能护卫：护卫多挡 ${v(u, 8, 12)} 点，团子自己受到的伤害再减半，每次护卫成功米娅获得 3 点格挡。合体时打出会先分离。`, play: (g, u) => { const p = P(g), c = cat(g); if (!c || c.down) return; c.merged = 0; p.mount = 2; p.mountB = v(u, 8, 12); p.rage = 0; c.cmd = 'guard'; c.set = 1; } },
  m_call: { ch: 'mia', name: '呼唤团子', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_call', tgt: 'self', exhaust: 1, desc: u => `团子倒地时：带 ${v(u, 30, 50)}% 生命回到场上，这回合可以下指令。团子没倒时：团子回复 ${v(u, 6, 9)} 生命。消耗。`, play: (g, u) => { const c = cat(g); if (!c) return; if (c.down) { c.down = 0; c.merged = 0; c.hp = Math.max(1, Math.ceil(c.max * v(u, 30, 50) / 100)); c.cmd = 'guard'; c.set = 0; g.note('团子回来了！'); } else healCat(g, v(u, 6, 9)); } },
  m_yarn: { ch: 'mia', name: '猫爪连打', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_yarn', tgt: 'one', form: 'cat', desc: u => `【猫】造成 ${v(u, 4, 5)} 点伤害 2 次；合体时打 3 次。`, play: (g, u, t, c, k) => { ((g, u, t) => g.attack(t, v(u, 4, 5), merged(g) ? 3 : 2))(g, u, t, c, k); } },
  m_trust: { ch: 'mia', name: '信任', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_m_trust', tgt: 'self', desc: u => `抽 ${v(u, 2, 3)} 张牌；团子生命不少于一半时得到 1 点能量。`, play: (g, u) => { g.draw(v(u, 2, 3)); const c = cat(g); if (c && !c.down && c.hp * 2 >= c.max) g.energy(1); } },
  // ---- 绯月：鲜血 / 吸血 / 蝙蝠 ----
  f_nick: { ch: 'feiyue', name: '划伤', type: 'atk', rar: 'c', cost: [0, 0], icon: 'icons2/n_f_nick', tgt: 'one', desc: u => `造成 ${v(u, 4, 6)} 点伤害。`, play: (g, u, t) => fa(g, t, v(u, 4, 6)) },
  f_drop: { ch: 'feiyue', name: '蝠幕', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_f_drop', tgt: 'self', desc: u => `获得 ${v(u, 5, 7)} 点格挡，每只血蝠再 +2。`, play: (g, u) => g.block(v(u, 5, 7) + 2 * bats(g)) },
  f_flock: { ch: 'feiyue', name: '蝠群涌动', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_f_flock', tgt: 'self', desc: u => `召唤 2 只血蝠，抽 ${v(u, 1, 2)} 张牌。`, play: (g, u) => { addBats(g, 2); g.draw(v(u, 1, 2)); } },
  f_feast: { ch: 'feiyue', name: '盛宴', type: 'atk', rar: 'u', cost: [2, 2], icon: 'icons2/n_f_feast', tgt: 'one', desc: u => `造成 ${v(u, 16, 20)} 点伤害，这一击的伤害全部回成生命。`, play: (g, u, t) => bite(g, g.attack(t, v(u, 16, 20)), 1) },
  f_mark: { ch: 'feiyue', name: '猎印', type: 'skill', rar: 'c', cost: [0, 0], icon: 'icons2/n_f_mark', tgt: 'one', desc: u => `给予 ${v(u, 2, 3)} 层易伤。`, play: (g, u, t) => g.apply(t, 'vuln', v(u, 2, 3)) },
  f_cloak: { ch: 'feiyue', name: '夜之斗篷', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/n_f_cloak', tgt: 'self', desc: u => `获得 ${v(u, 9, 12)} 点格挡；本回合吸过血时抽 1 张牌。`, play: (g, u) => { g.block(v(u, 9, 12)); if (P(g).lsT) g.draw(1); } },
  f_dash: { ch: 'feiyue', name: '血之冲刺', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/n_f_dash', tgt: 'one', desc: u => `造成 ${v(u, 6, 8)} 点伤害；本回合每失去过 3 点生命再 +3（最多 +12）。`, play: (g, u, t) => fa(g, t, v(u, 6, 8) + Math.min(12, 3 * Math.floor((P(g).lostT || 0) / 3))) },
  f_nest: { ch: 'feiyue', name: '夜宴', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_f_nest', tgt: 'self', desc: u => `每回合开始召唤 ${v(u, 1, 2)} 只血蝠。`, play: (g, u) => { P(g).st.batgen = v(u, 1, 2); } },
  f_dance: { ch: 'feiyue', name: '绯红之舞', type: 'atk', rar: 'u', cost: [2, 2], icon: 'icons2/n_f_dance', tgt: 'all', desc: u => `失去 4 点生命，对所有敌人造成 ${v(u, 12, 16)} 点伤害。`, play: (g, u) => { bleed(g, 4); faAll(g, v(u, 12, 16)); } },
  f_hunger: { ch: 'feiyue', name: '饥渴', type: 'power', rar: 'u', cost: [1, 1], icon: 'icons2/n_f_hunger', tgt: 'self', desc: u => `每次吸血真的回到血后，获得 ${v(u, 2, 3)} 点格挡。`, play: (g, u) => { P(g).st.vhunger = v(u, 2, 3); } },
  f_rite: { ch: 'feiyue', name: '血祭', type: 'atk', rar: 'r', cost: [1, 1], icon: 'icons2/n_f_rite', tgt: 'all', exhaust: 1, desc: u => `消灭全部血蝠，每只对所有敌人造成 ${v(u, 4, 5)} 点伤害。消耗。`, play: (g, u) => { const k = bats(g); P(g).bats = 0; if (k) faAll(g, v(u, 4, 5) * k); } },
  f_echo: { ch: 'feiyue', name: '回声定位', type: 'skill', rar: 'c', cost: [1, 1], icon: 'icons2/n_f_echo', tgt: 'self', desc: u => `获得 ${v(u, 6, 9)} 点格挡；有召唤物时再 +4。`, play: (g, u) => g.block(v(u, 6, 9) + (bats(g) || P(g).big ? 4 : 0)) },
  f_fangs: { ch: 'feiyue', name: '獠牙', type: 'atk', rar: 'c', cost: [1, 1], icon: 'icons2/n_f_fangs', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害；目标有易伤时，这一击伤害的一半回成生命。`, play: (g, u, t) => { const vu = t && t.st.vuln; const d = g.attack(t, v(u, 8, 11)); if (vu) bite(g, d, .5); else lsHeal(g, d); } },
  f_moon2: { ch: 'feiyue', name: '初拥', type: 'skill', rar: 'r', cost: [2, 2], icon: 'icons2/n_f_moon2', tgt: 'one', exhaust: 1, can: g => g.alive().some(e => !isBig(e) && e.hp <= 20), desc: u => `把一个生命不超过 ${v(u, 15, 20)} 的普通敌人变成眷属：它保留原来的生命和攻击，回合结束攻击敌人（占血骑士的位置）。消耗。`, play: (g, u, t) => embrace(g, t, v(u, 15, 20)) },
  f_undying: { ch: 'feiyue', name: '不死之身', type: 'power', rar: 'r', cost: [2, 2], icon: 'icons2/n_f_undying', tgt: 'self', desc: u => `每场一次：受到致命伤害时保留 1 点生命，并回复 ${v(u, 10, 15)} 生命。`, play: (g, u) => { P(g).st.undying = v(u, 10, 15); } },
};

for (const k of Object.keys(ERIN)) if (k.startsWith('sp_')) ERIN[k].icon = 'icons2/n_' + k;

/* ===== 第三章专属卡（只在永冬之巅和无尽模式出现）===== */
const NEW3 = {
  a3_miko: { ch: 'miko', act3: 1, name: '破龙之矢', type: 'atk', rar: 'u', cost: [2, 2], icon: 'icons2/a3_miko', tgt: 'one', desc: u => `造成 ${v(u, 14, 18)} 点伤害，无视格挡和鳞甲；结界不少于 3 层时再 +6。`, play: (g, u, t) => { const p = P(g); p.pierce = 1; g.attack(t, v(u, 14, 18) + ((p.st.kek || 0) >= 3 ? 6 : 0)); p.pierce = 0; } },
  a3_hero: { ch: 'hero', act3: 1, name: '屠龙弹', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/a3_hero', tgt: 'self', desc: u => `光弹 +${v(u, 3, 4)}；本回合射出的光弹无视鳞甲。`, play: (g, u) => { g.ammo(v(u, 3, 4)); P(g).pierceS = 1; } },
  a3_song: { ch: 'heroine', act3: 1, name: '龙吟', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/a3_song', tgt: 'all', desc: u => `所有敌人共鸣 +${v(u, 6, 9)}，并打断所有正在蓄力的龙息。`, play: (g, u) => { g.resAll(v(u, 6, 9)); g.alive().forEach(e => { if (e.chg) e.dmgT = 999; }); } },
  a3_blood: { ch: 'witch', act3: 1, name: '龙血药剂', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/a3_blood', tgt: 'self', exhaust: 1, desc: u => `获得 2 点力量，回复 ${v(u, 6, 9)} 点生命。消耗。`, play: (g, u) => { g.self('str', 2); g.heal(v(u, 6, 9)); } },
  a3_el: { ch: 'erin', act3: 1, name: '龙之元素', type: 'skill', rar: 'u', cost: [1, 0], icon: 'icons2/a3_el', tgt: 'self', desc: u => `依次写入火、水、风。`, play: g => { writeEl(g, '火'); writeEl(g, '水'); writeEl(g, '风'); } },
  a3_gu: { ch: 'gu', act3: 1, name: '斩龙剑', type: 'atk', rar: 'u', cost: [1, 1], icon: 'icons2/a3_gu', tgt: 'one', desc: u => `射出所有飞剑，每把对目标造成 ${v(u, 6, 8)} 点伤害，无视鳞甲。`, play: (g, u, t) => { const p = P(g), o = p.pierceS; p.pierceS = 1; fire(g, t, 'all', v(u, 6, 8)); p.pierceS = o; } },
  a3_syl: { ch: 'sylvie', act3: 1, name: '龙裔觉醒', type: 'power', rar: 'r', cost: [2, 2], icon: 'icons2/a3_syl', tgt: 'self', desc: u => `本场每回合开始得到 ${v(u, 2, 3)} 点龙血。`, play: (g, u) => { P(g).st.sawake = v(u, 2, 3); } },
  a3_mia: { ch: 'mia', act3: 1, name: '龙鳞项圈', type: 'skill', rar: 'u', cost: [1, 1], icon: 'icons2/a3_mia', tgt: 'self', desc: u => `驯养：团子本场护卫多挡 4 点、自己受伤 -2；米娅获得 ${v(u, 6, 9)} 点格挡。`, play: (g, u) => { const c = cat(g); if (c) { c.gP = (c.gP || 0) + 4; c.sRp = (c.sRp || 0) + 2; } g.block(v(u, 6, 9)); } },
  a3_fei: { ch: 'feiyue', act3: 1, name: '龙血盛宴', type: 'atk', rar: 'u', cost: [2, 2], icon: 'icons2/a3_fei', tgt: 'one', desc: u => `造成 ${v(u, 16, 20)} 点伤害并吸血；击杀时最大生命 +3（整局）。`, play: (g, u, t) => { fa(g, t, v(u, 16, 20)); if (t && t.dead) { g.R.maxHp += 3; g.R.hp += 3; } } },
  grudge: { name: '龙之怨', type: 'skill', rar: 'gen', cost: [0, 0], icon: 'icons2/grudge', tgt: 'self', unplay: 1, burn: 2, curse: 1, desc: () => `诅咒。不能打出。回合结束时若在手中，失去 2 点生命。`, play: () => {} },
  bugcard: { name: '报错', type: 'skill', rar: 'gen', cost: [0, 0], icon: 'icons2/bugcard', tgt: 'self', unplay: 1, ethereal: 1, desc: () => `不能打出。回合结束时消耗。`, play: () => {} },
  draft: { name: '草稿', type: 'skill', rar: 'gen', cost: [0, 0], icon: 'icons2/draft', tgt: 'self', exhaust: 1, desc: () => `随机：造成 3 点伤害、获得 3 点格挡或抽 1 张牌。消耗。`, play: g => { const r = Math.random(); if (r < 1 / 3) g.attackRandom(3, 1); else if (r < 2 / 3) g.block(3); else g.draw(1); } },
  devperm: { name: '开发者权限', type: 'skill', rar: 'gen', cost: [1, 0], icon: 'icons2/devperm', tgt: 'self', exhaust: 1, pick: 1, bot: (g, o) => [...o].sort((a, b) => (g.cardOf(b.c).type === 'atk') - (g.cardOf(a.c).type === 'atk'))[0], pickT: '选一张手牌：升级、补丁 +5、本场 0 费', desc: () => `选一张手牌：升级并补丁 +5，它本场费用变 0。消耗。`, play: (g, u, t, c, pk) => { const x = g.hand.find(y => y.uid === pk); if (x) { x.up = 1; g.patch(x, 5); x.free = 1; } } },
};
export const NEWCARDS = { ...ERIN, ...GU, ...SYL, ...MIA, ...FEI, ...OLD, ...NEW2, ...NEW3 };
for (const c of Object.values(NEWCARDS)) c.noart = 1;
// 机器人估值：sim 的熟练机器人按这些词判断「流派牌」
export const OLDKEYW = { miko: /结界|技能牌/, hero: /光弹|攻击牌/, witch: /中毒|炼金瓶|火焰瓶/, heroine: /共鸣|爆音|弃/ };
export const NEWKEYW = { erin: /元素|祈唤|写入/, gu: /飞剑/, sylvie: /龙血|霜龙/, mia: /团子|扑击|护卫/, feiyue: /鲜血|吸血|献血/ };
const B5 = ['tstrike', 'tstrike', 'tstrike', 'tstrike', 'defend', 'defend', 'defend'];
export const NEWSTARTERS = {
  erin: ['tstrike', 'tstrike', 'tstrike', 'defend', 'defend', 'defend', 'e_spark', 'e_ripple', 'e_needle', 'e_invoke'], gu: [...B5, 'g_sheath', 'g_breath', 'g_shift'], sylvie: [...B5, 's_lance', 's_scale', 's_pulse'],
  mia: [...B5, 'm_staff', 'm_side', 'm_snack'], feiyue: [...B5, 'f_claw', 'f_sleeve', 'f_bats'],
};
export const NEWSTARTRELIC = { erin: 'oldstaff', gu: 'swordtassel', sylvie: 'eggshard', mia: 'catbell', feiyue: 'ribbon' };
export const NEWRELICS = {
  oldstaff: { ch: 'erin', name: '旧世界法杖', icon: 'ic_rune', rar: 'start', desc: '每场战斗第一张祈唤牌少 1 费。战斗结束时回复 4 点生命。' },
  lens: { ch: 'erin', name: '定相透镜', icon: 'ic_crystal', rar: 'u', desc: '每场战斗第一次三格元素相同时，获得 6 点格挡。' },
  prism: { ch: 'erin', name: '裂色棱镜', icon: 'ic_hexa', rar: 'r', desc: '每场战斗第一次打出两种不同配方的法术后，抽 2 张牌，得到 1 点能量。' },
  swordtassel: { ch: 'gu', name: '雪纹剑穗', icon: 'ic_sword', rar: 'start', desc: '战斗开始时得到 1 把飞剑。战斗结束时回复 4 点生命。' },
  jade: { ch: 'gu', name: '护脉玉', icon: 'ic_aura', rar: 'u', desc: '每场战斗第一次射出飞剑后，再得到 2 把飞剑。' },
  manual: { ch: 'gu', name: '旧剑谱', icon: 'b_dur', rar: 'r', desc: '每场战斗第一次一回合打出 3 张攻击牌后，下回合多抽 2 张牌。' },
  eggshard: { ch: 'sylvie', name: '寒卵碎片', icon: 'ic_crystal', rar: 'start', desc: '战斗开始时得到 2 点龙血。战斗结束时回复 4 点生命。' },
  horn: { ch: 'sylvie', name: '断角护符', icon: 'm_ward', rar: 'u', desc: '每场战斗第一次变身时，获得 8 点格挡。' },
  dayscale: { ch: 'sylvie', name: '极昼鳞', icon: 'p_tough', rar: 'r', desc: '每场战斗第一次退出霜龙形态时不会虚弱，并得到 3 点龙血。' },
  catbell: { ch: 'mia', name: '团子的铃铛', icon: 'ic_bell', rar: 'start', desc: '云猫团子和你并肩作战，每回合可以给它一个指令。战斗结束时回复 4 点生命。' },
  catbed: { ch: 'mia', name: '旅行猫窝', icon: 'box', rar: 'u', desc: '每回合开始时，团子回复 2 生命。' },
  lynx: { ch: 'mia', name: '山猫纹章', icon: 'sk_wolf', rar: 'r', desc: '每场战斗第一次护卫和扑击都执行过后，下回合抽 1 张牌，得到 1 点能量。' },
  ribbon: { ch: 'feiyue', name: '家书缎带', icon: 'b_vamp', rar: 'start', desc: '每场战斗第一次因为自己的牌失去生命时，召唤 2 只血蝠。战斗结束时回复 4 点生命。' },
  redpin: { ch: 'feiyue', name: '红银针', icon: 'ic_stake', rar: 'u', desc: '每场战斗第一次吸血时多回复 2 生命（仍算进每场 20 点的上限）。' },
  cup: { ch: 'feiyue', name: '倒悬杯', icon: 'pot', rar: 'r', desc: '每场战斗第一次血蝠达到 8 只时，抽 2 张牌。' },
};
export const NEWSTATUS = {
  efocus: ['专注', '每回合开始再写入一次最新的元素', '#ffd060'], emaster: ['元素宗师', '每打出 1 张法术获得格挡', '#ffd060'], enote: ['元素笔记', '每回合第一次凑齐三种元素时抽牌', '#ffd060'], ecrown: ['三相冠冕', '每回合第一张三格相同的法术后获得格挡并抽牌', '#ffd060'], eseason: ['四季轮转', '每回合第一次换配方打出法术后全体受伤并抽牌', '#ffd060'],
  
  
  sword: ['飞剑', '每把让攻击牌的第一击 +1 伤害，每 2 把再额外 +1；回合结束每 2 把给 1 点格挡；可以射出（最多 6 把）', '#9fd8ff'], swordgen: ['剑阵', '每回合开始得到 1 把飞剑', '#9fd8ff'], zen: ['剑心通明', '每把飞剑的第一击加成变成 +2', '#9fd8ff'], 
  gflow: ['剑气护体', '回合结束时每把飞剑给 1 点格挡', '#9fd8ff'], grev: ['剑意循环', '每射出 1 把飞剑抽 1 张牌（每回合最多 3 张）；飞剑归零时再得到 2 把', '#9fd8ff'], dualst: ['剑意', '每回合第一次射出飞剑后得到 1 点能量', '#9fd8ff'],
  dblood: ['龙血', '攒满 8 点后可以变身霜龙', '#ff9090'], dragon: ['霜龙形态', '变身时对所有敌人造成 14 点伤害；攻击牌第一击 +8；每个敌方回合第一段打穿格挡的伤害 -4。数字是剩余回合', '#c8f0ff'],
  dbgen: ['冰晶脊', '每回合开始得到 1 点龙血', '#ff9090'], dscale: ['龙鳞', '霜龙形态下每回合开始获得格挡', '#c8f0ff'], dheart: ['龙心', '变身时得到 2 点能量并抽 1 张牌', '#c8f0ff'], perma: ['永冻', '龙血满 8 点时攻击牌第一击额外加成', '#a8e8ff'],
  aval: ['雪崩之心', '每花掉 1 点龙血获得 1 点格挡；变身时获得 8 点格挡', '#a8e8ff'], wake: ['冬眠苏醒', '退出霜龙形态时得到龙血并抽牌', '#a8e8ff'],
  mbond: ['羁绊', '每回合开始团子回血', '#ffc0e0'], mpact: ['守护契约', '团子挡下的伤害一半变成米娅的格挡', '#ffc0e0'], mjump: ['练习跳台', '每种指令第一次执行时获得格挡', '#ffc0e0'], mgate: ['云猫守门', '团子护卫多挡 3 点，受伤后下回合抽牌', '#ffc0e0'],
  batgen: ['夜宴', '每回合开始召唤血蝠', '#c080ff'], vhunger: ['饥渴', '每次吸血真的回到血后获得格挡', '#ff5070'], undying: ['不死之身', '每场一次，受到致命伤害时保留 1 点生命并回血', '#ff5070'],
  vdawn: ['血尽天明', '每回合第一次因为自己的牌失去生命时得到 1 点能量', '#ff5070'],
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
  bloodlust: ['嗜血', '本场每失去 10 点生命，攻击牌第一击 +1', '#ff5070'],
  bpact: ['血契', '召唤物伤害的一半回成生命', '#ff5070'],
  wild: ['野性', '合体时攻击加成变成团子攻击力的三分之二', '#ffc0e0'],
  mtwin: ['默契', '团子每回合同时护卫和扑击', '#ffc0e0'],
  shiki: ['式神', '整段挡下敌人的下一次攻击（最多同时 2 个）', '#f0f0ff', 'icons2/st_shiki'], shikiR: ['式神返魂', '式神每挡下一次攻击，结界 +2', '#f0f0ff'], aleye: ['炼金师之眼', '每用炼金瓶打倒一个敌人，获得 5 金币并抽 1 张牌', '#ffd060'],
};

/* ---------- 角色机制钩子（两个引擎在固定时机调用） ---------- */
export const MECH = {
  battleStart(g) { const p = P(g), R = g.R, c = R.char;
    if (c === 'erin') p.el = [...EL];
    if (c === 'gu' && g.has('swordtassel')) addSword(g, 1);
    if (c === 'sylvie' && g.has('eggshard')) gainDB(g, 2);
    if (c === 'mia' && g.has('catbell')) { R.cat = { lv: Math.min(3, R.act || 1) }; const L = CATLV[R.cat.lv], hb = k => hasBoon(g, k); const mx = L.max + (hb('fur') ? 6 : 0); p.cat = { hp: mx, max: mx, atk: L.atk + (hb('claw') ? 2 : 0), gP: hb('guard') ? 4 : 0, cmd: 'guard', set: 0, did: {}, took: 0 }; }
    if (c === 'feiyue') { p.bats = 0; p.big = null; }
  },
  turnStart(g, first) { const p = P(g);
    if (p.nextDraw) { g.draw(p.nextDraw); p.nextDraw = 0; } p.kbU = 0; p.bugU = 0; p.duckU = 0; p.thr = 0;
    if (p.st.sawake) gainDB(g, p.st.sawake);
    for (const k of ['invN', 'seasT', 'gateT', 'noteT', 'spells', 'windT', 'mtnT', 'windDisc', 'mtnB', 'dualT', 'combo', 'burnT', 'qiT', 'frostT', 'donT', 'vpT', 'vowT', 'vdT', 'setT', 'patT', 'syT', 'syR', 'rzT', 'drawnT', 'avT', 'drHit', 'crT', 'lsT', 'grevT', 'hangT', 'mergeT', 'lostT', 'batB', 'bigG', 'skillN', 'fireN', 'wnT', 'discN', 'loopT', 'zenT']) delete p[k];
    if (p.st.efocus && p.el) { writeEl(g, p.el[2]); if (p.st.efocus > 1) g.block(3, true); }
    if (p.hang && p.hang.length) { const q = p.hang; p.hang = []; for (const h of q) swordHits(g, null, h.k, h.dmg, h.mode); }
    delete p.dmul; delete p.flhsD; if (p.flhsN) { if (p.flhsN === 'e') g.energy(1); else if (p.flhsN === 'a') p.dmul = 1.2; else p.flhsD = 1; delete p.flhsN; }
    if (p.restE) { g.energy(-1); p.restE = 0; }
    if (p.st.kaura && !first) { p.st.kaura--; if (!p.st.kaura) delete p.st.kaura; }
    if (p.st.dbgen) { gainDB(g, 1); if (p.st.dbgen > 1) g.block(2, true); }
    if (p.cat && g.has('catbed')) healCat(g, 2);
    if (p.st.swordgen) { addSword(g, 1); if (p.st.swordgen > 1) g.block(2, true); }
    if (p.st.dscale && p.st.dragon) g.block(p.st.dscale, true);
    if (p.st.mbond && p.cat) healCat(g, p.st.mbond);
    if (p.st.batgen) addBats(g, p.st.batgen);
    if (merged(g)) { healCat(g, 1); g.block((hasBoon(g, 'heart') ? 6 : 3) + (p.st.wild > 1 ? 3 : 0), true); }
    if (p.st.nshade) { const a = g.alive(); if (a.length) g.poison(a.reduce((m, e) => (e.st.poison || 0) > (m.st.poison || 0) ? e : m, a[0]), p.st.nshade); }
    if (p.st.dragon && !first) { p.st.dragon--; if (!p.st.dragon) { delete p.st.dragon; if (g.has('dayscale') && !p.dsU) { p.dsU = 1; gainDB(g, 3); } else g.self('weak', 1); if (p.st.wake) { gainDB(g, 4); g.draw(2); if (p.st.wake > 1) g.energy(1); } } }
    if (p.manualD) { g.draw(2); p.manualD = 0; }
    const c = p.cat; if (c) { c.set = 0; c.gB = 0; c.sR = 0; c.pB = 0; c.big = 0; c.twice = 0; c.took = c.tookN || 0; c.tookN = 0; if (!c.down) c.cmd = c.cmd === 'pounce' && g.alive().some(e => e.id === c.pt) ? 'pounce' : 'guard'; if (p.rage) p.rage--; if (p.mount) p.mount--; if (!c.down && p.rage) rageLock(g); if (!c.down && p.mount) { c.cmd = 'guard'; c.set = 1; } if (p.gateD) { g.draw(1); p.gateD = 0; } }
    if (p.lynxD) { p.lynxD = 0; g.draw(1); g.energy(1); }
  },
  /* 玩家回合结束、敌人行动前 */
  turnEnd(g) { const p = P(g), c = p.cat;
    if (c && !c.down && !c.merged) { const did = k => catDid(g, k); const both = p.st.mtwin; if (both) c.guardOn = 1; const extra = hasBoon(g, 'agile') && !p.agU ? (p.agU = 1) : 0; if (extra) c.twice = 1;
      if (c.cmd === 'pounce' || both) { const a = g.alive(), t = a.find(e => e.id === c.pt) || a[0]; if (t) { c.fx = { k: 'atk', t: Date.now() }; p.fh = 0; for (let n = 0; n < (c.twice && !c.big ? 2 : 1); n++) { const a2 = g.alive(), t2 = t.dead ? a2[0] : t; if (!t2) break; if (c.big) g.attack(t2, c.big + (c.pB || 0), 2); else g.attack(t2, (c.atk + (c.pB || 0)) * (p.rage ? 2 : 1)); } if (hasBoon(g, 'hunt') && !t.dead) g.apply(t, 'weak', 1); } did('pounce'); }
      if (c.cmd === 'guard') c.guardOn = 1; }
    if (p.st.torii && (p.st.kek || 0) >= 3) g.block(p.st.torii, true);
    if (p.boomer) { addSword(g, p.boomer); p.boomer = 0; }
    if (sw(g)) g.block(p.st.gflow ? sw(g) : Math.floor(sw(g) / 2), true);
    if (bats(g) || p.big) summonsAttack(g);
    p.ePhase = 1;
  },
  /* 敌人攻击打到玩家：格挡之前（团子护卫） */
  preBlock(g, amt, e) { const p = P(g), c = p.cat;
    if (p.rage && amt > 0) amt = Math.ceil(amt * 1.5);
    if (e && amt > 0 && p.st.shiki) { p.st.shiki--; if (!p.st.shiki) delete p.st.shiki; g.note(`式神挡下了 ${amt}`); if (p.st.shikiR) g.kek(2); return 0; }
    if (e) { if (e.cutH) amt = Math.floor(amt / 2); if (e.cutS) amt = Math.max(0, amt - e.cutS); if (p.st.permaf && e.st && e.st.fburn) amt = Math.max(0, amt - p.st.permaf); }
    if (p.flhsD) amt = Math.floor(amt * .8);
    if (e) { if (bats(g) && !e.batHit && amt > 0) { e.batHit = 1; p.bats--; } if (p.big && p.big.kind === 'knight' && !p.bigG && amt > 0) { p.bigG = 1; p.big.hp -= amt; g.note(`血骑士挡下 ${amt}`); amt = 0; if (p.big.hp <= 0) { p.big = null; g.note('血骑士倒下了'); } } }
    if (c && !c.down && !c.merged && (c.cmd === 'guard' || p.st.mtwin) && c.guardOn && amt > 0) { c.guardOn = 0; const capN = 5 + (c.gB || 0) + (c.gP || 0) + (p.st.mgate ? 3 : 0) + (p.mount ? p.mountB || 8 : 0), k = Math.min(amt, capN, c.hp); if (k > 0) { const hurtC = Math.max(0, Math.ceil(k / (p.mount ? 4 : 2)) - (c.sR || 0) - (c.sRp || 0)); if (p.mount) g.block(3, true); c.fx = { k: 'hit', t: Date.now() }; c.hp -= hurtC; c.tookN = (c.tookN || 0) + k; amt -= k; catDid(g, 'guard'); if (p.st.mpact) g.block(Math.floor(k / 2), true); g.note(`团子挡下 ${k}`); if (hurtC > 0 && p.st.mgate) p.gateD = 1; if (c.hp <= 0) catFall(g); } }
    return amt; },
  /* 格挡之后（霜龙减伤） */
  postBlock(g, left, e) { const p = P(g); if (left <= 0) return left;
    if (left >= g.R.hp && p.nineL && merged(g)) { p.nineL = 0; left = g.R.hp - 1; const c = cat(g); c.merged = 0; c.down = 1; c.hp = 0; g.note('九命：团子替你倒下了'); }
    if (left >= g.R.hp && p.st.undying && !p.undU) { p.undU = 1; left = g.R.hp - 1; g.heal(p.st.undying); g.note('不死之身'); }
    if (p.st.dragon && !p.drHit) { p.drHit = 1; left = Math.max(0, left - 4); }
    return left; },
  /* 千早：召唤式神（最多同时 2 个） */
  shiki(g, n) { const p = P(g); p.st.shiki = Math.min(2, (p.st.shiki || 0) + n); },
  /* 通用硬控（给数据里的牌用） */
  cc(g, t, k) { hardCC(g, t, k); },
  /* 敌人行动前：霜灼、藤蔓、硬控、麻痹、威吓。返回 'skip' 表示这次不行动 */
  enemyAct(g, e) { e.cutH = 0; e.cutS = 0; e.batHit = 0;
    if (e.st.fburn) { const n = e.st.fburn; g.hitE(e, n); if (e.dead) return; const h = Math.floor(n / 2); if (h) e.st.fburn = h; else delete e.st.fburn; }
    if (e.st.bindD) { g.hitE(e, 4); e.st.bindD--; if (!e.st.bindD) delete e.st.bindD; if (e.dead) return; }
    for (const k of ['frozen', 'stun', 'bind']) if (e.st[k]) { delete e.st[k]; return 'skip'; }
    if (e.st.para) { delete e.st.para; e.cutH = 1; }
    if (e.st.awe) { delete e.st.awe; e.cutS = 5; } },
  /* 攻击牌第一击的加成 */
  firstHit(g) { const p = P(g); let b = Math.floor((p.st.sword || 0) * (p.st.zen ? 2.5 : 1.5)) + (p.st.dragon ? 8 : 0) + (p.fhx || 0) + (merged(g) ? (p.st.wild ? Math.floor(p.cat.atk * 2 / 3) : Math.floor(p.cat.atk / 3)) : 0) + (p.st.bloodlust ? Math.floor((p.lostF || 0) / 10) : 0); p.fhx = 0; return b; },
  costMod(g, d) { const p = P(g); return d.invoke && g.has('oldstaff') && !p.staffU ? -1 : 0; },
  postPlay(g, d) { const p = P(g);
    if (d.invoke && g.has('oldstaff')) p.staffU = 1;
    if (d.spell) { p.spells = p.spells || []; p.spells.push(d.id); p.spellB = p.spellB || []; if (!p.spellB.includes(d.id)) p.spellB.push(d.id);
      if (p.st.emaster) g.block(p.st.emaster, true);
      if (p.st.ecrown && !p.crT && ['sp_meteor', 'sp_mirror', 'sp_gate'].includes(d.id)) { p.crT = 1; g.block(p.st.ecrown, true); g.draw(1); }
      if (p.st.eseason && !p.seasT && p.spells.length >= 2 && p.spells[p.spells.length - 1] !== p.spells[p.spells.length - 2]) { p.seasT = 1; g.attackAll(p.st.eseason); g.draw(1); }
      if (g.has('prism') && !p.prU && p.spellB.length >= 2) { p.prU = 1; g.draw(2); g.energy(1); } }
    if (d.type === 'skill' && !d.potion) { p.skillN = (p.skillN || 0) + 1; if (p.skillN === 3 && p.st.mheart) { g.energy(1); if (p.st.mheart > 1) g.draw(1); } }
    if (d.id === 'p_fire') p.fireN = (p.fireN || 0) + 1;
    if (d.potion && p.st.wnotes && !p.wnT) { p.wnT = 1; g.draw(p.st.wnotes); }
    if (d.type === 'atk' && p.st.kaura && sw(g)) { const a = g.alive(); if (a.length) g.hitE(a[Math.floor(Math.random() * a.length)], sw(g) * (p.st.zen ? 2 : 1)); }
    if (d.type === 'atk') { p.combo = (p.combo || 0) + 1; if (p.combo === 3 && p.st.quick) { g.energy(1); if (p.st.quick > 1) g.draw(1); } if (p.combo >= 3 && g.has('manual') && !p.manU) { p.manU = 1; p.manualD = 1; } }
  },
  /* 胜利后 */
  victory(g) { const p = P(g); if (p.cat && !p.cat.down && hasBoon(g, 'gift')) { g.R.gold += 5; return '猫之馈赠：+5 金币'; } return null; },
  /* 米娅：打完精英或 Boss，三选一灵魂恩赐 */
  boonOpts(g, kind) { if (g.R.char !== 'mia' || (kind !== 'elite' && kind !== 'boss')) return null; const own = g.R.boons || []; if (own.length >= 5) return null;
    const pool = Object.keys(BOONS).filter(k => !own.includes(k)); const pick = []; while (pool.length && pick.length < 3) pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return pick.map(k => ({ val: k, name: BOONS[k][0], desc: BOONS[k][1], html: `<button class="btn"><b>${BOONS[k][0]}</b>：${BOONS[k][1]}</button>` })); },
  boonPick(g, k) { if (!k || !BOONS[k]) return; (g.R.boons = g.R.boons || []).push(k); },
  /* 角色按钮 */
  actions(g) { const p = P(g), out = [], c = p.cat;
    if (c) { if (c.down) out.push({ id: 'x', label: '团子倒地', dis: 1 }); else if (c.merged) out.push({ id: 'merge', label: '分离', on: 1, dis: p.mergeT }); else { out.push({ id: 'merge', label: '合体', dis: p.mergeT || p.rage || p.mount }); }
    if (c && !c.down && !c.merged) for (const [k, n] of [['guard', '护卫'], ['pounce', '扑击']]) out.push({ id: 'cmd_' + k, label: n, on: c.cmd === k, dis: c.set && c.cmd !== k }); }
    if (g.R.char === 'sylvie') out.push({ id: 'drake', label: p.st.dragon ? `霜龙 ${p.st.dragon} 回合` : `变身（龙血 ${p.st.dblood || 0}/8）`, dis: p.st.dragon || (p.st.dblood || 0) < 8 || (p.drN || 0) >= 2, on: !!p.st.dragon });
    return out; },
  /* 执行按钮：返回需要选目标的种类 */
  act(g, id, val) { const p = P(g), c = p.cat;
    if (id === 'merge' && c && !c.down && !p.mergeT && !(!c.merged && (p.rage || p.mount))) { p.mergeT = 1; setForm(g, c.merged ? 'hum' : 'cat'); return; }
    if (id.startsWith('cmd_') && c && !c.down) { const k = id.slice(4); if (c.set && c.cmd !== k) return; if (k === 'pounce' && val == null) return 'enemy'; c.cmd = k; c.set = 1; if (k === 'pounce') c.pt = val; return; }
    if (id === 'drake' && (p.st.dblood || 0) >= 8 && !p.st.dragon && (p.drN || 0) < 2) { p.st.dragon = 3; delete p.st.dblood; p.drN = (p.drN || 0) + 1; g.alive().forEach(e => { if (e.st.fburn) e.st.fburn *= 2; }); if (p.st.aval) g.block(8, true); if (p.st.dheart) { g.energy(p.st.dheart); g.draw(1); } if (g.has('horn') && !p.hornU) { p.hornU = 1; g.block(8, true); } g.attackAll(14); g.note('霜龙形态！'); return; } },
  /* 机器人用的按钮策略 */
  bot(g, incoming) { const p = P(g), c = p.cat, a = g.alive(); if (!a.length) return;
    if (c && !c.down && !p.mergeT) { const catN = g.hand.filter(x => (CARDS_[x.id] || {}).form === 'cat').length; if (!c.merged && (c.hp * 10 < c.max * 4 || catN >= 2)) MECH.act(g, 'merge'); else if (c.merged && c.hp * 10 >= c.max * 8 && catN === 0) MECH.act(g, 'merge'); }
    if (c && !c.down && !c.merged && !c.set) { const low = [...a].sort((x, y) => x.hp - y.hp)[0]; if (incoming >= 12 && c.hp > 3) MECH.act(g, 'cmd_guard'); else MECH.act(g, 'cmd_pounce', low.id); }
    if (g.R.char === 'sylvie') MECH.act(g, 'drake'); },
  /* 头顶显示：团子 */
  chips(g) { const p = P(g), out = [];
    if (p.el) out.push({ h: `${p.el.map(x => `<span class="el el${EL.indexOf(x)}">${x}</span>`).join('')} ➜ <span>${(NEWCARDS[RECIPE[elKey(p.el)]] || {}).name || ''}</span>`, c: '#ffb070', tip: '元素位：祈唤会得到箭头后面的法术' });
    if (p.bats) out.push({ h: `<span>血蝠</span> ×${p.bats}`, c: '#ff6080', tip: '每只回合结束打随机敌人 3 点；敌人每次行动会打掉 1 只' });
    if (p.big) out.push({ h: `<span>${p.big.name}</span> ${p.big.hp}/${p.big.max}`, c: '#ff6080', tip: `攻击 ${p.big.atk}` + (p.big.kind === 'knight' ? '；每回合替你挡下第一次攻击' : '') });
    if (p.cat) out.push({ h: p.cat.down ? '<span>团子倒地</span>' : p.cat.merged ? `<span>合体中</span> ${p.cat.hp}/${p.cat.max}` : `<span>团子</span> ${p.cat.hp}/${p.cat.max} · <span>${{ guard: '护卫', pounce: '扑击' }[p.cat.cmd]}${p.rage ? '·狂暴' : p.mount ? '·不动如山' : ''}</span>`, c: '#ffc0e0', tip: `团子 ${g.R.cat ? g.R.cat.lv : 1} 级，攻击 ${p.cat.atk}` });
    return out; },
  rack() { return null; },
};
