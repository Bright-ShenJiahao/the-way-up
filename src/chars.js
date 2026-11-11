// 六个新角色：卡牌、秘宝、状态和角色机制（游戏和平衡模拟共用这一份规则）
// 设计来源：DS 评审的 20 张牌方案为主；米娅的「献祭」取自 GPT；需要玩家选择的地方做了简化（见各角色注释）
// g = 战斗接口（游戏和模拟器各自实现同名函数）
const v = (u, a, b) => (u ? b : a);
const P = g => g.p;
const cap = (x, n) => Math.max(0, Math.min(n, x));

/* ======================= 艾琳 · 元素位 =======================
   三个元素位开场是火、水、风。写入新元素时挤掉最早的一格（简化：DS 原案是玩家选一格替换）。
   祈唤：按当前三格的组合，把对应法术放进手牌（0 费、消耗、回合结束没打就消失），元素保留。每回合最多祈唤 3 次。 */
const EL = ['火', '水', '风'];
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
  sp_meteor: spell('陨星', 'atk', 'one', '造成 22 点伤害。', (g, u, t) => g.attack(t, 22)),
  sp_steam: spell('蒸爆', 'atk', 'all', '对所有敌人造成 11 点伤害。', g => g.attackAll(11)),
  sp_whirl: spell('火旋', 'atk', 'one', '造成 13 点伤害，给予 1 层易伤。', (g, u, t) => { g.attack(t, 13); g.apply(t, 'vuln', 1); }),
  sp_warm: spell('暖流', 'skill', 'self', '获得 13 点格挡。', g => g.block(13)),
  sp_prism: spell('虹闪', 'atk', 'one', '造成 11 点伤害，抽 1 张牌。', (g, u, t) => { g.attack(t, 11); g.draw(1); }),
  sp_arrow: spell('炎矢', 'atk', 'one', '造成 8 点伤害 2 次。', (g, u, t) => g.attack(t, 8, 2)),
  sp_mirror: spell('冰镜', 'skill', 'self', '获得 18 点格挡。', g => g.block(18)),
  sp_fog: spell('寒雾', 'skill', 'all', '获得 9 点格挡，给予所有敌人 1 层虚弱。', g => { g.block(9); g.applyAll('weak', 1); }),
  sp_wave: spell('踏浪', 'skill', 'self', '获得 8 点格挡，抽 2 张牌。', g => { g.block(8); g.draw(2); }),
  sp_gate: spell('风门', 'skill', 'self', '抽 2 张牌，得到 1 点能量（每回合只有第一张风门给能量）。', g => { g.draw(2); if (!P(g).gateT) { P(g).gateT = 1; g.energy(1); } }),
  e_spark: { ch: 'erin', name: '火种', type: 'atk', rar: 'start', cost: [1, 1], icon: 'ic_flame', tgt: 'one', desc: u => `造成 ${v(u, 7, 10)} 点伤害。写入火。`, play: (g, u, t) => { g.attack(t, v(u, 7, 10)); writeEl(g, '火'); } },
  e_ripple: { ch: 'erin', name: '水纹', type: 'skill', rar: 'start', cost: [1, 1], icon: 'ic_water', tgt: 'self', desc: u => `获得 ${v(u, 6, 9)} 点格挡。写入水。`, play: (g, u) => { g.block(v(u, 6, 9)); writeEl(g, '水'); } },
  e_invoke: { ch: 'erin', invoke: 1, name: '初阶祈唤', type: 'skill', rar: 'start', cost: [0, 0], icon: 'ic_rune', tgt: 'self', desc: u => `${v(u, '', '获得 3 点格挡，')}祈唤：把当前元素组合的法术放进手牌。`, play: (g, u) => { if (u) g.block(3); invoke(g); } },
  e_needle: { ch: 'erin', name: '追风针', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_stride', tgt: 'one', desc: u => `造成 ${v(u, 7, 10)} 点伤害。写入风。`, play: (g, u, t) => { g.attack(t, v(u, 7, 10)); writeEl(g, '风'); } },
  e_steamshot: { ch: 'erin', name: '蒸汽弹', type: 'atk', rar: 'c', cost: [1, 1], icon: 'sk_bmist', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 5, 7)} 点伤害；元素位里同时有火和水时改为 ${v(u, 7, 9)} 点。`, play: (g, u) => { const el = P(g).el || EL; g.attackAll(el.includes('火') && el.includes('水') ? v(u, 7, 9) : v(u, 5, 7)); } },
  e_tricolor: { ch: 'erin', name: '三色光', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_crystal', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害。三种元素齐全时抽 1 张牌。`, play: (g, u, t) => { g.attack(t, v(u, 8, 11)); if (kinds(g) === 3) g.draw(1); } },
  e_icewall: { ch: 'erin', name: '冰幕', type: 'skill', rar: 'c', cost: [1, 1], icon: 'ic_barrier', tgt: 'self', desc: u => `获得 ${v(u, 7, 10)} 点格挡。写入水。`, play: (g, u) => { g.block(v(u, 7, 10)); writeEl(g, '水'); } },
  e_ignite: { ch: 'erin', name: '点火', type: 'skill', rar: 'c', cost: [0, 0], icon: 'sk_fireel', tgt: 'self', exhaust: 1, desc: u => `写入火，抽 1 张牌。${v(u, '', '获得 3 点格挡。')}消耗。`, play: (g, u) => { writeEl(g, '火'); g.draw(1); if (u) g.block(3); } },
  e_turn: { ch: 'erin', name: '换向', type: 'skill', rar: 'c', cost: [0, 0], icon: 'ic_stride', tgt: 'self', exhaust: 1, desc: u => `写入风，获得 ${v(u, 3, 5)} 点格挡。消耗。`, play: (g, u) => { writeEl(g, '风'); g.block(v(u, 3, 5)); } },
  e_attune: { ch: 'erin', name: '调和', type: 'skill', rar: 'c', cost: [1, 1], icon: 'ic_hexa', tgt: 'self', pick: elPick, pickT: '选择要写入的元素', bot: elBot, desc: u => `写入任一元素，抽 2 张牌。${v(u, '', '获得 3 点格挡。')}`, play: (g, u, t, c, k) => { writeEl(g, k || '火'); g.draw(2); if (u) g.block(3); } },
  e_chant: { ch: 'erin', invoke: 1, name: '防御咏唱', type: 'skill', rar: 'c', cost: [1, 1], icon: 'ic_aura', tgt: 'self', desc: u => `祈唤，获得 ${v(u, 4, 6)} 点格挡。`, play: (g, u) => { g.block(v(u, 4, 6)); invoke(g); } },
  e_twin: { ch: 'erin', name: '双轨射线', type: 'atk', rar: 'u', cost: [1, 1], icon: 'ic_thunder', tgt: 'one', desc: u => `造成 ${v(u, 8, 10)} 点伤害。元素位里恰好有两种元素时，再造成 ${v(u, 5, 6)} 点伤害。`, play: (g, u, t) => { g.attack(t, v(u, 8, 10)); if (kinds(g) === 2) g.attack(t, v(u, 5, 6)); } },
  e_pure: { ch: 'erin', name: '纯相爆发', type: 'atk', rar: 'u', cost: [2, 2], icon: 'ic_gods', tgt: 'one', desc: u => `造成 ${v(u, 17, 21)} 点伤害；三格元素相同时改为 ${v(u, 26, 31)} 点。`, play: (g, u, t) => g.attack(t, kinds(g) === 1 ? v(u, 26, 31) : v(u, 17, 21)) },
  e_refill: { ch: 'erin', name: '回填', type: 'skill', rar: 'u', cost: [1, 1], icon: 'ic_orbit', tgt: 'self', desc: u => `把最早的一格改成最新一格的元素，获得 ${v(u, 8, 11)} 点格挡。`, play: (g, u) => { const p = P(g); p.el = p.el || [...EL]; p.el[0] = p.el[2]; elCheck(g); g.block(v(u, 8, 11)); } },
  e_impro: { ch: 'erin', invoke: 1, name: '临场变式', type: 'skill', rar: 'u', cost: [1, 1], icon: 'ic_vortex', tgt: 'self', pick: elPick, pickT: '选择要写入的元素', bot: elBot, desc: u => `${v(u, '', '抽 1 张牌，')}写入任一元素，然后祈唤。`, play: (g, u, t, c, k) => { if (u) g.draw(1); writeEl(g, k || '火'); invoke(g); } },
  e_split: { ch: 'erin', name: '分流', type: 'skill', rar: 'u', cost: [0, 0], icon: 'b_cd', tgt: 'self', exhaust: 1, pick: elPick, pickT: '选择要写入的元素', bot: elBot, desc: u => `写入任一元素，得到 1 点能量。${v(u, '', '获得 3 点格挡。')}消耗。`, play: (g, u, t, c, k) => { writeEl(g, k || '火'); g.energy(1); if (u) g.block(3); } },
  e_notes: { ch: 'erin', name: '元素笔记', type: 'power', rar: 'u', cost: [1, 1], icon: 'sk_pouch', tgt: 'self', desc: u => `每回合第一次凑齐三种不同元素时，抽 1 张牌${v(u, '', '，获得 3 点格挡')}。`, play: (g, u) => { P(g).st.enote = u ? 2 : 1; } },
  e_rewrite: { ch: 'erin', invoke: 1, name: '复写仪式', type: 'skill', rar: 'r', cost: [2, 1], icon: 'ic_rune', tgt: 'self', exhaust: 1, pick: elPick, pickT: '第二次祈唤前写入哪种元素', bot: elBot, desc: () => `祈唤；再写入任一元素，再祈唤一次（这张不占每回合 3 次的上限）。消耗。`, play: (g, u, t, c, k) => { invoke(g, true); writeEl(g, k || '火'); invoke(g, true); } },
  e_crown: { ch: 'erin', name: '三相冠冕', type: 'power', rar: 'r', cost: [1, 1], icon: 'm_crown', tgt: 'self', desc: u => `每回合打出第一张三格相同的法术（陨星、冰镜、风门）后，获得 ${v(u, 5, 8)} 点格挡，抽 1 张牌。`, play: (g, u) => { P(g).st.ecrown = v(u, 5, 8); } },
  e_seasons: { ch: 'erin', name: '四季轮转', type: 'power', rar: 'r', cost: [2, 1], icon: 'sk_orb', tgt: 'self', desc: () => `每回合打出第二张法术时，如果和第一张的配方不同，对所有敌人造成 7 点伤害。`, play: g => { P(g).st.eseason = 1; } },
};

/* ======================= 顾清寒 · 飞剑 / 内力 / 剑势 =======================
   飞剑（最多 5 把）：每把让攻击牌的第一击 +2；「射出」移除飞剑，每把单独造成 5 点伤害。
   内力（最多 12）：每回合开始 +1，由牌消耗。燃血：失去 2 生命换 3 内力（每回合只有第一次给内力）。
   剑势：开场疾风。切入疾风→本回合下一张攻击牌少 1 费；切入破岳→下一张攻击牌第一击 +4。每种势每回合最多触发一次。
   连段：本回合已经打出的攻击牌张数。原案「可选」的花费（可射出、可花内力）简化为条件满足就自动执行。 */
const sw = g => P(g).st.sword || 0;
function addSword(g, n) { const p = P(g), a = sw(g), b = Math.min(5, a + n); if (b > a) p.st.sword = b; return a + n - b; }
function shootSword(g, t, k, dmg = 5) { const p = P(g); k = Math.min(k, sw(g)); if (!k) return 0; p.st.sword -= k; if (!p.st.sword) delete p.st.sword; const fh = p.fh; p.fh = 0; for (let i = 0; i < k; i++) { const a = g.alive(); if (!a.length) break; g.attack(t && !t.dead ? t : a[0], dmg); } p.fh = fh; return k; }
const live = (g, t) => (t && !t.dead ? t : g.alive()[0]);
function gainQi(g, n) { const p = P(g); p.st.qi = Math.min(12, (p.st.qi || 0) + n); }
function spendQi(g, n) { const p = P(g); if ((p.st.qi || 0) < n) return false; p.st.qi -= n; if (!p.st.qi) delete p.st.qi; if (p.st.qiflow && !p.qiT) { p.qiT = 1; g.block(p.st.qiflow, true); } return true; }
function burnBlood(g) { const p = P(g); if (g.has('jade') && !p.jadeU) p.jadeU = 1; else g.loseHp(2); if (!p.burnT) { p.burnT = 1; gainQi(g, 3); if (p.st.revqi) { gainQi(g, 2); g.draw(1); } } }
function stance(g, to) { const p = P(g); to = to || (p.st.wind ? 'mtn' : 'wind'); if (p.st[to]) return; delete p.st.wind; delete p.st.mtn; p.st[to] = 1;
  if (p.st.zen && !p.zenT) { p.zenT = 1; g.draw(p.st.zen); }
  if (to === 'wind' && !p.windT) { p.windT = 1; p.windDisc = 1; } if (to === 'mtn' && !p.mtnT) { p.mtnT = 1; p.mtnB = 4; }
  if (p.windT && p.mtnT && !p.dualT && p.st.dualst) { p.dualT = 1; g.energy(1); g.draw(1); if (p.st.dualst > 1) g.block(5); } }
