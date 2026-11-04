// 检查：en / ja 的 key 是否一致、占位符是否一致、游戏数据里的中文是否都有翻译
import EN from '../src/lang/en.js'; import JA from '../src/lang/ja.js';
import * as D from '../src/data.js';
const ph = s => (s.match(/\{\d+\}/g) || []).sort().join(',');
const ek = Object.keys(EN), jk = Object.keys(JA); let bad = 0;
for (const k of ek) if (!(k in JA)) { console.log('ja 缺少:', k); bad++; }
for (const k of jk) if (!(k in EN)) { console.log('en 缺少:', k); bad++; }
for (const k of ek) for (const [n, d] of [['en', EN], ['ja', JA]]) if (d[k] != null && ph(d[k]) !== ph(k)) { console.log(`${n} 占位符不一致:`, k, '→', d[k]); bad++; }
const split = s => s.replace(/「([^」]*)」|[+-]?\d+(?:\.\d+)?%?/g, (m, q) => '').length && s.replace(/(「)([^」]*)(」)|[+-]?\d+(?:\.\d+)?%?/g, (() => { let i = 0; return (m, a, q, b) => a ? `「{${i++}}」` : `{${i++}}`; })());
const need = []; const add = s => { if (s && /[㐀-鿿]/.test(s)) need.push(s); };
// 数据里的文字（取原始中文：先切到中文再读）
const { setLanguage } = await import('../src/i18n.js'); setLanguage('zh');
for (const c of Object.values(D.CARDS)) { add(c.name); add(c.desc(0)); add(c.desc(1)); }
for (const r of Object.values(D.RELICS)) { add(r.name); add(r.desc); }
for (const x of Object.values(D.POTIONS)) { add(x.name); add(x.desc); }
for (const e of Object.values(D.ENEMIES)) { add(e.name); for (const m of Object.values(e.moves)) add(m.n); }
for (const s of Object.values(D.STATUS)) { add(s[0]); add(s[1]); }
for (const ev of D.EVENTS) { add(ev.title); add(ev.text); for (const o of ev.opts) add(o.t); }
for (const s of need) { const k = split(s); if (!(s in EN) && !(k in EN)) { console.log('数据缺翻译:', k); bad++; } }
console.log(bad ? `共 ${bad} 处问题` : `OK：${ek.length} 个 key，en / ja 一致，数据全部有翻译`);
