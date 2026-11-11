// 平衡回归门禁：新结果和上一次提交的 data/balance.md 比较
// 用法：node tools/gate.mjs 旧文件 新文件
// 规则：样本少于 200 局直接失败；任一角色「熟练机器人第一章通关」比上次掉超过 5 个百分点就失败
import fs from 'fs';
const [oldF, newF] = process.argv.slice(2);
const parse = txt => {
  const out = {}; let sec = '', n = 0;
  for (const line of txt.split('\n')) {
    const h = line.match(/N=(\d+)/); if (h && line.startsWith('#')) n = Math.max(n, +h[1]);
    if (line.startsWith('## ')) sec = line.includes('熟练') ? 'smart' : 'novice';
    const m = line.match(/^\| (\w+) \| ([\d.]+)% \| ([\d.]+)%/);
    if (m && sec === 'smart') out[m[1]] = { ch1: +m[2], ch2: +m[3] };
  }
  return { n, rows: out };
};
const nw = parse(fs.readFileSync(newF, 'utf8'));
if (nw.n < 200) { console.log(`门禁失败：每档只有 ${nw.n} 局，至少要 200 局`); process.exit(1); }
let old = null; try { old = parse(fs.readFileSync(oldF, 'utf8')); } catch (e) {}
if (!old || old.n < 200) { console.log('没有可比较的旧结果，跳过回归比较'); process.exit(0); }
let bad = [];
for (const [ch, r] of Object.entries(nw.rows)) {
  const o = old.rows[ch]; if (!o) continue;
  const d = r.ch1 - o.ch1; console.log(`${ch}: 第一章 ${o.ch1}% → ${r.ch1}%（${d >= 0 ? '+' : ''}${d.toFixed(1)}）`);
  if (d < -5) bad.push(`${ch} 第一章通关掉了 ${(-d).toFixed(1)} 个百分点`);
}
if (bad.length) { console.log('门禁失败：' + bad.join('；')); process.exit(1); }
console.log('门禁通过');