const GU = {
  g_sheath: { ch: 'gu', name: '收剑式', type: 'atk', rar: 'start', cost: [1, 1], icon: 'ic_sword', tgt: 'one', desc: u => `造成 ${v(u, 7, 9)} 点伤害。得到 1 把飞剑。`, play: (g, u, t) => { g.attack(t, v(u, 7, 9)); addSword(g, 1); } },
  g_breath: { ch: 'gu', name: '吐纳', type: 'skill', rar: 'start', cost: [1, 1], icon: 'ic_aura', tgt: 'self', desc: u => `获得 ${v(u, 7, 9)} 点格挡。得到 ${v(u, 2, 3)} 点内力。`, play: (g, u) => { g.block(v(u, 7, 9)); gainQi(g, v(u, 2, 3)); } },
  g_shift: { ch: 'gu', name: '易势', type: 'skill', rar: 'start', cost: [0, 0], icon: 'ic_stride', tgt: 'self', exhaust: 1, desc: u => `切换剑势，抽 1 张牌。${v(u, '', '获得 3 点格挡。')}消耗。`, play: (g, u) => { stance(g); g.draw(1); if (u) g.block(3); } },
  g_return: { ch: 'gu', name: '归鞘', type: 'skill', rar: 'c', cost: [1, 1], icon: 'sk_gsword', tgt: 'self', desc: u => `获得 ${v(u, 6, 9)} 点格挡。得到 1 把飞剑。`, play: (g, u) => { g.block(v(u, 6, 9)); addSword(g, 1); } },
  g_finger: { ch: 'gu', name: '指剑', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_rapier', tgt: 'one', desc: u => `造成 ${v(u, 6, 9)} 点伤害。有飞剑时，再射出 1 把。`, play: (g, u, t) => { g.attack(t, v(u, 6, 9)); shootSword(g, t, 1); } },
  g_pine: { ch: 'gu', name: '风过松', type: 'atk', rar: 'c', cost: [0, 0], icon: 'sk_rapier', tgt: 'one', desc: u => `造成 ${v(u, 4, 6)} 点伤害。本回合已打出 2 张攻击牌时，抽 1 张牌。`, play: (g, u, t) => { g.attack(t, v(u, 4, 6)); if ((P(g).combo || 0) >= 2) g.draw(1); } },
  g_cliff: { ch: 'gu', name: '断崖', type: 'atk', rar: 'c', cost: [1, 1], icon: 'sk_greatsword', tgt: 'one', desc: u => `造成 ${v(u, 8, 10)} 点伤害；破岳势下再 +${v(u, 4, 5)}。`, play: (g, u, t) => g.attack(t, v(u, 8, 10) + (P(g).st.mtn ? v(u, 4, 5) : 0)) },
  g_guard: { ch: 'gu', name: '守中', type: 'skill', rar: 'c', cost: [1, 1], icon: 'sk_hshield', tgt: 'self', desc: u => `获得 ${v(u, 8, 11)} 点格挡。疾风势下抽 1 张牌。`, play: (g, u) => { g.block(v(u, 8, 11)); if (P(g).st.wind) g.draw(1); } },
  g_burn: { ch: 'gu', name: '焚脉', type: 'skill', rar: 'c', cost: [0, 0], icon: 'm_blood', tgt: 'self', desc: u => `燃血（失去 2 生命，得到 3 点内力，每回合只有第一次给内力）。获得 ${v(u, 5, 8)} 点格挡。`, play: (g, u) => { burnBlood(g); g.block(v(u, 5, 8)); } },
  g_palm: { ch: 'gu', name: '绵掌', type: 'atk', rar: 'c', cost: [1, 1], icon: 'sk_fist', tgt: 'one', desc: u => `造成 ${v(u, 7, 9)} 点伤害。内力不少于 3 时，花掉 3 点再打 1 次。`, play: (g, u, t) => { g.attack(t, v(u, 7, 9)); if (spendQi(g, 3)) g.attack(t, v(u, 7, 9)); } },
  g_qi: { ch: 'gu', name: '运气', type: 'skill', rar: 'c', cost: [1, 1], icon: 'ic_aura', tgt: 'self', desc: u => `获得 ${v(u, 7, 9)} 点格挡。内力不少于 3 时，花掉 3 点再获得 ${v(u, 6, 8)} 点格挡。`, play: (g, u) => { g.block(v(u, 7, 9)); if (spendQi(g, 3)) g.block(v(u, 6, 8)); } },
  g_three: { ch: 'gu', name: '并指三剑', type: 'skill', rar: 'u', cost: [1, 1], icon: 'sk_gsword', tgt: 'self', desc: u => `得到 2 把飞剑；超过上限的每把改为获得 ${v(u, 4, 6)} 点格挡。`, play: (g, u) => { const o = addSword(g, 2); if (o > 0) g.block(o * v(u, 4, 6)); } },
  g_rain: { ch: 'gu', name: '长空落剑', type: 'atk', rar: 'u', cost: [1, 1], icon: 'ic_xbow', tgt: 'one', desc: u => `射出全部飞剑（每把 5 点伤害），再造成 ${v(u, 5, 8)} 点伤害。`, play: (g, u, t) => { shootSword(g, t, 5); g.attack(live(g, t), v(u, 5, 8)); } },
  g_horse: { ch: 'gu', name: '回马势', type: 'skill', rar: 'u', cost: [1, 1], icon: 'sk_wolf', tgt: 'self', desc: u => `切换剑势。获得 ${v(u, 8, 11)} 点格挡。`, play: (g, u) => { stance(g); g.block(v(u, 8, 11)); } },
  g_snow: { ch: 'gu', name: '雪径连斩', type: 'atk', rar: 'u', cost: [1, 1], icon: 'fx_slash', tgt: 'one', desc: u => `造成 ${v(u, 8, 10)} 点伤害。本回合已打出 2 张攻击牌时，再对所有敌人造成 ${v(u, 6, 8)} 点伤害。`, play: (g, u, t) => { const c = P(g).combo || 0; g.attack(t, v(u, 8, 10)); if (c >= 2) g.attackAll(v(u, 6, 8)); } },
  g_quake: { ch: 'gu', name: '震山掌', type: 'atk', rar: 'u', cost: [2, 2], icon: 'ic_palm', tgt: 'one', desc: u => `造成 ${v(u, 16, 20)} 点伤害。有 2 个以上敌人且内力不少于 5 时，花掉 5 点改为打所有敌人。`, play: (g, u, t) => { if (g.alive().length >= 2 && spendQi(g, 5)) g.attackAll(v(u, 16, 20)); else g.attack(t, v(u, 16, 20)); } },
  g_flow: { ch: 'gu', name: '气走周天', type: 'power', rar: 'u', cost: [1, 1], icon: 'ic_orbit', tgt: 'self', desc: u => `每回合第一次花掉内力时，获得 ${v(u, 4, 6)} 点格挡。`, play: (g, u) => { P(g).st.qiflow = v(u, 4, 6); } },
  g_myriad: { ch: 'gu', name: '万剑归一', type: 'atk', rar: 'r', cost: [2, 2], icon: 'sk_gsword', tgt: 'one', desc: u => `射出全部飞剑，每把改为 ${v(u, 9, 11)} 点伤害，然后得到 2 把飞剑。`, play: (g, u, t) => { shootSword(g, t, 5, v(u, 9, 11)); P(g).fh = 0; addSword(g, 2); } },
  g_rev: { ch: 'gu', name: '逆行经脉', type: 'power', rar: 'r', cost: [2, 1], icon: 'm_anger', tgt: 'self', desc: () => `每回合第一次燃血时，额外得到 2 点内力并抽 1 张牌。`, play: g => { P(g).st.revqi = 1; } },
  g_dual: { ch: 'gu', name: '双势归元', type: 'power', rar: 'r', cost: [1, 1], icon: 'ic_hexa', tgt: 'self', desc: u => `同一回合里两种剑势都切入过时（每回合一次），得到 1 点能量，抽 1 张牌${v(u, '', '，获得 5 点格挡')}。`, play: (g, u) => { P(g).st.dualst = u ? 2 : 1; } },
};

/* ======================= 希尔薇 · 龙血 / 霜龙形态 / 霜甲 =======================
   龙血满 10 后点「变身」：霜龙形态持续本回合和接下来两个回合（每场最多 2 次），期间不能攒龙血。
   霜龙形态：变身时对所有敌人造成 10 点伤害；攻击牌的第一击 +6；每个敌方回合第一段打穿格挡的伤害 -4。退形后下一个回合虚弱 1。
   霜甲：每点抵消 1 点打穿格挡的敌人攻击伤害，你的回合开始时清空。 */
const dr = g => !!P(g).st.dragon;
function gainDB(g, n) { const p = P(g); if (dr(g)) return; p.st.dblood = Math.min(8, (p.st.dblood || 0) + n); }
function gainFrost(g, n) { const p = P(g); if (p.st.fspine && !p.frostT) { p.frostT = 1; n += p.st.fspine; } p.st.frost = (p.st.frost || 0) + n; }
function spendFrost(g, n) { const p = P(g), k = Math.min(n, p.st.frost || 0); if (k) { p.st.frost -= k; if (!p.st.frost) delete p.st.frost; } return k; }
const SYL = {
  s_lance: { ch: 'sylvie', name: '霜枪', type: 'atk', rar: 'start', cost: [1, 1], icon: 'ic_stake', tgt: 'one', desc: u => `造成 ${v(u, 7, 10)} 点伤害。得到 2 点龙血。`, play: (g, u, t) => { g.attack(t, v(u, 7, 10)); gainDB(g, 2); } },
  s_scale: { ch: 'sylvie', name: '鳞守', type: 'skill', rar: 'start', cost: [1, 1], icon: 'b_armor', tgt: 'self', desc: u => `获得 ${v(u, 6, 8)} 点格挡和 ${v(u, 2, 3)} 层霜甲。`, play: (g, u) => { g.block(v(u, 6, 8)); gainFrost(g, v(u, 2, 3)); } },
  s_pulse: { ch: 'sylvie', name: '龙脉吐纳', type: 'skill', rar: 'start', cost: [1, 1], icon: 'm_blood', tgt: 'self', desc: u => `得到 ${v(u, 3, 4)} 点龙血，获得 ${v(u, 4, 5)} 点格挡。`, play: (g, u) => { gainDB(g, v(u, 3, 4)); g.block(v(u, 4, 5)); } },
  s_crack: { ch: 'sylvie', name: '裂冰', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_crystal', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害。霜龙形态下给予 1 层易伤。`, play: (g, u, t) => { g.attack(t, v(u, 8, 11)); if (dr(g)) g.apply(t, 'vuln', 1); } },
  s_rev: { ch: 'sylvie', name: '逆鳞刺', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_rapier', tgt: 'one', desc: u => `造成 ${v(u, 7, 9)} 点伤害，再加上当前霜甲层数（最多 +${v(u, 6, 8)}）。`, play: (g, u, t) => g.attack(t, v(u, 7, 9) + Math.min(v(u, 6, 8), P(g).st.frost || 0)) },
  s_sweep: { ch: 'sylvie', name: '横扫冰原', type: 'atk', rar: 'c', cost: [1, 1], icon: 'sk_waterel', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 5, 7)} 点伤害。得到 1 点龙血。`, play: (g, u) => { g.attackAll(v(u, 5, 7)); gainDB(g, 1); } },
  s_frost: { ch: 'sylvie', name: '结霜', type: 'skill', rar: 'c', cost: [1, 1], icon: 'ic_water', tgt: 'self', desc: u => `获得 ${v(u, 5, 7)} 点格挡和 ${v(u, 4, 5)} 层霜甲。`, play: (g, u) => { g.block(v(u, 5, 7)); gainFrost(g, v(u, 4, 5)); } },
  s_borrow: { ch: 'sylvie', name: '借寒', type: 'skill', rar: 'c', cost: [0, 0], icon: 'sk_bmist', tgt: 'self', exhaust: 1, pick: (g) => [{ val: 'b', html: btn('<span>得到龙血</span>') }, { val: 'f', html: btn('<span>得到霜甲</span>') }], pickT: '借寒：选一样', bot: (g, o) => o[dr(g) ? 1 : 0], desc: u => `二选一：得到 ${v(u, 2, 3)} 点龙血，或 ${v(u, 3, 4)} 层霜甲。消耗。`, play: (g, u, t, c, k) => { if (k === 'f') gainFrost(g, v(u, 3, 4)); else gainDB(g, v(u, 2, 3)); } },
  s_breath: { ch: 'sylvie', name: '凝息', type: 'skill', rar: 'c', cost: [1, 1], icon: 'ic_aura', tgt: 'self', desc: u => `获得 ${v(u, 8, 11)} 点格挡。霜龙形态下抽 1 张牌。`, play: (g, u) => { g.block(v(u, 8, 11)); if (dr(g)) g.draw(1); } },
  s_sneak: { ch: 'sylvie', name: '冰下潜行', type: 'skill', rar: 'c', cost: [1, 1], icon: 'sk_shadow', tgt: 'one', desc: u => `获得 ${v(u, 7, 9)} 点格挡，给予目标 1 层虚弱。`, play: (g, u, t) => { g.block(v(u, 7, 9)); g.apply(t, 'weak', 1); } },
  s_shatter: { ch: 'sylvie', name: '晶碎', type: 'atk', rar: 'c', cost: [1, 1], icon: 'p_knock', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害。花掉最多 4 层霜甲，每层 +2。`, play: (g, u, t) => g.attack(t, v(u, 8, 11) + 2 * spendFrost(g, 4)) },
  s_claw: { ch: 'sylvie', name: '龙爪二式', type: 'atk', rar: 'u', cost: [1, 1], icon: 'sk_wolf', tgt: 'one', desc: u => `造成 ${v(u, 5, 7)} 点伤害 2 次。霜龙形态下第一击再 +2。`, play: (g, u, t) => { if (dr(g)) P(g).fhx = 2; g.attack(t, v(u, 5, 7), 2); } },
  s_echo: { ch: 'sylvie', name: '血脉回响', type: 'skill', rar: 'u', cost: [1, 1], icon: 'm_blood', tgt: 'self', desc: u => `得到 ${v(u, 4, 5)} 点龙血；霜龙形态下改为获得 ${v(u, 8, 11)} 点格挡并抽 1 张牌。`, play: (g, u) => { if (dr(g)) { g.block(v(u, 8, 11)); g.draw(1); } else gainDB(g, v(u, 4, 5)); } },
  s_coffin: { ch: 'sylvie', name: '冰棺', type: 'skill', rar: 'u', cost: [2, 2], icon: 'sk_hwall', tgt: 'self', desc: u => `获得 ${v(u, 15, 18)} 点格挡和 ${v(u, 6, 8)} 层霜甲。`, play: (g, u) => { g.block(v(u, 15, 18)); gainFrost(g, v(u, 6, 8)); } },
  s_gather: { ch: 'sylvie', name: '收鳞', type: 'skill', rar: 'u', cost: [0, 0], icon: 'p_tough', tgt: 'self', exhaust: 1, desc: u => `把最多 5 层霜甲转成等量龙血。${v(u, '', '抽 1 张牌。')}消耗。`, play: (g, u) => { const k = dr(g) ? 0 : spendFrost(g, 5); gainDB(g, k); if (u) g.draw(1); } },
  s_roar: { ch: 'sylvie', name: '龙吼', type: 'skill', rar: 'u', cost: [1, 1], icon: 'm_anger', tgt: 'all', desc: u => `给予所有敌人 ${v(u, 1, 2)} 层虚弱；霜龙形态下再给予 1 层易伤。`, play: (g, u) => { g.applyAll('weak', v(u, 1, 2)); if (dr(g)) g.applyAll('vuln', 1); } },
  s_spine: { ch: 'sylvie', name: '冰晶脊', type: 'power', rar: 'u', cost: [1, 1], icon: 'ic_crystal', tgt: 'self', desc: u => `每回合第一次获得霜甲时，再多 ${v(u, 2, 3)} 层。`, play: (g, u) => { P(g).st.fspine = v(u, 2, 3); } },
  s_night: { ch: 'sylvie', name: '极夜龙息', type: 'atk', rar: 'r', cost: [2, 2], icon: 'sk_waterel', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 13, 16)} 点伤害；霜龙形态下改为 ${v(u, 19, 23)} 点。`, play: (g, u) => g.attackAll(dr(g) ? v(u, 19, 23) : v(u, 13, 16)) },
  s_aval: { ch: 'sylvie', name: '雪崩之心', type: 'power', rar: 'r', cost: [2, 1], icon: 'ic_mine', tgt: 'self', desc: () => `每个敌方回合，霜甲第一次挡下伤害后，攻击者受到 8 点伤害。`, play: g => { P(g).st.aval = 1; } },
  s_wake: { ch: 'sylvie', name: '冬眠苏醒', type: 'power', rar: 'r', cost: [1, 1], icon: 'p_rev', tgt: 'self', desc: u => `每次退出霜龙形态的那个回合，额外抽 2 张牌，获得 5 点格挡${v(u, '', '，得到 1 点能量')}。`, play: (g, u) => { P(g).st.wake = u ? 2 : 1; } },
};

/* ======================= 米娅 · 云猫团子 =======================
   团子 1/2/3 级：生命 15/20/25、攻击 7/9/11，每场满血入场，倒地后这场不再回来。
   每回合有一个免费指令（默认护卫，每回合能改一次）：
   护卫：替米娅挡下一次敌人直接攻击的前 8 点（受团子剩余生命限制，团子自己只受一半）；扑击：回合结束攻击目标；休息：回合结束团子回 3 生命。
   团子活着且这场执行过两种不同指令，胜利后得 1 成长点；累计 3 / 7 点升到 2 / 3 级。 */
function catDid(g, k) { const p = P(g), c = p.cat; if (c.did[k]) return; c.did[k] = 1; if (p.st.mjump) g.block(p.st.mjump, true); if (Object.keys(c.did).length >= 2 && g.has('lynx') && !p.lynxU) { p.lynxU = 1; p.lynxD = 1; } }
const CATLV = [null, { max: 15, atk: 7 }, { max: 20, atk: 9 }, { max: 25, atk: 11 }];
const cat = g => P(g).cat;
const catUp = g => cat(g) && !cat(g).down;
const healCat = (g, n) => { const c = cat(g); if (!c || c.down) return 0; const k = Math.min(n, c.max - c.hp); c.hp += k; return k; };
const isPT = (g, t) => t && catUp(g) && cat(g).cmd === 'pounce' && cat(g).pt === t.id;
const MIA = {
  m_staff: { ch: 'mia', name: '猫杖点射', type: 'atk', rar: 'start', cost: [1, 1], icon: 'ic_rune', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害。团子在扑击时，扑击目标改成这个敌人。`, play: (g, u, t) => { g.attack(t, v(u, 8, 11)); const c = cat(g); if (c && c.cmd === 'pounce' && t) c.pt = t.id; } },
  m_side: { ch: 'mia', name: '并肩防守', type: 'skill', rar: 'start', cost: [1, 1], icon: 'sk_hshield', tgt: 'self', desc: u => `获得 ${v(u, 7, 9)} 点格挡。团子在护卫时，本轮能多挡 ${v(u, 2, 3)} 点。`, play: (g, u) => { g.block(v(u, 7, 9)); if (cat(g)) cat(g).gB = (cat(g).gB || 0) + v(u, 2, 3); } },
  m_snack: { ch: 'mia', name: '递零食', type: 'skill', rar: 'start', cost: [1, 1], icon: 'meat', tgt: 'self', desc: u => `团子回复 ${v(u, 4, 5)} 生命，米娅获得 ${v(u, 5, 7)} 点格挡。`, play: (g, u) => { healCat(g, v(u, 4, 5)); g.block(v(u, 5, 7)); } },
  m_flank: { ch: 'mia', name: '绕背', type: 'atk', rar: 'c', cost: [1, 1], icon: 'sk_shadow', tgt: 'one', desc: u => `造成 ${v(u, 7, 9)} 点伤害；目标是团子的扑击目标时再 +${v(u, 4, 5)}。`, play: (g, u, t) => g.attack(t, v(u, 7, 9) + (isPT(g, t) ? v(u, 4, 5) : 0)) },
  m_bell: { ch: 'mia', name: '铃铛波', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_bell', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 5, 7)} 点伤害。`, play: (g, u) => g.attackAll(v(u, 5, 7)) },
  m_rope: { ch: 'mia', name: '弹跳绳', type: 'skill', rar: 'c', cost: [1, 1], icon: 'ic_whip', tgt: 'self', desc: u => `获得 ${v(u, 7, 10)} 点格挡。本回合可以再改一次团子的指令。`, play: (g, u) => { g.block(v(u, 7, 10)); if (cat(g)) cat(g).set = 0; } },
  m_scarf: { ch: 'mia', name: '双层围巾', type: 'skill', rar: 'c', cost: [1, 1], icon: 'b_dur', tgt: 'self', desc: u => `获得 ${v(u, 7, 9)} 点格挡。团子护卫时，它自己受到的伤害 -${v(u, 2, 3)}。`, play: (g, u) => { g.block(v(u, 7, 9)); if (cat(g)) cat(g).sR = v(u, 2, 3); } },
  m_whistle: { ch: 'mia', name: '追踪哨', type: 'skill', rar: 'c', cost: [0, 0], icon: 'p_hunt', tgt: 'self', exhaust: 1, desc: u => `本回合团子扑击 +${v(u, 3, 5)} 点伤害，抽 1 张牌。消耗。`, play: (g, u) => { if (cat(g)) cat(g).pB = (cat(g).pB || 0) + v(u, 3, 5); g.draw(1); } },
  m_nest: { ch: 'mia', name: '暖窝', type: 'skill', rar: 'c', cost: [1, 1], icon: 'box', tgt: 'self', desc: u => `获得 ${v(u, 8, 10)} 点格挡。团子休息时额外回复 ${v(u, 3, 4)} 生命。`, play: (g, u) => { g.block(v(u, 8, 10)); if (cat(g)) cat(g).rB = (cat(g).rB || 0) + v(u, 3, 4); } },
  m_duck: { ch: 'mia', name: '一起蹲下', type: 'skill', rar: 'c', cost: [1, 1], icon: 'p_dodge', tgt: 'self', desc: u => `获得 ${v(u, 9, 11)} 点格挡。团子还在场时抽 1 张牌。`, play: (g, u) => { g.block(v(u, 9, 11)); if (catUp(g)) g.draw(1); } },
  m_pat: { ch: 'mia', name: '拍拍背', type: 'skill', rar: 'c', cost: [0, 0], icon: 'sk_fairy', tgt: 'self', exhaust: 1, desc: u => `团子回复 ${v(u, 3, 4)} 生命，米娅获得 ${v(u, 3, 5)} 点格挡。消耗。`, play: (g, u) => { healCat(g, v(u, 3, 4)); g.block(v(u, 3, 5)); } },
  m_pincer: { ch: 'mia', name: '夹击', type: 'atk', rar: 'u', cost: [1, 1], icon: 'sk_wolf', tgt: 'one', desc: u => `造成 ${v(u, 9, 12)} 点伤害；目标是团子的扑击目标时给予 1 层易伤。`, play: (g, u, t) => { if (isPT(g, t)) g.apply(t, 'vuln', 1); g.attack(t, v(u, 9, 12)); } },
  m_revenge: { ch: 'mia', name: '护主反扑', type: 'atk', rar: 'u', cost: [1, 1], icon: 'm_anger', tgt: 'one', desc: u => `造成 ${v(u, 8, 10)} 点伤害，再加上上一轮团子替你挡下的伤害（最多 +${v(u, 8, 10)}）。`, play: (g, u, t) => g.attack(t, v(u, 8, 10) + Math.min(v(u, 8, 10), (cat(g) && cat(g).took) || 0)) },
  m_swap: { ch: 'mia', name: '交换站位', type: 'skill', rar: 'u', cost: [0, 0], icon: 'ic_orbit', tgt: 'self', exhaust: 1, desc: u => `把团子的指令改成护卫，米娅获得 ${v(u, 6, 9)} 点格挡。消耗。`, play: (g, u) => { const c = cat(g); if (c && !c.down) { c.cmd = 'guard'; c.did = c.did || {}; } g.block(v(u, 6, 9)); } },
  m_mint: { ch: 'mia', name: '猫薄荷团', type: 'skill', rar: 'u', cost: [1, 1], icon: 'sk_treant', tgt: 'self', desc: u => `团子回复 ${v(u, 5, 7)} 生命；实际回复不少于 3 点时，得到 1 点能量。`, play: (g, u) => { if (healCat(g, v(u, 5, 7)) >= 3) g.energy(1); } },
  m_jump: { ch: 'mia', name: '练习跳台', type: 'power', rar: 'u', cost: [1, 1], icon: 'ic_stride', tgt: 'self', desc: u => `每场战斗每种指令第一次执行时，米娅获得 ${v(u, 4, 6)} 点格挡。`, play: (g, u) => { P(g).st.mjump = v(u, 4, 6); } },
  m_cloud: { ch: 'mia', name: '云步', type: 'skill', rar: 'u', cost: [1, 1], icon: 'sk_flamestep', tgt: 'self', desc: u => `获得 ${v(u, 10, 13)} 点格挡。团子倒地时再获得 5 点格挡并抽 1 张牌。`, play: (g, u) => { g.block(v(u, 10, 13)); if (cat(g) && cat(g).down) { g.block(5); g.draw(1); } } },
  m_bigpounce: { ch: 'mia', name: '大猫扑杀', type: 'skill', rar: 'r', cost: [2, 2], icon: 'p_exec', tgt: 'self', exhaust: 1, desc: u => `本回合团子的指令是扑击时，扑击改为造成 ${v(u, 14, 17)} 点伤害 2 次（追踪哨的加成每次都算）。消耗。`, play: (g, u) => { if (cat(g)) cat(g).big = v(u, 14, 17); } },
  m_hold: { ch: 'mia', name: '绝不松手', type: 'skill', rar: 'r', cost: [1, 1], icon: 'p_rev', tgt: 'self', exhaust: 1, desc: u => `获得 ${v(u, 10, 13)} 点格挡。团子倒地时，让它带着 ${v(u, 6, 9)} 生命回到场上。消耗。`, play: (g, u) => { g.block(v(u, 10, 13)); const c = cat(g); if (c && c.down) { c.down = 0; c.hp = Math.min(c.max, v(u, 6, 9)); c.cmd = 'guard'; c.set = 0; c.big = 0; c.pB = 0; } } },
  m_gate: { ch: 'mia', name: '云猫守门', type: 'power', rar: 'r', cost: [2, 1], icon: 'm_ward', tgt: 'self', desc: () => `团子护卫时多挡 3 点；团子护卫真的受了伤，下回合米娅抽 1 张牌。`, play: g => { P(g).st.mgate = 1; } },
  m_sac: { ch: 'mia', can: g => catUp(g), name: '献祭', type: 'atk', rar: 'r', cost: [2, 2], icon: 'p_svamp', tgt: 'all', exhaust: 1, desc: u => `团子${v(u, '倒地', '只剩 1 生命')}，对所有敌人造成团子最大生命一半的伤害。消耗。`, play: (g, u) => { const c = cat(g); if (!c || c.down) return; g.attackAll(Math.floor(c.max / 2)); if (u) c.hp = 1; else { c.hp = 0; c.down = 1; } } },
};

