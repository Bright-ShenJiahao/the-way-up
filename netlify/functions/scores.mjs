// 排行榜：GET /api/scores 取榜；POST /api/scores 提交一局成绩
// 存储：Netlify Blobs。每局一条 run:xxx；名字口令存在 pin:名字
import { getStore } from '@netlify/blobs';
export const config = { path: '/api/scores' };

const SEASON = 's1', NAME_MAX = 8, TOP_N = 30;
const CHARS = ['hero', 'heroine', 'miko', 'witch'];
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const cleanName = raw => Array.from(String(raw ?? '').replace(/[\u0000-\u001f<>\\"'`]/g, '').trim()).slice(0, NAME_MAX).join('');
const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));

// 积分 = 层数×20 + 击杀×3 + 精英×25 + 通关 300 + 通关时剩余生命×2
export const scoreOf = r => { const b = r.floor * 20 + r.kills * 3 + r.elites * 25 + (r.win ? 300 + r.hp * 2 : 0); return b + Math.round(b * r.asc * .1); };

export default async function handler(req) {
  const store = getStore({ name: 'theway-board', consistency: 'strong' });
  if (req.method === 'GET') {
    try {
      const list = await store.list({ prefix: `run:${SEASON}:` });
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
  const pk = `pin:${name}`; const saved = await store.get(pk);
  if (saved && saved !== pin) return json({ ok: false, error: '这个名字已被设了口令，口令不对' }, 403);
  if (!saved && pin) await store.set(pk, pin);
  if (b.check) return json({ ok: true, hasPin: !!(saved || pin) }); // 只校验名字
  const r = { name, char: CHARS.includes(b.char) ? b.char : 'hero', floor: int(b.floor, 0, 17), kills: int(b.kills, 0, 150),
    elites: int(b.elites, 0, 10), asc: int(b.asc, 0, 8), win: !!b.win, hp: int(b.hp, 0, 300), at: Date.now() };
  if (r.win && r.floor < 10) return json({ ok: false, error: '数据异常' }, 400);
  r.score = scoreOf(r);
  await store.set(`run:${SEASON}:${r.at}-${Math.random().toString(36).slice(2, 8)}`, JSON.stringify(r));
  return json({ ok: true, score: r.score });
}
