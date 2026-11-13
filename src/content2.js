// 内容扩充：新秘宝（含 Boss 秘宝）、新药水、新事件。
// 秘宝效果都写成钩子，挂在 MECH / CORE3 上，游戏和平衡模拟器共用同一份逻辑。
import { MECH, PW } from './chars.js?v=live2_11132500';
import { CORE3 } from './act3.js?v=live2_11132500';

let CB = null; /* 当前战斗 */
const has = id => !!(CB && CB.rel && CB.rel.includes(id));
const S = () => CB.r2;
const rint = n => Math.floor(Math.random() * n);

/* ---------- 秘宝 ---------- */
/* bs: 战斗开始(B,R)  ts: 回合开始(G,B,first)  te: 回合结束(G,B)  pp: 出牌后(G,B,d)  vic: 战斗胜利(G)
   atk: 你造成的伤害(amt,tgt,B)→amt  def: 你受到的攻击伤害(amt,B,R)→amt  kill: 打倒敌人(B)  pick: 拾取时(R) */
export const R2 = {
  /* 普通 */
  r_whistle: { name: '铜哨', icon: 'ic_bell', rar: 'c', desc: '战斗开始时获得 8 点格挡。', ts: (G, B, first) => { if (first) G.block(8, true); } },
  r_sugar: { name: '方糖', icon: 'meat', rar: 'c', desc: '每场战斗的第一回合多 1 点能量。', ts: (G, B, first) => { if (first) G.energy(1); } },
  r_whet: { name: '磨刀石', icon: 'sk_gsword', rar: 'c', desc: '每场战斗你的第一次攻击伤害 +6。', atk: (a, t, B) => { if (!S().whet) { S().whet = 1; return a + 6; } return a; } },
  r_amulet: { name: '护身符', icon: 'm_ward', rar: 'c', desc: '每场战斗你第一次受到的攻击伤害 -6。', def: (a, B) => { if (!S().amu) { S().amu = 1; return Math.max(0, a - 6); } return a; } },
  r_apple: { name: '红苹果', icon: 'meat', rar: 'c', desc: '战斗结束时回复 3 点生命。', vic: G => { G.R.hp = Math.min(G.R.maxHp, G.R.hp + 3); } },
  r_herbs: { name: '草药包', icon: 'sk_pouch', rar: 'c', desc: '拾取时最大生命 +7。', pick: R => { R.maxHp += 7; R.hp += 7; } },
  r_coin: { name: '幸运币', icon: 'goldbag', rar: 'c', desc: '每场战斗胜利额外获得 8 金币。', vic: G => { G.R.gold += 8; } },
  r_compass: { name: '指南针', icon: 'ic_orbit', rar: 'c', desc: '每第 3 回合开始时多抽 1 张牌。', ts: (G, B) => { if (B.turn % 3 === 0) G.draw(1); } },
  r_gloves: { name: '皮手套', icon: 'ic_palm', rar: 'c', desc: '每回合打出的第一张技能牌给你 3 点格挡。', pp: (G, B, d) => { if (d.type === 'skill' && S().glT !== B.turn) { S().glT = B.turn; G.block(3, true); } } },
  r_drum: { name: '小战鼓', icon: 'ic_drum', rar: 'c', desc: '每回合打出第 3 张攻击牌时，抽 1 张牌。', pp: (G, B, d) => { if (d.type !== 'atk') return; if (S().drT !== B.turn) { S().drT = B.turn; S().drN = 0; } if (++S().drN === 3) G.draw(1); } },
  r_icepack: { name: '冰袋', icon: 'ic_water', rar: 'c', desc: '战斗开始时，给予所有敌人 1 层虚弱。', bs: B => B.en.forEach(e => { e.st.weak = (e.st.weak || 0) + 1; }) },
  r_caltrop: { name: '铁蒺藜', icon: 'ic_mine', rar: 'c', desc: '战斗开始时，给予所有敌人 1 层易伤。', bs: B => B.en.forEach(e => { e.st.vuln = (e.st.vuln || 0) + 1; }) },
  r_teapot: { name: '旧茶壶', icon: 'pot', rar: 'c', desc: '回合结束时如果你没有格挡，获得 4 点格挡。', te: (G, B) => { if (!B.p.block) G.block(4, true); } },
  r_bread: { name: '黑面包', icon: 'meat', rar: 'c', desc: '拾取时回复 15 点生命，最大生命 +3。', pick: R => { R.maxHp += 3; R.hp = Math.min(R.maxHp, R.hp + 18); } },
  r_lamp: { name: '矿工灯', icon: 'ic_flame', rar: 'c', desc: '战斗开始时，你的第一回合多抽 1 张牌。', ts: (G, B, first) => { if (first) G.draw(1); } },
  /* 罕见 */
  r_shard: { name: '锋利石片', icon: 'ic_rapier', rar: 'u', desc: '你的每次攻击伤害 +1。', atk: a => a + 1 },
  r_opal: { name: '猫眼石', icon: 'ic_crystal', rar: 'u', desc: '每回合打出的第一张 0 费牌，抽 1 张牌。', pp: (G, B, d) => { if (d.cost && d.cost[0] === 0 && S().opT !== B.turn) { S().opT = B.turn; G.draw(1); } } },
  r_banner: { name: '战旗', icon: 'ic_gods', rar: 'u', desc: '精英和 Boss 战的第一回合，多 2 点能量、获得 10 点格挡。', ts: (G, B, first) => { if (first && (B.kind === 'elite' || B.kind === 'boss')) { G.energy(2); G.block(10, true); } } },
  r_soulgem: { name: '灵魂宝石', icon: 'ic_necro', rar: 'u', desc: '打倒敌人时得到 1 点能量（每回合 1 次）。', kill: B => { if (S().sgT !== B.turn) { S().sgT = B.turn; B.p.energy++; } } },
  r_rune: { name: '守护符文', icon: 'ic_rune', rar: 'u', desc: '回合结束时，最多 5 点格挡留到下回合。', te: (G, B) => { S().keep = Math.min(5, B.p.block || 0); }, ts: (G, B, first) => { if (!first && S().keep) { G.block(S().keep, true); S().keep = 0; } } },
  r_rage: { name: '怒火之心', icon: 'm_anger', rar: 'u', desc: '生命低于一半时，你的每次攻击伤害 +3。', atk: (a, t, B) => B.rr && B.rr.hp < B.rr.maxHp / 2 ? a + 3 : a },
  r_bracer: { name: '寒铁护腕', icon: 'b_armor', rar: 'u', desc: '回合开始时如果生命低于 30%，获得 10 点格挡。', ts: (G, B) => { if (B.rr && B.rr.hp < B.rr.maxHp * .3) G.block(10, true); } },
  r_ink: { name: '魔法墨水', icon: 'sk_orb', rar: 'u', desc: '每打出 5 张技能牌，抽 2 张牌。', pp: (G, B, d) => { if (d.type === 'skill' && ++S().inkN % 5 === 0) G.draw(2); } },
  r_shoes: { name: '弹簧鞋', icon: 'ic_stride', rar: 'u', desc: '每回合你的第一次攻击伤害 +3。', atk: (a, t, B) => { if (S().shT !== B.turn) { S().shT = B.turn; return a + 3; } return a; } },
  r_alch: { name: '炼金石', icon: 'ic_hexa', rar: 'u', desc: '战斗胜利时有 25% 几率得到一瓶药水。', vic: G => { if (Math.random() < .25) give(G.R); } },
  r_sand: { name: '时之沙', icon: 'ic_vortex', rar: 'u', desc: '每场战斗第 3 回合开始时，得到 2 点能量。', ts: (G, B) => { if (B.turn === 3) G.energy(2); } },
  r_star: { name: '星图', icon: 'ic_aura', rar: 'u', desc: '每场战斗你的生命第一次降到一半以下时，获得 12 点格挡和 1 点能量。', hurt: (B, R) => { if (!S().star && R.hp > 0 && R.hp < R.maxHp / 2) { S().star = 1; B.p.block += 12; S().starE = 1; } }, ts: G => { if (S().starE) { S().starE = 0; G.energy(1); } } },
  r_bell: { name: '银铃', icon: 'ic_bell', rar: 'u', desc: '每回合打出第 4 张牌时，得到 1 点能量。', pp: (G, B) => { if (S().blT !== B.turn) { S().blT = B.turn; S().blN = 0; } if (++S().blN === 4) G.energy(1); } },
  r_needle: { name: '毒针', icon: 'ic_stake', rar: 'u', desc: '战斗开始时，给予所有敌人 3 层中毒。', bs: B => B.en.forEach(e => { e.st.poison = (e.st.poison || 0) + 3; }) },
  r_medal: { name: '老兵勋章', icon: 'ic_gods', rar: 'u', desc: '精英和 Boss 战中，你的每次攻击伤害 +2。', atk: (a, t, B) => B.kind === 'elite' || B.kind === 'boss' ? a + 2 : a },
  /* 稀有 */
  r_kingblade: { name: '王者之剑', icon: 'sk_greatsword', rar: 'r', desc: '你的每次攻击伤害 +2。', atk: a => a + 2 },
  r_unbroken: { name: '不屈徽章', icon: 'p_tough', rar: 'r', desc: '每场战斗一次：受到致命的攻击时，改为留下 1 点生命。', def: (a, B, R) => { if (!S().unb && a - (B.p.block || 0) >= R.hp) { S().unb = 1; return Math.max(0, R.hp - 1 + (B.p.block || 0)); } return a; } },
  r_hourglass: { name: '永恒沙漏', icon: 'ic_vortex', rar: 'r', desc: '每第 3 回合开始时，多 1 点能量。', ts: (G, B) => { if (B.turn % 3 === 0) G.energy(1); } },
  r_sage: { name: '贤者之石', icon: 'ic_crystal', rar: 'r', desc: '每回合开始时多抽 1 张牌。', ts: G => G.draw(1) },
  r_tree: { name: '生命之树枝', icon: 'b_regen', rar: 'r', desc: '每回合结束时回复 1 点生命。', te: G => G.heal(1) },
  r_twin: { name: '双子星', icon: 'ic_aura', rar: 'r', desc: '每场战斗你的第一次攻击伤害翻倍。', atk: a => { if (!S().twin) { S().twin = 1; return a * 2; } return a; } },
  r_hammer: { name: '雷神之锤', icon: 'ic_thunder', rar: 'r', desc: '每回合结束时，对随机敌人造成 6 点伤害。', te: G => { const a = G.alive(); if (a.length) G.hit(a[rint(a.length)], 6); } },
  r_obsidian: { name: '黑曜石', icon: 'b_armor', rar: 'r', desc: '回合结束时，如果这回合没有打出攻击牌，获得 12 点格挡。', pp: (G, B, d) => { if (d.type === 'atk') S().obT = B.turn; }, te: (G, B) => { if (S().obT !== B.turn) G.block(12, true); } },
  r_dbone: { name: '龙骨护符', icon: 'ic_necro', rar: 'r', desc: '战斗开始时获得 2 点力量。', ts: (G, B, first) => { if (first) G.self('str', 2); } },
  r_mithril: { name: '秘银甲', icon: 'sk_hshield', rar: 'r', desc: '你受到的每次攻击伤害 -1。', def: a => Math.max(0, a - 1) },
  /* Boss 秘宝：打完前两章 Boss 和开发者后三选一，强但有代价 */
  b_core: { name: '熔火之心', icon: 'ic_flame', rar: 'boss', desc: '每回合多 1 点能量。营火不能再休息回血。', ts: G => G.energy(1) },
  b_bell: { name: '沉默之钟', icon: 'ic_bell', rar: 'boss', desc: '每回合多 1 点能量。每场战斗开始时，一张「懊悔」混进你的抽牌堆。', ts: (G, B, first) => { G.energy(1); if (first) G.addCard('regret', 0, 'draw'); } },
  b_scale: { name: '命运天平', icon: 'ic_hexa', rar: 'boss', desc: '每回合多 1 点能量。每回合开始时随机弃掉 1 张手牌。', ts: (G, B) => { G.energy(1); if (B.hand.length) { const c = B.hand.splice(rint(B.hand.length), 1)[0]; B.disc.push(c); } } },
  b_mask: { name: '狂战面具', icon: 'p_berserk', rar: 'boss', desc: '你的每次攻击伤害 +3。每回合开始时失去 1 点生命。', atk: a => a + 3, ts: G => G.loseHp(1) },
  b_frozen: { name: '冰封之心', icon: 'ic_water', rar: 'boss', desc: '每回合多 1 点能量。敌人生命 +10%。', ts: G => G.energy(1), bs: B => B.en.forEach(e => { e.max = Math.round(e.max * 1.1); e.hp = Math.round(e.hp * 1.1); }) },
  b_star: { name: '黑星', icon: 'ic_aura', rar: 'boss', desc: '精英战胜利后额外掉落一个秘宝。' },
  b_cards: { name: '群星画卷', icon: 'p_arc', rar: 'boss', desc: '卡牌奖励多 1 张可选。' },
  b_giant: { name: '巨人之心', icon: 'm_blood', rar: 'boss', desc: '拾取时最大生命 +25。每场战斗第一回合少 1 点能量。', pick: R => { R.maxHp += 25; R.hp += 25; }, ts: (G, B, first) => { if (first) G.energy(-1); } },
  b_tome: { name: '禁忌之书', icon: 'sk_orb', rar: 'boss', desc: '每回合多抽 2 张牌。每回合结束时失去 1 点生命。', ts: G => G.draw(2), te: G => G.loseHp(1) },
  b_lens: { name: '时光透镜', icon: 'ic_orbit', rar: 'boss', desc: '每场战斗第一回合多 2 点能量、多抽 2 张牌。精英和 Boss 生命 +10%。', ts: (G, B, first) => { if (first) { G.energy(2); G.draw(2); } }, bs: B => { if (B.kind !== 'fight') B.en.forEach(e => { e.max = Math.round(e.max * 1.1); e.hp = Math.round(e.hp * 1.1); }); } },
};
let POOL = ['heal'];
export const setPotPool = ks => { POOL = ks; };
function give(R) { const L = R.potions || R.pots; if (L && L.length < 3) L.push(POOL[rint(POOL.length)]); }