/* ======================= 绯月 · 鲜血 / 吸血 / 蝙蝠 =======================
   献血 N：失去 N 生命，得到 N 鲜血（最多 12）。牌面写「生命高于一半时献血」的，生命不到一半就不献（简化：原案是玩家自己决定）。
   吸血 N：按这一击实际打掉的生命回复，最多 N；每场战斗吸血合计最多 14。
   蝙蝠（最多 4 只）：不出猎时，每回合结束每只给「标记目标」1 层血痕（最多 4）；出猎：每只造成 7 点伤害；攒满 4 只时回合结束自动出猎，血痕每层再 +1，然后蝙蝠全部离场。 */
const vb = g => P(g).st.vblood || 0;
function donate(g, n, safe = true) { const R = g.R; if (safe && R.hp <= R.maxHp / 2) return false; if (R.hp <= n) return false; g.loseHp(n); const p = P(g); p.st.vblood = Math.min(12, vb(g) + n); p.donT = 1; if (p.st.vpulse && !p.vpT) { p.vpT = 1; g.block(p.st.vpulse, true); } return true; }
function spendB(g, n) { const p = P(g); if (vb(g) < n) return false; p.st.vblood -= n; if (!p.st.vblood) delete p.st.vblood; if (n >= 4 && p.st.vdawn && !p.vdT) { p.vdT = 1; g.energy(1); g.block(p.st.vdawn, true); } return true; }
function leech(g, dealt, n) { const p = P(g); let k = Math.min(dealt, n, 14 - (p.ls || 0)); if (k <= 0) return; const pin = g.has('redpin') && !p.pinU; if (pin) k = Math.min(k + 2, 14 - (p.ls || 0)); const got = g.heal(k) || 0; if (got <= 0) return; if (pin) p.pinU = 1; p.ls = (p.ls || 0) + got; /* 满血时回不到血，不扣额度也不触发 */ if (p.st.vhunger) g.block(p.st.vhunger, true); if (p.st.vowb && !p.vowT) { p.vowT = 1; p.st.vblood = Math.min(12, vb(g) + 1); g.draw(1); } }
const bats = g => P(g).st.bat || 0;
function addBat(g, n) { const p = P(g); p.st.bat = Math.min(4, bats(g) + n); if (!p.st.bat) delete p.st.bat; }
function markT(g) { const a = g.alive(), p = P(g); let t = a.find(e => e.id === p.mark); if (!t && a[0]) { t = a[0]; p.mark = t.id; } return t; }
function hunt(g, t, per = 7) { const p = P(g), k = bats(g); if (!k) return; if (t && t.dead) return; t = t || markT(g); if (!t) return; /* 指定的目标已经倒下：蝙蝠留着 */ const sc = t.st.scar || 0; delete t.st.scar; delete p.st.bat; p.fh = 0;
  for (let i = 0; i < k && !t.dead; i++) g.attack(t, per + (i === 0 ? sc : 0));
  if (k >= 4 && g.has('cup') && !p.cupU) { p.cupU = 1; addBat(g, 1); g.draw(1); } }
