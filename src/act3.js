/* 第三章「永冬之巅」+ 守门 Boss「开发者」+ 无尽模式「天外之塔」
   敌人用的 B 接口（game.js 和 tools/sim.mjs 各有一份，名字一致）：
   applyP addSt eBlock healE summon say alive allies
   以及本章新加的：transform addHand discardRand swapHigh flipRand nerfTop zc handTypes hitP */
const cycle = (e, list) => list[e.turn % list.length];
const ELEM = { fire: 'd_fire', frost: 'd_frost', storm: 'd_storm', venom: 'd_venom' };
const TINT = { fire: '', frost: 'hue-rotate(185deg) saturate(.8) brightness(1.15)', storm: 'hue-rotate(250deg) saturate(1.2)', venom: 'hue-rotate(95deg) saturate(.9) brightness(.85)' };
/* 蓄力：蓄力那个回合（玩家回合）里受到 ≥ brk 的伤害，龙息就被打断 */
const charge = (pose = 'atk0') => ({ n: '蓄力', i: 'buff', f: e => { e.chg = 1; e.st.chg = 1; e.pose = pose; } });
function breathTurn(e, B, big, small) { /* onTurn 里调用：决定龙息是否被打断 */
  if (e.move !== big) return; const ok = e.chg && (e.dmgT || 0) < e.d.brk; e.chg = 0; delete e.st.chg; e.pose = null;
  if (!ok) { e.move = small; B.say('（龙息被打断了！）'); }
}
const elemOf = B => { const d = B.alive().find(a => a.elem); return d ? d.elem : ['fire', 'frost', 'storm', 'venom'][Math.floor(Math.random() * 4)]; };
const dragon = (elem, o) => ({ name: o.name, hp: o.hp, sc: 2.4, hd: o.hd || 250, brk: 15, elemD: elem, lore: o.lore, init: e => { e.elem = elem; },
  moves: { main: o.main, charge: charge(), breath: o.breath, fizzle: { n: '小股龙息', i: 'atk', d: o.fizzle } },
  onTurn: (e, B) => breathTurn(e, B, 'breath', 'fizzle'), onHurt: o.onHurt, ai: e => cycle(e, ['main', 'charge', 'breath']) });