const each = (k, ...a) => { if (!CB || !CB.rel) return; for (const id of CB.rel) { const r = R2[id]; if (r && r[k]) r[k](...a); } };
const fold = (k, v, ...a) => { if (!CB || !CB.rel) return v; for (const id of CB.rel) { const r = R2[id]; if (r && r[k]) v = r[k](v, ...a); } return v; };

/* 挂钩子 */
{ const o = CORE3.battleStart; CORE3.battleStart = (B, h, R) => { o(B, h, R); CB = B; B.rel = R.relics; B.rr = R; B.r2 = { inkN: 0 }; each('bs', B, R); }; }
{ const o = CORE3.pre; CORE3.pre = (B, tgt, amt, isP, attacker, hs) => { amt = o(B, tgt, amt, isP, attacker, hs); if (amt <= 0 || !B.r2) return amt;
  if (!isP && attacker === B.p) amt = fold('atk', amt, tgt, B); else if (isP && attacker && attacker !== B.p) amt = fold('def', amt, B, B.rr); return amt; }; }
{ const o = CORE3.after; CORE3.after = (tgt, left, isP, attacker, B) => { o(tgt, left, isP, attacker, B); if (!B.r2) return; if (isP) each('hurt', B, B.rr); else if (tgt.hp <= 0) each('kill', B); }; }
const pw = (k, G, ...a) => { if (!CB) return; const st = CB.p.st; for (const id of Object.keys(st)) { const h = PW[id]; if (h && h[k] && st[id]) h[k](G, st[id], ...a); } };
{ const o = MECH.turnStart; MECH.turnStart = (G, first) => { o(G, first); if (CB) { CB.p.shotN = 0; CB.p.kotoB = 0; CB.p.kotoS = 0; } each('ts', G, CB, first); pw('ts', G); }; }
{ const o = MECH.turnEnd; MECH.turnEnd = G => { o(G); each('te', G, CB); pw('te', G); }; }
{ const o = MECH.postPlay; MECH.postPlay = (G, d) => { o(G, d); each('pp', G, CB, d); pw('pp', G, d); if (CB && CB.p.kotoB && d.type === 'skill') { if (CB.p.kotoS) CB.p.kotoS = 0; else G.block(CB.p.kotoB, true); } }; }
{ const o = MECH.victory; MECH.victory = (G, kind) => { const m = o(G, kind); each('vic', G); return m; }; }

