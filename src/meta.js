// 局外系统的数据：开局祝福、进阶 16~20、成就、每日挑战 / 自定义修正、新事件
// 效果的实现写在 game.js（界面）和 tools/sim.mjs（训练用的模拟器）里，这里只放定义

/* ---------- 开局祝福：两个免费 + 一个有代价 ---------- */
export const BLESS_FREE = {
  b_hp: '最大生命 +8',
  b_gold: '获得 100 金币',
  b_rm: '删除 1 张牌',
  b_up: '升级 1 张牌',
  b_card: '从 3 张牌里选 1 张加入牌组',
  b_pot: '获得 2 瓶随机药水',
  b_relic: '获得 1 个随机普通秘宝',
};
export const BLESS_COST = {
  t_rare: '失去 10% 最大生命：从 3 张稀有牌里选 1 张',
  t_relic: '失去所有金币：获得 1 个随机稀有秘宝',
  t_rm2: '牌组混进 1 张「悔意」：删除 2 张牌',
  t_gold: '失去 12 点最大生命：获得 150 金币',
};

/* ---------- 进阶 16~20（接在 game.js 的 ASC 后面） ---------- */
export const ASC2 = ['每章开始回复的生命减少（50% → 40%）', '普通怪伤害 +10%', '精英血量再 +10%', '开局金币 -60', '所有 Boss 开局有 1 点力量、生命 +10%'];

/* ---------- 每日挑战 / 自定义模式的修正 ---------- */
export const MODS = {
  rich: ['富翁', '开局获得 400 金币。'],
  big: ['豪华开局', '开局牌组多 3 张随机本角色牌。'],
  cursed: ['诅咒宝藏', '开局带 2 张「悔意」，同时获得 1 个随机稀有秘宝。'],
  nopot: ['禁药令', '这一局得不到任何药水。'],
  heavy: ['巨躯', '所有敌人血量 +25%。'],
  swift: ['先手', '每场战斗第一回合多 1 点能量。'],
  glass: ['玻璃大炮', '你造成的伤害 +50%，但最大生命减半。'],
  midas: ['点金', '战斗掉落的金币翻倍，商店价格也翻倍。'],
};

/* ---------- 成就（只存在本机） ---------- */
const CH9 = [['hero', '林拓'], ['heroine', '苏音'], ['miko', '千早'], ['witch', '莉泽'], ['erin', '艾琳'], ['gu', '顾清寒'], ['sylvie', '希尔薇'], ['mia', '米娅'], ['feiyue', '绯月']];
export const ACH = [
  { id: 'a_act1', name: '翠绿之地', desc: '通关第一章。' },
  { id: 'a_act2', name: '血月熄灭', desc: '通关第二章。' },
  { id: 'a_act3', name: '回家的门', desc: '打败魔王。' },
  ...CH9.map(([c, n]) => ({ id: 'a_win_' + c, name: n + '的归途', desc: `用${n}打败魔王。`, ch: c })),
  { id: 'a_all9', name: '全员到齐', desc: '九个角色都打败过魔王。' },
  { id: 'a_asc5', name: '小试身手', desc: '在进阶 5 以上打败魔王。' },
  { id: 'a_asc10', name: '老手', desc: '在进阶 10 以上打败魔王。' },
  { id: 'a_asc20', name: '登峰造极', desc: '在进阶 20 打败魔王。' },
  { id: 'a_dev', name: '找到 Bug 了', desc: '打败开发者。' },
  { id: 'a_endless3', name: '天外有天', desc: '在无尽模式爬到第 3 轮。' },
  { id: 'a_endless10', name: '没有尽头', desc: '在无尽模式爬到第 10 轮。' },
  { id: 'a_thin', name: '少即是多', desc: '牌组不超过 15 张时打败魔王。' },
  { id: 'a_fat', name: '百宝箱', desc: '牌组达到 40 张以上时打败魔王。' },
  { id: 'a_relic15', name: '秘宝猎人', desc: '一局里拥有 15 个以上秘宝。' },
  { id: 'a_rich', name: '守财奴', desc: '同时持有 600 金币。' },
  { id: 'a_nopot', name: '清醒的头脑', desc: '一瓶药水都不用，打败魔王。' },
  { id: 'a_norest', name: '不眠不休', desc: '一次营火休息都不用，打败魔王。' },
  { id: 'a_bossclean', name: '毫发无伤', desc: '打一场 Boss 战，一点血都没掉。' },
  { id: 'a_hit60', name: '一击必杀', desc: '一次攻击造成 60 点以上伤害。' },
  { id: 'a_turn10', name: '手速', desc: '一回合打出 10 张以上的牌。' },
  { id: 'a_daily', name: '今天也来了', desc: '通关一次每日挑战（打败第一章 Boss 即可）。' },
  { id: 'a_keys', name: '三把钥匙', desc: '一局里集齐三把钥匙。' },
  { id: 'a_true', name: '真正的归途', desc: '看到真结局。' },
  { id: 'a_codex', name: '博物学家', desc: '图鉴里见过所有怪物。' },
  { id: 'a_runs50', name: '百折不挠', desc: '累计开始 50 局。' },
];

