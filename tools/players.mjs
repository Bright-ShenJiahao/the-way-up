// 把 /api/runs 的汇总写成中文报告 data/players.md（真人数据）；可和 data/balance.md（强化学习 AI）对照着看
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { CARDS, ENEMIES } from '../src/data.js';
const d = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const pc = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '-';
const nm = k => (CARDS[k.replace(/\+$/, '')] || {}).name || k;
const en = s => s.split('+').map(k => (ENEMIES[k] || {}).name || k).join(' + ');
const L = [`# 真人对局数据（${d.from || '-'} ~ ${d.to || '-'}）`, '', `共 ${d.runs} 局，${d.players} 位玩家（按随机设备编号区分）。选卡时跳过的比例：${pc(d.skipRate * 1000, 1000)}`, '',
  '| 角色 | 局数 | 一章通关 | 二章通关 | 打败魔王 | 真结局 | 平均层数 | 平均进阶 | 平均时长(分) |', '|---|---|---|---|---|---|---|---|---|'];
for (const [c, s] of Object.entries(d.chars || {}).sort((a, b) => b[1].n - a[1].n)) L.push(`| ${c} | ${s.n} | ${pc(s.a1, s.n)} | ${pc(s.a2, s.n)} | ${pc(s.king, s.n)} | ${s.trueEnd} | ${(s.floor / s.n).toFixed(1)} | ${(s.asc / s.n).toFixed(1)} | ${(s.dur / s.n / 60).toFixed(0)} |`);
L.push('', '## 最常死在', '', '| 角色 | 章 | 敌人 | 次数 |', '|---|---|---|---|', ...(d.deaths || []).map(([k, n]) => { const [c, a, e] = k.split('|'); return `| ${c} | ${a} | ${en(e)} | ${n} |`; }));
L.push('', '## 选卡：最常被拿（出现 5 次以上）', '', '| 卡 | 出现 | 被拿 | 拿取率 |', '|---|---|---|---|', ...(d.mostPicked || []).map(([k, o, p, r]) => `| ${nm(k)} | ${o} | ${p} | ${pc(r * 1000, 1000)} |`));
L.push('', '## 选卡：最常被跳过', '', '| 卡 | 出现 | 被拿 | 拿取率 |', '|---|---|---|---|', ...(d.leastPicked || []).map(([k, o, p, r]) => `| ${nm(k)} | ${o} | ${p} | ${pc(r * 1000, 1000)} |`));
L.push('', '## 开局祝福选择', '', ...(d.bless || []).map(([k, n]) => `- ${k}：${n}`), '');
const out = L.join('\n'); console.log(out); mkdirSync('data', { recursive: true }); writeFileSync('data/players.md', out + '\n');
