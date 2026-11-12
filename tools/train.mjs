// 强化训练（进化策略）：自动调机器人出牌/选牌的权重，让它玩得更好，看「玩得好时」各角色真实强度。
// 只在 GitHub Actions 上跑：node tools/train.mjs <角色> <分钟> [每次评估局数]
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
const [ch, MIN = '55', N0 = '160'] = process.argv.slice(2);
const N = +N0, T_END = Date.now() + (+MIN) * 60e3, P = Math.max(2, os.cpus().length);
const W0 = { pow0: 9, pow1: 3, blkN: 8, blk0: 1, atk: 5, atkK: 1, leth: 6, zero: 2, pot: 3, skill: 4, rs: 1, arch: 2, archW: .8, needBlk: 1, needAtk: 1.2, nonAtk: .8, powPen: 1.5, dup: 1.2, skip: 1.5, rest: .55, needMul: 1 };
const KEYS = Object.keys(W0);
const BOUND = { rest: [.2, .95], needMul: [.3, 2] };
let seedR = 12345; const rnd = () => { seedR = (seedR * 1103515245 + 12345) % 2147483648; return seedR / 2147483648; };
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const clamp = (k, x) => { const b = BOUND[k] || [-20, 30]; return Math.min(b[1], Math.max(b[0], +x.toFixed(3))); };
/* 跑一次 sim，返回三章通关率的平均（熟练机器人） */
function evalW(w, n, seed) { return new Promise(res => {
  const p = spawn('node', ['tools/sim.mjs', String(n), '4', ch], { env: { ...process.env, WEIGHTS: JSON.stringify(w), SMARTONLY: '1', NOWRITE: '1', SEED: String(seed) } });
  let out = ''; p.stdout.on('data', d => out += d); p.on('close', () => { const m = out.match(new RegExp(`^\\| ${ch} \\| ([\\d.]+)% \\| ([\\d.]+)% \\| ([\\d.]+)% `, 'm')); res(m ? { a: +m[1], b: +m[2], c: +m[3], s: (+m[1] + +m[2] + 2 * +m[3]) / 4 } : { s: -1 }); }); }); }
async function pool(tasks) { const out = new Array(tasks.length); let i = 0; await Promise.all(Array.from({ length: P }, async () => { while (i < tasks.length) { const k = i++; out[k] = await tasks[k](); } })); return out; }
let mean = { ...W0 }; const sig = Object.fromEntries(KEYS.map(k => [k, Math.max(.25, Math.abs(W0[k]) * .25)]));
const log = []; let gen = 0, best = { w: { ...W0 }, s: -1 };
while (Date.now() < T_END - 6 * 60e3) {
  const seed = 1000 + gen * 17, cands = [];
  for (let j = 0; j < P; j++) { const z = Object.fromEntries(KEYS.map(k => [k, gauss()])); for (const sgn of [1, -1]) cands.push(Object.fromEntries(KEYS.map(k => [k, clamp(k, mean[k] + sgn * sig[k] * z[k])]))); }
  cands.push({ ...mean });
  const res = await pool(cands.map(w => () => evalW(w, N, seed)));
  const order = res.map((r, i) => [r.s, i]).sort((a, b) => b[0] - a[0]);
  const mu = Math.max(2, Math.floor(cands.length / 4)), wts = Array.from({ length: mu }, (_, i) => Math.log(mu + .5) - Math.log(i + 1)), ws = wts.reduce((a, b) => a + b, 0);
  const nm = Object.fromEntries(KEYS.map(k => [k, clamp(k, order.slice(0, mu).reduce((acc, [, i], r) => acc + cands[i][k] * wts[r] / ws, 0))]));
  mean = nm; for (const k of KEYS) sig[k] *= .97;
  if (order[0][0] > best.s) best = { w: cands[order[0][1]], s: order[0][0] };
  log.push({ gen, meanScore: res[res.length - 1].s, top: order[0][0] }); console.log(`gen ${gen} mean=${res[res.length - 1].s.toFixed(1)} top=${order[0][0].toFixed(1)}`); gen++;
}
/* 最后用 1000 局、同一批种子，对比：原来的权重 / 训练后的平均权重 / 训练中最好的那组 */
const NF = 1000, fin = await pool([W0, mean, best.w].map(w => () => evalW(w, NF, 777)));
const pick = fin[1].s >= fin[2].s ? { w: mean, r: fin[1] } : { w: best.w, r: fin[2] };
const report = { ch, gens: gen, before: fin[0], after: pick.r, weights: pick.w, log };
fs.mkdirSync('data', { recursive: true }); fs.writeFileSync(`data/train_${ch}.json`, JSON.stringify(report, null, 1));
console.log(`| ${ch} | ${fin[0].a}% / ${fin[0].b}% / ${fin[0].c}% | ${pick.r.a}% / ${pick.r.b}% / ${pick.r.c}% | ${gen} 代 |`);
