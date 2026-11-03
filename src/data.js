// 数据：卡牌 / 遗物 / 敌人 / 遭遇 / 事件
// 卡牌 play(g,u,t)：g=战斗接口，u=是否升级(0/1)，t=目标敌人
const I = n => `assets/icons/${n}.png`;
const v = (u, a, b) => (u ? b : a);

export const CARDS = {
  // ---- 初始 ----
  strike: { name: '砍击', type: 'atk', rar: 'start', cost: [1, 1], icon: 'ic_sword', tgt: 'one',
    desc: u => `造成 ${v(u, 6, 9)} 点伤害。`, play: (g, u, t) => g.attack(t, v(u, 6, 9)) },
  defend: { name: '格挡', type: 'skill', rar: 'start', cost: [1, 1], icon: 'p_tough', tgt: 'self',
    desc: u => `获得 ${v(u, 5, 8)} 点格挡。`, play: (g, u) => g.block(v(u, 5, 8)) },
  bash: { name: '重锤', type: 'atk', rar: 'start', cost: [2, 2], icon: 'ic_hammer', tgt: 'one',
    desc: u => `造成 ${v(u, 8, 10)} 点伤害，给予 ${v(u, 2, 3)} 层易伤。`,
    play: (g, u, t) => { g.attack(t, v(u, 8, 10)); g.apply(t, 'vuln', v(u, 2, 3)); } },
  // ---- 普通 ----
  cleave: { name: '横扫', type: 'atk', rar: 'c', cost: [1, 1], icon: 'sk_greatsword', tgt: 'all',
    desc: u => `对所有敌人造成 ${v(u, 8, 11)} 点伤害。`, play: (g, u) => g.attackAll(v(u, 8, 11)) },
  twin: { name: '双斩', type: 'atk', rar: 'c', cost: [1, 1], icon: 'sk_gsword', tgt: 'one',
    desc: u => `造成 ${v(u, 5, 7)} 点伤害 2 次。`, play: (g, u, t) => g.attack(t, v(u, 5, 7), 2) },
  pierce: { name: '长枪突刺', type: 'atk', rar: 'c', cost: [1, 1], icon: 'sk_rapier', tgt: 'one',
    desc: u => `造成 ${v(u, 9, 10)} 点伤害。抽 ${v(u, 1, 2)} 张牌。`,
    play: (g, u, t) => { g.attack(t, v(u, 9, 10)); g.draw(v(u, 1, 2)); } },
  knives: { name: '飞刀连掷', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_orbit', tgt: 'all',
    desc: u => `随机对敌人造成 3 点伤害 ${v(u, 3, 4)} 次。`, play: (g, u) => g.attackRandom(3, v(u, 3, 4)) },
  anger: { name: '怒斩', type: 'atk', rar: 'c', cost: [0, 0], icon: 'm_anger', tgt: 'one',
    desc: u => `造成 ${v(u, 6, 8)} 点伤害。将一张此牌的复制放入弃牌堆。`,
    play: (g, u, t, c) => { g.attack(t, v(u, 6, 8)); g.addCard(c.id, c.up, 'discard'); } },
  quake: { name: '震地', type: 'atk', rar: 'c', cost: [1, 1], icon: 'ic_stake', tgt: 'all',
    desc: u => `对所有敌人造成 ${v(u, 4, 7)} 点伤害，并给予 1 层易伤。`,
    play: (g, u) => { g.attackAll(v(u, 4, 7)); g.applyAll('vuln', 1); } },
  quickshot: { name: '速射', type: 'atk', rar: 'c', cost: [0, 0], icon: 'ic_bow', tgt: 'one',
    desc: u => `造成 ${v(u, 3, 5)} 点伤害。抽 1 张牌。`,
    play: (g, u, t) => { g.attack(t, v(u, 3, 5)); g.draw(1); } },
  boomer: { name: '回旋镖', type: 'atk', rar: 'c', cost: [2, 2], icon: 'ic_boomer', tgt: 'one',
    desc: u => `造成 ${v(u, 12, 14)} 点伤害，给予 ${v(u, 2, 3)} 层虚弱。`,
    play: (g, u, t) => { g.attack(t, v(u, 12, 14)); g.apply(t, 'weak', v(u, 2, 3)); } },
  slam: { name: '盾击', type: 'atk', rar: 'c', cost: [1, 0], icon: 'sk_hshield', tgt: 'one',
    desc: () => `造成等同于你当前格挡值的伤害。`, play: (g, u, t) => g.attack(t, g.p.block) },
  shrug: { name: '铁壁', type: 'skill', rar: 'c', cost: [1, 1], icon: 'ic_barrier', tgt: 'self',
    desc: u => `获得 ${v(u, 8, 11)} 点格挡。抽 1 张牌。`, play: (g, u) => { g.block(v(u, 8, 11)); g.draw(1); } },
  stride: { name: '疾步', type: 'skill', rar: 'c', cost: [0, 0], icon: 'ic_stride', tgt: 'self',
    desc: u => `获得 ${v(u, 3, 5)} 点格挡。抽 1 张牌。`, play: (g, u) => { g.block(v(u, 3, 5)); g.draw(1); } },
  // ---- 罕见 ----
  blood: { name: '鲜血斩', type: 'atk', rar: 'u', cost: [1, 1], icon: 'm_blood', tgt: 'one',
    desc: u => `失去 2 点生命。造成 ${v(u, 15, 20)} 点伤害。`,
    play: (g, u, t) => { g.loseHp(2); g.attack(t, v(u, 15, 20)); } },
  exec: { name: '处决', type: 'atk', rar: 'u', cost: [2, 2], icon: 'p_exec', tgt: 'one',
    desc: u => `造成 14 点伤害。力量对此牌生效 ${v(u, 3, 5)} 倍。`,
    play: (g, u, t) => g.attack(t, 14, 1, v(u, 3, 5)) },
  vamp: { name: '吸血斩', type: 'atk', rar: 'u', cost: [2, 2], icon: 'b_vamp', tgt: 'all', exhaust: 1,
    desc: u => `对所有敌人造成 ${v(u, 4, 5)} 点伤害，回复等同于未被格挡伤害的生命。消耗。`,
    play: (g, u) => g.heal(g.attackAll(v(u, 4, 5))) },
  keg: { name: '炸药桶', type: 'atk', rar: 'u', cost: [2, 2], icon: 'sk_keg', tgt: 'all', exhaust: 1,
    desc: u => `对所有敌人造成 ${v(u, 14, 18)} 点伤害。消耗。`, play: (g, u) => g.attackAll(v(u, 14, 18)) },
  drum: { name: '战吼', type: 'skill', rar: 'u', cost: [0, 0], icon: 'ic_drum', tgt: 'self',
    desc: u => `抽 ${v(u, 3, 4)} 张牌。本回合不能再抽牌。`,
    play: (g, u) => { g.draw(v(u, 3, 4)); g.p.noDraw = 1; } },
  bloodlet: { name: '嗜血', type: 'skill', rar: 'u', cost: [0, 0], icon: 'sk_bmist', tgt: 'self',
    desc: u => `失去 3 点生命。获得 ${v(u, 2, 3)} 点能量。`, play: (g, u) => { g.loseHp(3); g.energy(v(u, 2, 3)); } },
  intim: { name: '恐吓', type: 'skill', rar: 'u', cost: [0, 0], icon: 'p_hunt', tgt: 'self', exhaust: 1,
    desc: u => `给予所有敌人 ${v(u, 1, 2)} 层虚弱。消耗。`, play: (g, u) => g.applyAll('weak', v(u, 1, 2)) },
  ward: { name: '圣光庇护', type: 'skill', rar: 'u', cost: [2, 1], icon: 'm_ward', tgt: 'self',
    desc: () => `将你的格挡值翻倍。`, play: g => g.block(g.p.block, true) },
  refocus: { name: '重整', type: 'skill', rar: 'u', cost: [1, 0], icon: 'b_cd', tgt: 'self', exhaust: 1,
    desc: () => `获得 2 点能量。消耗。`, play: g => g.energy(2) },
  inflame: { name: '蛮力', type: 'power', rar: 'u', cost: [1, 1], icon: 'b_atk', tgt: 'self',
    desc: u => `获得 ${v(u, 2, 3)} 点力量。`, play: (g, u) => g.self('str', v(u, 2, 3)) },
  metal: { name: '金属化', type: 'power', rar: 'u', cost: [1, 1], icon: 'b_armor', tgt: 'self',
    desc: u => `每回合结束时，获得 ${v(u, 3, 4)} 点格挡。`, play: (g, u) => g.self('metal', v(u, 3, 4)) },
  dexp: { name: '灵巧', type: 'power', rar: 'u', cost: [1, 1], icon: 'p_dodge', tgt: 'self',
    desc: u => `获得 ${v(u, 2, 3)} 点敏捷。`, play: (g, u) => g.self('dex', v(u, 2, 3)) },
  thorns: { name: '尖刺护甲', type: 'power', rar: 'u', cost: [1, 1], icon: 'sk_trap', tgt: 'self',
    desc: u => `获得 ${v(u, 3, 5)} 层荆棘（被攻击时反伤）。`, play: (g, u) => g.self('thorns', v(u, 3, 5)) },
  // ---- 稀有 ----
  whirl: { name: '连弩齐射', type: 'atk', rar: 'r', cost: ['X', 'X'], icon: 'ic_xbow', tgt: 'all',
    desc: u => `对所有敌人造成 ${v(u, 5, 8)} 点伤害 X 次。`, play: (g, u) => g.attackAll(v(u, 5, 8), g.x) },
  thunder: { name: '雷霆一击', type: 'atk', rar: 'r', cost: [3, 3], icon: 'ic_thunder', tgt: 'one',
    desc: u => `造成 ${v(u, 32, 42)} 点伤害。`, play: (g, u, t) => g.attack(t, v(u, 32, 42)) },
  offer: { name: '献祭', type: 'skill', rar: 'r', cost: [0, 0], icon: 'sk_undead', tgt: 'self', exhaust: 1,
    desc: u => `失去 6 点生命。获得 2 点能量，抽 ${v(u, 3, 5)} 张牌。消耗。`,
    play: (g, u) => { g.loseHp(6); g.energy(2); g.draw(v(u, 3, 5)); } },
  berserk: { name: '狂暴', type: 'power', rar: 'r', cost: [3, 3], icon: 'p_berserk', tgt: 'self',
    desc: u => `每回合开始时，获得 ${v(u, 2, 3)} 点力量。`, play: (g, u) => g.self('rage', v(u, 2, 3)) },
  fortress: { name: '不动如山', type: 'power', rar: 'r', cost: [3, 2], icon: 'sk_golem', tgt: 'self',
    desc: () => `格挡不再在回合开始时消失。`, play: g => g.self('keep', 1) },
  regen: { name: '生命之泉', type: 'power', rar: 'r', cost: [1, 1], icon: 'b_regen', tgt: 'self',
    desc: u => `每回合结束时，回复 ${v(u, 2, 3)} 点生命。`, play: (g, u) => g.self('regen', v(u, 2, 3)) },
};
for (const [k, c] of Object.entries(CARDS)) { c.id = k; c.img = I(c.icon); }
export const STARTER = ['strike', 'strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'bash'];

export const RELICS = {
  gameboy: { name: '掌机', icon: 'gb', rar: 'start', desc: '战斗结束时，回复 6 点生命。' },
  charm: { name: '蛮力护符', icon: 'b_atk', rar: 'c', desc: '每场战斗开始时，获得 1 点力量。' },
  anchor: { name: '铁甲', icon: 'b_armor', rar: 'c', desc: '每场战斗第一回合，获得 10 点格挡。' },
  hourglass: { name: '沙漏', icon: 'b_cd', rar: 'c', desc: '每场战斗第一回合，获得 1 点额外能量。' },
  clover: { name: '四叶草', icon: 'b_luck', rar: 'c', desc: '战斗胜利后，额外获得 15 金币。' },
  fang: { name: '吸血獠牙', icon: 'b_vamp', rar: 'c', desc: '每击杀一个敌人，回复 3 点生命。' },
  herb: { name: '再生药剂', icon: 'b_regen', rar: 'c', desc: '拾取时，最大生命 +10。' },
  scroll: { name: '卷轴', icon: 'b_dur', rar: 'u', desc: '每场战斗开始时，额外抽 2 张牌。' },
  quiver: { name: '箭袋', icon: 'b_amt', rar: 'u', desc: '每打出 3 张攻击牌，对所有敌人造成 5 点伤害。' },
  wardrum: { name: '战鼓', icon: 'ic_drum', rar: 'u', desc: '每场战斗开始时，给予所有敌人 1 层易伤。' },
  dice: { name: '幸运骰', icon: 'p_gamble', rar: 'u', desc: '每场战斗开始时，随机一张手牌本场战斗耗能变为 0。' },
  spikes: { name: '尖刺', icon: 'sk_trap', rar: 'u', desc: '每场战斗开始时，获得 3 层荆棘。' },
  feather: { name: '凤凰羽', icon: 'p_rev', rar: 'r', desc: '死亡时，复活并回复 50% 生命（一次）。' },
  crown: { name: '王冠', icon: 'm_crown', rar: 'r', desc: '每回合开始时，获得 1 点额外能量。' },
};
for (const [k, r] of Object.entries(RELICS)) { r.id = k; r.img = I(r.icon); }

export const STATUS = {
  str: ['力量', '攻击伤害增加', '#e05a3a'], dex: ['敏捷', '获得的格挡增加', '#5ab45a'],
  vuln: ['易伤', '受到的攻击伤害 +50%', '#c070e0'], weak: ['虚弱', '造成的攻击伤害 -25%', '#7a90c0'],
  metal: ['金属化', '回合结束获得格挡', '#aaaaaa'], thorns: ['荆棘', '被攻击时反伤', '#c08a40'],
  rage: ['狂暴', '回合开始获得力量', '#ff4040'], keep: ['不动如山', '格挡不消失', '#d0b060'],
  regen: ['再生', '回合结束回复生命', '#50d080'], enrage: ['激怒', '你每打出一张技能牌，它获得力量', '#ff7030'],
  ritual: ['战意', '回合结束获得力量', '#ff9050'], fuse: ['引信', '归零时自爆', '#ffcc00'],
  heal: ['自愈', '回合结束回复生命', '#50d080'], aegis: ['圣盾', '免疫所有伤害', '#ffe070'],
};

// ---- 敌人 ----
// moves: {n 名称, i 意图(atk/def/buff/debuff/atkdef/atkdebuff/summon/unknown), d 伤害, x 次数, f(e,B) 额外效果}
const pick = (e, opts) => { // 避免同一招连用 3 次
  let o; for (let k = 0; k < 10; k++) { o = opts[Math.floor(Math.random() * opts.length)]; if (!(e.hist.at(-1) === o && e.hist.at(-2) === o)) break; } return o;
};
const cycle = (e, list) => list[e.turn % list.length];
export const ENEMIES = {
  goblin: { name: '哥布林小兵', hp: [12, 16], sc: 2.6, hd: 225,
    moves: { poke: { n: '戳刺', i: 'atk', d: 6 }, rock: { n: '扔石头', i: 'atkdebuff', d: 3, f: (e, B) => B.applyP('weak', 1) } },
    ai: e => pick(e, ['poke', 'poke', 'rock']) },
  gob_kid: { name: '哥布林小鬼', hp: [9, 12], sc: 2.8, hd: 151,
    moves: { bite: { n: '撕咬', i: 'atk', d: 5 }, yell: { n: '尖叫', i: 'debuff', f: (e, B) => B.applyP('weak', 1) } },
    ai: e => pick(e, ['bite', 'bite', 'yell']) },
  gob_blade: { name: '哥布林刀手', hp: [40, 44], sc: 2.4, hd: 250,
    moves: { slash: { n: '斩击', i: 'atk', d: 11 }, hone: { n: '磨刀', i: 'buff', f: (e, B) => { B.addSt(e, 'str', 3); B.eBlock(e, 6); } },
      guard: { n: '劈挡', i: 'atkdef', d: 7, f: (e, B) => B.eBlock(e, 5) } },
    ai: e => e.turn === 0 ? 'slash' : pick(e, ['slash', 'hone', 'guard']) },
  gob_archer: { name: '哥布林弓手', hp: [22, 26], sc: 2.6, hd: 200,
    moves: { shoot: { n: '射击', i: 'atk', d: 8 }, aim: { n: '瞄准', i: 'buff', f: (e, B) => B.addSt(e, 'str', 2) } },
    ai: e => pick(e, ['shoot', 'shoot', 'aim']) },
  gob_shield: { name: '哥布林盾兵', hp: [30, 34], sc: 2.4, hd: 205,
    moves: { cover: { n: '举盾', i: 'def', f: (e, B) => { const al = B.allies(e); B.eBlock(al.length ? al[Math.floor(Math.random() * al.length)] : e, 10); } },
      bash: { n: '盾撞', i: 'atk', d: 7 } },
    ai: (e, B) => B.allies(e).length ? pick(e, ['cover', 'cover', 'bash']) : 'bash' },
  gob_wolf: { name: '哥布林骑狼兵', hp: [44, 48], sc: 2.2, hd: 270, hdw: 230,
    moves: { bite: { n: '撕咬', i: 'atk', d: 12 }, howl: { n: '嚎叫', i: 'atkdebuff', d: 6, f: (e, B) => B.applyP('weak', 2) } },
    ai: e => pick(e, ['bite', 'howl']) },
  gob_bomb: { name: '哥布林炸弹兵', hp: [28, 32], sc: 2.4, hd: 217, init: e => { e.st.fuse = 3; },
    moves: { toss: { n: '投掷', i: 'atk', d: 4 }, boom: { n: '自爆', i: 'atk', d: 25, f: (e, B) => B.kill(e) } },
    ai: e => e.st.fuse <= 1 ? 'boom' : 'toss', after: e => { e.st.fuse--; } },
  gob_mage: { name: '哥布林法师', hp: [24, 28], sc: 2.4, hd: 285,
    moves: { fire: { n: '火球', i: 'atk', d: 9 }, hex: { n: '邪火', i: 'atkdebuff', d: 4, f: (e, B) => B.applyP('vuln', 2) } },
    ai: e => pick(e, ['fire', 'fire', 'hex']) },
  gob_thrower: { name: '哥布林投石手', hp: [24, 28], sc: 2.4, hd: 248,
    moves: { volley: { n: '乱投', i: 'atk', d: 3, x: 3 }, aim: { n: '蓄力', i: 'atkdef', d: 0, f: (e, B) => { B.addSt(e, 'str', 1); B.eBlock(e, 4); } } },
    ai: e => pick(e, ['volley', 'volley', 'aim']) },
  // 精英
  gob_shaman: { name: '哥布林萨满', hp: [58, 62], sc: 2.6, hd: 284, elite: 1,
    moves: { bolt: { n: '暗影弹', i: 'atk', d: 12 }, hex: { n: '诅咒', i: 'debuff', f: (e, B) => { B.applyP('vuln', 2); B.applyP('weak', 1); } },
      totem: { n: '治疗图腾', i: 'buff', f: (e, B) => B.alive().forEach(a => { B.healE(a, 8); B.addSt(a, 'str', 1); }) } },
    ai: e => cycle(e, ['bolt', 'hex', 'bolt', 'totem']) },
  gob_giant: { name: '巨型哥布林', hp: [38, 42], sc: 2.2, hd: 384, hdw: 200,
    moves: { roar: { n: '怒吼', i: 'buff', f: (e, B) => B.addSt(e, 'str', 2) }, smash: { n: '重砸', i: 'atk', d: 14 } },
    ai: e => cycle(e, ['smash', 'roar']) },
  wolf: { name: '野狼', hp: [20, 24], sc: 2, hd: 205, hdw: 190,
    moves: { bite: { n: '撕咬', i: 'atk', d: 8 }, howl: { n: '嚎叫', i: 'atkdebuff', d: 4, f: (e, B) => B.applyP('weak', 1) } },
    ai: e => pick(e, ['bite', 'bite', 'howl']) },
  gob_paladin: { name: '哥布林圣骑士', hp: [80, 84], sc: 2, elite: 1, hd: 375, hdw: 200,
    moves: { guard: { n: '圣光守护', i: 'def', f: (e, B) => B.alive().forEach(a => B.eBlock(a, 10)) },
      smite: { n: '圣光斩', i: 'atk', d: 14 }, aegis: { n: '圣盾', i: 'buff', f: (e, B) => { e.aegisUsed = 1; B.addSt(e, 'aegis', 2); } } },
    ai: e => (e.hp <= e.max / 2 && !e.aegisUsed) ? 'aegis' : cycle(e, ['smite', 'guard', 'smite']) },
  gob_hero: { name: '哥布林勇者', hp: [88, 92], sc: 2.5, elite: 1, hd: 330, hdw: 200, init: e => { e.st.ritual = 1; },
    moves: { combo: { n: '连斩', i: 'atk', d: 6, x: 2 }, crush: { n: '破甲', i: 'atkdebuff', d: 10, f: (e, B) => B.applyP('vuln', 2) },
      charge: { n: '蓄力', i: 'unknown' }, heavy: { n: '重劈', i: 'atk', d: 24 } },
    ai: e => cycle(e, ['combo', 'crush', 'charge', 'heavy']) },
  gob_king: { name: '哥布林大王', hp: [220, 220], sc: 2.9, hd: 380, hdw: 260, boss: 1,
    moves: { call: { n: '召唤', i: 'summon', f: (e, B) => { B.summon('goblin'); B.summon('goblin'); } },
      cut: { n: '王之斩', i: 'atk', d: 18 }, order: { n: '号令', i: 'buff', f: (e, B) => { B.alive().forEach(a => B.addSt(a, 'str', 3)); B.eBlock(e, 15); } },
      fury: { n: '暴怒连斩', i: 'atk', d: 7, x: 3 } },
    ai: (e, B) => { const m = cycle(e, ['call', 'cut', 'order', 'fury']); return m === 'call' && B.alive().length > 2 ? 'cut' : m; } },
};

export const ENCOUNTERS = {
  easy: [['goblin', 'goblin'], ['gob_kid', 'gob_kid', 'gob_kid'], ['gob_blade'], ['gob_archer', 'gob_shield']],
  hard: [['gob_wolf'], ['gob_bomb', 'gob_bomb', 'goblin'], ['gob_thrower', 'gob_thrower'], ['gob_kid', 'gob_blade'],
    ['gob_archer', 'gob_shield', 'gob_archer'], ['goblin', 'gob_wolf'], ['gob_mage', 'goblin'], ['gob_shield', 'gob_mage'], ['gob_giant'], ['gob_kid', 'gob_giant']],
  elite: [['gob_kid', 'gob_shaman', 'gob_kid'], ['gob_paladin'], ['gob_hero']],
  boss: [['gob_king']],
};

// ---- 事件 ---- opts: {t 文本, ok(R) 可选条件, go(R, api) 执行，返回结果文本}
export const EVENTS = [
  { title: '林中泉水', img: 'holywater', text: '树林深处有一汪清澈的泉水，水面泛着微光。',
    opts: [
      { t: '饮水：回复 25% 最大生命', go: (R, A) => { A.heal(Math.floor(R.maxHp * .25)); return '泉水甘甜，伤口在慢慢愈合。'; } },
      { t: '净身：移除一张牌', ok: R => R.deck.length > 1, go: (R, A) => { A.pick('remove'); return '你把杂念洗进了泉水里。'; } },
      { t: '离开', go: () => '你没有停留。' }] },
  { title: '赌徒哥布林', img: 'p_gamble', text: '一只戴眼罩的哥布林蹲在树桩上抛骰子：“来一把？赢了翻倍！”',
    opts: [
      { t: '下注 30 金币：50% 赢得 80 金币', ok: R => R.gold >= 30, go: (R, A) => { A.gold(-30); if (Math.random() < .5) { A.gold(80); return '骰子停在六点，你赢了！'; } return '骰子停在一点。哥布林笑得前仰后合。'; } },
      { t: '揍它一顿：失去 5 生命，获得 20 金币', go: (R, A) => { A.hurt(5); A.gold(20); return '它挠了你几下，扔下钱袋跑了。'; } },
      { t: '离开', go: () => '你不跟哥布林赌钱。' }] },
  { title: '古老祭坛', img: 'p_arc', text: '长满青苔的石台上刻着符文，中央的凹槽像在等待鲜血。',
    opts: [
      { t: '献血：失去 8 生命，获得一个随机遗物', go: (R, A) => { A.hurt(8); const r = A.relic(); return `符文亮起，祭坛上多了一件「${r}」。`; } },
      { t: '离开', go: () => '你绕开了祭坛。' }] },
  { title: '流浪铁匠', img: 'ic_hammer', text: '路边一个背着铁砧的矮人朝你招手：“兄弟，武器要打磨吗？”',
    opts: [
      { t: '打磨：升级一张牌', go: (R, A) => { A.pick('upgrade'); return '叮叮当当，焕然一新。'; } },
      { t: '离开', go: () => '你谢绝了他。' }] },
  { title: '掌机的信号', img: 'gb', text: '口袋里的掌机突然震动，屏幕上滚过一串乱码……',
    opts: [
      { t: '接收：随机变化一张牌', go: (R, A) => { A.pick('transform'); return '你的一张牌被改写成了别的东西。'; } },
      { t: '调大音量：获得 50 金币，最大生命 -5', go: (R, A) => { A.gold(50); A.maxHp(-5); return '刺耳的电流声之后，掌机吐出了几枚金币。'; } },
      { t: '关机', go: () => '屏幕暗了下去。' }] },
  { title: '受伤的商队', img: 'box', text: '一辆翻倒的马车旁，商人捂着伤口：“救救我，我有好东西给你。”',
    opts: [
      { t: '帮忙：失去 6 生命，获得一张稀有牌（三选一）', go: (R, A) => { A.hurt(6); A.rareCard(); return '商人感激地塞给你几张卡。'; } },
      { t: '离开', go: () => '你转身离开。' }] },
];