export const E3 = {
  d_egg: { name: '龙蛋', hp: [18, 22], sc: 1.6, hd: 150, lore: '会孵化的龙蛋。头顶的数字归零时，就会孵出一只幼龙。',
    init: e => { e.st.hatch = 3; }, moves: { wait: { n: '孵化中', i: 'unknown' } }, ai: () => 'wait',
    onTurn: (e, B) => { e.st.hatch = (e.st.hatch || 1) - 1; e.pose = e.st.hatch === 1 ? 'charge' : null; if (e.st.hatch <= 0) { const el = elemOf(B); const w = B.transform(e, 'd_whelp', 1); if (w) { w.elem = el; w.tint = TINT[el]; } B.say('（蛋壳裂开，一只幼龙钻了出来！）'); return 'hatch'; } return 'wait'; } },
  d_whelp: { name: '幼龙', hp: [16, 20], sc: 1.6, hd: 170, lore: '刚孵出来的小龙。头顶的数字归零时，会长成满血的成龙。',
    init: e => { e.st.grow = 3; if (!e.elem) e.elem = 'fire'; },
    moves: { bite: { n: '啄咬', i: 'atk', d: 6 }, spark: { n: '喷火星', i: 'atk', d: 3, x: 2 } }, ai: e => cycle(e, ['bite', 'spark']),
    onTurn: (e, B) => { e.st.grow = (e.st.grow || 1) - 1; if (e.st.grow <= 0) { B.transform(e, ELEM[e.elem] || 'd_fire', 1); B.say('（幼龙长大了！）'); return 'grow'; } } },
  d_fire: dragon('fire', { name: '赤焰龙', hp: [46, 50], hd: 255, lore: '喷火的红龙。蓄力的那个回合打它 15 点以上，就能打断龙息。',
    main: { n: '龙爪', i: 'atk', d: 11 }, breath: { n: '烈焰龙息', i: 'atkdebuff', d: 16, f: (e, B) => B.applyP('pburn', 3) }, fizzle: 5 }),
  d_frost: dragon('frost', { name: '霜龙', hp: [50, 54], hd: 255, lore: '冰霜龙。它的龙息会让你冻伤：回合结束时手里剩的牌越多，掉的血越多。',
    main: { n: '尾扫', i: 'atkdef', d: 9, f: (e, B) => B.eBlock(e, 6) }, breath: { n: '寒霜龙息', i: 'atkdebuff', d: 14, f: (e, B) => B.applyP('frost', 3) }, fizzle: 5 }),
  d_storm: dragon('storm', { name: '雷龙', hp: [42, 46], hd: 255, lore: '雷龙。血不多，但龙息伤害最高，还会让你麻痹（下回合少 1 点能量）。',
    main: { n: '雷爪', i: 'atk', d: 6, x: 2 }, breath: { n: '雷霆龙息', i: 'atkdebuff', d: 18, f: (e, B) => B.applyP('zap', 1) }, fizzle: 6 }),
  d_venom: dragon('venom', { name: '毒沼龙', hp: [48, 52], hd: 230, lore: '毒沼龙。身上全是毒鳞：每次被你攻击，你也中毒 1 层。',
    main: { n: '毒牙', i: 'atkdebuff', d: 8, f: (e, B) => B.applyP('ppois', 3) }, breath: { n: '毒雾龙息', i: 'atkdebuff', d: 10, f: (e, B) => B.applyP('ppois', 5) }, fizzle: 4,
    onHurt: (e, B) => { if (e.hitByP) B.applyP('ppois', 1); } }),
  d_wyvern: { name: '双足飞龙', hp: [30, 34], sc: 2.2, hd: 250, lore: '一直飞在半空。每回合第一次受到的伤害减半。',
    init: e => { e.st.wing = 1; }, moves: { dive: { n: '俯冲', i: 'atk', d: 12 }, sting: { n: '尾刺', i: 'atkdebuff', d: 5, f: (e, B) => B.applyP('ppois', 2) } },
    onTurn: e => { e.st.wing = 1; }, ai: e => cycle(e, ['dive', 'sting']) },
  d_rock: { name: '岩甲龙', hp: [58, 62], sc: 2.4, hd: 240, lore: '浑身岩甲，鳞甲最多叠到 6 层。每层让你每次攻击少 1 点伤害，一下打出 10 点以上能敲碎 1 层。',
    init: e => { e.st.scale = 3; }, moves: { harden: { n: '硬化', i: 'def', f: (e, B) => { if ((e.st.scale || 0) < 6) B.addSt(e, 'scale', Math.min(2, 6 - (e.st.scale || 0))); B.eBlock(e, 10); e.pose = 'guard'; } }, ram: { n: '撞击', i: 'atk', d: 15 } },
    onTurn: e => { e.pose = null; }, ai: e => cycle(e, ['harden', 'ram']) },
  dk_warrior: { name: '龙人战士', hp: [54, 58], sc: 2.3, hd: 230, lore: '人形时连砍两刀，化龙后一爪很重、还会长出鳞甲。意图里会提前写「化龙」。',
    init: e => { e.form = 'h'; },
    moves: { slash: { n: '双刃', i: 'atk', d: 7, x: 2 }, roar: { n: '战吼', i: 'buff', f: (e, B) => B.addSt(e, 'str', 2) },
      toD: { n: '化龙', i: 'buff', f: (e, B) => { e.form = 'd'; e.art = 'dk_warrior_d'; e.hd = 290; for (const k of ['weak', 'vuln', 'poison']) delete e.st[k]; B.addSt(e, 'scale', 2); } },
      claw: { n: '龙爪', i: 'atk', d: 18 }, toH: { n: '化人', i: 'def', f: (e, B) => { e.form = 'h'; e.art = null; e.hd = null; B.eBlock(e, 8); } } },
    ai: e => cycle(e, ['slash', 'roar', 'toD', 'claw', 'claw', 'toH']) },
  dk_mage: { name: '龙人术士', hp: [44, 48], sc: 2.2, hd: 235, brk: 15, lore: '人形时给队友加护盾、扔火球；生命低于一半会强制化龙，从此每两回合一口龙息。',
    init: e => { e.form = 'h'; },
    moves: { shield: { n: '龙鳞护盾', i: 'def', f: (e, B) => { B.alive().forEach(a => B.eBlock(a, 8)); e.pose = 'cast'; } }, fireball: { n: '火球', i: 'atk', d: 9 },
      toD: { n: '化龙', i: 'buff', f: (e, B) => { e.form = 'd'; e.art = 'dk_mage_d'; e.hd = 265; e.dturn = e.turn + 1; for (const k of ['weak', 'vuln', 'poison']) delete e.st[k]; } },
      charge: charge(), breath: { n: '龙息', i: 'atkdebuff', d: 20, f: (e, B) => B.applyP('pburn', 2) }, fizzle: { n: '小股龙息', i: 'atk', d: 6 } },
    onTurn: (e, B) => { if (e.pose === 'cast') e.pose = null; breathTurn(e, B, 'breath', 'fizzle'); },
    ai: e => e.form === 'd' ? ((e.turn - e.dturn) % 2 === 0 ? 'charge' : 'breath') : e.hp < e.max / 2 ? 'toD' : cycle(e, ['shield', 'fireball']) },
  d_twin: { name: '双头龙', hp: [125, 130], sc: 2.7, hd: 300, elite: 1, lore: '一火一冰两个头。生命掉到一半时会被砍掉一个头，剩下那个会暴怒（力量 +5、回 15 血）。',
    moves: { fire: { n: '火息', i: 'atkdebuff', d: 12, af: ['atk0'], f: (e, B) => B.applyP('pburn', 2) }, ice: { n: '冰咬', i: 'atkdebuff', d: 10, af: ['atk1'], f: (e, B) => B.applyP('frost', 2) } },
    onHurt: (e, B) => { if (!e.cut && e.hp <= e.max / 2) { e.cut = Math.random() < .5 ? 'fire' : 'ice'; e.pose = e.cut; B.addSt(e, 'str', 5); B.healE(e, 15); B.say(e.cut === 'fire' ? '（冰头被砍下，火头暴怒了！）' : '（火头被砍下，冰头暴怒了！）'); } },
    ai: e => e.cut || cycle(e, ['fire', 'ice']) },
  d_hydra: { name: '九头蛇', hp: [118, 122], sc: 2.7, hd: 300, elite: 1, lore: '每个头咬一口。每掉 20 血砍掉一个头，但会长出两个；它身上有灼烧，或者那一下打了 15 点以上，就不会再长。',
    init: e => { e.st.heads = 3; e.xb = 2; e.mark = e.max; },
    moves: { bite: { n: '群咬', i: 'atk', d: 4, x: 1 }, regen: { n: '再生', i: 'buff', f: (e, B) => B.healE(e, 10) } },
    onHurt: (e, B) => { while (e.hp > 0 && e.hp <= e.mark - 20) { e.mark -= 20; const stop = (e.st.fburn || 0) > 0 || (e.lastHit || 0) >= 15; e.st.heads = Math.max(1, Math.min(6, e.st.heads + (stop ? -1 : 1))); e.xb = e.st.heads - 1; B.say(stop ? '（断口烧焦了，长不出来！）' : '（砍掉一个，长出两个！）'); } },
    ai: e => e.turn % 3 === 2 ? 'regen' : 'bite' },
  dk_elder: { name: '龙人长老', hp: [128, 132], sc: 2.6, hd: 255, elite: 1, brk: 20, lore: '三种形态轮换：人形召唤龙蛋、半龙形加攻、龙形蓄力龙息。',
    init: e => { e.form = 'h'; },
    moves: { summon: { n: '唤蛋', i: 'summon', f: (e, B) => { e.art = null; e.hd = null; e.tint = null; e.pose = 'cast'; if (B.alive().length < 4) B.summon('d_egg'); B.eBlock(e, 8); } },
      half: { n: '半龙化', i: 'buff', f: (e, B) => { e.pose = null; e.tint = 'sepia(.6) saturate(2) brightness(1.15) drop-shadow(0 0 10px #ffd060)'; B.addSt(e, 'str', 3); } },
      claws: { n: '龙爪', i: 'atk', d: 10, x: 2 },
      charge: { n: '化龙·蓄力', i: 'buff', f: e => { e.tint = null; e.art = 'dk_elder_d'; e.hd = 300; e.chg = 1; e.st.chg = 1; e.pose = 'atk0'; } },
      breath: { n: '古龙之息', i: 'atkdebuff', d: 28, f: (e, B) => B.applyP('frost', 2) }, fizzle: { n: '小股龙息', i: 'atk', d: 9 } },
    onTurn: (e, B) => { if (e.pose === 'cast') e.pose = null; breathTurn(e, B, 'breath', 'fizzle'); },
    ai: e => cycle(e, ['summon', 'half', 'claws', 'charge', 'breath']) },
  d_boss: { name: '紫瞳霜龙', hp: [320, 320], sc: 3, hd: 330, boss: 1, brk: 30, deadArt: 'd_boss_fly', lore: '雪山之巅的远古霜龙，召唤你们来到这个世界的门就在它身后。生命掉到一半会飞上天。',
    intro: '「异界的孩子们……把你们叫来的门，就在我身后。」',
    moves: { hatch: { n: '唤雏', i: 'summon', f: (e, B) => { for (let k = 0; k < 2 && B.alive().length < 3; k++) { const w = B.summon('d_whelp', 18); if (w) { w.elem = 'frost'; w.tint = TINT.frost; } } } },
      claw: { n: '冰爪', i: 'atk', d: 12, x: 2 }, charge: charge('charge'),
      breath: { n: '紫霜龙息', i: 'atkdebuff', d: 30, af: ['breath'], f: (e, B) => B.applyP('frost', 3) }, fizzle: { n: '寒气', i: 'atk', d: 10, af: ['breath'] },
      scales: { n: '冰鳞', i: 'def', f: (e, B) => { B.addSt(e, 'scale', 4); B.eBlock(e, 15); } },
      fcharge: charge('idle1'), fbreath: { n: '极寒吐息', i: 'atkdebuff', d: 22, af: ['atk1'], f: (e, B) => B.applyP('frost', 2) }, ffizzle: { n: '寒气', i: 'atk', d: 8, af: ['atk1'] },
      dive: { n: '俯冲', i: 'atk', d: 16, af: ['atk0'] } },
    onHurt: (e, B) => { if (!e.p2 && e.hp <= e.max / 2 && e.hp > 0) { e.p2 = 1; e.art = 'd_boss_fly'; e.st.fly = 3; e.chg = 0; delete e.st.chg; e.pose = null; e.t2 = e.turn + 1; B.say(B.sylvie ? '「留下来吧，幼崽。这座山本该是你的。」' : '「那就让我看看——你们能爬多高。」'); } },
    onTurn: (e, B) => { if (e.p2) { if (e.grounded) { e.grounded = 0; e.st.fly = 3; return 'skip'; } e.st.fly = 3; breathTurn(e, B, 'fbreath', 'ffizzle'); } else breathTurn(e, B, 'breath', 'fizzle'); },
    onDie: (e, B) => B.say('「门……开了。去吧，去你们想去的地方。」'),
    ai: e => e.p2 ? cycle({ turn: e.turn - (e.t2 || 0) }, ['fcharge', 'fbreath', 'dive']) : cycle(e, ['hatch', 'claw', 'charge', 'breath', 'scales']) },
  dev_boss: { name: '开发者', hd: 290, hp: [260, 260], sc: 2.6, boss: 1, lore: '这个游戏的作者。他能看你的手牌、改你的牌。弱点：一回合打出 3 张 0 费牌，他就会「程序报错」晕一回合。',
    intro: '「这一关……其实我自己都没打过。」',
    moves: { peek: { n: '偷看', i: 'unknown' }, peekDef: { n: '看穿', i: 'def', f: (e, B) => B.eBlock(e, 18) }, peekHit: { n: '看穿', i: 'atk', d: 14 },
      keys: { n: '键盘连打', i: 'atk', d: 7, x: 3 },
      swap: { n: '换牌', i: 'debuff', f: e => { e.pend = 'swap'; e.pose = 'cast'; } },
      del: { n: 'Delete', i: 'atkdebuff', d: 9, f: e => { e.pend = 'del'; } },
      patch: { n: '平衡补丁', i: 'debuff', f: (e, B) => { e.pose = 'cast'; const n = B.nerfTop(3); B.say(n ? `「「${n}」太强了，削。」` : '「嗯……没什么好削的。」'); } },
      flip: { n: '敲回车', i: 'atkdebuff', d: 11, f: e => { e.pend = 'flip'; } },
      debug: { n: '调试召唤', i: 'summon', f: (e, B) => { e.pose = 'cast'; const m = B.summon(Math.random() < .5 ? 'gob_king' : 'wolf_lord', 45); if (m) { m.mini = 1; m.hd = 200; } B.say('「调试一下……」'); } },
      demand: { n: '需求变更', i: 'atk', d: 20 } },
    onPTurn: (e, B) => { e.bugT = 0;
      if (e.move === 'peek') { const h = B.handTypes(); e.move = h.atk >= h.skill ? 'peekDef' : 'peekHit'; B.say('「你手里的牌，我都看到了。」'); }
      if (e.pend === 'swap') { const n = B.swapHigh(); if (n) B.say(`「「${n}」借我用用。」`); }
      if (e.pend === 'del') { B.discardRand(2); B.say('「这两张，删了。」'); }
      if (e.pend === 'flip') { B.flipRand(); B.say('「这张……正负反过来试试。」'); }
      e.pend = null; },
    onCard: (e, type, B) => { if (!e.bugT && !e.stun && B.zc() >= 3) { e.bugT = 1; e.stun = 1; B.say('「程序报错了？！」'); } },
    onHurt: (e, B) => { if (!e.z && e.hp > 0 && e.hp <= e.max / 2) { e.z = 1; B.healE(e, Math.floor(e.max * .3)); B.addSt(e, 'str', 1); B.addHand('bugcard', 2); B.say('「这个数值不对……Ctrl+Z。」'); } },
    onTurn: e => { if (e.stun) { e.stun = 0; e.pose = 'stun'; return 'skip'; } e.pose = null; },
    onDie: (e, B) => B.say('「行，你们比我会玩。门在上面，替我向那条龙问好。」'),
    ai: (e, B) => { const m = cycle(e, ['peek', 'keys', 'swap', 'del', 'patch', 'flip', 'debug']); return m === 'debug' && B.alive().some(a => a.mini) ? 'demand' : m; } },
};