/* ---------- 药水 ---------- */
export const P2 = {
  bigheal: { name: '大治疗药水', icon: 'pot', rar: 'u', tgt: 'self', desc: '回复 30% 最大生命。', use: g => g.heal(Math.floor(g.R.maxHp * .3)) },
  toxin: { name: '毒雾药水', icon: 'ic_stake', rar: 'c', tgt: 'all', desc: '给予所有敌人 6 层中毒。', use: g => g.applyAll('poison', 6) },
  vulnp: { name: '破甲药水', icon: 'ic_mine', rar: 'c', tgt: 'all', desc: '给予所有敌人 3 层易伤。', use: g => g.applyAll('vuln', 3) },
  metalp: { name: '铁皮药水', icon: 'b_armor', rar: 'c', tgt: 'self', desc: '本场战斗每回合结束获得 4 点格挡。', use: g => g.self('metal', 4) },
  bolt: { name: '闪电药水', icon: 'ic_thunder', rar: 'c', tgt: 'all', desc: '对随机敌人造成 3 次 8 点伤害。', use: g => { for (let k = 0; k < 3; k++) { const a = g.alive(); if (a.length) g.hit(a[rint(a.length)], 8); } } },
  essence: { name: '精华药水', icon: 'sk_orb', rar: 'c', tgt: 'self', desc: '获得 1 点能量，抽 2 张牌。', use: g => { g.energy(1); g.draw(2); } },
  guard: { name: '守护药水', icon: 'sk_hshield', rar: 'u', tgt: 'self', desc: '获得 20 点格挡。', use: g => g.block(20, true) },
  rage: { name: '狂暴药水', icon: 'p_berserk', rar: 'u', tgt: 'self', desc: '本场战斗获得 3 点力量，失去 5 点生命。', use: g => { g.self('str', 3); g.loseHp(5); } },
  swift: { name: '灵巧药水', icon: 'ic_stride', rar: 'u', tgt: 'self', desc: '抽 5 张牌。', use: g => g.draw(5) },
  fear: { name: '恐惧药水', icon: 'b_curse', rar: 'c', tgt: 'all', desc: '给予所有敌人 2 层虚弱和 2 层易伤。', use: g => { g.applyAll('weak', 2); g.applyAll('vuln', 2); } },
  holy: { name: '圣水', icon: 'holywater', rar: 'u', tgt: 'one', desc: '对一个敌人造成 35 点伤害。', use: (g, t) => g.hit(t, 35) },
  goldp: { name: '炼金药水', icon: 'goldbag', rar: 'c', tgt: 'self', desc: '获得 40 金币。', use: g => { g.R.gold += 40; } },
  time: { name: '时间药水', icon: 'ic_vortex', rar: 'r', tgt: 'self', desc: '获得 3 点能量。', use: g => g.energy(3) },
  snake: { name: '蛇油', icon: 'm_blood', rar: 'r', tgt: 'self', desc: '最大生命 +5，回复 5 点生命。', use: g => { g.R.maxHp += 5; g.R.hp = Math.min(g.R.maxHp, g.R.hp + 5); } },
  steam: { name: '蒸汽药水', icon: 'ic_water', rar: 'c', tgt: 'all', desc: '对所有敌人造成 6 点伤害，并给予 1 层易伤。', use: g => g.eachEnemy(e => { g.hit(e, 6); if (!e.dead) g.apply(e, 'vuln', 1); }) },
};