/* ---------- 种子随机：同一个种子 → 同样的地图和奖励 ---------- */
export const hashSeed = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const mulberry = st => () => { st = st + 0x6D2B79F5 | 0; let t = Math.imul(st ^ st >>> 15, 1 | st); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
export const todayKey = () => { const d = new Date(Date.now() + 9 * 3600e3); /* 统一按日本时间（UTC+9）算“今天” */ return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`; };
/* 每日挑战：按日期定角色和两个修正 */
export const dailyOf = (key, chars) => { const r = mulberry(hashSeed('daily' + key)); const ch = chars[Math.floor(r() * chars.length)]; const ks = Object.keys(MODS); for (let i = ks.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ks[i], ks[j]] = [ks[j], ks[i]]; } ks.length = 2; return { seed: 'D' + key, char: ch, mods: ks }; };

/* ---------- 新事件：第一章 1 个、第二章 7 个、第三章 8 个 ---------- */
export const EV1C = [
  { title: '迷路的小狗', pic: 'e_dog', text: '一只脏兮兮的小狗跟在你身后，肚子咕咕直叫。',
    opts: [
      { t: '喂它：失去 20 金币，回复 8 生命，得到 1 瓶药水', ok: R => R.gold >= 20, go: (R, A) => { A.gold(-20); A.heal(8); const p = A.potion(); return `小狗叼来了一个瓶子：「${p}」。`; } },
      { t: '摸摸它的头', go: (R, A) => { A.heal(4); return '它摇着尾巴跑远了，你的心情好了一点。'; } }] },
];
export const EV2C = [
  { title: '棺材里的敲门声', pic: 'e_coffin', text: '一口黑棺材里传出「咚、咚」的声音。',
    opts: [
      { t: '打开它：可能是宝物，也可能是麻烦', go: (R, A) => { if (Math.random() < .5) return `里面躺着一具枯骨，手里握着：「${A.relic()}」。`; A.hurt(10); A.curse('regret'); return '一只吸血蝠扑了出来，咬了你一口才飞走。'; } },
      { t: '把它钉死：获得 30 金币', go: (R, A) => { A.gold(30); return '敲门声停了。棺材缝里滚出几枚金币。'; } }] },
  { title: '地牢的囚徒', pic: 'e_prisoner', text: '铁栏后面，一个瘦弱的人朝你伸出手。',
    opts: [
      { t: '救他出来：失去 8 生命，得到一张牌', go: (R, A) => { A.hurt(8); A.card(); return '他塞给你一张卡片，消失在走廊尽头。'; } },
      { t: '拿走看守的钥匙串：获得 60 金币，混进一张「悔意」', go: (R, A) => { A.gold(60); A.curse('regret'); return '钥匙能卖钱。只是那双眼睛一直跟着你。'; } }] },
  { title: '血色喷泉', pic: 'e_bloodfount', text: '喷泉里流的不是水，是温热的红色液体。',
    opts: [
      { t: '喝一口：最大生命 +6，失去 6 生命', go: (R, A) => { A.maxHp(6); A.hurt(6); return '一股热流冲遍全身，你的身体变结实了。'; } },
      { t: '用它洗掉污秽：删除 1 张牌', go: (R, A) => { A.pick('remove', 1); return '有什么东西从你身上被洗掉了。'; } }] },
  { title: '骷髅商人', pic: 'e_skelshop', text: '「新鲜货，不新鲜不要钱。」骷髅咔哒咔哒地笑。',
    opts: [
      { t: '买神秘包裹：失去 100 金币，得到秘宝和药水', ok: R => R.gold >= 100, go: (R, A) => { A.gold(-100); const r = A.relic(); const p = A.potion(); return `包裹里是：「${r}」，还有「${p}」。`; } },
      { t: '只买一瓶药：失去 30 金币', ok: R => R.gold >= 30, go: (R, A) => { A.gold(-30); return `你买到了：「${A.potion()}」。`; } },
      { t: '离开', go: () => '骷髅耸了耸肩。骨头掉了一块。' }] },
  { title: '照不出人的镜子', pic: 'e_mirror', text: '镜子里映着整个房间，唯独没有你。',
    opts: [
      { t: '凝视它：最大生命 -4，升级 2 张牌', go: (R, A) => { A.maxHp(-4); A.pick('upgrade', 2); return '镜子里慢慢出现了另一个你，她教了你几招。'; } },
      { t: '打碎它：失去 6 生命，删除 1 张牌', go: (R, A) => { A.hurt(6); A.pick('remove', 1); return '碎片划破了手，但心里轻松了一些。'; } }] },
  { title: '午夜钟楼', pic: 'e_bell', text: '钟楼顶上挂着一口巨钟，绳子就在你手边。',
    opts: [
      { t: '敲响它：回复 20 生命，混进一张「疑心」', go: (R, A) => { A.heal(20); A.curse('doubt'); return '钟声回荡，伤口愈合了，可你开始怀疑这一切是不是真的。'; } },
      { t: '悄悄离开', go: () => '你没有惊动任何东西。' }] },
  { title: '狼人的契约', pic: 'e_wolfpact', text: '一个披着狼皮的人拦住你：「签了它，你会更强。」',
    opts: [
      { t: '签下契约：最大生命 -5，得到一张稀有牌', go: (R, A) => { A.maxHp(-5); A.rareCard(); return '契约燃成了灰。你感到一股野性的力量。'; } },
      { t: '拒绝：回复 10 生命', go: (R, A) => { A.heal(10); return '「胆小鬼。」他嗤笑一声，消失在雾里。你松了口气。'; } }] },
];
export const EV3C = [
  { title: '冰封的勇者', pic: 'e_frozenhero', text: '一个勇者被冻在冰里，手里还紧握着什么。',
    opts: [
      { t: '凿开冰层：失去 10 生命，得到一个秘宝', go: (R, A) => { A.hurt(10); return `冰碎了，你拿到了：「${A.relic()}」。`; } },
      { t: '为他默哀：回复 12 生命', go: (R, A) => { A.heal(12); return '风停了一会儿。你觉得他在冰里笑了。'; } }] },
  { title: '金币山', pic: 'e_goldhill', text: '龙不在家，金币堆得像小山。',
    opts: [
      { t: '抓一大把：获得 120 金币，失去 8 生命', go: (R, A) => { A.gold(120); A.hurt(8); return '金币山塌了一角，砸得你满头包。'; } },
      { t: '只拿一枚当纪念：获得 20 金币', go: (R, A) => { A.gold(20); return '龙大概不会为一枚金币生气。'; } }] },
  { title: '隐士的茶', pic: 'e_hermittea', text: '山洞里的老隐士给你倒了一杯热茶。',
    opts: [
      { t: '喝茶聊天：回复 15 生命，升级 1 张牌', go: (R, A) => { A.heal(15); A.pick('upgrade', 1); return '老人讲了很多故事，其中一个对你很有用。'; } },
      { t: '请教修行：删除 1 张牌', go: (R, A) => { A.pick('remove', 1); return '「放下吧。」他只说了这一句。'; } }] },
  { title: '雏龙的巢', pic: 'e_hatchling', text: '巢里有一只刚出壳的小龙，还有一颗没孵化的蛋。',
    opts: [
      { t: '照顾小龙：最大生命 +8', go: (R, A) => { A.maxHp(8); return '小龙蹭了蹭你，一股暖意留在了身体里。'; } },
      { t: '拿走龙蛋：得到一个秘宝，混进一张「悔意」', go: (R, A) => { const r = A.relic(); A.curse('regret'); return `你拿到了：「${r}」。小龙一直望着你的背影。`; } }] },
  { title: '雪山温泉', pic: 'e_hotspring', text: '冰天雪地里，一汪温泉冒着白气。',
    opts: [
      { t: '泡一会儿：回复 30% 生命', go: (R, A) => { A.heal(Math.floor(R.maxHp * .3)); return '冻僵的手脚终于暖和过来了。'; } },
      { t: '泡到天黑：失去 50 金币（被偷了），回复全部生命', ok: R => R.gold >= 50, go: (R, A) => { A.gold(-50); A.heal(999); return '你睡着了。醒来时浑身舒坦，钱袋却轻了。'; } }] },
  { title: '矮人铁匠', pic: 'e_dwarfsmith', text: '「龙鳞做的砧子，什么都能打。」矮人敲了敲铁锤。',
    opts: [
      { t: '全套打磨：失去 80 金币，升级 3 张牌', ok: R => R.gold >= 80, go: (R, A) => { A.gold(-80); A.pick('upgrade', 3); return '叮叮当当一整夜，你的装备焕然一新。'; } },
      { t: '简单修补：升级 1 张牌', go: (R, A) => { A.pick('upgrade', 1); return '「凑合用吧。」矮人打了个哈欠。'; } }] },
  { title: '奇怪的终端', pic: 'e_terminal', text: '雪地里竖着一台发光的电脑，屏幕上写着：「输入密码」。',
    opts: [
      { t: '随便试一个：失去 6 生命，得到一张稀有牌', go: (R, A) => { A.hurt(6); A.rareCard(); return '屏幕闪了一下：「权限已授予。」你被电了一下，手里多了一张牌。'; } },
      { t: '拔掉电源：获得 40 金币', go: (R, A) => { A.gold(40); return '机箱里掉出几枚硬币。屏幕最后显示：「……下个版本见。」'; } }] },
  { title: '裂隙的信号', pic: 'e_riftsignal', text: '空气里传来断断续续的声音，像有人在呼叫。',
    opts: [
      { t: '回应它：得到 2 瓶药水', go: (R, A) => { const a = A.potion(), b = A.potion(); return `裂缝里递出了两个瓶子：「${a}」、「${b}」。`; } },
      { t: '切断它：失去 5 生命，删除 1 张牌', go: (R, A) => { A.hurt(5); A.pick('remove', 1); return '声音消失了，连同你的一点杂念。'; } }] },
];