const FEI = {
  f_claw: { ch: 'feiyue', name: '红爪', type: 'atk', rar: 'start', cost: [1, 1], icon: 'p_svamp', tgt: 'one', desc: u => `造成 ${v(u, 9, 12)} 点伤害，吸血 ${v(u, 3, 4)}。`, play: (g, u, t) => leech(g, g.attack(t, v(u, 9, 12)), v(u, 3, 4)) },
  f_sleeve: { ch: 'feiyue', name: '挽袖', type: 'skill', rar: 'start', cost: [1, 1], icon: 'b_vamp', tgt: 'self', desc: u => `获得 ${v(u, 8, 11)} 点格挡。生命高于一半时献血 2。`, play: (g, u) => { g.block(v(u, 8, 11)); donate(g, 2); } },
  f_bats: { ch: 'feiyue', name: '放蝠', type: 'skill', rar: 'start', cost: [1, 1], icon: 'sk_undead', tgt: 'self', desc: u => `得到 3 只蝙蝠，获得 ${v(u, 3, 6)} 点格挡。`, play: (g, u) => { addBat(g, 3); g.block(v(u, 3, 6)); } },
  f_line: { ch: 'feiyue', name: '血线', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_whip', tgt: 'one', desc: u => `造成 ${v(u, 8, 10)} 点伤害。鲜血不少于 2 时，花掉 2 点再造成 ${v(u, 6, 8)} 点伤害。`, play: (g, u, t) => { g.attack(t, v(u, 8, 10)); if (spendB(g, 2)) g.attack(t, v(u, 6, 8)); } },
  f_moon: { ch: 'feiyue', name: '血月飞刃', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_boomer', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 5, 7)} 点伤害；生命高于一半时献血 1，改为 ${v(u, 7, 9)} 点。`, play: (g, u) => g.attackAll(donate(g, 1) ? v(u, 7, 9) : v(u, 5, 7)) },
  f_gap: { ch: 'feiyue', name: '寻隙', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_rapier', tgt: 'one', desc: u => `造成 ${v(u, 7, 10)} 点伤害。打穿了目标的格挡时，获得 5 点格挡。`, play: (g, u, t) => { const b = t ? t.block : 0, d = g.attack(t, v(u, 7, 10)); if (b > 0 && d > 0) g.block(5); } },
  f_drink: { ch: 'feiyue', name: '夜饮', type: 'atk', rar: 'c', cost: [1, 1], icon: 'b_vamp', tgt: 'one', desc: u => `造成 ${v(u, 7, 9)} 点伤害，吸血 ${v(u, 3, 4)}。`, play: (g, u, t) => leech(g, g.attack(t, v(u, 7, 9)), v(u, 3, 4)) },
  f_gauze: { ch: 'feiyue', name: '纱布', type: 'skill', rar: 'c', cost: [1, 1], icon: 'b_regen', tgt: 'self', desc: u => `获得 ${v(u, 8, 10)} 点格挡。鲜血不少于 2 时，花掉 2 点再获得 ${v(u, 6, 8)} 点格挡。`, play: (g, u) => { g.block(v(u, 8, 10)); if (spendB(g, 2)) g.block(v(u, 6, 8)); } },
  f_shade: { ch: 'feiyue', name: '蝠影', type: 'skill', rar: 'c', cost: [1, 1], icon: 'sk_shadow', tgt: 'self', desc: u => `获得 ${v(u, 7, 10)} 点格挡，得到 1 只蝙蝠。`, play: (g, u) => { g.block(v(u, 7, 10)); addBat(g, 1); } },
  f_snap: { ch: 'feiyue', name: '响指', type: 'skill', rar: 'c', cost: [0, 0], icon: 'p_hunt', tgt: 'one', exhaust: 1, desc: u => `蝙蝠全部对目标出猎。${v(u, '', '获得 3 点格挡。')}消耗。`, play: (g, u, t) => { hunt(g, t); if (u) g.block(3); } },
  f_thirst: { ch: 'feiyue', name: '止渴', type: 'skill', rar: 'c', cost: [0, 0], icon: 'm_blood', tgt: 'self', exhaust: 1, desc: u => `生命高于一半时献血 2。抽 1 张牌。${v(u, '', '获得 4 点格挡。')}消耗。`, play: (g, u) => { donate(g, 2); g.draw(1); if (u) g.block(4); } },
  f_curtain: { ch: 'feiyue', name: '红幕', type: 'skill', rar: 'u', cost: [1, 1], icon: 'sk_hwall', tgt: 'self', desc: u => `花掉最多 4 点鲜血，每点获得 ${v(u, 3, 4)} 点格挡；另获得 4 点格挡。`, play: (g, u) => { const k = Math.min(4, vb(g)); if (k) spendB(g, k); g.block(4 + k * v(u, 3, 4)); } },
  f_vein: { ch: 'feiyue', name: '破脉', type: 'atk', rar: 'u', cost: [2, 2], icon: 'sk_greatsword', tgt: 'one', desc: u => `造成 ${v(u, 16, 19)} 点伤害。鲜血不少于 4 时，花掉 4 点再打 1 次。`, play: (g, u, t) => { g.attack(t, v(u, 16, 19)); if (spendB(g, 4)) g.attack(t, v(u, 16, 19)); } },
  f_wing: { ch: 'feiyue', name: '翼刃', type: 'atk', rar: 'u', cost: [1, 1], icon: 'sk_hawk', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害，然后蝙蝠全部对它出猎。`, play: (g, u, t) => { g.attack(t, v(u, 8, 11)); hunt(g, t); } },
  f_repay: { ch: 'feiyue', name: '借血还血', type: 'atk', rar: 'u', cost: [1, 1], icon: 'p_svamp', tgt: 'one', desc: u => `造成 ${v(u, 9, 12)} 点伤害。本回合献过血时，吸血 ${v(u, 4, 5)}。`, play: (g, u, t) => { const s = g.attack(t, v(u, 9, 12)); if (P(g).donT) leech(g, s, v(u, 4, 5)); } },
  f_fold: { ch: 'feiyue', name: '收翼', type: 'skill', rar: 'u', cost: [1, 1], icon: 'b_armor', tgt: 'self', desc: u => `收回最多 3 只蝙蝠，每只获得 ${v(u, 4, 5)} 点格挡，抽 1 张牌。`, play: (g, u) => { const k = Math.min(3, bats(g)); addBat(g, -k); g.block(k * v(u, 4, 5)); g.draw(1); } },
  f_pulse: { ch: 'feiyue', name: '夜行脉搏', type: 'power', rar: 'u', cost: [1, 1], icon: 'm_blood', tgt: 'self', desc: u => `每回合第一次献血后，获得 ${v(u, 5, 7)} 点格挡。`, play: (g, u) => { P(g).st.vpulse = v(u, 5, 7); } },
  f_vow: { ch: 'feiyue', name: '血色誓约', type: 'power', rar: 'r', cost: [2, 1], icon: 'ic_necro', tgt: 'self', desc: () => `每回合第一次吸血成功后，得到 1 点鲜血，抽 1 张牌。`, play: g => { P(g).st.vowb = 1; } },
  f_swarm: { ch: 'feiyue', name: '万翼降临', type: 'skill', rar: 'r', cost: [2, 1], icon: 'sk_undead', tgt: 'one', exhaust: 1, desc: () => `得到 4 只蝙蝠，立刻全部对目标出猎，每只改为 7 点伤害。消耗。`, play: (g, u, t) => { addBat(g, 4); hunt(g, t, 7); } },
  f_dawn: { ch: 'feiyue', name: '血尽天明', type: 'power', rar: 'r', cost: [1, 1], icon: 'p_berserk', tgt: 'self', desc: u => `每回合第一次一口气花掉至少 4 点鲜血时，得到 1 点能量，获得 ${v(u, 5, 8)} 点格挡。`, play: (g, u) => { P(g).st.vdawn = v(u, 5, 8); } },
};

/* ======================= 沈雀 · 麻将牌 =======================
   万、条、筒三门各 1～9，每种两张，共 54 张。每回合摸 3 张，牌架最多 7 张，多了自动弃掉最孤立的一张。
   主动结算（报牌等）每回合一次：对子 5 格挡；刻子 单体 13；顺子 全体 6；清一色（同门任意 5 张）全体 10 + 6 格挡；
   小胡（两个三张面子 + 一个对子，共 8 张，可借用本回合最后摸到的那张）全体 16 + 12 格挡。
   简化：出千换哪张、弃哪张由程序自动挑最有利的。 */
const SUIT = ['万', '条', '筒'];
export const tileName = x => `${x[1]}<i>${SUIT['msp'.indexOf(x[0])]}</i>`;
const btn = h => `<button class="btn">${h}</button>`;
const sameT = (a, b) => a === b;
function tiles(g) { const p = P(g); return p.rack ? [...p.rack] : []; }
function findPat(ts, e8) { /* 返回能结算的每一种牌型（各取一组），按价值排序 */
  const out = [], cnt = {}; ts.forEach(t => cnt[t] = (cnt[t] || 0) + 1);
  const keys = Object.keys(cnt);
  const trip = keys.find(k => cnt[k] >= 3); if (trip) out.push({ k: 'trip', use: [trip, trip, trip] });
  const pair = keys.find(k => cnt[k] >= 2); if (pair) out.push({ k: 'pair', use: [pair, pair] });
  for (const s of 'msp') for (let n = 1; n <= 7; n++) { const a = s + n, b = s + (n + 1), c = s + (n + 2); if (cnt[a] && cnt[b] && cnt[c]) { out.push({ k: 'run', use: [a, b, c] }); n = 99; break; } }
  for (const s of 'msp') { const su = ts.filter(t => t[0] === s); if (su.length >= 5) { out.push({ k: 'flush', use: su.slice(0, 5) }); break; } }
  const hu = smallWin(ts.concat(e8 ? [e8] : [])); if (hu) out.push({ k: 'hu', use: hu });
  const V = { hu: 5, flush: 4, trip: 3, run: 2, pair: 1 }; return out.sort((a, b) => V[b.k] - V[a.k]);
}
function smallWin(ts) { /* 两个面子 + 一个对子，共 8 张 */
  if (ts.length < 8) return null; const melds = c => { const r = [], ks = Object.keys(c);
    for (const k of ks) if (c[k] >= 3) r.push([k, k, k]);
    for (const k of ks) { const s = k[0], n = +k[1]; if (n <= 7 && c[s + (n + 1)] && c[s + (n + 2)]) r.push([k, s + (n + 1), s + (n + 2)]); } return r; };
  const cnt = {}; ts.forEach(t => cnt[t] = (cnt[t] || 0) + 1);
  const take = (c, arr) => { const d = { ...c }; for (const x of arr) { if (!d[x]) return null; d[x]--; } return d; };
  for (const m1 of melds(cnt)) { const c1 = take(cnt, m1); if (!c1) continue; for (const m2 of melds(c1)) { const c2 = take(c1, m2); if (!c2) continue; const pk = Object.keys(c2).find(k => c2[k] >= 2); if (pk) return [...m1, ...m2, pk, pk]; } }
  return null;
}
const PATN = { pair: '对子', trip: '刻子', run: '顺子', flush: '清一色', hu: '小胡' };
function isoScore(ts, x) { let s = 0; for (const y of ts) { if (y === x) continue; if (sameT(y, x)) s += 3; else if (y[0] === x[0] && Math.abs(+y[1] - +x[1]) === 1) s += 2; else if (y[0] === x[0] && Math.abs(+y[1] - +x[1]) === 2) s += 1; } return s + ts.filter(y => y === x).length * 3 - 3; }
function mjDiscard(g) { const p = P(g); while (p.rack.length > 7) { let bi = 0, bs = 1e9; p.rack.forEach((x, i) => { const s = isoScore(p.rack, x); if (s < bs || (s === bs && i === p.rack.length - 1)) { bs = s; bi = i; } }); const newest = bi === p.rack.length - 1, x = p.rack.splice(bi, 1)[0];
    if (newest && !p.eighth) p.eighth = x; else p.mdisc.push(x); /* 只有最新摸到的那张能留在临时位，而且只能用来凑小胡 */
    if (bs <= 0 && g.has('chips') && !p.chipU) { p.chipU = 1; drawTile(g, 1); } } }
function drawTile(g, n = 1, noDiscard) { const p = P(g); for (let i = 0; i < n; i++) { if (!p.pool.length) { p.pool = shuf(p.mdisc); p.mdisc = []; } if (!p.pool.length) break; const x = p.pool.pop(); p.rack.push(x); p.lastT = x; p.drawnT = (p.drawnT || 0) + 1; } if (!noDiscard) mjDiscard(g); }
const shuf = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function removeTiles(g, use) { const p = P(g); for (const x of use) { let i = p.rack.indexOf(x); if (i >= 0) p.rack.splice(i, 1); else if (p.eighth === x) p.eighth = null; else continue; p.mdisc.push(x); } }
function settle(g, pat, t) { /* 结算一个牌型；每回合只能主动结算一次 */
  const p = P(g); if (!pat || p.setT) { if (p.setT) g.note('本回合已经结算过牌型'); return null; }
  p.setT = 1; removeTiles(g, pat.use); p.patT = p.patT || {}; p.patT[pat.k] = 1; p.patB = p.patB || {}; p.patB[pat.k] = 1;
  const k = pat.k;
  const pb = p.patBonus || 0;
  if (k === 'pair') g.block(10 + pb); else if (k === 'trip') g.attack(live(g, t), 20 + pb + (p.st.sanyuan && !p.syT ? (p.syT = 1, 7) : 0)); else if (k === 'run') { g.attackAll(11 + pb); if (p.st.sanyuan && !p.syR) { p.syR = 1; g.block(6); } }
  else if (k === 'flush') { g.attackAll(14 + pb); g.block(8 + pb); } else if (k === 'hu') { g.attackAll(22 + pb); g.block(14 + pb); if (p.st.menzen && !p.huU) { p.huU = 1; g.energy(2); } }
  if ((k === 'flush' || k === 'hu') && p.st.menzen) g.attackAll(p.st.menzen);
  if (p.st.renzhuang && !p.rzT) { p.rzT = 1; drawTile(g, 1); if (p.st.renzhuang > 1) g.block(3); }
  if (g.has('scorebook') && !p.sbU && Object.keys(p.patB).length >= 3) { p.sbU = 1; g.energy(2); g.draw(2); }
  return pat;
}
const patPick = only => g => findPat(tiles(g), P(g).eighth).filter(x => !only || only.includes(x.k)).map(x => ({ val: x, html: btn(`<span>${PATN[x.k]}</span>：<span class="tiles">${x.use.map(y => `<b class="tile">${tileName(y)}</b>`).join('')}</span>`) }));
const patBot = (g, o) => o[0];
function cheat(g, mode) { /* 出千：自动挑一张牌换成牌池或弃牌区里有的牌，使牌型最好 */
  const p = P(g), have = [...p.pool, ...p.mdisc]; let best = null, bv;
  const val = ts => { const f = findPat(ts); const V = { hu: 50, flush: 30, trip: 20, run: 15, pair: 6 }; return f.reduce((s, x) => s + V[x.k], 0); };
  bv = val(p.rack); /* 不比现在好就不换，免得拆掉已有的对子 */
  p.rack.forEach((x, i) => { const cands = mode === 'suit' ? 'msp'.split('').filter(s => s !== x[0]).map(s => s + x[1]) : [x[0] + (+x[1] - 1), x[0] + (+x[1] + 1)].filter(y => +y[1] >= 1 && +y[1] <= 9);
    for (const y of cands) { if (!have.includes(y)) continue; const ts = [...p.rack]; ts[i] = y; const s = val(ts); if (s > bv) { bv = s; best = [i, y]; } } });
  if (!best) return false; const [i, y] = best, old = p.rack[i]; p.rack[i] = y; const pi = p.pool.indexOf(y); if (pi >= 0) p.pool.splice(pi, 1); else p.mdisc.splice(p.mdisc.indexOf(y), 1); p.mdisc.push(old); return true;
}
function canCheat(g, mode) { const p = P(g); if (!p.rack) return false; const save = [p.rack.slice(), p.pool.slice(), p.mdisc.slice()]; const ok = cheat(g, mode); [p.rack, p.pool, p.mdisc] = save; return !!ok; }
const SQ = {
  q_fly: { ch: 'shenque', name: '飞牌', type: 'atk', rar: 'start', cost: [1, 1], icon: 'ic_boomer', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害。摸 1 张麻将牌。`, play: (g, u, t) => { g.attack(t, v(u, 8, 11)); drawTile(g, 1); } },
  q_tidy: { ch: 'shenque', name: '拢牌', type: 'skill', rar: 'start', cost: [1, 1], icon: 'b_armor', tgt: 'self', desc: u => `获得 ${v(u, 7, 10)} 点格挡。摸 1 张麻将牌，再弃掉最孤立的 1 张。`, play: (g, u) => { g.block(v(u, 7, 10)); const p = P(g); drawTile(g, 1, true); if (p.rack.length) { let bi = 0, bs = 1e9; p.rack.forEach((x, i) => { const s = isoScore(p.rack, x); if (s < bs) { bs = s; bi = i; } }); p.mdisc.push(p.rack.splice(bi, 1)[0]); } } },
  q_call: { ch: 'shenque', name: '报牌', type: 'skill', rar: 'start', cost: [0, 0], icon: 'ic_rune', tgt: 'one', pick: patPick(), pickT: '选择要结算的牌型', bot: patBot, desc: u => `结算一个牌型（每回合一次），另获得 ${v(u, 3, 6)} 点格挡。`, play: (g, u, t, c, k) => { settle(g, k, t); g.block(v(u, 3, 6)); } },
  q_toss: { ch: 'shenque', name: '顺手一甩', type: 'atk', rar: 'c', cost: [1, 1], icon: 'sk_wedge', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害；本回合结算过顺子时，改为对所有敌人造成 8 点。`, play: (g, u, t) => { if (P(g).patT && P(g).patT.run) g.attackAll(8); else g.attack(t, v(u, 8, 11)); } },
  q_three: { ch: 'shenque', name: '三声连响', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_drum', tgt: 'one', desc: u => `造成 ${v(u, 7, 9)} 点伤害；本回合结算过刻子时，再造成 ${v(u, 6, 8)} 点。`, play: (g, u, t) => { g.attack(t, v(u, 7, 9)); if (P(g).patT && P(g).patT.trip) g.attack(t, v(u, 6, 8)); } },
  q_keep: { ch: 'shenque', name: '留张', type: 'skill', rar: 'c', cost: [1, 1], icon: 'sk_hshield', tgt: 'self', desc: u => `获得 ${v(u, 8, 11)} 点格挡。摸 1 张麻将牌。`, play: (g, u) => { g.block(v(u, 8, 11)); drawTile(g, 1); } },
  q_swap: { ch: 'shenque', can: (g, u) => u || canCheat(g), name: '偷换一张', type: 'skill', rar: 'c', cost: [0, 0], icon: 'p_gamble', tgt: 'self', exhaust: 1, desc: u => `出千：把一张牌的点数 ±1（同一门，自动挑最好的）。${v(u, '', '获得 4 点格挡。')}消耗。`, play: (g, u) => { cheat(g); if (u) g.block(4); } },
  q_pon: { ch: 'shenque', can: g => !P(g).setT && findPat(tiles(g), P(g).eighth).some(x => x.k === 'pair' || x.k === 'trip'), name: '碰一下', type: 'skill', rar: 'c', cost: [1, 1], icon: 'ic_hammer', tgt: 'one', pick: patPick(['pair', 'trip']), pickT: '选择对子或刻子', bot: patBot, desc: u => `结算一个对子或刻子，抽 1 张牌。${v(u, '', '获得 4 点格挡。')}`, play: (g, u, t, c, k) => { settle(g, k, t); g.draw(1); if (u) g.block(4); } },
  q_quick: { ch: 'shenque', name: '快摸', type: 'skill', rar: 'c', cost: [0, 0], icon: 'sk_pouch', tgt: 'self', exhaust: 1, desc: u => `摸 2 张麻将牌。${v(u, '', '获得 3 点格挡。')}消耗。`, play: (g, u) => { drawTile(g, 2); if (u) g.block(3); } },
  q_fill: { ch: 'shenque', name: '补位', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_mine', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害。弃掉最孤立的 1 张麻将牌，再摸 1 张。`, play: (g, u, t) => { g.attack(t, v(u, 8, 11)); const p = P(g); if (p.rack.length) { let bi = 0, bs = 1e9; p.rack.forEach((x, i) => { const s = isoScore(p.rack, x); if (s < bs) { bs = s; bi = i; } }); p.mdisc.push(p.rack.splice(bi, 1)[0]); } drawTile(g, 1); } },
  q_guard: { ch: 'shenque', name: '护对子', type: 'skill', rar: 'c', cost: [1, 1], icon: 'ic_barrier', tgt: 'self', desc: u => `获得 ${v(u, 8, 10)} 点格挡；牌架里有对子时再获得 ${v(u, 4, 5)} 点。`, play: (g, u) => g.block(v(u, 8, 10) + (findPat(tiles(g), P(g).eighth).some(x => x.k === 'pair' || x.k === 'trip') ? v(u, 4, 5) : 0)) },
  q_door: { ch: 'shenque', name: '换门', type: 'skill', rar: 'u', cost: [1, 1], icon: 'ic_vortex', tgt: 'self', desc: u => `出千：把一张牌换成同点数的另一门（自动挑最好的）。获得 ${v(u, 5, 8)} 点格挡。`, play: (g, u) => { cheat(g, 'suit'); g.block(v(u, 5, 8)); } },
  q_rush: { ch: 'shenque', name: '冲刻', type: 'atk', rar: 'u', cost: [1, 1], icon: 'sk_fist', tgt: 'one', desc: u => `造成 ${v(u, 7, 10)} 点伤害。有刻子时立刻结算它（算本回合的一次结算）。`, play: (g, u, t) => { g.attack(t, v(u, 7, 10)); const tp = findPat(tiles(g), P(g).eighth).find(x => x.k === 'trip'); if (tp && !P(g).setT) settle(g, tp, t); } },
  q_dealer: { ch: 'shenque', name: '连庄', type: 'power', rar: 'u', cost: [1, 1], icon: 'ic_hexa', tgt: 'self', desc: u => `每回合第一次结算牌型后，摸 1 张麻将牌${v(u, '', '，获得 3 点格挡')}。`, play: (g, u) => { P(g).st.renzhuang = u ? 2 : 1; } },
  q_wait: { ch: 'shenque', name: '听口', type: 'skill', rar: 'u', cost: [1, 1], icon: 'p_mag', tgt: 'self', noCancel: 1, pick: (g, u) => { const p = P(g); if (p.pool.length < 4) { p.pool = shuf(p.mdisc).concat(p.pool); p.mdisc = []; } return p.pool.slice(-v(u, 3, 4)).reverse().map((x, i) => ({ val: x, html: btn(`<b class="tile">${tileName(x)}</b>`) })); }, pickT: '选择收进牌架的牌', desc: u => `看牌池接下来的 ${v(u, 3, 4)} 张，选 1 张收进牌架，其余弃掉。获得 6 点格挡。`, play: (g, u, t, c, k) => { const p = P(g), n = v(u, 3, 4), top = p.pool.splice(-Math.min(n, p.pool.length)); const i = k ? top.indexOf(k) : top.length - 1; const pick = top.splice(i >= 0 ? i : top.length - 1, 1)[0]; if (pick) { p.rack.push(pick); p.lastT = pick; } p.mdisc.push(...top); mjDiscard(g); g.block(6); } },
  q_table: { ch: 'shenque', can: (g, u) => u || (!P(g).setT && findPat(tiles(g), P(g).eighth).length > 0), name: '开桌', type: 'skill', rar: 'u', cost: [1, 1], icon: 'box', tgt: 'one', pick: patPick(), pickT: '选择要结算的牌型', bot: patBot, desc: u => `结算一个牌型；用掉至少 5 张时，抽 2 张牌。${v(u, '', '获得 4 点格挡。')}`, play: (g, u, t, c, k) => { const r = settle(g, k, t); if (r && r.use.length >= 5) g.draw(2); if (u) g.block(4); } },
  q_combo: { ch: 'shenque', name: '摸打连手', type: 'atk', rar: 'u', cost: [1, 1], icon: 'p_crit', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 5, 7)} 点伤害；本回合摸过至少 4 张麻将牌时，打两次。`, play: (g, u) => g.attackAll(v(u, 5, 7), (P(g).drawnT || 0) >= 4 ? 2 : 1) },
  q_last: { ch: 'shenque', name: '绝张', type: 'skill', rar: 'r', cost: [2, 1], icon: 'p_exec', tgt: 'self', exhaust: 1, pick: g => { const p = P(g), have = new Set([...p.pool, ...p.mdisc]), want = new Set(); for (const x of p.rack) { want.add(x); for (const d of [-2, -1, 1, 2]) { const n = +x[1] + d; if (n >= 1 && n <= 9) want.add(x[0] + n); } } return [...want].filter(x => have.has(x)).slice(0, 12).map(x => ({ val: x, html: btn(`<b class="tile">${tileName(x)}</b>`) })); }, pickT: '指定一张牌', can: g => { const p = P(g); return !!(p.rack && p.rack.length); }, noCancel: 1, desc: () => `指定一张牌架上已有的牌或同一门前后两点内的牌，从牌池或弃牌区拿 1 张到牌架。消耗。`, play: (g, u, t, c, k) => { const p = P(g); if (!k) return; let i = p.pool.indexOf(k); if (i >= 0) p.pool.splice(i, 1); else { i = p.mdisc.indexOf(k); if (i < 0) return; p.mdisc.splice(i, 1); } p.rack.push(k); p.lastT = k; mjDiscard(g); } },
  q_sanyuan: { ch: 'shenque', name: '大三元', type: 'power', rar: 'r', cost: [2, 1], icon: 'm_crown', tgt: 'self', desc: () => `每回合第一个刻子额外造成 7 点伤害，第一个顺子额外获得 6 点格挡。`, play: g => { P(g).st.sanyuan = 1; } },
  q_menzen: { ch: 'shenque', name: '门前清', type: 'power', rar: 'r', cost: [1, 1], icon: 'p_luck', tgt: 'self', desc: u => `清一色或小胡额外对所有敌人造成 ${v(u, 5, 8)} 点伤害；每场第一次小胡后得到 2 点能量。`, play: (g, u) => { P(g).st.menzen = v(u, 5, 8); } },
};
SQ.q_menzen.icon = 'b_luck';


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
  h_jab: { ch: 'hero', name: '点射', type: 'atk', rar: 'c', cost: [0, 0], icon: 'ic_gun', tgt: 'one', desc: u => `造成 ${v(u, 3, 4)} 点伤害。${v(u, '', '得到 1 发光弹。')}`, play: (g, u, t) => { g.attack(t, v(u, 3, 4)); if (u) g.ammo(1); } },
  h_double: { ch: 'hero', name: '双连打', type: 'atk', rar: 'c', cost: [1, 1], icon: 'p_crit', tgt: 'one', desc: u => `造成 ${v(u, 4, 4)} 点伤害 2 次。${v(u, '', '得到 1 发光弹。')}`, play: (g, u, t) => { g.attack(t, 4, 2); if (u) g.ammo(1); } },
  h_spray: { ch: 'hero', name: '乱射', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_xbow', tgt: 'all', desc: u => `对随机敌人造成 3 点伤害 ${v(u, 3, 4)} 次。`, play: (g, u) => g.attackRandom(3, v(u, 3, 4)) },
  h_combo: { ch: 'hero', name: '连段射击', type: 'atk', rar: 'u', cost: [1, 1], icon: 'fx_slash', tgt: 'one', desc: u => `造成 ${v(u, 5, 7)} 点伤害；本回合每打出过 1 张攻击牌，再 +2。`, play: (g, u, t) => g.attack(t, v(u, 5, 7) + 2 * cmb(g)) },
  h_quick: { ch: 'hero', name: '快枪手', type: 'power', rar: 'r', cost: [1, 1], icon: 'p_haste', tgt: 'self', desc: u => `每回合打出第 3 张攻击牌后，得到 1 点能量${v(u, '', '，抽 1 张牌')}。`, play: (g, u) => { P(g).st.quick = u ? 2 : 1; } },
  h_finish: { ch: 'hero', name: '终结一击', type: 'atk', rar: 'r', cost: [2, 2], icon: 'p_exec', tgt: 'one', desc: u => `造成 ${v(u, 8, 12)} 点伤害；本回合每打出过 1 张攻击牌，再 +3。`, play: (g, u, t) => g.attack(t, v(u, 8, 12) + 3 * cmb(g)) },
  h_field: { ch: 'hero', name: '力场', type: 'skill', rar: 'c', cost: [1, 1], icon: 'ic_barrier', tgt: 'self', desc: u => `获得 ${v(u, 6, 9)} 点格挡；光弹不少于 3 发时再 +3。`, play: (g, u) => g.block(v(u, 6, 9) + ((P(g).st.ammo || 0) >= 3 ? 3 : 0)) },
  h_cover: { ch: 'hero', name: '掩护射击', type: 'skill', rar: 'u', cost: [1, 1], icon: 'b_armor', tgt: 'self', desc: u => `获得 ${v(u, 6, 9)} 点格挡。得到 1 发光弹。`, play: (g, u) => { g.block(v(u, 6, 9)); g.ammo(1); } },
  h_shell: { ch: 'hero', name: '金属外壳', type: 'power', rar: 'u', cost: [1, 1], icon: 'b_dur', tgt: 'self', desc: u => `每回合结束时获得 ${v(u, 3, 4)} 点格挡。`, play: (g, u) => g.self('metal', v(u, 3, 4)) },
  h_mag: { ch: 'hero', name: '扩容弹匣', type: 'skill', rar: 'c', cost: [1, 1], icon: 'gb', tgt: 'self', desc: u => `得到 2 发光弹，获得 ${v(u, 4, 7)} 点格挡。`, play: (g, u) => { g.ammo(2); g.block(v(u, 4, 7)); } },
  h_overshot: { ch: 'hero', name: '过载射击', type: 'atk', rar: 'u', cost: [1, 1], icon: 'p_boom', tgt: 'one', desc: u => `光弹不少于 3 发时，用掉 3 发造成 ${v(u, 18, 24)} 点伤害；否则造成 6 点。`, play: (g, u, t) => { const p = P(g); if ((p.st.ammo || 0) >= 3) { p.st.ammo -= 3; if (!p.st.ammo) delete p.st.ammo; g.attack(t, v(u, 18, 24)); } else g.attack(t, 6); } },
  h_save: { ch: 'hero', name: '存档读档', type: 'skill', rar: 'u', cost: [1, 0], icon: 'sk_pouch', tgt: 'self', pick: 1, pickT: '选 1 张手牌弃掉', desc: () => `抽 3 张牌，再选 1 张手牌弃掉。`, play: (g, u, t, c, k) => { g.draw(3); g.discardPick(k); } },
  h_lag: { ch: 'hero', name: '卡顿', type: 'skill', rar: 'c', cost: [0, 0], icon: 'p_freeze', tgt: 'one', desc: u => `给予 1 层虚弱${v(u, '', '和 1 层易伤')}。得到 1 发光弹。`, play: (g, u, t) => { g.apply(t, 'weak', 1); if (u) g.apply(t, 'vuln', 1); g.ammo(1); } },
  h_bonus: { ch: 'hero', name: '隐藏关卡', type: 'skill', rar: 'r', cost: [0, 0], icon: 'm_crown', tgt: 'self', exhaust: 1, desc: u => `得到 ${v(u, 2, 3)} 点能量，抽 1 张牌。消耗。`, play: (g, u) => { g.energy(v(u, 2, 3)); g.draw(1); } },
  h_rain: { ch: 'hero', name: '弹雨', type: 'atk', rar: 'r', cost: [2, 2], icon: 'ic_vortex', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 6, 8)} 点伤害；本回合每打出过 1 张攻击牌，再打 1 次（最多 2 次）。`, play: (g, u) => g.attackAll(v(u, 6, 8), 1 + Math.min(2, cmb(g))) },
  // ---- 千早 ----
  k_breakarrow: { ch: 'miko', name: '破界一箭', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_bow', tgt: 'one', desc: u => `造成 ${v(u, 7, 9)} 点伤害；花掉 1 层结界，再造成 ${v(u, 7, 9)} 点。`, play: (g, u, t) => { g.attack(t, v(u, 7, 9)); if (kspend(g, 1)) g.attack(t, v(u, 7, 9)); } },
  k_seal: { ch: 'miko', name: '封魔', type: 'skill', rar: 'u', cost: [1, 1], icon: 'sk_sigil', tgt: 'one', desc: u => `花掉最多 2 层结界，每层给予目标 1 层易伤和 1 层虚弱。${v(u, '', '获得 4 点格挡。')}`, play: (g, u, t) => { const k = kspend(g, 2); if (k) { g.apply(t, 'vuln', k); g.apply(t, 'weak', k); } if (u) g.block(4); } },
  k_volley: { ch: 'miko', name: '箭雨', type: 'atk', rar: 'u', cost: [1, 1], icon: 'ic_xbow', tgt: 'all', desc: u => `对随机敌人造成 ${v(u, 5, 6)} 点伤害 2 次；花掉最多 3 层结界，每层多射 1 次。`, play: (g, u) => g.attackRandom(v(u, 5, 6), 2 + kspend(g, 3)) },
  k_burst: { ch: 'miko', name: '结界爆裂', type: 'atk', rar: 'r', cost: [2, 2], icon: 'ic_mine', tgt: 'all', exhaust: 1, desc: u => `花掉全部结界（最多 8 层），对所有敌人每层造成 ${v(u, 5, 6)} 点伤害。消耗。`, play: (g, u) => { const k = kspend(g, 8); if (k) g.attackAll(k * v(u, 5, 6)); } },
  k_bell: { ch: 'miko', name: '铃音', type: 'skill', rar: 'c', cost: [0, 0], icon: 'ic_bell', tgt: 'self', desc: u => `获得 ${v(u, 3, 5)} 点格挡；本回合每打出过 1 张技能牌，再 +2。`, play: (g, u) => g.block(v(u, 3, 5) + 2 * skN(g)) },
  k_dance: { ch: 'miko', name: '神乐连舞', type: 'atk', rar: 'u', cost: [1, 1], icon: 'sk_fairy', tgt: 'one', desc: u => `造成 ${v(u, 4, 6)} 点伤害；本回合每打出过 1 张技能牌，再打 1 次（最多再 4 次）。`, play: (g, u, t) => g.attack(t, v(u, 4, 6), 1 + Math.min(4, skN(g))) },
  k_offer: { ch: 'miko', name: '献舞', type: 'skill', rar: 'c', cost: [1, 1], icon: 'ic_aura', tgt: 'self', desc: u => `抽 2 张牌，获得 ${v(u, 3, 6)} 点格挡。`, play: (g, u) => { g.draw(2); g.block(v(u, 3, 6)); } },
  k_heart: { ch: 'miko', name: '巫女之心', type: 'power', rar: 'r', cost: [1, 1], icon: 'm_ward', tgt: 'self', desc: u => `每回合打出第 3 张技能牌后，得到 1 点能量${v(u, '', '，抽 1 张牌')}。`, play: (g, u) => { P(g).st.mheart = u ? 2 : 1; } },
  k_charm: { ch: 'miko', name: '平安符', type: 'skill', rar: 'c', cost: [1, 1], icon: 'm_ward', tgt: 'self', desc: u => `获得 ${v(u, 5, 7)} 点格挡，结界 +1；结界不少于 5 层时抽 1 张牌。`, play: (g, u) => { g.block(v(u, 5, 7)); g.kek(1); if ((P(g).st.kek || 0) >= 5) g.draw(1); } },
  k_torii: { ch: 'miko', name: '鸟居', type: 'power', rar: 'u', cost: [1, 1], icon: 'sk_hwall', tgt: 'self', desc: u => `每回合结束时，结界不少于 3 层就获得 ${v(u, 4, 6)} 点格挡。`, play: (g, u) => { P(g).st.torii = v(u, 4, 6); } },
  k_descend: { ch: 'miko', name: '神降', type: 'skill', rar: 'r', cost: [2, 2], icon: 'ic_gods', tgt: 'self', exhaust: 1, desc: u => `结界 +${v(u, 3, 4)}，获得 12 点格挡。消耗。`, play: (g, u) => { g.kek(v(u, 3, 4)); g.block(12); } },
  // ---- 苏音 ----
  s_sample: { ch: 'heroine', name: '采样', type: 'skill', rar: 'c', cost: [1, 0], icon: 'sk_pouch', tgt: 'self', pick: 1, pickT: '选 1 张手牌弃掉', desc: () => `抽 2 张牌，再选 1 张手牌弃掉。`, play: (g, u, t, c, k) => { g.draw(2); g.discardPick(k); } },
  s_loop: { ch: 'heroine', name: '循环播放', type: 'power', rar: 'u', cost: [1, 1], icon: 'ic_orbit', tgt: 'self', desc: u => `每回合第一次弃牌后，抽 ${v(u, 1, 2)} 张牌。`, play: (g, u) => { P(g).st.loop = v(u, 1, 2); } },
  s_feedback: { ch: 'heroine', name: '回授', type: 'atk', rar: 'c', cost: [1, 1], icon: 'p_knock', tgt: 'one', desc: u => `造成 ${v(u, 7, 9)} 点伤害；本回合弃过牌时，再造成 ${v(u, 5, 7)} 点。`, play: (g, u, t) => { g.attack(t, v(u, 7, 9)); if (dN(g)) g.attack(t, v(u, 5, 7)); } },
  s_crowd: { ch: 'heroine', name: '大合唱', type: 'skill', rar: 'u', cost: [1, 1], icon: 'ic_drum', tgt: 'all', desc: u => `其他敌人各得到共鸣最多的敌人一半的共鸣${v(u, '', '，再各 +2')}。`, play: (g, u) => { const a = g.alive(); if (!a.length) return; const top = a.reduce((m, e) => (e.st.res || 0) > (m.st.res || 0) ? e : m, a[0]); const h = Math.floor((top.st.res || 0) / 2); a.filter(e => e !== top).forEach(e => g.res(e, h + (u ? 2 : 0))); } },
  s_surround: { ch: 'heroine', name: '环绕声', type: 'skill', rar: 'c', cost: [1, 1], icon: 'sk_waterel', tgt: 'all', desc: u => `给予所有敌人 2 层共鸣，获得 ${v(u, 4, 7)} 点格挡。`, play: (g, u) => { g.resAll(2); g.block(v(u, 4, 7)); } },
  s_sub: { ch: 'heroine', name: '低音炮', type: 'atk', rar: 'u', cost: [2, 2], icon: 'ic_drum', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 6, 8)} 点伤害；共鸣不少于 5 层的敌人受到双倍。`, play: (g, u) => g.eachEnemy(e => g.attack(e, v(u, 6, 8) * ((e.st.res || 0) >= 5 ? 2 : 1))) },
  s_shuffle: { ch: 'heroine', name: '随机播放', type: 'skill', rar: 'c', cost: [0, 0], icon: 'p_gamble', tgt: 'self', desc: u => `随机弃 1 张牌，抽 ${v(u, 2, 3)} 张牌。`, play: (g, u) => { g.discard(1); g.draw(v(u, 2, 3)); } },
  s_encore: { ch: 'heroine', name: '返场', type: 'atk', rar: 'r', cost: [1, 1], icon: 'sk_holyorb', tgt: 'one', desc: u => `造成 ${v(u, 5, 7)} 点伤害；本回合每弃过 1 张牌，再造成 ${v(u, 5, 7)} 点（最多再 5 次）。`, play: (g, u, t) => g.attack(t, v(u, 5, 7), 1 + Math.min(5, dN(g))) },
  // ---- 莉泽 ----
  w_bolt: { ch: 'witch', name: '瓶装闪电', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_thunder', tgt: 'one', desc: u => `造成 ${v(u, 6, 8)} 点伤害；手里每有 1 个炼金瓶，再 +2（最多算 4 个）。`, play: (g, u, t) => g.attack(t, v(u, 6, 8) + 2 * Math.min(4, g.potsInHand())) },
  w_wall: { ch: 'witch', name: '瓶墙', type: 'skill', rar: 'c', cost: [1, 1], icon: 'pot', tgt: 'self', desc: u => `获得 ${v(u, 4, 6)} 点格挡；手里每有 1 个炼金瓶，再 +2（最多算 4 个）。`, play: (g, u) => g.block(v(u, 4, 6) + 2 * Math.min(4, g.potsInHand())) },
  w_notes: { ch: 'witch', name: '学徒笔记', type: 'power', rar: 'u', cost: [1, 1], icon: 'b_dur', tgt: 'self', desc: u => `每回合第一次用掉炼金瓶后，抽 ${v(u, 1, 2)} 张牌。`, play: (g, u) => { P(g).st.wnotes = v(u, 1, 2); } },
  w_copy: { ch: 'witch', name: '二次调配', type: 'skill', rar: 'u', cost: [1, 0], icon: 'sk_bmist', tgt: 'self', desc: () => `把手里随机 1 个炼金瓶复制一份（没有就随机获得 1 个）。`, play: g => { const ps = potH(g); g.potion(1, ps.length ? ps[Math.floor(Math.random() * ps.length)].id : undefined); } },
  w_cauldron: { ch: 'witch', name: '翻滚的坩埚', type: 'skill', rar: 'u', cost: [1, 1], icon: 'ic_vortex', tgt: 'all', desc: u => `给予所有敌人 ${v(u, 2, 3)} 层中毒，随机获得 1 个炼金瓶。`, play: (g, u) => { g.eachEnemy(e => g.poison(e, v(u, 2, 3))); g.potion(1); } },
  w_ignite: { ch: 'witch', name: '点燃', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_flame', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害，获得 1 瓶火焰瓶。`, play: (g, u, t) => { g.attack(t, v(u, 8, 11)); g.potion(1, 'p_fire'); } },
  w_fireball: { ch: 'witch', name: '火球术', type: 'atk', rar: 'u', cost: [2, 2], icon: 'sk_fireel', tgt: 'one', desc: u => `造成 ${v(u, 14, 18)} 点伤害；本回合每用过 1 瓶火焰瓶，再 +6。`, play: (g, u, t) => g.attack(t, v(u, 14, 18) + 6 * (P(g).fireN || 0)) },
  w_inferno: { ch: 'witch', name: '业火', type: 'power', rar: 'r', cost: [2, 1], icon: 'ic_flame', tgt: 'self', desc: () => `火焰瓶的伤害永久 +4。`, play: g => g.self('inferno', 4) },
  w_ember: { ch: 'witch', name: '余烬', type: 'skill', rar: 'c', cost: [0, 0], icon: 'sk_flamestep', tgt: 'self', exhaust: 1, desc: u => `获得 ${v(u, 1, 2)} 瓶火焰瓶。消耗。`, play: (g, u) => g.potion(v(u, 1, 2), 'p_fire') },
  w_firewall: { ch: 'witch', name: '火墙', type: 'skill', rar: 'u', cost: [1, 1], icon: 'sk_hwall', tgt: 'all', desc: u => `获得 ${v(u, 8, 10)} 点格挡，对所有敌人造成 ${v(u, 3, 5)} 点伤害。`, play: (g, u) => { g.block(v(u, 8, 10)); g.attackAll(v(u, 3, 5)); } },
  w_toxblade: { ch: 'witch', name: '毒刃', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_rapier', tgt: 'one', desc: u => `造成 ${v(u, 5, 7)} 点伤害，给予 ${v(u, 3, 4)} 层中毒。`, play: (g, u, t) => { g.attack(t, v(u, 5, 7)); g.poison(t, v(u, 3, 4)); } },
  w_spread: { ch: 'witch', name: '毒素扩散', type: 'skill', rar: 'u', cost: [1, 1], icon: 'sk_undead', tgt: 'one', desc: u => `其他所有敌人各得到目标${v(u, '一半', '全部')}的中毒层数。`, play: (g, u, t) => { const n = Math.floor((t.st.poison || 0) * (u ? 1 : .5)); if (n) g.alive().filter(e => e !== t).forEach(e => g.poison(e, n)); } },
  w_corrode: { ch: 'witch', name: '腐蚀', type: 'skill', rar: 'c', cost: [1, 1], icon: 'b_curse', tgt: 'one', desc: u => `给予 ${v(u, 3, 5)} 层中毒和 1 层虚弱。`, play: (g, u, t) => { g.poison(t, v(u, 3, 5)); g.apply(t, 'weak', 1); } },
  w_nshade: { ch: 'witch', name: '颠茄', type: 'power', rar: 'r', cost: [1, 1], icon: 'sk_treant', tgt: 'self', desc: u => `每回合开始时，给中毒最多的敌人 ${v(u, 3, 5)} 层中毒。`, play: (g, u) => { P(g).st.nshade = v(u, 3, 5); } },
  w_reserve: { ch: 'witch', name: '库存清点', type: 'skill', rar: 'c', cost: [1, 1], icon: 'goldbag', tgt: 'self', desc: u => `随机获得 ${v(u, 2, 3)} 个炼金瓶。`, play: (g, u) => g.potion(v(u, 2, 3)) },
};

/* ======================= 新角色扩充到 35 张 ======================= */
const NEW2 = {
  // ---- 艾琳：三同专精 / 混合应变 ----
  e_flare: { ch: 'erin', name: '闪焰', type: 'atk', rar: 'c', cost: [0, 0], icon: 'ic_flame', tgt: 'one', desc: u => `造成 ${v(u, 4, 6)} 点伤害。写入火。`, play: (g, u, t) => { g.attack(t, v(u, 4, 6)); writeEl(g, '火'); } },
  e_mist: { ch: 'erin', name: '雾帘', type: 'skill', rar: 'c', cost: [0, 0], icon: 'sk_bmist', tgt: 'self', desc: u => `写入水，获得 ${v(u, 4, 6)} 点格挡。`, play: (g, u) => { writeEl(g, '水'); g.block(v(u, 4, 6)); } },
  e_gust: { ch: 'erin', name: '疾风', type: 'skill', rar: 'c', cost: [1, 1], icon: 'ic_stride', tgt: 'self', desc: u => `写入风，抽 2 张牌。${v(u, '', '获得 3 点格挡。')}`, play: (g, u) => { writeEl(g, '风'); g.draw(2); if (u) g.block(3); } },
  e_prismshot: { ch: 'erin', name: '三棱射线', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_crystal', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 4, 5)} 点伤害；三种元素齐全时再 +${v(u, 3, 4)}。`, play: (g, u) => g.attackAll(v(u, 4, 5) + (kinds(g) === 3 ? v(u, 3, 4) : 0)) },
  e_resonate: { ch: 'erin', invoke: 1, name: '元素共振', type: 'skill', rar: 'u', cost: [1, 1], icon: 'ic_rune', tgt: 'self', desc: u => `祈唤；三格元素相同时再抽 1 张牌。${v(u, '', '获得 4 点格挡。')}`, play: (g, u) => { if (u) g.block(4); const same = kinds(g) === 1; invoke(g); if (same) g.draw(1); } },
  e_focus: { ch: 'erin', name: '专注', type: 'power', rar: 'u', cost: [1, 1], icon: 'ic_aura', tgt: 'self', desc: u => `每回合开始时，再写入一次最新一格的元素${v(u, '', '，获得 3 点格挡')}。`, play: (g, u) => { P(g).st.efocus = u ? 2 : 1; } },
  e_mix: { ch: 'erin', name: '混合咒', type: 'atk', rar: 'u', cost: [1, 1], icon: 'ic_hexa', tgt: 'one', desc: u => `造成 ${v(u, 6, 8)} 点伤害；元素位里每有 1 种不同元素，再 +${v(u, 3, 4)}。`, play: (g, u, t) => g.attack(t, v(u, 6, 8) + kinds(g) * v(u, 3, 4)) },
  e_overload: { ch: 'erin', name: '元素过载', type: 'atk', rar: 'r', cost: [2, 2], icon: 'ic_gods', tgt: 'one', desc: u => `造成 ${v(u, 8, 12)} 点伤害；本回合每打出过 1 张法术，再 +7。`, play: (g, u, t) => g.attack(t, v(u, 8, 12) + 7 * ((P(g).spells || []).length)) },
  e_reserve: { ch: 'erin', name: '元素储备', type: 'skill', rar: 'c', cost: [1, 1], icon: 'ic_barrier', tgt: 'self', desc: u => `获得 ${v(u, 7, 10)} 点格挡；本回合打出过法术时再 +4。`, play: (g, u) => g.block(v(u, 7, 10) + ((P(g).spells || []).length ? 4 : 0)) },
  e_echo: { ch: 'erin', name: '回响祈唤', type: 'skill', rar: 'r', cost: [1, 0], icon: 'ic_orbit', tgt: 'self', exhaust: 1, desc: () => `把本回合打出的上一张法术再放一张进手牌。消耗。`, play: g => { const sp = P(g).spells || []; if (sp.length) g.addHand(sp[sp.length - 1]); } },
  e_staff: { ch: 'erin', name: '法杖格挡', type: 'skill', rar: 'c', cost: [1, 1], icon: 'ic_rune', tgt: 'self', desc: u => `获得 ${v(u, 8, 11)} 点格挡。`, play: (g, u) => g.block(v(u, 8, 11)) },
  e_tide: { ch: 'erin', name: '潮汐', type: 'skill', rar: 'u', cost: [1, 1], icon: 'ic_water', tgt: 'self', desc: u => `写入水两次，获得 ${v(u, 6, 9)} 点格挡。`, play: (g, u) => { writeEl(g, '水'); writeEl(g, '水'); g.block(v(u, 6, 9)); } },
  e_blaze: { ch: 'erin', name: '烈焰', type: 'atk', rar: 'u', cost: [1, 1], icon: 'sk_fireel', tgt: 'one', desc: u => `造成 ${v(u, 9, 12)} 点伤害；三格都是火时改为打所有敌人。`, play: (g, u, t) => { const el = P(g).el || EL; if (el.every(x => x === '火')) g.attackAll(v(u, 9, 12)); else g.attack(t, v(u, 9, 12)); } },
  e_cyclone: { ch: 'erin', name: '旋风', type: 'atk', rar: 'u', cost: [1, 1], icon: 'ic_vortex', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 5, 7)} 点伤害；三格都是风时抽 2 张牌。`, play: (g, u) => { g.attackAll(v(u, 5, 7)); const el = P(g).el || EL; if (el.every(x => x === '风')) g.draw(2); } },
  e_master: { ch: 'erin', name: '元素宗师', type: 'power', rar: 'r', cost: [2, 1], icon: 'm_crown', tgt: 'self', desc: () => `每打出 1 张法术，获得 3 点格挡。`, play: g => { P(g).st.emaster = 3; } },
  // ---- 顾清寒：剑宗 / 气宗 / 剑势 ----
  g_unsheath: { ch: 'gu', name: '拔剑', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_sword', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害。`, play: (g, u, t) => g.attack(t, v(u, 8, 11)) },
  g_twin: { ch: 'gu', name: '双剑', type: 'atk', rar: 'c', cost: [1, 1], icon: 'sk_gsword', tgt: 'one', desc: u => `造成 ${v(u, 4, 5)} 点伤害 2 次。得到 1 把飞剑。`, play: (g, u, t) => { g.attack(t, v(u, 4, 5), 2); addSword(g, 1); } },
  g_sit: { ch: 'gu', name: '静坐', type: 'skill', rar: 'c', cost: [1, 1], icon: 'ic_aura', tgt: 'self', desc: u => `得到 ${v(u, 3, 4)} 点内力，获得 ${v(u, 5, 7)} 点格挡。`, play: (g, u) => { gainQi(g, v(u, 3, 4)); g.block(v(u, 5, 7)); } },
  g_parry: { ch: 'gu', name: '格剑', type: 'skill', rar: 'c', cost: [1, 1], icon: 'sk_hshield', tgt: 'self', desc: u => `获得 ${v(u, 7, 10)} 点格挡；破岳势下再 +4。`, play: (g, u) => g.block(v(u, 7, 10) + (P(g).st.mtn ? 4 : 0)) },
  g_galestep: { ch: 'gu', name: '疾风步', type: 'skill', rar: 'c', cost: [0, 0], icon: 'ic_stride', tgt: 'self', desc: u => `切入疾风势，获得 ${v(u, 3, 5)} 点格挡。`, play: (g, u) => { stance(g, 'wind'); g.block(v(u, 3, 5)); } },
  g_rooted: { ch: 'gu', name: '稳如山', type: 'skill', rar: 'c', cost: [1, 1], icon: 'b_armor', tgt: 'self', desc: u => `切入破岳势，获得 ${v(u, 8, 11)} 点格挡。`, play: (g, u) => { stance(g, 'mtn'); g.block(v(u, 8, 11)); } },
  g_array: { ch: 'gu', name: '剑阵', type: 'power', rar: 'u', cost: [1, 1], icon: 'sk_gsword', tgt: 'self', desc: u => `每回合开始时，得到 1 把飞剑${v(u, '', '，获得 2 点格挡')}。`, play: (g, u) => { P(g).st.swordgen = u ? 2 : 1; } },
  g_surge: { ch: 'gu', name: '内力奔涌', type: 'skill', rar: 'u', cost: [0, 0], icon: 'm_blood', tgt: 'self', desc: u => `燃血，抽 ${v(u, 2, 3)} 张牌。`, play: (g, u) => { burnBlood(g); g.draw(v(u, 2, 3)); } },
  g_heavy: { ch: 'gu', name: '千斤坠', type: 'atk', rar: 'u', cost: [2, 2], icon: 'ic_hammer', tgt: 'one', desc: u => `造成 ${v(u, 12, 15)} 点伤害；花掉最多 6 点内力，每点再 +2。`, play: (g, u, t) => { const k = Math.min(6, P(g).st.qi || 0); if (k) spendQi(g, k); g.attack(t, v(u, 12, 15) + 2 * k); } },
  g_chain: { ch: 'gu', name: '连环剑', type: 'atk', rar: 'u', cost: [1, 1], icon: 'fx_slash', tgt: 'one', desc: u => `造成 ${v(u, 3, 4)} 点伤害；本回合每打出过 1 张攻击牌，再打 1 次（最多再 4 次）。`, play: (g, u, t) => g.attack(t, v(u, 3, 4), 1 + Math.min(4, cmb(g))) },
  g_crush: { ch: 'gu', name: '碎岳', type: 'atk', rar: 'u', cost: [1, 1], icon: 'sk_greatsword', tgt: 'one', desc: u => `造成 ${v(u, 9, 12)} 点伤害；破岳势下给予 2 层易伤。`, play: (g, u, t) => { if (P(g).st.mtn) g.apply(t, 'vuln', 2); g.attack(t, v(u, 9, 12)); } },
  g_recall: { ch: 'gu', name: '回剑', type: 'skill', rar: 'c', cost: [1, 1], icon: 'ic_boomer', tgt: 'one', desc: u => `射出 1 把飞剑，再得到 2 把飞剑，获得 ${v(u, 3, 6)} 点格挡。`, play: (g, u, t) => { shootSword(g, t, 1); addSword(g, 2); g.block(v(u, 3, 6)); } },
  g_immortal: { ch: 'gu', name: '天外飞仙', type: 'atk', rar: 'r', cost: [3, 2], icon: 'sk_rapier', tgt: 'one', exhaust: 1, desc: () => `射出全部飞剑（每把 7 点伤害），再花掉全部内力，每点造成 3 点伤害。消耗。`, play: (g, u, t) => { shootSword(g, t, 5, 7); const k = P(g).st.qi || 0; if (k) { spendQi(g, k); g.attack(live(g, t), 3 * k); } } },
  g_zen: { ch: 'gu', name: '剑心通明', type: 'power', rar: 'r', cost: [1, 1], icon: 'p_mag', tgt: 'self', desc: u => `每回合第一次切换剑势时，抽 ${v(u, 2, 3)} 张牌。`, play: (g, u) => { P(g).st.zen = v(u, 2, 3); } },
  g_qiarmor: { ch: 'gu', name: '护体真气', type: 'power', rar: 'u', cost: [1, 1], icon: 'b_armor', tgt: 'self', desc: u => `每回合结束时，每有 3 点内力获得 ${v(u, 2, 3)} 点格挡。`, play: (g, u) => { P(g).st.qiarmor = v(u, 2, 3); } },
  // ---- 希尔薇：抢变身 / 霜甲反击 ----
  s_icicle: { ch: 'sylvie', name: '冰锥', type: 'atk', rar: 'c', cost: [0, 0], icon: 'ic_crystal', tgt: 'one', desc: u => `造成 ${v(u, 4, 6)} 点伤害。得到 1 点龙血。`, play: (g, u, t) => { g.attack(t, v(u, 4, 6)); gainDB(g, 1); } },
  s_fang: { ch: 'sylvie', name: '龙牙', type: 'atk', rar: 'c', cost: [1, 1], icon: 'p_svamp', tgt: 'one', desc: u => `造成 ${v(u, 9, 12)} 点伤害；霜龙形态下再 +${v(u, 4, 5)}。`, play: (g, u, t) => g.attack(t, v(u, 9, 12) + (dr(g) ? v(u, 4, 5) : 0)) },
  s_iceshield: { ch: 'sylvie', name: '冰盾', type: 'skill', rar: 'c', cost: [1, 1], icon: 'ic_barrier', tgt: 'self', desc: u => `获得 ${v(u, 8, 11)} 点格挡和 ${v(u, 2, 3)} 层霜甲。`, play: (g, u) => { g.block(v(u, 8, 11)); gainFrost(g, v(u, 2, 3)); } },
  s_rage: { ch: 'sylvie', name: '龙怒', type: 'skill', rar: 'c', cost: [1, 1], icon: 'm_anger', tgt: 'self', desc: u => `得到 ${v(u, 3, 4)} 点龙血，抽 1 张牌。`, play: (g, u) => { gainDB(g, v(u, 3, 4)); g.draw(1); } },
  s_nova: { ch: 'sylvie', name: '霜爆', type: 'atk', rar: 'u', cost: [1, 1], icon: 'sk_waterel', tgt: 'all', desc: u => `对所有敌人造成等同霜甲层数的伤害（至少 ${v(u, 4, 6)}）。`, play: (g, u) => g.attackAll(Math.max(v(u, 4, 6), P(g).st.frost || 0)) },
  s_awaken: { ch: 'sylvie', name: '觉醒', type: 'skill', rar: 'u', cost: [1, 1], icon: 'p_rev', tgt: 'self', desc: u => `得到 ${v(u, 5, 6)} 点龙血；龙血攒满时抽 2 张牌。`, play: (g, u) => { gainDB(g, v(u, 5, 6)); if ((P(g).st.dblood || 0) >= 8) g.draw(2); } },
  s_dscale: { ch: 'sylvie', name: '龙鳞', type: 'power', rar: 'u', cost: [1, 1], icon: 'b_dur', tgt: 'self', desc: u => `霜龙形态下，每回合开始时获得 ${v(u, 6, 8)} 点格挡。`, play: (g, u) => { P(g).st.dscale = v(u, 6, 8); } },
  s_glacier: { ch: 'sylvie', name: '冰川', type: 'skill', rar: 'u', cost: [2, 2], icon: 'sk_hwall', tgt: 'self', desc: u => `获得 ${v(u, 12, 15)} 点格挡和 ${v(u, 3, 4)} 层霜甲。`, play: (g, u) => { g.block(v(u, 12, 15)); gainFrost(g, v(u, 3, 4)); } },
  s_tail: { ch: 'sylvie', name: '龙尾扫', type: 'atk', rar: 'u', cost: [1, 1], icon: 'sk_wolf', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 6, 8)} 点伤害；霜龙形态下给予所有敌人 1 层虚弱。`, play: (g, u) => { g.attackAll(v(u, 6, 8)); if (dr(g)) g.applyAll('weak', 1); } },
  s_dheart: { ch: 'sylvie', name: '龙心', type: 'power', rar: 'r', cost: [1, 1], icon: 'm_blood', tgt: 'self', desc: u => `每次变身时，得到 ${v(u, 2, 3)} 点能量。`, play: (g, u) => { P(g).st.dheart = v(u, 2, 3); } },
  s_permafrost: { ch: 'sylvie', name: '永冻', type: 'power', rar: 'r', cost: [1, 1], icon: 'ic_water', tgt: 'self', desc: u => `你的回合开始时，霜甲不再清空，改为减半${v(u, '', '（向上取整）')}。`, play: (g, u) => { P(g).st.perma = u ? 2 : 1; } },
  s_mirror: { ch: 'sylvie', name: '冰反射', type: 'skill', rar: 'u', cost: [1, 1], icon: 'p_dodge', tgt: 'self', desc: u => `获得 ${v(u, 5, 7)} 点格挡和 ${v(u, 4, 6)} 层霜甲。`, play: (g, u) => { g.block(v(u, 5, 7)); gainFrost(g, v(u, 4, 6)); } },
  s_dive: { ch: 'sylvie', name: '俯冲', type: 'atk', rar: 'r', cost: [2, 2], icon: 'p_exec', tgt: 'one', desc: u => `造成 ${v(u, 18, 22)} 点伤害；霜龙形态下改为 ${v(u, 30, 36)} 点。`, play: (g, u, t) => g.attack(t, dr(g) ? v(u, 30, 36) : v(u, 18, 22)) },
  s_chill: { ch: 'sylvie', name: '寒息', type: 'skill', rar: 'c', cost: [1, 1], icon: 'sk_bmist', tgt: 'one', desc: u => `给予 2 层虚弱，得到 ${v(u, 2, 3)} 点龙血。`, play: (g, u, t) => { g.apply(t, 'weak', 2); gainDB(g, v(u, 2, 3)); } },
  s_calm: { ch: 'sylvie', name: '平静', type: 'skill', rar: 'c', cost: [0, 0], icon: 'ic_aura', tgt: 'self', desc: u => `获得 ${v(u, 4, 6)} 点格挡，得到 1 点龙血。`, play: (g, u) => { g.block(v(u, 4, 6)); gainDB(g, 1); } },
  // ---- 米娅：扑击 / 护卫 / 照料 ----
  m_claw: { ch: 'mia', name: '猫抓', type: 'atk', rar: 'c', cost: [0, 0], icon: 'sk_wolf', tgt: 'one', desc: u => `造成 ${v(u, 4, 6)} 点伤害。`, play: (g, u, t) => g.attack(t, v(u, 4, 6)) },
  m_toy: { ch: 'mia', name: '逗猫棒', type: 'skill', rar: 'c', cost: [1, 1], icon: 'ic_whip', tgt: 'self', desc: u => `团子回复 3 生命，本回合扑击 +${v(u, 3, 5)} 点伤害。`, play: (g, u) => { healCat(g, 3); if (cat(g)) cat(g).pB = (cat(g).pB || 0) + v(u, 3, 5); } },
  m_fluff: { ch: 'mia', name: '炸毛', type: 'skill', rar: 'c', cost: [1, 1], icon: 'b_armor', tgt: 'self', desc: u => `获得 ${v(u, 8, 11)} 点格挡。团子护卫时本轮多挡 2 点。`, play: (g, u) => { g.block(v(u, 8, 11)); if (cat(g)) cat(g).gB = (cat(g).gB || 0) + 2; } },
  m_whistle2: { ch: 'mia', name: '口哨', type: 'skill', rar: 'c', cost: [0, 0], icon: 'p_hunt', tgt: 'self', desc: u => `本回合可以再改一次团子的指令，抽 1 张牌。${v(u, '', '获得 3 点格挡。')}`, play: (g, u) => { if (cat(g)) cat(g).set = 0; g.draw(1); if (u) g.block(3); } },
  m_twice: { ch: 'mia', name: '二连扑', type: 'skill', rar: 'u', cost: [1, 1], icon: 'p_crit', tgt: 'self', desc: u => `本回合团子扑击时，扑两次。${v(u, '', '抽 1 张牌。')}`, play: (g, u) => { if (cat(g)) cat(g).twice = 1; if (u) g.draw(1); } },
  m_bond: { ch: 'mia', name: '羁绊', type: 'power', rar: 'u', cost: [1, 1], icon: 'sk_fairy', tgt: 'self', desc: u => `每回合开始时，团子回复 ${v(u, 2, 3)} 生命。`, play: (g, u) => { P(g).st.mbond = v(u, 2, 3); } },
  m_sharpen: { ch: 'mia', name: '磨爪', type: 'power', rar: 'u', cost: [1, 1], icon: 'ic_hammer', tgt: 'self', desc: u => `本场战斗团子的攻击 +${v(u, 2, 3)}。`, play: (g, u) => { if (cat(g)) cat(g).atk += v(u, 2, 3); } },
  m_leap: { ch: 'mia', name: '飞扑', type: 'atk', rar: 'u', cost: [1, 1], icon: 'ic_stride', tgt: 'one', desc: u => `造成 ${v(u, 7, 10)} 点伤害；团子在场时，把它的指令改成扑击这个敌人。`, play: (g, u, t) => { g.attack(t, v(u, 7, 10)); const c = cat(g); if (c && !c.down && t && !t.dead) { c.cmd = 'pounce'; c.pt = t.id; } } },
  m_catshield: { ch: 'mia', name: '猫咪盾', type: 'skill', rar: 'c', cost: [1, 1], icon: 'sk_hshield', tgt: 'self', desc: u => `获得 ${v(u, 6, 9)} 点格挡，团子回复 ${v(u, 2, 3)} 生命。`, play: (g, u) => { g.block(v(u, 6, 9)); healCat(g, v(u, 2, 3)); } },
  m_herd: { ch: 'mia', name: '猫群来袭', type: 'atk', rar: 'r', cost: [2, 2], icon: 'sk_undead', tgt: 'all', exhaust: 1, desc: u => `团子在场时，对所有敌人造成团子攻击 ×${v(u, 3, 4)} 的伤害。消耗。`, play: (g, u) => { const c = cat(g); if (c && !c.down) g.attackAll(c.atk * v(u, 3, 4)); } },
  m_pact: { ch: 'mia', name: '守护契约', type: 'power', rar: 'r', cost: [1, 0], icon: 'm_ward', tgt: 'self', desc: () => `团子护卫时，它挡下的伤害一半变成米娅的格挡。`, play: g => { P(g).st.mpact = 1; } },
  m_nap: { ch: 'mia', name: '打盹', type: 'skill', rar: 'c', cost: [1, 1], icon: 'box', tgt: 'self', desc: u => `团子回复 ${v(u, 6, 8)} 生命，米娅获得 ${v(u, 4, 6)} 点格挡。`, play: (g, u) => { healCat(g, v(u, 6, 8)); g.block(v(u, 4, 6)); } },
  m_yarn: { ch: 'mia', name: '毛线球', type: 'atk', rar: 'u', cost: [1, 1], icon: 'ic_orbit', tgt: 'one', desc: u => `造成 ${v(u, 5, 6)} 点伤害 2 次；团子在场时给予 1 层易伤。`, play: (g, u, t) => { if (catUp(g)) g.apply(t, 'vuln', 1); g.attack(t, v(u, 5, 6), 2); } },
  m_trust: { ch: 'mia', name: '信任', type: 'skill', rar: 'u', cost: [1, 1], icon: 'sk_pouch', tgt: 'self', desc: u => `抽 ${v(u, 2, 3)} 张牌；团子满血时得到 1 点能量。`, play: (g, u) => { g.draw(v(u, 2, 3)); const c = cat(g); if (c && !c.down && c.hp >= c.max) g.energy(1); } },
  // ---- 绯月：鲜血 / 吸血 / 蝙蝠 ----
  f_nick: { ch: 'feiyue', name: '划伤', type: 'atk', rar: 'c', cost: [0, 0], icon: 'ic_rapier', tgt: 'one', desc: u => `造成 ${v(u, 4, 6)} 点伤害，吸血 ${v(u, 1, 2)}。`, play: (g, u, t) => leech(g, g.attack(t, v(u, 4, 6)), v(u, 1, 2)) },
  f_drop: { ch: 'feiyue', name: '血滴', type: 'skill', rar: 'c', cost: [0, 0], icon: 'm_blood', tgt: 'self', desc: u => `生命高于一半时献血 1。获得 ${v(u, 4, 6)} 点格挡。`, play: (g, u) => { donate(g, 1); g.block(v(u, 4, 6)); } },
  f_flock: { ch: 'feiyue', name: '蝠群', type: 'skill', rar: 'c', cost: [1, 1], icon: 'sk_undead', tgt: 'self', desc: u => `得到 ${v(u, 2, 3)} 只蝙蝠，抽 1 张牌。`, play: (g, u) => { addBat(g, v(u, 2, 3)); g.draw(1); } },
  f_feast: { ch: 'feiyue', name: '盛宴', type: 'atk', rar: 'u', cost: [2, 2], icon: 'p_svamp', tgt: 'one', desc: u => `造成 ${v(u, 14, 18)} 点伤害，吸血 ${v(u, 5, 6)}。`, play: (g, u, t) => leech(g, g.attack(t, v(u, 14, 18)), v(u, 5, 6)) },
  f_mark: { ch: 'feiyue', name: '猎印', type: 'skill', rar: 'c', cost: [0, 0], icon: 'p_hunt', tgt: 'one', desc: u => `把目标设为标记目标，给予 ${v(u, 2, 3)} 层血痕。`, play: (g, u, t) => { if (!t) return; P(g).mark = t.id; t.st.scar = Math.min(4, (t.st.scar || 0) + v(u, 2, 3)); } },
  f_cloak: { ch: 'feiyue', name: '夜之斗篷', type: 'skill', rar: 'u', cost: [1, 1], icon: 'b_vamp', tgt: 'self', desc: u => `获得 ${v(u, 10, 13)} 点格挡；鲜血不少于 3 时再 +5。`, play: (g, u) => g.block(v(u, 10, 13) + (vb(g) >= 3 ? 5 : 0)) },
  f_dash: { ch: 'feiyue', name: '血之冲刺', type: 'atk', rar: 'u', cost: [1, 1], icon: 'ic_stride', tgt: 'one', desc: u => `造成 ${v(u, 6, 8)} 点伤害；花掉最多 3 点鲜血，每点再 +${v(u, 4, 5)}。`, play: (g, u, t) => { const k = Math.min(3, vb(g)); if (k) spendB(g, k); g.attack(t, v(u, 6, 8) + k * v(u, 4, 5)); } },
  f_nest: { ch: 'feiyue', name: '蝠巢', type: 'power', rar: 'u', cost: [1, 1], icon: 'sk_shadow', tgt: 'self', desc: u => `每回合开始时，得到 1 只蝙蝠${v(u, '', '，获得 2 点格挡')}。`, play: (g, u) => { P(g).st.batgen = u ? 2 : 1; } },
  f_dance: { ch: 'feiyue', name: '绯红之舞', type: 'atk', rar: 'r', cost: [2, 2], icon: 'ic_boomer', tgt: 'all', desc: u => `对所有敌人造成 ${v(u, 8, 10)} 点伤害，吸血 ${v(u, 4, 5)}。`, play: (g, u) => leech(g, g.attackAll(v(u, 8, 10)), v(u, 4, 5)) },
  f_hunger: { ch: 'feiyue', name: '饥渴', type: 'power', rar: 'u', cost: [1, 1], icon: 'b_vamp', tgt: 'self', desc: u => `每次吸血成功后，获得 ${v(u, 2, 3)} 点格挡。`, play: (g, u) => { P(g).st.vhunger = v(u, 2, 3); } },
  f_rite: { ch: 'feiyue', name: '血祭', type: 'skill', rar: 'r', cost: [1, 1], icon: 'ic_necro', tgt: 'self', exhaust: 1, desc: u => `失去 6 生命，得到 ${v(u, 6, 8)} 点鲜血和 2 点能量。消耗。`, play: (g, u) => { g.loseHp(6); P(g).st.vblood = Math.min(12, vb(g) + v(u, 6, 8)); g.energy(2); } },
  f_echo: { ch: 'feiyue', name: '回声定位', type: 'skill', rar: 'c', cost: [1, 1], icon: 'p_mag', tgt: 'self', desc: u => `给标记目标 2 层血痕，获得 ${v(u, 6, 9)} 点格挡。`, play: (g, u) => { const t = markT(g); if (t) t.st.scar = Math.min(4, (t.st.scar || 0) + 2); g.block(v(u, 6, 9)); } },
  f_fangs: { ch: 'feiyue', name: '獠牙', type: 'atk', rar: 'c', cost: [1, 1], icon: 'p_svamp', tgt: 'one', desc: u => `造成 ${v(u, 8, 11)} 点伤害；目标有血痕时吸血 ${v(u, 3, 4)}。`, play: (g, u, t) => { const sc = t && t.st.scar; const d = g.attack(t, v(u, 8, 11)); if (sc) leech(g, d, v(u, 3, 4)); } },
  f_moon2: { ch: 'feiyue', name: '月升', type: 'skill', rar: 'u', cost: [2, 2], icon: 'sk_holyorb', tgt: 'self', desc: u => `得到 4 只蝙蝠，获得 ${v(u, 6, 9)} 点格挡。`, play: (g, u) => { addBat(g, 4); g.block(v(u, 6, 9)); } },
  f_undying: { ch: 'feiyue', name: '不死之身', type: 'power', rar: 'r', cost: [2, 1], icon: 'p_rev', tgt: 'self', desc: () => `每回合结束时，鲜血不少于 4 点就花掉 2 点，回复 3 生命（不算吸血）。`, play: g => { P(g).st.undying = 1; } },
  // ---- 沈雀：快牌 / 做牌 ----
  q_peek: { ch: 'shenque', name: '偷看', type: 'skill', rar: 'c', cost: [0, 0], icon: 'p_mag', tgt: 'self', desc: u => `摸 1 张麻将牌，获得 ${v(u, 3, 5)} 点格挡。`, play: (g, u) => { drawTile(g, 1); g.block(v(u, 3, 5)); } },
  q_slap: { ch: 'shenque', name: '拍桌', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_palm', tgt: 'one', desc: u => `造成 ${v(u, 9, 12)} 点伤害。`, play: (g, u, t) => g.attack(t, v(u, 9, 12)) },
  q_stack: { ch: 'shenque', name: '码牌', type: 'skill', rar: 'c', cost: [1, 1], icon: 'box', tgt: 'self', desc: u => `获得 ${v(u, 8, 11)} 点格挡，摸 1 张麻将牌。`, play: (g, u) => { g.block(v(u, 8, 11)); drawTile(g, 1); } },
  q_double: { ch: 'shenque', name: '双响', type: 'atk', rar: 'u', cost: [1, 1], icon: 'ic_drum', tgt: 'one', desc: u => `造成 ${v(u, 6, 7)} 点伤害 2 次；牌架有对子时每次再 +2。`, play: (g, u, t) => g.attack(t, v(u, 6, 7) + (findPat(tiles(g), P(g).eighth).some(x => x.k === 'pair' || x.k === 'trip') ? 2 : 0), 2) },
  q_riichi: { ch: 'shenque', name: '立直', type: 'power', rar: 'u', cost: [1, 1], icon: 'p_luck', tgt: 'self', desc: u => `每回合开始时多摸 1 张麻将牌${v(u, '', '，获得 2 点格挡')}。`, play: (g, u) => { P(g).st.riichi = u ? 2 : 1; } },
  q_dora: { ch: 'shenque', name: '宝牌', type: 'skill', rar: 'u', cost: [1, 0], icon: 'm_crown', tgt: 'self', desc: () => `本回合结算牌型时，伤害和格挡各 +6。`, play: g => { P(g).patBonus = 6; } },
  q_again: { ch: 'shenque', name: '再来一局', type: 'skill', rar: 'u', cost: [1, 1], icon: 'ic_orbit', tgt: 'self', exhaust: 1, desc: u => `本回合可以再结算一次牌型，摸 ${v(u, 1, 2)} 张麻将牌。消耗。`, play: (g, u) => { P(g).setT = 0; drawTile(g, v(u, 1, 2)); } },
  q_bluff: { ch: 'shenque', name: '虚张声势', type: 'skill', rar: 'c', cost: [1, 1], icon: 'm_anger', tgt: 'one', desc: u => `给予 ${v(u, 2, 3)} 层虚弱，摸 1 张麻将牌。`, play: (g, u, t) => { g.apply(t, 'weak', v(u, 2, 3)); drawTile(g, 1); } },
  q_tenpai: { ch: 'shenque', name: '一向听', type: 'skill', rar: 'u', cost: [1, 1], icon: 'sk_pouch', tgt: 'self', desc: u => `获得 ${v(u, 6, 9)} 点格挡；牌架满 7 张时抽 2 张牌。`, play: (g, u) => { g.block(v(u, 6, 9)); if (P(g).rack && P(g).rack.length >= 7) g.draw(2); } },
  q_chips: { ch: 'shenque', name: '筹码护身', type: 'skill', rar: 'c', cost: [1, 1], icon: 'goldbag', tgt: 'self', desc: u => `获得 ${v(u, 6, 8)} 点格挡；牌架上每有 1 种能结算的牌型，再 +2。`, play: (g, u) => g.block(v(u, 6, 8) + 2 * findPat(tiles(g), P(g).eighth).length) },
  q_allin: { ch: 'shenque', name: '梭哈', type: 'atk', rar: 'r', cost: [2, 2], icon: 'p_gamble', tgt: 'one', exhaust: 1, desc: u => `造成 ${v(u, 6, 10)} 点伤害，牌架上每有 1 张牌再 +3，然后弃掉牌架上所有的牌。消耗。`, play: (g, u, t) => { const p = P(g), n = (p.rack || []).length; g.attack(t, v(u, 6, 10) + 3 * n); if (p.rack) { p.mdisc.push(...p.rack); p.rack = []; } } },
  q_flower: { ch: 'shenque', name: '花牌', type: 'skill', rar: 'u', cost: [0, 0], icon: 'sk_fairy', tgt: 'self', desc: u => `摸 2 张麻将牌，获得 ${v(u, 3, 5)} 点格挡。`, play: (g, u) => { drawTile(g, 2); g.block(v(u, 3, 5)); } },
  q_defend: { ch: 'shenque', name: '防守牌', type: 'skill', rar: 'c', cost: [1, 1], icon: 'sk_hshield', tgt: 'self', desc: u => `获得 ${v(u, 9, 12)} 点格挡。`, play: (g, u) => g.block(v(u, 9, 12)) },
  q_tsumo: { ch: 'shenque', name: '自摸', type: 'skill', rar: 'r', cost: [1, 1], icon: 'p_luck', tgt: 'one', desc: u => `摸 ${v(u, 1, 2)} 张麻将牌，然后自动结算最好的牌型（算本回合的一次结算）。`, play: (g, u, t) => { drawTile(g, v(u, 1, 2)); const RK = { hu: 5, flush: 4, run: 3, trip: 2, pair: 1 }, f = findPat(tiles(g), P(g).eighth).sort((x, y) => (RK[y.k] || 0) - (RK[x.k] || 0)); if (f.length && !P(g).setT) settle(g, f[0], t); } },
  q_luck: { ch: 'shenque', name: '手气', type: 'atk', rar: 'c', cost: [1, 1], icon: 'p_crit', tgt: 'one', desc: u => `造成 ${v(u, 7, 9)} 点伤害；本回合摸过至少 3 张麻将牌时再 +${v(u, 5, 7)}。`, play: (g, u, t) => g.attack(t, v(u, 7, 9) + ((P(g).drawnT || 0) >= 3 ? v(u, 5, 7) : 0)) },
};

export const NEWCARDS = { ...ERIN, ...GU, ...SYL, ...MIA, ...FEI, ...SQ, ...OLD, ...NEW2 };
for (const c of Object.values(NEWCARDS)) c.noart = 1;
// 机器人估值：sim 的熟练机器人按这些词判断「流派牌」
export const OLDKEYW = { miko: /结界|技能牌/, hero: /光弹|攻击牌/, witch: /中毒|炼金瓶|火焰瓶/, heroine: /共鸣|爆音|弃/ };
export const NEWKEYW = { erin: /元素|祈唤|写入/, gu: /飞剑|内力|剑势|燃血/, sylvie: /龙血|霜甲|霜龙/, mia: /团子|扑击|护卫/, feiyue: /鲜血|吸血|蝙蝠|献血/, shenque: /麻将|牌型|对子|刻子|顺子/ };
const B5 = ['tstrike', 'tstrike', 'tstrike', 'tstrike', 'defend', 'defend', 'defend'];
export const NEWSTARTERS = {
  erin: [...B5, 'e_spark', 'e_ripple', 'e_invoke'], gu: [...B5, 'g_sheath', 'g_breath', 'g_shift'], sylvie: [...B5, 's_lance', 's_scale', 's_pulse'],
  mia: [...B5, 'm_staff', 'm_side', 'm_snack'], feiyue: [...B5, 'f_claw', 'f_sleeve', 'f_bats'], shenque: [...B5, 'q_fly', 'q_tidy', 'q_call'],
};
export const NEWSTARTRELIC = { erin: 'oldstaff', gu: 'swordtassel', sylvie: 'eggshard', mia: 'catbell', feiyue: 'ribbon', shenque: 'mjbox' };
export const NEWRELICS = {
  oldstaff: { ch: 'erin', name: '旧世界法杖', icon: 'ic_rune', rar: 'start', desc: '每场战斗第一张祈唤牌少 1 费。战斗结束时回复 4 点生命。' },
  lens: { ch: 'erin', name: '定相透镜', icon: 'ic_crystal', rar: 'u', desc: '每场战斗第一次三格元素相同时，获得 6 点格挡。' },
  prism: { ch: 'erin', name: '裂色棱镜', icon: 'ic_hexa', rar: 'r', desc: '每场战斗第一次打出两种不同配方的法术后，抽 2 张牌，得到 1 点能量。' },
  swordtassel: { ch: 'gu', name: '雪纹剑穗', icon: 'ic_sword', rar: 'start', desc: '战斗开始时得到 1 把飞剑。战斗结束时回复 4 点生命。' },
  jade: { ch: 'gu', name: '护脉玉', icon: 'ic_aura', rar: 'u', desc: '每场战斗第一次燃血不失去生命。' },
  manual: { ch: 'gu', name: '旧剑谱', icon: 'b_dur', rar: 'r', desc: '每场战斗第一次一回合打出 3 张攻击牌后，下回合多抽 2 张牌。' },
  eggshard: { ch: 'sylvie', name: '寒卵碎片', icon: 'ic_crystal', rar: 'start', desc: '战斗开始时得到 2 点龙血。战斗结束时回复 4 点生命。' },
  horn: { ch: 'sylvie', name: '断角护符', icon: 'm_ward', rar: 'u', desc: '每场战斗第一次变身时，获得 8 点格挡。' },
  dayscale: { ch: 'sylvie', name: '极昼鳞', icon: 'p_tough', rar: 'r', desc: '每场战斗第一次退出霜龙形态时不会虚弱，并得到 3 点龙血。' },
  catbell: { ch: 'mia', name: '团子的铃铛', icon: 'ic_bell', rar: 'start', desc: '云猫团子和你并肩作战，每回合可以给它一个指令。战斗结束时回复 4 点生命。' },
  catbed: { ch: 'mia', name: '旅行猫窝', icon: 'box', rar: 'u', desc: '每场战斗团子第一次休息，额外回复 4 生命。' },
  lynx: { ch: 'mia', name: '山猫纹章', icon: 'sk_wolf', rar: 'r', desc: '每场战斗第一次执行过两种不同指令后，下回合抽 1 张牌，得到 1 点能量。' },
  ribbon: { ch: 'feiyue', name: '家书缎带', icon: 'b_vamp', rar: 'start', desc: '战斗开始时得到 2 点鲜血。战斗结束时回复 4 点生命。' },
  redpin: { ch: 'feiyue', name: '红银针', icon: 'ic_stake', rar: 'u', desc: '每场战斗第一次吸血时多回复 2 生命（仍算进每场 8 点的上限）。' },
  cup: { ch: 'feiyue', name: '倒悬杯', icon: 'pot', rar: 'r', desc: '每场战斗第一次 4 只蝙蝠一起出猎后，返还 1 只蝙蝠，抽 1 张牌。' },
  mjbox: { ch: 'shenque', name: '旧麻将盒', icon: 'box', rar: 'start', desc: '带来麻将牌架：战斗开始先摸 2 张，之后每回合摸 3 张。战斗结束时回复 4 点生命。' },
  chips: { ch: 'shenque', name: '三色筹码', icon: 'goldbag', rar: 'u', desc: '每场战斗第一次弃掉一张孤张后，再摸 1 张麻将牌。' },
  scorebook: { ch: 'shenque', name: '牌社记分簿', icon: 'b_dur', rar: 'r', desc: '每场战斗第一次结算过三种不同牌型时，得到 2 点能量，抽 2 张牌。' },
};
export const NEWSTATUS = {
  efocus: ['专注', '每回合开始再写入一次最新的元素', '#ffd060'], emaster: ['元素宗师', '每打出 1 张法术获得格挡', '#ffd060'], swordgen: ['剑阵', '每回合开始得到 1 把飞剑', '#9fd8ff'], zen: ['剑心通明', '每回合第一次切换剑势时抽牌', '#9fd8ff'], qiarmor: ['护体真气', '回合结束时按内力获得格挡', '#ffd890'],
  dscale: ['龙鳞', '霜龙形态下每回合开始获得格挡', '#c8f0ff'], dheart: ['龙心', '变身时得到能量', '#c8f0ff'], perma: ['永冻', '霜甲在回合开始时减半而不是清空', '#a8e8ff'],
  mbond: ['羁绊', '每回合开始团子回血', '#ffc0e0'], mpact: ['守护契约', '团子挡下的伤害一半变成米娅的格挡', '#ffc0e0'], batgen: ['蝠巢', '每回合开始得到 1 只蝙蝠', '#c080ff'], vhunger: ['饥渴', '每次吸血后获得格挡', '#ff5070'], undying: ['不死之身', '回合结束时花鲜血回血', '#ff5070'], riichi: ['立直', '每回合多摸 1 张麻将牌', '#90e0a0'],
  quick: ['快枪手', '每回合第 3 张攻击牌后得到能量', '#ffd060'], mheart: ['巫女之心', '每回合第 3 张技能牌后得到能量', '#ffd060'], torii: ['鸟居', '回合结束时结界不少于 3 层就获得格挡', '#ffd060'],
  loop: ['循环播放', '每回合第一次弃牌后抽牌', '#ffd060'], wnotes: ['学徒笔记', '每回合第一次用掉炼金瓶后抽牌', '#ffd060'], nshade: ['颠茄', '每回合开始给中毒最多的敌人加中毒', '#ffd060'], inferno: ['业火', '火焰瓶伤害增加', '#ff9050'],
  sword: ['飞剑', '每把让攻击牌的第一击 +2 伤害；可以被射出，每把造成 5 点伤害（最多 5 把）', '#9fd8ff'],
  qi: ['内力', '每回合开始 +1，由牌消耗（最多 12）', '#ffd890'],
  wind: ['疾风势', '切入时：本回合下一张攻击牌少 1 费', '#9fffd0'], mtn: ['破岳势', '切入时：本回合下一张攻击牌第一击 +4', '#ffb070'],
  dblood: ['龙血', '攒满 8 点后可以变身霜龙', '#ff9090'], dragon: ['霜龙形态', '变身时对所有敌人造成 10 点伤害；攻击牌第一击 +6；每个敌方回合第一段打穿格挡的伤害 -4。数字是剩余回合', '#c8f0ff'],
  frost: ['霜甲', '每层抵消 1 点打穿格挡的敌人攻击伤害，你的回合开始时清空', '#a8e8ff'],
  vblood: ['鲜血', '献血得到，由牌消耗（最多 12）', '#ff5070'], bat: ['蝙蝠', '不出猎时每回合结束给标记目标 1 层血痕；出猎时每只造成 7 点伤害；攒满 4 只时回合结束自动出猎', '#c080ff'],
  scar: ['血痕', '蝙蝠出猎时每层 +1 伤害（最多 4 层）', '#ff6080'],
  enote: ['元素笔记', '每回合第一次凑齐三种元素时抽牌', '#ffd060'], ecrown: ['三相冠冕', '每回合第一张三格相同的法术后获得格挡并抽牌', '#ffd060'], eseason: ['四季轮转', '每回合第二张不同配方的法术打出后全体受伤', '#ffd060'],
  qiflow: ['气走周天', '每回合第一次花内力时获得格挡', '#ffd890'], revqi: ['逆行经脉', '每回合第一次燃血额外得到内力并抽牌', '#ffd890'], dualst: ['双势归元', '一回合切入过两种势时得到能量并抽牌', '#ffd890'],
  fspine: ['冰晶脊', '每回合第一次获得霜甲时多得几层', '#a8e8ff'], aval: ['雪崩之心', '霜甲每个敌方回合第一次挡伤后反击 8 点', '#a8e8ff'], wake: ['冬眠苏醒', '退出霜龙形态的回合额外抽牌和格挡', '#a8e8ff'],
  mjump: ['练习跳台', '每种指令第一次执行时获得格挡', '#ffc0e0'], mgate: ['云猫守门', '团子护卫多挡 3 点，受伤后下回合抽牌', '#ffc0e0'],
  vpulse: ['夜行脉搏', '每回合第一次献血后获得格挡', '#ff5070'], vowb: ['血色誓约', '每回合第一次吸血后得到鲜血并抽牌', '#ff5070'], vdawn: ['血尽天明', '每回合第一次一口气花 4 点以上鲜血时得到能量和格挡', '#ff5070'],
  renzhuang: ['连庄', '每回合第一次结算后摸 1 张麻将牌', '#90e0a0'], sanyuan: ['大三元', '每回合第一个刻子、顺子额外加成', '#90e0a0'], menzen: ['门前清', '清一色、小胡额外伤害', '#90e0a0'],
};

/* ---------- 角色机制钩子（两个引擎在固定时机调用） ---------- */
export const MECH = {
  battleStart(g) { const p = P(g), R = g.R, c = R.char;
    if (c === 'erin') p.el = [...EL];
    if (c === 'gu') { p.st.wind = 1; if (g.has('swordtassel')) addSword(g, 1); }
    if (c === 'sylvie' && g.has('eggshard')) gainDB(g, 2);
    if (c === 'mia' && g.has('catbell')) { R.cat = R.cat || { lv: 1, pts: 0 }; const L = CATLV[R.cat.lv]; p.cat = { hp: L.max, max: L.max, atk: L.atk, cmd: 'guard', set: 0, did: {}, took: 0 }; }
    if (c === 'feiyue' && g.has('ribbon')) p.st.vblood = 2;
    if (c === 'shenque' && g.has('mjbox')) { p.pool = []; for (const s of 'msp') for (let n = 1; n <= 9; n++) p.pool.push(s + n, s + n, s + n); p.pool = shuf(p.pool); p.rack = []; p.mdisc = []; drawTile(g, 2); }
  },
  turnStart(g, first) { const p = P(g);
    for (const k of ['invN', 'gateT', 'noteT', 'spells', 'windT', 'mtnT', 'windDisc', 'mtnB', 'dualT', 'combo', 'burnT', 'qiT', 'frostT', 'donT', 'vpT', 'vowT', 'vdT', 'setT', 'patT', 'syT', 'syR', 'rzT', 'drawnT', 'avT', 'drHit', 'crT', 'skillN', 'fireN', 'wnT', 'discN', 'loopT', 'zenT']) delete p[k];
    if (p.st.efocus && p.el) { writeEl(g, p.el[2]); if (p.st.efocus > 1) g.block(3, true); }
    if (p.st.swordgen) { addSword(g, 1); if (p.st.swordgen > 1) g.block(2, true); }
    if (p.st.dscale && p.st.dragon) g.block(p.st.dscale, true);
    if (p.st.mbond && p.cat) healCat(g, p.st.mbond);
    if (p.st.batgen) { addBat(g, 1); if (p.st.batgen > 1) g.block(2, true); }
    if (p.st.riichi && p.rack && !first) { drawTile(g, 1); if (p.st.riichi > 1) g.block(2, true); }
    p.patBonus = 0;
    if (p.st.nshade) { const a = g.alive(); if (a.length) g.poison(a.reduce((m, e) => (e.st.poison || 0) > (m.st.poison || 0) ? e : m, a[0]), p.st.nshade); }
    if (p.eighth) { p.mdisc.push(p.eighth); p.eighth = null; }
    if (g.R.char === 'gu') gainQi(g, 1);
    if (p.st.perma && p.st.frost) { p.st.frost = p.st.perma > 1 ? Math.ceil(p.st.frost / 2) : Math.floor(p.st.frost / 2); if (!p.st.frost) delete p.st.frost; } else delete p.st.frost;
    if (p.st.dragon && !first) { p.st.dragon--; if (!p.st.dragon) { delete p.st.dragon; if (g.has('dayscale') && !p.dsU) { p.dsU = 1; gainDB(g, 3); } else g.self('weak', 1); if (p.st.wake) { g.draw(2); g.block(5, true); if (p.st.wake > 1) g.energy(1); } } }
    if (p.manualD) { g.draw(2); p.manualD = 0; }
    const c = p.cat; if (c) { c.set = 0; c.gB = 0; c.sR = 0; c.pB = 0; c.rB = 0; c.big = 0; c.twice = 0; c.took = c.tookN || 0; c.tookN = 0; if (!c.down) c.cmd = c.cmd === 'pounce' && g.alive().some(e => e.id === c.pt) ? 'pounce' : 'guard'; if (p.gateD) { g.draw(1); p.gateD = 0; } }
    if (p.lynxD) { p.lynxD = 0; g.draw(1); g.energy(1); }
    if (p.rack && !first) drawTile(g, 3);
  },
  /* 玩家回合结束、敌人行动前 */
  turnEnd(g) { const p = P(g), c = p.cat;
    if (c && !c.down) { const did = k => catDid(g, k);
      if (c.cmd === 'pounce') { const a = g.alive(), t = a.find(e => e.id === c.pt) || a[0]; if (t) { p.fh = 0; for (let n = 0; n < (c.twice ? 2 : 1); n++) { const a2 = g.alive(), t2 = t.dead ? a2[0] : t; if (!t2) break; if (c.big) g.attack(t2, c.big + (c.pB || 0), 2); else g.attack(t2, c.atk + (c.pB || 0)); } } did('pounce'); }
      else if (c.cmd === 'rest') { let n = 3 + (c.rB || 0); if (g.has('catbed') && !p.bedU) { p.bedU = 1; n += 4; } healCat(g, n); did('rest'); }
      else if (c.cmd === 'guard') c.guardOn = 1; }
    if (bats(g) >= 4) hunt(g); else if (bats(g)) { const t = markT(g); if (t) t.st.scar = Math.min(4, (t.st.scar || 0) + bats(g)); }
    if (p.st.torii && (p.st.kek || 0) >= 3) g.block(p.st.torii, true);
    if (p.st.qiarmor && p.st.qi) g.block(Math.floor(p.st.qi / 3) * p.st.qiarmor, true);
    if (p.st.undying && vb(g) >= 4) { spendB(g, 2); g.heal(3); }
    p.ePhase = 1;
  },
  /* 敌人攻击打到玩家：格挡之前（团子护卫） */
  preBlock(g, amt, e) { const p = P(g), c = p.cat;
    if (c && !c.down && c.cmd === 'guard' && c.guardOn && amt > 0) { c.guardOn = 0; const capN = 8 + (c.gB || 0) + (p.st.mgate ? 3 : 0), k = Math.min(amt, capN, c.hp); if (k > 0) { const hurtC = Math.max(0, Math.ceil(k / 2) - (c.sR || 0)); c.hp -= hurtC; c.tookN = (c.tookN || 0) + k; amt -= k; catDid(g, 'guard'); if (p.st.mpact) g.block(Math.floor(k / 2), true); g.note(`团子挡下 ${k}`); if (hurtC > 0 && p.st.mgate) p.gateD = 1; if (c.hp <= 0) { c.hp = 0; c.down = 1; g.note('团子倒下了'); } } }
    return amt; },
  /* 格挡之后（霜龙减伤、霜甲） */
  postBlock(g, left, e) { const p = P(g); if (left <= 0) return left;
    if (p.st.dragon && !p.drHit) { p.drHit = 1; left = Math.max(0, left - 4); }
    if (p.st.frost && left > 0) { const k = spendFrost(g, left); left -= k; if (k && p.st.aval && !p.avT && e && !e.dead) { p.avT = 1; g.hitE(e, 8); } }
    return left; },
  /* 攻击牌第一击的加成 */
  firstHit(g) { const p = P(g); let b = (p.st.sword || 0) * 2 + (p.mtnB || 0) + (p.st.dragon ? 6 : 0) + (p.fhx || 0); p.mtnB = 0; p.fhx = 0; return b; },
  costMod(g, d) { const p = P(g); let k = 0; if (d.type === 'atk' && p.windDisc) k--; if (d.invoke && g.has('oldstaff') && !p.staffU) k--; return k; },
  postPlay(g, d) { const p = P(g);
    if (d.type === 'skill' && !d.potion) { p.skillN = (p.skillN || 0) + 1; if (p.skillN === 3 && p.st.mheart) { g.energy(1); if (p.st.mheart > 1) g.draw(1); } }
    if (d.id === 'p_fire') p.fireN = (p.fireN || 0) + 1;
    if (d.potion && p.st.wnotes && !p.wnT) { p.wnT = 1; g.draw(p.st.wnotes); }
    if (d.type === 'atk' && p.windDisc) p.windDisc = 0;
    if (d.invoke && g.has('oldstaff')) p.staffU = 1;
    if (d.type === 'atk') { p.combo = (p.combo || 0) + 1; if (p.combo === 3 && p.st.quick) { g.energy(1); if (p.st.quick > 1) g.draw(1); } if (p.combo >= 3 && g.has('manual') && !p.manU) { p.manU = 1; p.manualD = 1; } }
    if (d.spell) { p.spells = p.spells || []; p.spells.push(d.id); p.spellB = p.spellB || []; if (!p.spellB.includes(d.id)) p.spellB.push(d.id);
      if (p.st.emaster) g.block(p.st.emaster, true);
      if (p.st.ecrown && !p.crT && ['sp_meteor', 'sp_mirror', 'sp_gate'].includes(d.id)) { p.crT = 1; g.block(p.st.ecrown, true); g.draw(1); }
      if (p.st.eseason && p.spells.length === 2 && p.spells[0] !== p.spells[1]) g.attackAll(7);
      if (g.has('prism') && !p.prU && p.spellB.length >= 2) { p.prU = 1; g.draw(2); g.energy(1); } }
  },
  /* 胜利后（团子成长） */
  victory(g) { const p = P(g), c = p.cat, R = g.R; if (!c || !R.cat) return null; if (!c.down && Object.keys(c.did).length >= 2) { R.cat.pts++; const lv = R.cat.pts >= 7 ? 3 : R.cat.pts >= 3 ? 2 : 1; const up = lv > R.cat.lv; R.cat.lv = lv; return up ? `团子长大了！（${lv} 级）` : '团子得到 1 点成长'; } return null; },
  /* 角色按钮 */
  actions(g) { const p = P(g), out = [], c = p.cat;
    if (c) { if (c.down) out.push({ id: 'x', label: '团子倒地', dis: 1 }); else for (const [k, n] of [['guard', '护卫'], ['pounce', '扑击'], ['rest', '休息']]) out.push({ id: 'cmd_' + k, label: n, on: c.cmd === k, dis: c.set && c.cmd !== k }); }
    if (g.R.char === 'sylvie') out.push({ id: 'drake', label: p.st.dragon ? `霜龙 ${p.st.dragon} 回合` : `变身（龙血 ${p.st.dblood || 0}/8）`, dis: p.st.dragon || (p.st.dblood || 0) < 8 || (p.drN || 0) >= 2, on: !!p.st.dragon });
    if (g.R.char === 'feiyue' && bats(g)) { const t = markT(g); out.push({ id: 'mark', label: `标记：${t ? t.d.name : '-'}` }); }
    return out; },
  /* 执行按钮：返回需要选目标的种类 */
  act(g, id, val) { const p = P(g), c = p.cat;
    if (id.startsWith('cmd_') && c && !c.down) { const k = id.slice(4); if (c.set && c.cmd !== k) return; if (k === 'pounce' && val == null) return 'enemy'; c.cmd = k; c.set = 1; if (k === 'pounce') c.pt = val; return; }
    if (id === 'drake' && (p.st.dblood || 0) >= 8 && !p.st.dragon && (p.drN || 0) < 2) { p.st.dragon = 3; delete p.st.dblood; p.drN = (p.drN || 0) + 1; if (p.st.dheart) g.energy(p.st.dheart); if (g.has('horn') && !p.hornU) { p.hornU = 1; g.block(8, true); } g.attackAll(10); g.note('霜龙形态！'); return; }
    if (id === 'mark') { if (val == null) return 'enemy'; p.mark = val; } },
  /* 机器人用的按钮策略 */
  bot(g, incoming) { const p = P(g), c = p.cat, a = g.alive(); if (!a.length) return;
    if (c && !c.down && !c.set) { const low = [...a].sort((x, y) => x.hp - y.hp)[0]; if (incoming >= 12 && c.hp > 3) MECH.act(g, 'cmd_guard'); else if (c.hp < c.max / 3 && incoming < 5) MECH.act(g, 'cmd_rest'); else MECH.act(g, 'cmd_pounce', low.id); }
    if (g.R.char === 'sylvie') MECH.act(g, 'drake');
    if (g.R.char === 'feiyue' && bats(g)) { const t = [...a].sort((x, y) => y.hp - x.hp)[0]; MECH.act(g, 'mark', t.id); } },
  /* 头顶显示：元素位、团子 */
  chips(g) { const p = P(g), out = [];
    if (p.el) out.push({ h: `${p.el.map(x => `<span class="el el${EL.indexOf(x)}">${x}</span>`).join('')} ➜ <span>${(NEWCARDS[RECIPE[elKey(p.el)]] || {}).name || ''}</span>`, c: '#ffb070', tip: '元素位：祈唤会得到箭头后面的法术' });
    if (p.cat) out.push({ h: p.cat.down ? '<span>团子倒地</span>' : `<span>团子</span> ${p.cat.hp}/${p.cat.max} · <span>${{ guard: '护卫', pounce: '扑击', rest: '休息' }[p.cat.cmd]}</span>`, c: '#ffc0e0', tip: `团子 ${g.R.cat ? g.R.cat.lv : 1} 级，攻击 ${p.cat.atk}` });
    return out; },
  rack(g) { const p = P(g); if (!p.rack) return null; const sorted = [...p.rack].sort(); return { tiles: sorted.map(tileName), eighth: p.eighth ? tileName(p.eighth) : null, pats: findPat(tiles(g), P(g).eighth).map(x => PATN[x.k]), pool: p.pool.length, set: !!p.setT }; },
};
