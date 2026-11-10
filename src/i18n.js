/* 多语言：中文原文就是 key（数字和「」里的名字会自动变成 {0}{1} 占位符），英文 / 日文词表在 src/lang/ */
import EN from './lang/en.js?v=fix11101320';
import JA from './lang/ja.js?v=fix11101320';
const DICT = { en: EN, ja: JA };
const CJK = /[㐀-鿿]/;
let lang = 'zh';
try { lang = localStorage.getItem('lang') || ''; } catch (e) {}
if (!['zh', 'en', 'ja'].includes(lang)) { const n = (navigator.language || 'en').toLowerCase(); lang = n.startsWith('ja') ? 'ja' : n.startsWith('zh') ? 'zh' : 'en'; }
const cbs = [], cache = new Map(), miss = new Set();
const OUT = { en: new Set(Object.values(EN)), ja: new Set(Object.values(JA)) }; /* 已经是译文的不再处理 */
export const getLanguage = () => lang;
export function setLanguage(l) { if (!DICT[l] && l !== 'zh') return; lang = l; cache.clear(); try { localStorage.setItem('lang', l); } catch (e) {} if (typeof document !== 'undefined') document.documentElement.lang = l === 'zh' ? 'zh-CN' : l; cbs.forEach(f => f(l)); }
export const onLanguageChange = f => cbs.push(f);
export const missing = () => [...miss];
/* 把一句中文拆成「模板 + 变量」 */
function split(s) { const vals = []; const key = s.replace(/「([^」]*)」|[+-]?\d+(?:\.\d+)?%?/g, (m, q) => { const i = vals.length; vals.push(q != null ? q : m); return q != null ? `「{${i}}」` : `{${i}}`; }); return [key, vals]; }
const fill = (t, vals) => t.replace(/\{(\d+)\}/g, (m, i) => vals[+i] != null ? vals[+i] : m);
/* t('中文 {0}', 值...)：显式变量；tr(任意中文)：自动拆变量 */
export function t(key, ...vals) { if (lang === 'zh') return fill(key, vals); const d = DICT[lang]; const v = d[key]; if (v == null) { miss.add(key); return fill(key, vals); } return fill(v, vals); }
export function tr(s) {
  if (lang === 'zh' || s == null || !CJK.test(s)) return s;
  const c = cache.get(s); if (c != null) return c;
  if (OUT[lang].has(s)) return s;
  const d = DICT[lang]; let out = d[s];
  if (out == null) { const [key, vals] = split(s); const v = d[key]; if (v != null) out = fill(v, vals); else {
    const m = s.match(/^(.+?)(：| · |\n)(.+)$/s); /* 「名字：说明」「A · B」这类拼接的，拆开分别翻译 */
    if (m && CJK.test(m[1] + m[3])) { const sep = m[2] === '：' ? (lang === 'en' ? ': ' : '：') : m[2]; out = tr(m[1]) + sep + tr(m[3]); } else { miss.add(key); out = s; } } }
  cache.set(s, out); return out;
}
/* 自动翻译页面上新出现的文字和 placeholder / title（带 data-noi18n 的跳过） */
function walk(n) {
  if (lang === 'zh') return;
  if (n.nodeType === 3) { const s = n.nodeValue, x = s.trim(); if (x && CJK.test(x)) { const y = tr(x); if (y !== x) n.nodeValue = s.replace(x, y); } return; }
  if (n.nodeType !== 1 || n.closest?.('[data-noi18n]') || n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return;
  for (const a of ['placeholder', 'title']) { const v = n.getAttribute(a); if (v && CJK.test(v)) n.setAttribute(a, tr(v)); }
  for (const c of n.childNodes) walk(c);
}
export function watch(root) {
  new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') walk(m.target); else m.addedNodes.forEach(walk); } }).observe(root, { childList: true, subtree: true, characterData: true });
  walk(root);
}
