// 排行榜：GET /api/scores 取榜；POST /api/scores 提交一局成绩
// 存储：Netlify Blobs。每局一条 run:xxx；名字口令存在 pin:名字
import { getStore } from '@netlify/blobs';
import { createHash, timingSafeEqual } from 'node:crypto';
const SALT = process.env.PIN_SALT || 'theway-up-2026-salt';
const hashPin = (name, pin) => createHash('sha256').update(`${name}:${pin}:${SALT}`).digest('hex');
const same = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export const config = { path: '/api/scores' };

const SEASON = 's1', NAME_MAX = 8, TOP_N = 30;
const CHARS = ['hero', 'heroine', 'miko', 'witch', 'erin', 'gu', 'sylvie', 'mia', 'feiyue'];
/* 允许 itch.io 上的游戏跨域访问 */
let CORS = {};
const corsFor = req => { const o = req.headers.get('origin') || ''; return /^https:\/\/([a-z0-9-]+\.)*(itch\.zone|itch\.io|hwcdn\.net)$/.test(o) || /^https:\/\/the-way-up\.netlify\.app$/.test(o) ? { 'access-control-allow-origin': o, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'vary': 'origin' } : {}; };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS } });
const cleanName = raw => Array.from(String(raw ?? '').replace(/[\u0000-\u001f<>\\"'`]/g, '').trim()).slice(0, NAME_MAX).join('');
const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));

// 积分 = 层数×20 + 击杀×3 + 精英×25 + 通关 300 + 通关时剩余生命×2
export const scoreOf = r => { const b = r.floor * 20 + r.kills * 3 + r.elites * 25 + (r.bosses || 0) * 300 + (r.win ? r.hp * 2 : 0) + (r.endless || 0) * 200 + (r.trueEnd ? 500 : 0); return b + Math.round(b * r.asc * .1); };

export default async function handler(req) {
  CORS = corsFor(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const store = getStore({ name: 'theway-board', consistency: 'strong' });
  if (req.method === 'GET') {
    try {
      const dk = new URL(req.url).searchParams.get('daily'); const day = /^\d{8}$/.test(dk || '') ? dk : '';
      const list = await store.list({ prefix: day ? `daily:${day}:` : `run:${SEASON}:` });
      const rows = (await Promise.all((list.blobs || []).map(async b => { try { return JSON.parse(await store.get(b.key)); } catch { return null; } }))).filter(Boolean);
      const best = new Map();
      for (const r of rows) { const c = best.get(r.name); if (!c || r.score > c.score) best.set(r.name, r); }
      const top = [...best.values()].sort((a, b) => b.score - a.score || a.at - b.at).slice(0, TOP_N)
        .map(r => ({ name: r.name, char: r.char, asc: r.asc || 0, floor: r.floor, kills: r.kills, win: r.win, score: r.score, at: r.at }));
      return json({ ok: true, season: SEASON, total: best.size, list: top });
    } catch { return json({ ok: false, error: '读取失败' }, 500); }
  }
  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);
  let b; try { b = await req.json(); } catch { return json({ ok: false, error: 'bad json' }, 400); }
  const name = cleanName(b.name); if (!name) return json({ ok: false, error: '没有名字' }, 400);
  const pin = String(b.pin || '');
  if (pin && !/^\d{4,6}$/.test(pin)) return json({ ok: false, error: '口令要 4～6 位数字' }, 400);
  // 口令：名字设过口令的，必须对上；没设过的，这次带了口令就顺便设上
  /* 频率限制：同一 IP 每分钟最多 3 次 */
  const ip = (req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim();
  const rk = `rl:${ip}`, now = Date.now(); let hits = []; try { hits = JSON.parse(await store.get(rk) || '[]').filter(t => now - t < 60000); } catch (e) {}
  if (hits.length >= 3) return json({ ok: false, error: '提交太频繁，请稍后再试' }, 429);
  hits.push(now); await store.set(rk, JSON.stringify(hits));
  /* 口令：只存加盐哈希；旧的明文记录在第一次校验通过时升级 */
  const pk = `pin:${name}`; const saved = await store.get(pk);
  if (saved) { const ok = saved.length === 64 ? same(saved, hashPin(name, pin)) : saved === pin; if (!ok) return json({ ok: false, error: '这个名字已被设了口令，口令不对' }, 403); if (saved.length !== 64) await store.set(pk, hashPin(name, pin)); }
  else if (pin) await store.set(pk, hashPin(name, pin));
  const r = { name, char: CHARS.includes(b.char) ? b.char : 'hero', floor: int(b.floor, 0, 400), kills: int(b.kills, 0, 1500),
    elites: int(b.elites, 0, 60), asc: int(b.asc, 0, 20), win: !!b.win, hp: int(b.hp, 0, 400), bosses: int(b.bosses, 0, 60), endless: int(b.endless, 0, 50), trueEnd: !!b.trueEnd, at: Date.now() };
  const day = /^\d{8}$/.test(String(b.daily || '')) ? String(b.daily) : '';
  /* 合理性检查：一局最多 17 层；击杀、精英与层数相符；通关必须到最后一层 */
  if ((r.win && r.floor < 16) || r.kills > r.floor * 5 + 6 || r.elites > Math.ceil(r.floor / 3) + 2 || r.bosses > Math.ceil(r.floor / 7) + 1 || (!r.win && r.hp > 0)) return json({ ok: false, error: '数据异常' }, 400);
  r.score = scoreOf(r);
  await store.set(`${day ? `daily:${day}` : `run:${SEASON}`}:${r.at}-${Math.random().toString(36).slice(2, 8)}`, JSON.stringify(r));
  return json({ ok: true, score: r.score });
}
