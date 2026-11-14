// 真人数据：POST /api/runs 每局结束匿名上传一条；GET /api/runs 返回汇总（不返回单条原始数据）
// 存储：Netlify Blobs（theway-runs）。不收名字、口令；只有一个随机设备编号，用来区分不同的人。
import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';
export const config = { path: '/api/runs' };
const CHARS = ['hero', 'heroine', 'miko', 'witch', 'erin', 'gu', 'sylvie', 'mia', 'feiyue'];
const ok = o => /^https:\/\/([a-z0-9-]+\.)*(itch\.zone|itch\.io|hwcdn\.net)$/.test(o) || /^https:\/\/the-way-up\.netlify\.app$/.test(o);
let CORS = {};
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS } });
const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
const id = v => String(v || '').replace(/[^\w+:-]/g, '').slice(0, 24);
const ids = (a, n) => (Array.isArray(a) ? a : []).slice(0, n).map(id).filter(Boolean);

let SUM = {};
export default async function handler(req) {
  const o = req.headers.get('origin') || ''; CORS = ok(o) ? { 'access-control-allow-origin': o, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' } : {};
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const store = getStore({ name: 'theway-runs', consistency: 'strong' });
  if (req.method === 'GET') { try { const k = new URL(req.url).searchParams.get('since') || ''; if (SUM[k] && Date.now() - SUM[k].t < 300000) return json(SUM[k].v); const v = await summary(store, k); SUM[k] = { t: Date.now(), v }; return json(v); } catch (e) { return json({ ok: false }, 500); } }
  if (+(req.headers.get('content-length') || 0) > 20000) return json({ ok: false }, 413);
  if (req.method !== 'POST') return json({ ok: false }, 405);
  /* 只收本游戏页面发来的 JSON（挡掉跨站的简单表单请求） */
  if (!ok(o) || !/application\/json/.test(req.headers.get('content-type') || '')) return json({ ok: false }, 403);
  let b; try { const tx = await req.text(); if (tx.length > 20000) return json({ ok: false }, 413); b = JSON.parse(tx); } catch { return json({ ok: false }, 400); }
  /* 频率限制：同一 IP 每分钟最多 6 条 */
  const ip = (req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim(), rk = `rl:${ip}`, now = Date.now();
  let hits = []; try { hits = JSON.parse(await store.get(rk) || '[]').filter(t => now - t < 60000); } catch (e) {}
  if (hits.length >= 6) return json({ ok: false }, 429); hits.push(now); await store.set(rk, JSON.stringify(hits));
  const day = new Date(now).toISOString().slice(0, 10); /* 设备编号按天加盐哈希：同一天能区分不同的人，跨天不能追踪 */
  const r = { v: id(b.v), dev: createHash('sha256').update(id(b.dev) + ':' + day + ':' + (process.env.PIN_SALT || 'tw')).digest('hex').slice(0, 12), char: CHARS.includes(b.char) ? b.char : 'hero', asc: int(b.asc, 0, 20), mode: ['normal', 'daily', 'custom'].includes(b.mode) ? b.mode : 'normal', mods: ids(b.mods, 8), bless: id(b.bless),
    win: !!b.win, act: int(b.act, 1, 5), king: !!b.king, trueEnd: !!b.trueEnd, endless: int(b.endless, 0, 50), floor: int(b.floor, 0, 400), by: ids(b.by, 6), deck: ids(b.deck, 90), relics: ids(b.relics, 60),
    picks: (Array.isArray(b.picks) ? b.picks : []).slice(-80).map(p => ({ f: int(p && p.f, 0, 400), o: ids(p && p.o, 5), p: p && p.p ? id(p.p) : null })),
    hp: (Array.isArray(b.hp) ? b.hp : []).slice(-80).map(x => [int(x && x[0], 0, 400), int(x && x[1], 0, 400), id(x && x[2])]), dur: int(b.dur, 0, 86400 * 3), keys: ids(b.keys, 3), at: now };
  /* 前后矛盾的数据不收：真结局必须是通关；通关至少爬过一整章；章节和层数要对得上 */
  if ((r.trueEnd && !r.win) || (r.king && !r.win) || (r.win && r.floor < 15) || r.floor < (r.act - 1) * 15 || r.floor > r.act * 20 + r.endless * 20) return json({ ok: false }, 422);
  const d = new Date(now).toISOString().slice(0, 10).replace(/-/g, '');
  await store.set(`r:${d}:${now}-${Math.random().toString(36).slice(2, 8)}`, JSON.stringify(r));
  return json({ ok: true });
}

/* 汇总：最近最多 3000 局 */
async function summary(store, since) {
  const list = (await store.list({ prefix: 'r:' })).blobs || [];
  const keys = list.map(b => b.key).filter(k => !since || k.slice(2, 10) >= since).sort().slice(-3000);
  const rows = (await Promise.all(keys.map(async k => { try { return JSON.parse(await store.get(k)); } catch { return null; } }))).filter(Boolean);
  const C = {}, death = {}, pick = {}, offer = {}, skip = { n: 0, of: 0 }, bless = {}, devs = new Set();
  for (const r of rows) { devs.add(r.dev);
    const c = C[r.char] = C[r.char] || { n: 0, a1: 0, a2: 0, king: 0, trueEnd: 0, floor: 0, dur: 0, asc: 0 };
    c.n++; c.floor += r.floor; c.dur += r.dur; c.asc += r.asc; if (r.act >= 2 || r.win) c.a1++; if (r.act >= 3 || (r.win && r.act >= 2)) c.a2++; if (r.king) c.king++; if (r.trueEnd) c.trueEnd++;
    if (!r.win && r.by && r.by.length) { const k = r.char + '|' + r.act + '|' + r.by.join('+'); death[k] = (death[k] || 0) + 1; }
    for (const p of r.picks || []) { skip.of++; if (!p.p) skip.n++; for (const x of p.o) offer[x] = (offer[x] || 0) + 1; if (p.p) pick[p.p] = (pick[p.p] || 0) + 1; }
    if (r.bless) bless[r.bless] = (bless[r.bless] || 0) + 1; }
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
  const cards = Object.keys(offer).filter(k => offer[k] >= 5).map(k => [k, offer[k], pick[k] || 0, +((pick[k] || 0) / offer[k]).toFixed(3)]);
  return { ok: true, runs: rows.length, players: devs.size, from: keys[0] ? keys[0].slice(2, 10) : '', to: keys.length ? keys[keys.length - 1].slice(2, 10) : '', chars: C, deaths: top(death, 40), skipRate: skip.of ? +(skip.n / skip.of).toFixed(3) : 0,
    mostPicked: cards.sort((a, b) => b[3] - a[3]).slice(0, 25), leastPicked: cards.sort((a, b) => a[3] - b[3]).slice(0, 25), bless: top(bless, 20) };
}