export const ENC3 = {
  easy: [['d_egg', 'd_egg'], ['d_whelp', 'd_whelp', 'd_whelp'], ['d_wyvern', 'd_wyvern'], ['d_fire'], ['d_frost']],
  hard: [['d_rock', 'd_egg'], ['d_storm', 'd_whelp'], ['d_venom', 'd_wyvern'], ['dk_warrior'], ['dk_mage', 'dk_warrior'], ['d_fire', 'd_frost'], ['dk_mage', 'd_rock'], ['d_egg', 'd_egg', 'dk_warrior']],
  elite: [['d_twin'], ['d_hydra'], ['dk_elder', 'd_egg']],
  boss: [['dev_boss']],
};
export const FINAL3 = 'd_boss';

export const S3 = {
  pburn: ['灼烧', '回合结束时失去等同层数的生命，然后减 1 层', '#ff7a30', 'icons2/st_pburn'],
  frost: ['冻伤', '回合结束时，手里每剩 1 张牌失去 1 生命（最多按层数算），然后减 1 层', '#9ad8ff', 'icons2/st_frost'],
  zap: ['麻痹', '回合开始时少 1 点能量，然后减 1 层', '#ffe14a', 'icons2/st_zap'],
  ppois: ['中毒', '回合开始时失去等同层数的生命，然后减 1 层', '#70d040'],
  scale: ['鳞甲', '受到的每次攻击伤害减少等同层数（最多减一半）；一次受到 10 点以上的攻击会打碎 1 层', '#b0a080', 'icons2/st_scale'],
  hatch: ['孵化', '归零时孵化成幼龙', '#ffb060'], grow: ['成长', '归零时长成满血的成龙', '#ff9040'],
  heads: ['头', '每个头咬一口', '#60c0a0'], chg: ['蓄力', '下回合放出龙息。这回合内受到足够伤害就会被打断', '#ffffff', 'icons2/st_chg'],
  wing: ['飞翼', '这回合第一次受到的伤害减半', '#c0a0ff'],
};
export const R3 = {
  slayer: { act3: 1, name: '屠龙者勋章', icon: 'icons2/r_slayer', rar: 'u', desc: '对蓄力中的敌人造成的伤害 +30%。' },
  dscale: { act3: 1, name: '龙鳞护符', icon: 'icons2/r_dscale', rar: 'c', desc: '每场战斗开始时，你获得 3 层鳞甲（每次受到的攻击伤害 -1）。' },
  stove: { act3: 1, name: '雪山暖炉', icon: 'icons2/r_stove', rar: 'c', desc: '冻伤对你无效。营火休息多回复 10 点生命。' },
};
export const EV3 = [
  { title: '龙的宝藏', pic: 'c3_hoard', img: 'goldbag', text: '山洞深处堆满了金币和宝物，空气里还残留着龙的气息。',
    opts: [{ t: '拿走宝堆：+200 金币，牌组加入一张「龙之怨」', go: (R, A) => { A.gold(200); A.curse('grudge'); return '金币沉甸甸的，背后却凉飕飕的。'; } },
      { t: '只拿一件：随机秘宝，失去 12 生命', go: (R, A) => { A.hurt(12); const n = A.relic(); return `你被落下的冰锥划伤，但拿到了「${n}」。`; } },
      { t: '离开', go: () => '你没敢多看一眼。' }] },
  { title: '龙蛋巢', pic: 'c3_nest', img: 'ic_crystal', text: '岩缝里有一窝还没孵化的龙蛋，摸上去是温热的。',
    opts: [{ t: '打碎蛋：选一张稀有卡', go: (R, A) => { A.rareCard(); return '蛋壳里流出金色的光。'; } },
      { t: '带走一颗蛋：最大生命 +6', go: (R, A) => { A.maxHp(6); A.heal(6); return '蛋在怀里暖暖的，好像在回应你。'; } },
      { t: '离开', go: () => '你轻手轻脚地走开了。' }] },
  { title: '冰封的冒险者', pic: 'c3_frozen', img: 'ic_hammer', text: '冰墙里冻着一个冒险者，手里还攥着一样东西。',
    opts: [{ t: '凿开冰：失去 8 生命，得到随机秘宝', go: (R, A) => { A.hurt(8); const n = A.relic(); return `冰块碎开，你拿到了「${n}」。`; } },
      { t: '翻他的背包：+60 金币', go: (R, A) => { A.gold(60); return '背包里还有一些金币。'; } },
      { t: '离开', go: () => '你为他默哀了一会儿。' }] },
  { title: '龙人隐者', pic: 'c3_hermit', img: 'ic_rune', text: '一个白胡子的龙人坐在山洞里，似乎在等你。',
    opts: [{ t: '拜师：升级 2 张牌', go: (R, A) => { A.pick('upgrade', 2); return '隐者点了点头。'; } },
      { t: '请他看牌：删除 1 张牌', go: (R, A) => { A.pick('remove', 1); return '「这张，用不上了。」'; } },
      { t: '离开', go: () => '你向他行了一礼。' }] },
  { title: '雪山温泉', pic: 'c3_spring', img: 'pot', text: '雪地里冒着热气的温泉，看着就很舒服。',
    opts: [{ t: '泡一泡：回复 30% 生命', go: (R, A) => { A.heal(Math.floor(R.maxHp * .3)); return '浑身都暖起来了。'; } },
      { t: '洗去疲惫：最大生命 +4', go: (R, A) => { A.maxHp(4); return '身体轻了不少。'; } }] },
];