/* ---------- 事件 ---------- */
export const EV1B = [
  { title: '迷路的商队', pic: 'caravan', img: 'goldbag', text: '一辆翻倒的马车挡在路中间，车夫正手忙脚乱地捡散落的货物。',
    opts: [
      { t: '帮他把车扶起来：失去 6 生命，获得 75 金币', go: (R, A) => { A.hurt(6); A.gold(75); return '车夫千恩万谢，硬塞给你一袋金币。'; } },
      { t: '顺手拿走一瓶药水', go: (R, A) => `你从散落的货物里拣了一瓶：${A.potion()}。` },
      { t: '离开', go: () => '你绕开马车，继续赶路。' }] },
  { title: '林间泉水', pic: 'spring', img: 'pot', text: '树林深处有一汪清澈的泉水，水面映着奇异的微光。',
    opts: [
      { t: '喝一口：回复 20 生命', go: (R, A) => { A.heal(20); return '泉水甘甜，伤口的疼痛减轻了不少。'; } },
      { t: '泡个澡：最大生命 +4', go: (R, A) => { A.maxHp(4); return '你感觉身体比以前结实了一点。'; } }] },
  { title: '训练场', pic: 'smith', img: 'ic_sword', text: '一个废弃的哥布林训练场，木桩上还插着几把生锈的刀。',
    opts: [
      { t: '练习一下：升级 2 张牌，失去 8 生命', go: (R, A) => { A.hurt(8); A.pick('upgrade', 2); return '一番苦练，你的招式更熟练了。'; } },
      { t: '只练一会儿：升级 1 张牌', go: (R, A) => { A.pick('upgrade', 1); return '你挥了几下，找到了一点手感。'; } },
      { t: '离开', go: () => '你没有时间练习。' }] },
  { title: '神秘赌徒', pic: 'gambler', img: 'p_gamble', text: '一个戴着高帽的赌徒拦住你：「猜硬币，赢了翻倍。」',
    opts: [
      { t: '押 50 金币', ok: R => R.gold >= 50, go: (R, A) => { if (Math.random() < .5) { A.gold(50); return '正面！你赢了 50 金币。'; } A.gold(-50); return '反面……你输掉了 50 金币。'; } },
      { t: '拒绝', go: () => '赌徒耸耸肩，消失在人群里。' }] },
  { title: '遗弃的营地', pic: 'wagon', img: 'box', text: '一处被匆忙遗弃的营地，篝火还冒着烟。',
    opts: [
      { t: '翻找物资：得到一个秘宝，但混进一张「懊悔」', go: (R, A) => { const n = A.relic(); A.curse('regret'); return `你找到了：${n}。可心里总觉得不踏实。`; } },
      { t: '在火边休息：回复 12 生命', go: (R, A) => { A.heal(12); return '你在温暖的火边打了个盹。'; } }] },
  { title: '流浪画师', pic: 'den', img: 'p_arc', text: '一个流浪画师在路边作画：「给我讲讲你的故事，我送你一幅画。」',
    opts: [
      { t: '讲讲你的旅途：选一张牌加入牌组', go: (R, A) => { A.card(); return '画师听得入迷，把画好的牌送给了你。'; } },
      { t: '请他把你的牌画掉一张：删除 1 张牌', go: (R, A) => { A.pick('remove', 1); return '一笔下去，那张牌从你的记忆里淡去了。'; } }] },
];
export const EV2B = [
  { title: '月下的祭坛', pic: 'altar', img: 'm_blood', text: '月光照在一座染血的祭坛上，祭坛上刻着「以血换力」。',
    opts: [
      { t: '献上鲜血：失去 12 生命，得到一张稀有牌', go: (R, A) => { A.hurt(12); A.rareCard(); return '祭坛吸走了你的血，一张发光的牌浮了起来。'; } },
      { t: '献上金币：失去 80 金币，得到一个秘宝', ok: R => R.gold >= 80, go: (R, A) => { A.gold(-80); return `祭坛收下了金币，留给你：${A.relic()}。`; } },
      { t: '离开', go: () => '你不想和这种东西扯上关系。' }] },
  { title: '古堡图书馆', pic: 'c2_study', img: 'sk_orb', text: '落满灰尘的书架上，有几本书还散发着魔力。',
    opts: [
      { t: '研读魔法书：升级 2 张牌', go: (R, A) => { A.pick('upgrade', 2); return '你从书里学到了新的技巧。'; } },
      { t: '撕掉一页诅咒：删除 1 张牌，失去 5 生命', go: (R, A) => { A.hurt(5); A.pick('remove', 1); return '纸页在你手中燃成了灰。'; } }] },
  { title: '吸血鬼的晚宴', pic: 'dinner', img: 'meat', text: '一张长桌摆满了佳肴，主位上的座位空着。',
    opts: [
      { t: '大吃一顿：回复全部生命，混进一张「懊悔」', go: (R, A) => { A.heal(999); A.curse('regret'); return '你吃得心满意足，却总觉得有人在看着你。'; } },
      { t: '只拿一瓶酒：得到一瓶药水', go: (R, A) => `你顺走了一瓶：${A.potion()}。` },
      { t: '离开', go: () => '你没有碰任何东西。' }] },
  { title: '镜中的自己', pic: 'c2_mirror', img: 'ic_crystal', text: '镜子里的你在微笑，可你并没有笑。',
    opts: [
      { t: '伸手触碰：最大生命 +8，失去 15 金币', go: (R, A) => { A.maxHp(8); A.gold(-Math.min(15, R.gold)); return '镜中人和你交换了什么东西。'; } },
      { t: '打碎镜子：失去 6 生命，选一张牌', go: (R, A) => { A.hurt(6); A.card(); return '碎片里映出一张牌的影子。'; } }] },
  { title: '受伤的骑士', pic: 'c2_coffin', img: 'b_armor', text: '一名受伤的骑士靠在墙边：「帮帮我……我会报答你。」',
    opts: [
      { t: '给他一瓶药：失去一瓶药水，得到一个秘宝', ok: R => (R.potions || []).length > 0, go: (R, A) => { R.potions.pop(); return `骑士把他的护身符送给了你：${A.relic()}。`; } },
      { t: '包扎伤口：失去 6 生命，获得 60 金币', go: (R, A) => { A.hurt(6); A.gold(60); return '骑士把钱袋塞给了你。'; } },
      { t: '离开', go: () => '你默默走开了。' }] },
];
export const EV3B = [
  { title: '冰封的勇者', pic: 'c3_frozen', img: 'ic_water', text: '冰层里冻着一个持剑的勇者，他的剑还闪着光。',
    opts: [
      { t: '凿开冰层：失去 10 生命，得到一张稀有牌', go: (R, A) => { A.hurt(10); A.rareCard(); return '冰裂开的瞬间，勇者的剑意流进了你的牌里。'; } },
      { t: '祈祷后离开：回复 10 生命', go: (R, A) => { A.heal(10); return '你向勇者行了一礼，心里安定了许多。'; } }] },
  { title: '龙之宝库', pic: 'c3_hoard', img: 'goldbag', text: '一座小小的龙之宝库，主人似乎刚刚离开。',
    opts: [
      { t: '拿一把金币：获得 100 金币', go: (R, A) => { A.gold(100); return '金币叮当作响，你赶紧离开了。'; } },
      { t: '拿走最亮的那件：得到一个秘宝，失去 12 生命', go: (R, A) => { A.hurt(12); return `宝物上有龙的诅咒，烫伤了你的手，但你还是拿到了：${A.relic()}。`; } },
      { t: '什么都不拿', go: () => '你不想惹怒一条龙。' }] },
  { title: '雪山温泉', pic: 'c3_spring', img: 'pot', text: '雪地里冒着热气的温泉，四周格外安静。',
    opts: [
      { t: '泡一会儿：回复 25 生命', go: (R, A) => { A.heal(25); return '冻僵的身体终于暖和起来。'; } },
      { t: '在泉边冥想：升级 2 张牌', go: (R, A) => { A.pick('upgrade', 2); return '你在热气里理清了思路。'; } }] },
  { title: '龙蛋', pic: 'c3_nest', img: 'ic_crystal', text: '巢里躺着一颗还温热的龙蛋。',
    opts: [
      { t: '带走它：最大生命 +6', go: (R, A) => { A.maxHp(6); return '龙蛋在你怀里轻轻跳动，好像在给你力量。'; } },
      { t: '卖给隐士：获得 70 金币', go: (R, A) => { A.gold(70); return '隐士眼睛一亮，爽快地付了钱。'; } }] },
  { title: '雪中隐士', pic: 'c3_hermit', img: 'p_arc', text: '一个隐士在雪中打坐：「你的牌组太重了，年轻人。」',
    opts: [
      { t: '请教：删除 2 张牌', go: (R, A) => { A.pick('remove', 2); return '隐士帮你去掉了多余的东西。'; } },
      { t: '买他的药：失去 40 金币，得到一瓶药水', ok: R => R.gold >= 40, go: (R, A) => { A.gold(-40); return `隐士递给你：${A.potion()}。`; } }] },
];
