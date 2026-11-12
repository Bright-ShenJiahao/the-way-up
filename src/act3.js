/* 第三章「永冬之巅」+ 守门 Boss「开发者」+ 无尽模式「天外之塔」
   敌人用的 B 接口（game.js 和 tools/sim.mjs 各有一份，名字一致）：
   applyP addSt eBlock healE summon say alive allies
   以及本章新加的：transform addHand discardRand swapHigh flipRand nerfTop zc handTypes hitP */
const cycle = (e, list) => list[e.turn % list.length];
const ELEM = { fire: 'd_fire', frost: 'd_frost', storm: 'd_storm', venom: 'd_venom', water: 'd_water' };
const TINT = { fire: '', frost: 'hue-rotate(185deg) saturate(.8) brightness(1.15)', storm: 'hue-rotate(250deg) saturate(1.2)', venom: 'hue-rotate(95deg) saturate(.9) brightness(.85)', water: 'hue-rotate(160deg) saturate(1.3)' };
/* 蓄力：蓄力那个回合（玩家回合）里受到 ≥ brk 的伤害，龙息就被打断 */
const charge = (pose = 'atk0') => ({ n: '蓄力', i: 'buff', f: e => { e.chg = 1; e.st.chg = 1; e.pose = pose; } });
function breathTurn(e, B, big, small) { /* onTurn 里调用：决定龙息是否被打断 */
  if (e.move !== big) return; const ok = e.chg && (e.dmgT || 0) < e.d.brk; e.chg = 0; delete e.st.chg; e.pose = null;
  if (!ok) { e.move = small; B.say('（龙息被打断了！）'); }
}
const elemOf = B => { const d = B.alive().find(a => a.elem); return d ? d.elem : ['frost', 'storm', 'water', 'fire'][Math.floor(Math.random() * 4)]; };
const dragon = (elem, o) => ({ name: o.name, hp: o.hp, sc: 2.4, hd: o.hd || 250, brk: 15, elemD: elem, dragon: 1, rage: 1, art: o.art, tint: o.tint, poses: o.poses, lore: o.lore, init: e => { e.elem = elem; o.init && o.init(e); }, onCard: o.onCard, onPTurn: o.onPTurn, after: o.after,
  moves: { main: o.main, charge: charge(), breath: { ...o.breath, br: 1 }, fizzle: { n: '小股龙息', i: 'atk', d: o.fizzle } },
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
  d_storm: dragon('storm', { name: '雷龙', hp: [42, 46], hd: 255, lore: '雷龙。你每打出一张非攻击牌，它就积 1 层静电（最多 3 层），每层让下一次雷爪多抓一下。龙息会让你麻痹（下回合少 1 点能量）。',
    onCard: (e, type) => { if (type !== 'atk' && (e.st.static || 0) < 3) { e.st.static = (e.st.static || 0) + 1; e.xb = e.st.static; } },
    after: e => { if (e.move === 'main') { delete e.st.static; e.xb = 0; } },
    main: { n: '雷爪', i: 'atk', d: 6, x: 2 }, breath: { n: '雷霆龙息', i: 'atkdebuff', d: 18, f: (e, B) => B.applyP('zap', 1) }, fizzle: 6 }),
  d_venom: dragon('venom', { name: '毒沼龙', hp: [48, 52], hd: 230, lore: '毒沼龙。身上全是毒鳞：每次被你攻击，你也中毒 1 层。',
    main: { n: '毒牙', i: 'atkdebuff', d: 8, f: (e, B) => B.applyP('ppois', 3) }, breath: { n: '毒雾龙息', i: 'atkdebuff', d: 10, f: (e, B) => B.applyP('ppois', 5) }, fizzle: 4,
    onHurt: (e, B) => { if (e.hitByP) B.applyP('ppois', 1); } }),
  d_wyvern: { name: '双足飞龙', dragon: 1, hp: [30, 34], sc: 2.2, hd: 250, lore: '一直飞在半空。每回合第一次受到的伤害减半。',
    init: e => { e.st.wing = 1; }, moves: { dive: { n: '俯冲', i: 'atk', d: 12 }, sting: { n: '尾刺', i: 'atkdebuff', d: 5, f: (e, B) => B.applyP('ppois', 2) } },
    onTurn: e => { e.st.wing = 1; }, ai: e => cycle(e, ['dive', 'sting']) },
  d_rock: { name: '岩甲龙', dragon: 1, hp: [58, 62], sc: 2.4, hd: 240, lore: '浑身岩甲，鳞甲最多叠到 6 层。每层让你每次攻击少 1 点伤害，一下打出 10 点以上能敲碎 1 层。',
    init: e => { e.st.scale = 3; }, moves: { harden: { n: '硬化', i: 'def', f: (e, B) => { if ((e.st.scale || 0) < 6) B.addSt(e, 'scale', Math.min(2, 6 - (e.st.scale || 0))); B.eBlock(e, 10); e.pose = 'guard'; } }, ram: { n: '撞击', i: 'atk', d: 15 } },
    onTurn: e => { e.pose = null; }, ai: e => cycle(e, ['harden', 'ram']) },
  dk_warrior: { name: '龙人战士', dragon: 1, hp: [54, 58], sc: 2.3, hd: 230, lore: '人形时连砍两刀，化龙后一爪很重、化龙那一下还会加 12 点格挡。意图里会提前写「化龙」。',
    init: e => { e.form = 'h'; },
    moves: { slash: { n: '双刃', i: 'atk', d: 7, x: 2 }, roar: { n: '战吼', i: 'buff', f: (e, B) => B.addSt(e, 'str', 2) },
      toD: { n: '化龙', i: 'buff', f: (e, B) => { e.form = 'd'; e.art = 'dk_warrior_d'; e.hd = 290; for (const k of ['weak', 'vuln', 'poison']) delete e.st[k]; B.eBlock(e, 12); } },
      claw: { n: '龙爪', i: 'atk', d: 18 }, toH: { n: '化人', i: 'def', f: (e, B) => { e.form = 'h'; e.art = null; e.hd = null; B.eBlock(e, 8); } } },
    ai: e => cycle(e, ['slash', 'roar', 'toD', 'claw', 'claw', 'toH']) },
  dk_mage: { name: '龙人术士', dragon: 1, hp: [44, 48], sc: 2.2, hd: 235, brk: 15, lore: '人形时给队友加护盾、扔火球；生命低于一半会强制化龙，从此每两回合一口龙息。',
    init: e => { e.form = 'h'; },
    moves: { shield: { n: '龙鳞护盾', i: 'def', f: (e, B) => { B.alive().forEach(a => B.eBlock(a, 8)); e.pose = 'cast'; } }, fireball: { n: '火球', i: 'atk', d: 9 },
      toD: { n: '化龙', i: 'buff', f: (e, B) => { e.form = 'd'; e.art = 'dk_mage_d'; e.hd = 265; e.dturn = e.turn + 1; for (const k of ['weak', 'vuln', 'poison']) delete e.st[k]; } },
      charge: charge(), breath: { n: '龙息', i: 'atkdebuff', d: 20, br: 1, f: (e, B) => B.applyP('pburn', 2) }, fizzle: { n: '小股龙息', i: 'atk', d: 6 } },
    onTurn: (e, B) => { if (e.pose === 'cast') e.pose = null; breathTurn(e, B, 'breath', 'fizzle'); },
    ai: e => e.form === 'd' ? ((e.turn - e.dturn) % 2 === 0 ? 'charge' : 'breath') : e.hp < e.max / 2 ? 'toD' : cycle(e, ['shield', 'fireball']) },
  d_twin: { name: '双头龙', dragon: 1, hp: [125, 130], sc: 2.7, hd: 300, elite: 1, lore: '一火一冰两个头。生命掉到一半时会被砍掉一个头，剩下那个会暴怒（力量 +5、回 15 血）。',
    moves: { fire: { n: '火息', i: 'atkdebuff', d: 12, af: ['atk0'], f: (e, B) => B.applyP('pburn', 2) }, ice: { n: '冰咬', i: 'atkdebuff', d: 10, af: ['atk1'], f: (e, B) => B.applyP('frost', 2) } },
    onHurt: (e, B) => { if (!e.cut && e.hp <= e.max / 2) { e.cut = Math.random() < .5 ? 'fire' : 'ice'; e.pose = e.cut; B.addSt(e, 'str', 5); B.healE(e, 15); B.say(e.cut === 'fire' ? '（冰头被砍下，火头暴怒了！）' : '（火头被砍下，冰头暴怒了！）'); } },
    ai: e => e.cut || cycle(e, ['fire', 'ice']) },
  d_hydra: { name: '九头蛇', dragon: 1, hp: [118, 122], sc: 2.7, hd: 300, elite: 1, lore: '每个头咬一口。每掉 20 血砍掉一个头，但会长出两个；它身上有灼烧，或者那一下打了 15 点以上，就不会再长。',
    init: e => { e.st.heads = 3; e.xb = 2; e.mark = e.max; },
    moves: { bite: { n: '群咬', i: 'atk', d: 4, x: 1 }, regen: { n: '再生', i: 'buff', f: (e, B) => B.healE(e, 10) } },
    onHurt: (e, B) => { while (e.hp > 0 && e.hp <= e.mark - 20) { e.mark -= 20; const stop = (e.st.fburn || 0) > 0 || (e.lastHit || 0) >= 15; e.st.heads = Math.max(1, Math.min(6, e.st.heads + (stop ? -1 : 1))); e.xb = e.st.heads - 1; B.say(stop ? '（断口烧焦了，长不出来！）' : '（砍掉一个，长出两个！）'); } },
    ai: e => e.turn % 3 === 2 ? 'regen' : 'bite' },
  dk_elder: { name: '龙人长老', dragon: 1, hp: [128, 132], sc: 2.6, hd: 255, elite: 1, brk: 20, lore: '三种形态轮换：人形召唤龙蛋、半龙形加攻、龙形蓄力龙息。',
    init: e => { e.form = 'h'; },
    moves: { summon: { n: '唤蛋', i: 'summon', f: (e, B) => { e.art = null; e.hd = null; e.tint = null; e.pose = 'cast'; if (B.alive().length < 4) B.summon('d_egg'); B.eBlock(e, 8); } },
      half: { n: '半龙化', i: 'buff', f: (e, B) => { e.pose = null; e.tint = 'sepia(.6) saturate(2) brightness(1.15) drop-shadow(0 0 10px #ffd060)'; B.addSt(e, 'str', 3); } },
      claws: { n: '龙爪', i: 'atk', d: 10, x: 2 },
      charge: { n: '化龙·蓄力', i: 'buff', f: e => { e.tint = null; e.art = 'dk_elder_d'; e.hd = 300; e.chg = 1; e.st.chg = 1; e.pose = 'atk0'; } },
      breath: { n: '古龙之息', i: 'atkdebuff', d: 28, br: 1, f: (e, B) => B.applyP('frost', 2) }, fizzle: { n: '小股龙息', i: 'atk', d: 9 } },
    onTurn: (e, B) => { if (e.pose === 'cast') e.pose = null; breathTurn(e, B, 'breath', 'fizzle'); },
    ai: e => cycle(e, ['summon', 'half', 'claws', 'charge', 'breath']) },
  d_boss: { name: '紫瞳霜龙', hp: [320, 320], sc: 3, hd: 330, boss: 1, dragon: 1, brk: 30, deadArt: 'd_boss_fly', lore: '守着世界之门的远古霜龙。是它把你们叫到这个世界来的。生命掉到一半会飞上天。',
    intro: '「异界的孩子们……是我把你们叫来的。门的那一边，有东西要出来了。」',
    moves: { hatch: { n: '唤雏', i: 'summon', f: (e, B) => { for (let k = 0; k < 2 && B.alive().length < 3; k++) { const w = B.summon('d_whelp', 18); if (w) { w.elem = 'frost'; w.tint = TINT.frost; } } } },
      claw: { n: '冰爪', i: 'atk', d: 12, x: 2 }, charge: charge('charge'),
      breath: { n: '紫霜龙息', i: 'atkdebuff', d: 30, br: 1, af: ['breath'], f: (e, B) => B.applyP('frost', 3) }, fizzle: { n: '寒气', i: 'atk', d: 10, af: ['breath'] },
      scales: { n: '冰甲', i: 'def', f: (e, B) => B.eBlock(e, 22) },
      fcharge: charge('idle1'), fbreath: { n: '极寒吐息', i: 'atkdebuff', d: 22, br: 1, af: ['atk1'], f: (e, B) => B.applyP('frost', 2) }, ffizzle: { n: '寒气', i: 'atk', d: 8, af: ['atk1'] },
      dive: { n: '俯冲', i: 'atk', d: 16, af: ['atk0'] } },
    onHurt: (e, B) => { if (!e.p2 && e.hp <= e.max / 2 && e.hp > 0) { e.p2 = 1; e.art = 'd_boss_fly'; e.st.fly = 3; e.chg = 0; delete e.st.chg; e.pose = null; e.t2 = e.turn + 1; B.say(B.sylvie ? '「留下来吧，幼崽。这座山本该是你的。」' : '「那就让我看看——你们能爬多高。」'); } },
    onTurn: (e, B) => { if (e.p2) { if (e.grounded) { e.grounded = 0; e.st.fly = 3; return 'skip'; } e.st.fly = 3; breathTurn(e, B, 'fbreath', 'ffizzle'); } else breathTurn(e, B, 'breath', 'fizzle'); },
    onDie: (e, B) => B.say(B.sylvie ? '「幼崽……替我，守住这扇门。」' : '「……拦住它。只有你们，能从这扇门走回去。」'),
    ai: e => e.p2 ? cycle({ turn: e.turn - (e.t2 || 0) }, ['fcharge', 'fbreath', 'dive']) : cycle(e, ['hatch', 'claw', 'charge', 'breath', 'scales']) },
  dev_boss: { name: '开发者', hd: 290, hp: [260, 260], sc: 2.6, boss: 1, lore: '这个游戏的作者。他能看你的手牌、改你的牌，每轮 7 个动作做完还会「加班」力量 +2。弱点：一回合打出 3 张 0 费牌，他就会「程序报错」晕一回合。',
    intro: '「这一关……其实我自己都没打过。」',
    moves: { peek: { n: '偷看', i: 'unknown' }, peekDef: { n: '看穿', i: 'def', f: (e, B) => B.eBlock(e, 18) }, peekHit: { n: '看穿', i: 'atk', d: 17 },
      keys: { n: '键盘连打', i: 'atk', d: 8, x: 3 },
      swap: { n: '换牌', i: 'debuff', f: e => { e.pend = 'swap'; e.pose = 'cast'; } },
      del: { n: 'Delete', i: 'atkdebuff', d: 12, f: e => { e.pend = 'del'; } },
      patch: { n: '平衡补丁', i: 'debuff', f: (e, B) => { e.pose = 'cast'; const n = B.nerfTop(3); B.say(n ? `「「${n}」太强了，削。」` : '「嗯……没什么好削的。」'); } },
      flip: { n: '敲回车', i: 'atkdebuff', d: 14, f: e => { e.pend = 'flip'; } },
      debug: { n: '调试召唤', i: 'summon', f: (e, B) => { e.pose = 'cast'; const m = B.summon(Math.random() < .5 ? 'gob_king' : 'wolf_lord', 45); if (m) { m.mini = 1; m.hd = 200; } B.say('「调试一下……」'); } },
      demand: { n: '需求变更', i: 'atk', d: 24 } },
    onPTurn: (e, B) => { e.bugT = 0;
      if (e.move === 'peek') { const h = B.handTypes(); e.move = h.atk >= h.skill ? 'peekDef' : 'peekHit'; B.say('「你手里的牌，我都看到了。」'); }
      if (e.pend === 'swap') { const n = B.swapHigh(); if (n) B.say(`「「${n}」借我用用。」`); }
      if (e.pend === 'del') { B.discardRand(2); B.say('「这两张，删了。」'); }
      if (e.pend === 'flip') { B.flipRand(); B.say('「这张……正负反过来试试。」'); }
      e.pend = null; },
    onCard: (e, type, B) => { if (!e.bugT && !e.stun && B.zc() >= 3) { e.bugT = 1; e.stun = 1; B.say('「程序报错了？！」'); } },
    onHurt: (e, B) => { if (!e.z && e.hp > 0 && e.hp <= e.max / 2) { e.z = 1; B.healE(e, Math.floor(e.max * .3)); B.addSt(e, 'str', 1); B.addHand('bugcard', 2); B.say('「这个数值不对……Ctrl+Z。」'); } },
    onTurn: (e, B) => { if (e.turn > 0 && e.turn % 7 === 0 && e.otT !== e.turn) { e.otT = e.turn; B.addSt(e, 'str', 2); B.say('「今晚又要加班了……」'); } if (e.stun) { e.stun = 0; e.pose = 'stun'; return 'skip'; } e.pose = null; },
    onDie: (e, B) => B.say('「行，你们比我会玩。……不过门那边漏出来的东西，我也没写过。小心。」'),
    ai: (e, B) => { const m = cycle(e, ['peek', 'keys', 'swap', 'del', 'patch', 'flip', 'debug']); return m === 'debug' && B.alive().some(a => a.mini) ? 'demand' : m; } },
  /* ---------- 龙族（新） ---------- */
  d_water: { name: '水龙', hp: [52, 56], sc: 2.4, hd: 270, brk: 15, dragon: 1, rage: 1, poses: ['charge'],
    lore: '水龙。涨潮那回合打它 15 点以上能打断巨浪；巨浪打中后，你下回合会被冲走 1 张手牌。',
    init: e => { e.elem = 'water'; },
    moves: { tail: { n: '水尾', i: 'atkdef', d: 9, f: (e, B) => B.eBlock(e, 6) }, charge: { n: '涨潮', i: 'buff', f: e => { e.chg = 1; e.st.chg = 1; e.pose = 'charge'; } },
      breath: { n: '巨浪', i: 'atkdebuff', d: 17, br: 1, f: e => { e.pend = 'wash'; } }, fizzle: { n: '浪花', i: 'atk', d: 6 } },
    onTurn: (e, B) => breathTurn(e, B, 'breath', 'fizzle'),
    onPTurn: (e, B) => { if (e.pend === 'wash') { e.pend = null; B.discardRand(1); B.say('（一张牌被浪卷走了！）'); } },
    ai: e => cycle(e, ['tail', 'charge', 'breath']) },
  d_black: { name: '黑龙', hp: [56, 60], sc: 2.5, hd: 285, dragon: 1, rage: 1, poses: ['shade'],
    lore: '黑龙。每三回合潜入暗影一次：潜行期间你每一下最多只能打 1 点（中毒照常）。暗影龙息会腐蚀你：下回合结束时格挡减半。',
    moves: { claw: { n: '暗爪', i: 'atk', d: 12 }, breath: { n: '暗影龙息', i: 'atkdebuff', d: 14, br: 1, f: (e, B) => B.applyP('corrode', 1) },
      shade: { n: '暗影潜行', i: 'buff', f: (e, B) => { B.addSt(e, 'shade', 1); e.pose = 'shade'; } } },
    onTurn: e => { delete e.st.shade; e.pose = null; },
    ai: e => cycle(e, ['claw', 'breath', 'shade']) },
  d_bone: { name: '骨龙', hp: [118, 124], sc: 2.8, hd: 320, elite: 1, dragon: 1, rage: 1, poses: ['revive'],
    lore: '不死的骨龙。第一次被打死会带 30% 生命重新拼起来——除非它死的时候身上有灼烧或中毒。会唤起骷髅护卫，龙息让你虚弱又易伤。',
    moves: { raise: { n: '唤骨', i: 'summon', f: (e, B) => { if (B.alive().length < 2) { const s = B.summon('skeleton', 20); if (s) s.mini = 1; } } },
      bite: { n: '骨咬', i: 'atk', d: 14 }, breath: { n: '灵魂龙息', i: 'atkdebuff', d: 12, br: 1, f: (e, B) => { B.applyP('weak', 1); B.applyP('vuln', 1); } } },
    onDie: (e, B) => { if (!e.revived && !e.diedPoison && !(e.st.fburn || 0) && !(e.st.poison || 0)) { B.revive(e, .3); e.pose = 'revive'; B.say('（散落的骨头被绿火拉了起来！）'); } },
    onTurn: e => { e.pose = null; },
    ai: e => cycle(e, ['raise', 'bite', 'breath', 'bite']) },
  d_holy: { name: '圣龙', hp: [138, 144], sc: 2.8, hd: 300, elite: 1, dragon: 1, rage: 1, poses: ['shield', 'cast'],
    lore: '神圣的白金巨龙。圣盾能完全挡下你的第一下攻击。审判：你上回合每打出一张牌，它就多打你一下（每下 4 点）。还会治疗、加护队友。',
    moves: { shield: { n: '圣盾', i: 'def', f: (e, B) => { B.addSt(e, 'hshield', 1); B.eBlock(e, 10); e.pose = 'shield'; } }, claw: { n: '圣爪', i: 'atk', d: 13 },
      judge: { n: '审判', i: 'atk', d: 4, x: 1 }, heal: { n: '圣愈', i: 'buff', f: (e, B) => { e.pose = 'cast'; B.alive().forEach(a => { B.healE(a, a === e ? 16 : 10); if (a !== e) B.eBlock(a, 8); }); } } },
    onTurn: e => { if (e.pose === 'cast' || !e.st.hshield) e.pose = null; },
    onPTurn: e => { e.cc = 0; e.xb = e.move === 'judge' ? -1 : 0; },
    onCard: e => { e.cc = (e.cc || 0) + 1; if (e.move === 'judge') e.xb = e.cc - 1; },
    ai: e => cycle(e, ['shield', 'claw', 'judge', 'heal']) },
  d_arch: { name: '大法师龙', hp: [136, 142], sc: 2.8, hd: 320, elite: 1, dragon: 1, rage: 1, poses: ['cast', 'meteor', 'mirror'],
    lore: '披着法袍的老龙。你每打出一张技能牌，它就积 1 点法力；攒满 4 点会立刻改念大魔法：陨石、镜像或奥术飞弹（意图会变）。',
    init: e => { e.st.mana = 0; },
    moves: { staff: { n: '法杖', i: 'atk', d: 11 }, circle: { n: '魔法阵', i: 'def', f: (e, B) => { B.eBlock(e, 12); B.addSt(e, 'mana', 1); e.pose = 'cast'; } },
      meteor: { n: '陨石', i: 'atkdebuff', d: 30, br: 1, af: ['meteor', 'atk1'], f: (e, B) => { e.st.mana = 0; e.pose = null; B.applyP('pburn', 2); } },
      mirror: { n: '镜像', i: 'summon', f: (e, B) => { e.st.mana = 0; e.pose = 'mirror'; for (let k = 0; k < 2 && B.alive().length < 4; k++) B.summon('d_mirror'); } },
      missile: { n: '奥术飞弹', i: 'atk', d: 4, x: 5, f: e => { e.st.mana = 0; } } },
    onCard: (e, type, B) => { if (type === 'atk' || e.spell) return; e.st.mana = (e.st.mana || 0) + 1; if (e.st.mana >= 4) { e.spell = 1; e.move = ['meteor', 'mirror', 'missile'][Math.floor(Math.random() * 3)]; if (e.move === 'meteor') e.pose = 'meteor'; B.say('（法力满了，它改念了大魔法！）'); } },
    after: e => { if (['meteor', 'mirror', 'missile'].includes(e.move)) e.spell = 0; },
    onTurn: e => { if (e.pose !== 'meteor') e.pose = null; },
    ai: e => (e.st.mana || 0) >= 4 ? (e.spell = 1, ['meteor', 'mirror', 'missile'][e.turn % 3]) : cycle(e, ['staff', 'circle']) },
  d_mirror: { name: '镜像', hp: [16, 16], sc: 2.4, hd: 300, art: 'd_arch', tint: 'opacity(.55) hue-rotate(20deg) brightness(1.3)', poses: [], lore: '大法师龙的幻影，会放奥术飞弹。',
    moves: { bolt: { n: '奥术飞弹', i: 'atk', d: 3, x: 3 } }, ai: () => 'bolt' },
  /* ---------- 恶魔（魔界裂隙） ---------- */
  d_imp: { name: '小恶魔', hp: [17, 19], sc: 2.8, hd: 160, poses: [], demon: 1,
    lore: '抱着一张被锁链缠住的牌。它出现后会封印你手里一张牌，直到它死掉。',
    moves: { claw: { n: '抓挠', i: 'atk', d: 5 } },
    onPTurn: (e, B) => { if (!e.sealed) { e.sealed = 1; const n = B.seal(e); if (n) B.say(`（小恶魔把「${n}」锁住了！）`); } },
    onDie: (e, B) => B.unseal(e), ai: () => 'claw' },
  d_succubus: { name: '梦魔', hp: [46, 50], sc: 2.5, hd: 300, poses: ['cast'], demon: 1,
    lore: '提着摇铃灯笼的梦魔。每两回合让你多 1 层睡意：每层下回合少抽 1 张牌，攒到 3 层你会睡着一回合（没有能量）。你一下打出 15 点以上能驱散 1 层。',
    moves: { lull: { n: '催眠', i: 'debuff', f: (e, B) => { B.applyP('drowsy', 1); e.pose = 'cast'; } }, claw: { n: '梦爪', i: 'atk', d: 10 },
      drain: { n: '吸取', i: 'atk', d: 8, f: (e, B) => B.healE(e, 8) } },
    onTurn: e => { e.pose = null; },
    ai: e => cycle(e, ['lull', 'claw', 'lull', 'drain']) },
  d_cerberus: { name: '地狱三头犬', heads3: 1, hp: [96, 96], sc: 2.4, hd: 280, poses: [], demon: 1,
    lore: '三个头的血是分开的：一下打得再狠，也只能打掉当前这个头剩下的血。每个活着的头都会咬你一口；只剩一个头时会狂暴。',
    init: e => { e.st.heads = 3; e.xb = 2; },
    moves: { bite: { n: '三头撕咬', i: 'atk', d: 7, x: 1 }, fire: { n: '地狱火息', i: 'atkdebuff', d: 5, x: 1, f: (e, B) => B.applyP('pburn', 1) } },
    onHurt: (e, B) => { const seg = e.max / 3, h = Math.max(1, Math.ceil(e.hp / seg - 1e-9)); if (h < e.st.heads) { e.st.heads = h; e.xb = h - 1; e.art = h === 3 ? null : 'd_cerberus' + h; if (h === 1) { B.addSt(e, 'str', 3); B.say('（只剩一个头了，它狂暴起来！）'); } else B.say('（一个头被打掉了！）'); } },
    onTurn: (e, B) => { e.d.onHurt(e, B); }, /* 中毒掉的血也要掉头 */
    ai: e => cycle(e, ['bite', 'bite', 'fire']) },
  d_contract: { name: '契约恶魔', hp: [118, 124], sc: 2.6, hd: 300, elite: 1, poses: ['cast'], demon: 1,
    lore: '彬彬有礼的恶魔商人。每两回合用契约偷走你 1 点力量（打死它会还给你），血剑打中你时会吸血。',
    moves: { contract: { n: '契约', i: 'debuff', f: (e, B) => { e.pose = 'cast'; B.applyP('str', -1); B.addSt(e, 'str', 1); e.took = (e.took || 0) + 1; } },
      blade: { n: '血剑', i: 'atk', d: 14, f: (e, B) => B.healE(e, 10) }, ink: { n: '血墨', i: 'def', f: (e, B) => B.eBlock(e, 14) } },
    onDie: (e, B) => { if (e.took) { B.applyP('str', e.took); B.say('（契约烧成了灰，被偷走的力量回来了。）'); } },
    onTurn: e => { e.pose = null; },
    ai: e => cycle(e, ['contract', 'blade', 'contract', 'ink']) },
  d_abyss: { name: '深渊领主', hp: [150, 156], sc: 2.9, hd: 340, elite: 1, poses: ['cast'], demon: 1,
    lore: '深渊的领主。会把你的一张牌封印到战斗结束，每两回合召唤一只小恶魔，地狱火会让你灼烧 3 层。',
    moves: { seal: { n: '深渊封印', i: 'debuff', f: (e, B) => { e.pend = 'seal'; B.eBlock(e, 10); e.pose = 'cast'; } }, summon: { n: '召唤小恶魔', i: 'summon', f: (e, B) => { e.pose = 'cast'; if (B.alive().length < 4) B.summon('d_imp'); } },
      hellfire: { n: '地狱火', i: 'atkdebuff', d: 14, f: (e, B) => B.applyP('pburn', 3) }, smash: { n: '战锤', i: 'atk', d: 20 } },
    onPTurn: (e, B) => { if (e.pend === 'seal') { e.pend = null; const n = B.seal(e, 1); if (n) B.say(`（「${n}」被封印到战斗结束！）`); } },
    onTurn: e => { e.pose = null; },
    ai: e => cycle(e, ['seal', 'summon', 'hellfire', 'summon', 'smash', 'summon']) },
  demon_king: { name: '深渊之主', hp: [340, 340], sc: 3, hd: 380, boss: 1, brk: 30, demon: 1, poses: ['soul', 'charge', 'devour', 'night'],
    lore: '门那一边的魔王。召来的小恶魔会被它献祭成护盾；终焉审判蓄力时打它 30 点以上能打断。生命掉到一半会吞掉全部手下、卸甲进入二阶段。',
    intro: '「龙守着门，就是为了关住我。……谢谢你们，替我把门打开了。」',
    moves: { legion: { n: '召唤军团', i: 'summon', f: (e, B) => { for (let k = 0; k < 2 && B.alive().length < 4; k++) B.summon('d_imp'); } },
      sweep: { n: '深渊横扫', i: 'atk', d: 18 },
      soul: { n: '灵魂献祭', i: 'def', f: (e, B) => { const m = B.allies(e); m.forEach(a => B.kill(a)); B.eBlock(e, 12 + 14 * m.length); if (m.length) B.addSt(e, 'str', m.length); e.pose = 'soul'; } },
      charge: { n: '终焉蓄力', i: 'buff', f: e => { e.chg = 1; e.st.chg = 1; e.pose = 'charge'; } }, judge: { n: '终焉审判', i: 'atk', d: 34, br: 1 }, fizzle: { n: '残响', i: 'atk', d: 12 },
      slash: { n: '双刃连斩', i: 'atk', d: 8, x: 3 }, night: { n: '永夜降临', i: 'debuff', f: (e, B) => { e.pend = 'night'; B.applyP('weak', 1); e.pose = 'night'; } },
      aseal: { n: '深渊封印', i: 'atkdebuff', d: 12, f: e => { e.pend = 'seal'; } }, exec: { n: '处刑', i: 'atkdebuff', d: 22, f: (e, B) => B.applyP('pburn', 3) } },
    onHurt: (e, B) => { if (!e.p2 && e.hp > 0 && e.hp <= e.max / 2) { e.p2 = 1; e.chg = 0; delete e.st.chg; e.art = 'demon_king2'; e.pose = null; e.t2 = e.turn + 1;
      const m = B.allies(e); m.forEach(a => B.kill(a)); if (m.length) B.healE(e, 20 * m.length); B.addSt(e, 'str', 2); B.say(B.sylvie ? '「霜龙的孩子？……那条老龙，连自己的孩子都送来了啊。」' : '「好久没有人让我脱下这身铠甲了。」'); } },
    onTurn: (e, B) => { if (e.pose !== 'charge') e.pose = null; if (!e.p2) breathTurn(e, B, 'judge', 'fizzle'); },
    onPTurn: (e, B) => { if (e.pend === 'night') { B.discardRand(2); B.say('「永夜降临。」'); } if (e.pend === 'seal') { const n = B.seal(e, 1); if (n) B.say(`（「${n}」被封印了！）`); } e.pend = null; },
    onDie: (e, B) => B.say('「门……还会再开的。下一次，我会……」'),
    ai: e => e.p2 ? cycle({ turn: e.turn - (e.t2 || 0) }, ['slash', 'night', 'exec', 'slash', 'aseal']) : cycle(e, ['legion', 'sweep', 'soul', 'charge', 'judge']) },
};
/* 逆鳞：带 rage 的龙第一次掉到一半血，力量 +3，你被龙威压制 */
for (const d of Object.values(E3)) if (d.rage) { const oh = d.onHurt; d.onHurt = (e, B) => { if (!e.rev && e.hp > 0 && e.hp <= e.max / 2) { e.rev = 1; B.addSt(e, 'str', 3); B.applyP('dread', 2); B.say('（逆鳞被触动了！龙威压得你出手发软。）'); } if (oh) oh(e, B); }; }

export const ENC3 = {
  easy: [['d_egg', 'd_egg'], ['d_whelp', 'd_whelp', 'd_whelp'], ['d_frost'], ['d_water'], ['d_storm']],
  hard: [['d_black'], ['d_water', 'd_whelp'], ['d_storm', 'd_egg'], ['dk_warrior'], ['dk_mage', 'dk_warrior'], ['d_frost', 'd_storm'], ['d_black', 'd_egg'], ['dk_mage', 'd_water']],
  elite: [['d_twin'], ['d_bone'], ['d_holy', 'd_whelp'], ['d_arch']],
  boss: [['dev_boss']],
};
/* 第三章下半：魔界裂隙（8 行短地图，尽头是紫瞳霜龙） */
export const RIFT = {
  easy: [['d_imp', 'd_imp', 'd_imp'], ['d_succubus'], ['d_imp', 'd_succubus']],
  hard: [['d_cerberus'], ['d_succubus', 'd_imp', 'd_imp'], ['d_cerberus', 'd_imp'], ['d_succubus', 'd_succubus']],
  elite: [['d_contract'], ['d_abyss']],
  boss: [['d_boss']],
};
/* 只在无尽模式出现的旧龙 */
export const ENC3X = {
  hard: [['d_fire'], ['d_venom', 'd_wyvern'], ['d_rock', 'd_egg'], ['d_wyvern', 'd_wyvern'], ['d_fire', 'd_frost']],
  elite: [['d_hydra'], ['dk_elder', 'd_egg']],
};
export const FINAL3 = 'demon_king', GATE3 = 'd_boss';

export const S3 = {
  pburn: ['灼烧', '回合结束时失去等同层数的生命，然后减 1 层', '#ff7a30', 'icons2/st_pburn'],
  frost: ['冻伤', '回合结束时，手里每剩 1 张牌失去 1 生命（最多按层数算），然后减 1 层', '#9ad8ff', 'icons2/st_frost'],
  zap: ['麻痹', '回合开始时少 1 点能量，然后减 1 层', '#ffe14a', 'icons2/st_zap'],
  ppois: ['中毒', '回合开始时失去等同层数的生命，然后减 1 层', '#70d040'],
  scale: ['鳞甲', '受到的每次攻击伤害减少等同层数（最多减一半）；一次受到 10 点以上的攻击会打碎 1 层', '#b0a080', 'icons2/st_scale'],
  hatch: ['孵化', '归零时孵化成幼龙', '#ffb060'], grow: ['成长', '归零时长成满血的成龙', '#ff9040'],
  heads: ['头', '每个头咬一口', '#60c0a0'], chg: ['蓄力', '下回合放出龙息。这回合内受到足够伤害就会被打断', '#ffffff', 'icons2/st_chg'],
  wing: ['飞翼', '这回合第一次受到的伤害减半', '#c0a0ff'],
  dread: ['龙威', '你造成的伤害 -25%。每回合开始减 1 层', '#ff6060', 'icons2/st_dread'],
  corrode: ['腐蚀', '回合结束时，你的格挡减半，然后减 1 层', '#9060c0', 'icons2/st_shade'],
  drowsy: ['睡意', '每层让你回合开始少抽 1 张牌；攒到 3 层你会睡着一回合（没有能量）。一下打出 15 点以上的伤害能驱散 1 层', '#b080ff', 'icons2/st_drowsy'],
  static: ['静电', '每层让下一次雷爪多抓一下', '#ffe14a', 'icons2/st_static'],
  shade: ['暗影', '潜行中：每次受到的伤害最多 1 点', '#6040a0', 'icons2/st_shade'],
  hshield: ['圣盾', '完全挡下下一次伤害', '#ffe080', 'icons2/st_hshield'],
  mana: ['法力', '攒满 4 点会立刻改念大魔法', '#c080ff', 'icons2/st_mana'],
};
export const R3 = {
  slayer: { act3: 1, name: '屠龙者勋章', icon: 'icons2/r_slayer', rar: 'u', desc: '对蓄力中的敌人造成的伤害 +30%。' },
  dscale: { act3: 1, name: '龙鳞护符', icon: 'icons2/r_dscale', rar: 'c', desc: '每场战斗开始时，你获得 3 层鳞甲（每层让每次受到的攻击伤害 -1，最多减一半；一次受到 10 点以上的攻击会打碎 1 层）。' },
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
    if (!isP) {
      if (tgt.st.hshield) { delete tgt.st.hshield; return 0; } /* 圣盾：挡下第一下 */
      if (attacker === B.p && B.p.st.dread) amt = Math.floor(amt * .75); /* 龙威 */
      if (tgt.d && tgt.d.dragon) amt = Math.ceil(amt * .9); /* 龙族减伤 10% */
      if (tgt.st.shade) amt = Math.min(amt, 1); /* 暗影潜行 */
      if (tgt.d && tgt.d.heads3 && tgt.st.heads) { const seg = tgt.max / 3; amt = Math.min(amt, Math.max(1, Math.ceil(tgt.hp - (tgt.st.heads - 1) * seg))); } /* 三头犬：只能打掉当前这个头 */
    } else if (attacker && attacker.d) { const mv = attacker.d.moves[attacker.move]; if (mv && mv.br && tgt.block > 1) { const h = Math.floor(tgt.block / 2); tgt.block -= h; tgt.stash = (tgt.stash || 0) + h; } } /* 龙息灼穿：无视一半格挡 */
    if (!isP && attacker === B.p && tgt.chg && has('slayer')) amt = Math.floor(amt * 1.3);
    if (!isP && tgt.st.wing) { amt = Math.ceil(amt / 2); tgt.st.wing = 0; }
    const sc0 = tgt.st.scale || 0, sc = !isP && attacker === B.p && B.p.halfScale ? Math.ceil(sc0 / 2) : sc0; if (sc && !(isP ? false : B.p.pierceS && attacker === B.p)) { const raw = amt; amt = Math.max(Math.ceil(amt / 2), amt - sc); if (raw >= 10) { tgt.st.scale = sc0 - 1; if (!tgt.st.scale) delete tgt.st.scale; } }
    return amt;
  },
  after(tgt, left, isP, attacker, B) { if (isP) { if (tgt.stash) { tgt.block += tgt.stash; tgt.stash = 0; } return; }
    if (attacker === B.p && left >= 15 && B.p.st.drowsy) { B.p.st.drowsy--; if (!B.p.st.drowsy) delete B.p.st.drowsy; } tgt.dmgT = (tgt.dmgT || 0) + left; tgt.lastHit = left; tgt.hitByP = attacker === B.p; },
  pStart(B, api) { const s = B.p.st;
    B.p.zc = 0; B.p.pierceS = 0; B.pc = B.pc || {};
    for (const e of B.en) { e.dmgT = 0; }
    if (s.dread) { s.dread--; if (!s.dread) delete s.dread; }
    if (s.drowsy >= 3) { B.p.energy = 0; delete s.drowsy; B.p.slept = 1; }
    if (s.zap) { B.p.energy = Math.max(0, B.p.energy - 1); s.zap--; if (!s.zap) delete s.zap; }
    if (s.ppois) { api.loseHp(s.ppois); s.ppois--; if (!s.ppois) delete s.ppois; }
  },
  pEnd(B, api) { const s = B.p.st;
    if (s.frost) { if (!api.has('stove')) { const k = Math.min(s.frost, B.hand.length); if (k) api.loseHp(k); } s.frost--; if (!s.frost) delete s.frost; }
    if (s.corrode) { B.p.block = Math.floor(B.p.block / 2); s.corrode--; if (!s.corrode) delete s.corrode; }
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