/* 双方引擎共用的规则：api = { has, loseHp(n), energy(n) } */
export const CORE3 = {
  /* 伤害结算前（扣格挡之前）调整数值 */
  pre(B, tgt, amt, isP, attacker, has) {
    if (amt <= 0) return amt;
    if (!isP && attacker === B.p && tgt.chg && has('slayer')) amt = Math.floor(amt * 1.3);
    if (!isP && tgt.st.wing) { amt = Math.ceil(amt / 2); tgt.st.wing = 0; }
    const sc0 = tgt.st.scale || 0, sc = !isP && attacker === B.p && B.p.halfScale ? Math.ceil(sc0 / 2) : sc0; if (sc && !(isP ? false : B.p.pierceS && attacker === B.p)) { const raw = amt; amt = Math.max(Math.ceil(amt / 2), amt - sc); if (raw >= 10) { tgt.st.scale = sc0 - 1; if (!tgt.st.scale) delete tgt.st.scale; } }
    return amt;
  },
  after(tgt, left, isP, attacker, B) { if (isP) return; tgt.dmgT = (tgt.dmgT || 0) + left; tgt.lastHit = left; tgt.hitByP = attacker === B.p; },
  pStart(B, api) { const s = B.p.st;
    B.p.zc = 0; B.p.pierceS = 0; B.pc = B.pc || {};
    for (const e of B.en) { e.dmgT = 0; }
    if (s.zap) { B.p.energy = Math.max(0, B.p.energy - 1); s.zap--; if (!s.zap) delete s.zap; }
    if (s.ppois) { api.loseHp(s.ppois); s.ppois--; if (!s.ppois) delete s.ppois; }
  },
  pEnd(B, api) { const s = B.p.st;
    if (s.frost) { if (!api.has('stove')) { const k = Math.min(s.frost, B.hand.length); if (k) api.loseHp(k); } s.frost--; if (!s.frost) delete s.frost; }
    if (s.pburn) { api.loseHp(s.pburn); s.pburn--; if (!s.pburn) delete s.pburn; }
  },
  battleStart(B, has, R) { B.p.halfScale = R.char === 'hero' ? 1 : 0; if (has('dscale')) B.p.st.scale = 3; if (R.trials) { if (R.trials.includes('scale')) B.en.forEach(e => e.block = 5); if (R.trials.includes('cold')) B.p.st.frost = 1; } },
};

/* 无尽模式：每层开始三选一的「天之试炼」 */
export const TRIALS = {
  scale: { name: '鳞甲', bad: '所有敌人开局带 5 点格挡', good: '选一张稀有卡' },
  blood: { name: '龙血', bad: '精英生命 +25%', good: '获得一个随机秘宝' },
  cold: { name: '寒潮', bad: '每场战斗开局你带 1 层冻伤', good: '删除 2 张牌' },
  greed: { name: '贪婪', bad: '商店涨价 50%', good: '立刻 +150 金币' },
  wind: { name: '狂风', bad: '每场第 1 回合少抽 1 张', good: '升级 2 张牌' },
  hunger: { name: '饥饿', bad: '营火休息回血 -15%', good: '最大生命 +10' },
  swarm: { name: '群龙', bad: '普通战斗多一颗龙蛋', good: '获得 2 瓶药水' },
  tyrant: { name: '强敌', bad: 'Boss 攻击 +15%', good: '下一个 Boss 多掉一个秘宝' },
};
export const endlessMul = n => ({ hp: 1 + .12 * n, dmg: 1 + .08 * n });
