// PostgreSQL прямо в браузере. Загружается с jsDelivr (около 15 МБ, браузер кеширует).
const PGLITE_URL = 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.5.14/dist/index.js';

import { SEED_SQL, SCHEMA, TOPIC, LESSONS, TASKS, EXAM_TASKS, CARDS, TEST, METHOD } from './content.js';

/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const now = () => Date.now();
const MIN = 60e3, DAY = 864e5;
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const plural = (n, one, few, many) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? few : many; };

const KW = /\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|IS|NULL|AS|ORDER|BY|ASC|DESC|LIMIT|OFFSET|DISTINCT|BETWEEN|LIKE|ILIKE|CASE|WHEN|THEN|ELSE|END|EXISTS|JOIN|ON|GROUP|HAVING|UNION|ALL|NULLS|FIRST|LAST|ROUND|AVG|COUNT|SUM|MIN|MAX)\b/gi;
function hl(sql) {
  // строки и комментарии отдельно, чтобы не подсвечивать ключевые слова внутри них
  let out = '', i = 0;
  const re = /('(?:[^']|'')*'?)|(--[^\n]*)/g; let m;
  while ((m = re.exec(sql))) {
    out += esc(sql.slice(i, m.index)).replace(KW, (k) => `<b class="kw">${k}</b>`);
    out += m[1] ? `<span class="str">${esc(m[1])}</span>` : `<span class="cm">${esc(m[2])}</span>`;
    i = re.lastIndex;
  }
  return out + esc(sql.slice(i)).replace(KW, (k) => `<b class="kw">${k}</b>`);
}
const stripSql = (sql) => sql.replace(/'(?:[^']|'')*'/g, "''").replace(/--[^\n]*/g, ' ');

/* ================= storage / auth ================= */
const LS_KEY = 'tetradka.sql.v1';
const blank = () => ({ v: 1, lessons: {}, tasks: {}, cards: {}, tests: [], exams: [], days: [] });
// Прогресс SQL хранится одной записью kind='sql', id='select' в общем аккаунте Тетрадки.
// Гость: localStorage. После входа на сайте: сервер /api/progress.
const KIND = 'sql', TOPIC_ID = 'select';
async function api(method, path, body) {
  const r = await fetch('/api' + path, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await r.json(); } catch {}
  if (!r.ok) { const e = new Error((data && data.error) || 'Сервер недоступен'); e.status = r.status; throw e; }
  return data || {};
}
const store = {
  mode: 'local', name: '', state: blank(), saving: false, dirty: false, timer: null,
  loadLocal() { try { const s = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); if (s && s.v === 1) return s; } catch {} return null; },
  saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(this.state)); } catch {} },
  async init() {
    this.state = Object.assign(blank(), this.loadLocal() || {});
    renderAuth();
    try {
      const { user } = await api('GET', '/me');
      if (!user) return;
      this.name = user.name || user.login;
      const { items } = await api('GET', '/progress');
      const mine = (items || []).find((r) => r.kind === KIND && r.id === TOPIC_ID);
      this.mode = 'cloud';
      if (mine && mine.data && mine.data.json) this.state = Object.assign(blank(), JSON.parse(mine.data.json));
      else if (this.loadLocal()) await this.push(); // перенести прогресс гостя в аккаунт
      this.saveLocal();
      renderAuth(); route();
    } catch (e) {
      console.warn('server progress unavailable', e);
      this.mode = 'local'; renderAuth();
    }
  },
  record() {
    const st = this.state;
    st.exams = st.exams.slice(-40); st.tests = st.tests.slice(-40);
    const best = st.exams.filter((t) => t.total === 100).reduce((m, t) => Math.max(m, t.score), 0);
    const last = st.exams.length ? st.exams[st.exams.length - 1].score || 0 : 0;
    return { kind: KIND, id: TOPIC_ID, best, last, attempts: st.exams.length, done: best >= 50, review: false, stage: 0, due: null, updated: Date.now(), data: { json: JSON.stringify(st) } };
  },
  save() {
    const today = new Date().toISOString().slice(0, 10);
    if (!this.state.days.includes(today)) this.state.days.push(today);
    this.state.days = this.state.days.slice(-60);
    this.saveLocal();
    if (this.mode !== 'cloud') return;
    this.dirty = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.push(), 1000);
  },
  async push() {
    if (this.saving) { this.dirty = true; return; }
    this.saving = true; this.dirty = false; renderAuth('сохраняю…');
    try { await api('PUT', '/progress', { items: [this.record()] }); renderAuth(); }
    catch (e) {
      console.warn('save failed', e);
      if (e.status === 401) { this.mode = 'local'; renderAuth(); }
      else renderAuth('не сохранилось, повторю');
    }
    this.saving = false;
    if (this.dirty && this.mode === 'cloud') this.timer = setTimeout(() => this.push(), 2000);
  },
  reset() { this.state = blank(); this.save(); if (this.mode === 'cloud') this.push(); },
};
window.addEventListener('pagehide', () => {
  if (store.mode !== 'cloud' || !store.dirty) return;
  fetch('/api/progress', { method: 'PUT', credentials: 'same-origin', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [store.record()] }) }).catch(() => {});
});

function renderAuth(note) {
  const el = $('#auth'); if (!el) return;
  if (store.mode === 'cloud') {
    el.innerHTML = `<span class="dot ok"></span><span><b>${esc(store.name)}</b><small>${esc(note || 'прогресс сохраняется в аккаунте')}</small></span>`;
    el.title = 'Прогресс хранится в аккаунте Тетрадки и доступен с любого устройства.';
  } else {
    el.innerHTML = `<span class="dot"></span><span><b>Гость</b><small>прогресс в этом браузере</small></span><a class="btn small pen" href="/#/login">Войти</a>`;
    el.title = 'Войди или зарегистрируйся на Тетрадке, чтобы прогресс сохранялся в аккаунте.';
  }
}

/* ================= database ================= */
let pg = null;
const dbReady = (async () => {
  const { PGlite } = await import(PGLITE_URL);
  pg = await PGlite.create();
  await pg.exec(SEED_SQL);
  return pg;
})();
dbReady.then(() => { document.body.classList.add('db-ready'); $('#dbstatus').textContent = 'PostgreSQL готов'; })
  .catch((e) => { console.error(e); $('#dbstatus').textContent = 'База не загрузилась: ' + e.message; $('#dbstatus').classList.add('bad'); });

let queue = Promise.resolve();
function run(sql) {
  // все запросы по очереди и в транзакции с откатом: база всегда остаётся исходной
  const job = queue.then(async () => {
    await dbReady;
    await pg.exec('BEGIN');
    try {
      const res = await pg.exec(sql, { rowMode: 'array' });
      const last = [...res].reverse().find((r) => r.fields && r.fields.length) || res[res.length - 1] || { fields: [], rows: [] };
      return { fields: last.fields.map((f) => f.name), rows: last.rows || [], affected: last.affectedRows };
    } finally { await pg.exec('ROLLBACK').catch(() => {}); }
  });
  queue = job.catch(() => {});
  return job;
}

const fmt = (v) => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') return String(Math.round(v * 1e6) / 1e6);
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) return String(Math.round(Number(v) * 1e6) / 1e6);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};
const rowKey = (r) => r.map((v) => (fmt(v) ?? '∅')).join('␟');

function tableHTML(res, opts = {}) {
  if (!res.fields.length) return `<p class="muted small">Запрос выполнен${res.affected != null ? `, затронуто строк: ${res.affected}` : ''}.</p>`;
  const max = opts.max || 200;
  const head = res.fields.map((f) => `<th>${esc(f)}</th>`).join('');
  const body = res.rows.slice(0, max).map((r) => `<tr>${r.map((v) => { const s = fmt(v); return s === null ? '<td class="null">NULL</td>' : `<td>${esc(s)}</td>`; }).join('')}</tr>`).join('');
  return `<div class="tbl-wrap"><table class="res"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div><p class="rows-count">${res.rows.length} ${plural(res.rows.length, 'строка', 'строки', 'строк')}</p>`;
}

/* ================= checking ================= */
function forbidden(sql, task) {
  const clean = stripSql(sql);
  return (task.forbid || []).find((re) => re.test(clean));
}
async function check(sql, task) {
  if (!sql.trim()) return { ok: false, reason: 'Пустой ответ.' };
  const bad = forbidden(sql, task);
  if (bad) return { ok: false, reason: 'В решении использована запрещённая конструкция: ' + String(bad).replace(/\\b|\\s\+|\/i|\//g, ' ').trim().toUpperCase() + '.' };
  let mine, ref;
  try { mine = await run(sql); } catch (e) { return { ok: false, reason: 'Ошибка PostgreSQL: ' + e.message, error: true }; }
  ref = await run(task.ref);
  const res = { mine, ref };
  if (mine.fields.length !== ref.fields.length) return { ...res, ok: false, reason: `Колонок в результате ${mine.fields.length}, а нужно ${ref.fields.length}.` };
  if (mine.rows.length !== ref.rows.length) return { ...res, ok: false, reason: `Строк в результате ${mine.rows.length}, а нужно ${ref.rows.length}. Проверь условие WHERE${/limit/i.test(task.ref) ? ' и LIMIT' : ''}.` };
  const a = mine.rows.map(rowKey), b = ref.rows.map(rowKey);
  const same = a.every((x, i) => x === b[i]);
  if (!same) {
    const sa = [...a].sort(), sb = [...b].sort();
    if (sa.every((x, i) => x === sb[i])) {
      if (task.ordered) return { ...res, ok: false, reason: 'Строки верные, но порядок другой. Проверь ORDER BY и направление ASC/DESC.' };
    } else {
      const i = a.findIndex((x) => !b.includes(x));
      return { ...res, ok: false, reason: `Значения не совпадают${i >= 0 ? `, например строка ${i + 1}: ${mine.rows[i].map((v) => fmt(v) ?? 'NULL').join(' | ')}` : ''}. Проверь колонки и условия.` };
    }
  }
  if (task.checkNames) {
    const names = mine.fields.map((f) => f.toLowerCase());
    const miss = task.checkNames.find((n) => !names.includes(n));
    if (miss) return { ...res, ok: false, reason: `Данные верные, но колонка должна называться ${miss}. Добавь AS ${miss}.`, almost: true };
  }
  return { ...res, ok: true, reason: 'Результат совпадает с эталоном.' };
}

/* ================= editor ================= */
function editor(initial = '', { rows = 7, paper = false, id } = {}) { // paper: фон листа в клетку (только для черновика)
  const ta = h(`<textarea class="code${paper ? ' paper' : ''}" rows="${rows}" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" ${id ? `id="${id}"` : ''} aria-label="SQL-запрос"></textarea>`);
  ta.value = initial;
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('  ', s, ta.selectionEnd, 'end'); }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ta.dispatchEvent(new CustomEvent('run', { bubbles: true })); }
  });
  return ta;
}

/* ================= visualizer ================= */
const TOP = ['select', 'from', 'where', 'group by', 'having', 'order by', 'limit', 'offset', 'union', 'intersect', 'except', 'join', 'window'];
function parseSimple(sqlRaw) {
  let sql = sqlRaw.replace(/--[^\n]*/g, ' ').trim().replace(/;\s*$/, '').trim();
  if (sql.includes(';')) return { error: 'Визуализация работает для одного запроса.' };
  // найти ключевые слова верхнего уровня (вне скобок и строк)
  const low = sql.toLowerCase(); const marks = []; let depth = 0;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "'") { i++; while (i < sql.length && !(sql[i] === "'" && sql[i + 1] !== "'")) { if (sql[i] === "'") i++; i++; } continue; }
    if (c === '(') depth++; else if (c === ')') depth--;
    if (depth) continue;
    if (i > 0 && /[a-z0-9_]/i.test(sql[i - 1])) continue;
    for (const kw of TOP) {
      const re = new RegExp('^' + kw.replace(' ', '\\s+') + '(?![a-z0-9_])', 'i');
      const m = low.slice(i).match(re);
      if (m) { marks.push({ kw, i, len: m[0].length }); i += m[0].length - 1; break; }
    }
  }
  const has = (k) => marks.find((m) => m.kw === k);
  if (!has('select') || marks[0].kw !== 'select' || marks[0].i !== 0) return { error: 'Визуализация показывает запросы, которые начинаются с SELECT.' };
  for (const k of ['group by', 'having', 'union', 'intersect', 'except', 'join', 'window']) if (has(k)) return { error: `Конструкцию ${k.toUpperCase()} визуализация пока не показывает. Она появится в следующих темах.` };
  if (marks.filter((m) => m.kw === 'select').length > 1) return { error: 'Визуализация показывает один SELECT.' };
  const part = (k) => { const idx = marks.findIndex((m) => m.kw === k); if (idx < 0) return null; const m = marks[idx]; const end = marks[idx + 1] ? marks[idx + 1].i : sql.length; return sql.slice(m.i + m.len, end).trim(); };
  let list = part('select'); const from = part('from');
  if (!from) return { error: 'В запросе нет FROM.' };
  const fm = from.match(/^([a-z_][a-z0-9_]*)(?:\s+(?:as\s+)?([a-z_][a-z0-9_]*))?$/i);
  if (!fm) return { error: 'Визуализация работает для одной таблицы во FROM.' };
  let distinct = false;
  if (/^distinct\s/i.test(list)) { distinct = true; list = list.replace(/^distinct\s+/i, ''); }
  return { sql, list, table: fm[1], alias: fm[2] || null, where: part('where'), order: part('order by'), limit: part('limit'), offset: part('offset'), distinct };
}

async function buildSteps(p) {
  const ref = p.alias || p.table;
  const fromSql = `FROM ${p.table}${p.alias ? ' ' + p.alias : ''}`;
  const whereSql = p.where ? ` WHERE ${p.where}` : '';
  const base = await run(`SELECT *, ${ref}.ctid::text AS __k ${fromSql} ORDER BY ${ref}.ctid`);
  const k = (res) => res.fields.length - 1;
  const strip = (res) => ({ fields: res.fields.slice(0, -1), rows: res.rows.map((r) => ({ key: r[k(res)], cells: r.slice(0, -1) })) });
  const B = strip(base);
  const steps = [];
  steps.push({ clause: 'from', title: `FROM ${p.table}`, text: `Берём все строки таблицы ${p.table}: ${B.rows.length}.`, fields: B.fields, rows: B.rows.map((r) => ({ ...r })) });
  let keep = B.rows.map((r) => r.key);
  if (p.where) {
    const pass = await run(`SELECT ${ref}.ctid::text ${fromSql}${whereSql}`);
    const ok = new Set(pass.rows.map((r) => r[0]));
    keep = B.rows.filter((r) => ok.has(r.key)).map((r) => r.key);
    steps.push({ clause: 'where', title: `WHERE ${p.where}`, text: `Проверяем условие для каждой строки. Подходят ${ok.size} из ${B.rows.length}, остальные отбрасываем.`, fields: B.fields, rows: B.rows.map((r) => ({ ...r, out: !ok.has(r.key) })) });
  }
  const proj = strip(await run(`SELECT ${p.list}, ${ref}.ctid::text AS __k ${fromSql}${whereSql} ORDER BY ${ref}.ctid`));
  const computed = proj.fields.map((f) => !B.fields.includes(f));
  const dropped = B.fields.filter((f) => !proj.fields.includes(f));
  steps.push({ clause: 'select', title: `SELECT ${p.list}`, text: `Оставляем ${proj.fields.length} ${plural(proj.fields.length, 'колонку', 'колонки', 'колонок')}${dropped.length && dropped.length < B.fields.length ? `, отбрасываем ${dropped.join(', ')}` : ''}${computed.some(Boolean) ? '. Подсвеченные колонки вычислены выражением или переименованы через AS' : ''}.`, fields: proj.fields, computed, rows: proj.rows });
  let rows = proj.rows;
  const vk = (r) => rowKey(r.cells);
  if (p.distinct) {
    const seen = new Set();
    const marked = rows.map((r) => { const d = seen.has(vk(r)); seen.add(vk(r)); return { ...r, out: d }; });
    const dup = marked.filter((r) => r.out).length;
    steps.push({ clause: 'distinct', title: 'DISTINCT', text: dup ? `Убираем повторы: ${dup} ${plural(dup, 'строка дублирует', 'строки дублируют', 'строк дублируют')} уже встреченные.` : 'Повторов нет, все строки уникальны.', fields: proj.fields, computed, rows: marked });
    rows = marked.filter((r) => !r.out);
  }
  if (p.order) {
    const ord = await run(`SELECT ${p.list}, ${ref}.ctid::text AS __k ${fromSql}${whereSql} ORDER BY ${p.order}, ${ref}.ctid`);
    const pos = new Map();
    if (p.distinct) { ord.rows.forEach((r, i) => { const key = rowKey(r.slice(0, -1)); if (!pos.has(key)) pos.set(key, i); }); rows = rows.slice().sort((a, b) => pos.get(vk(a)) - pos.get(vk(b))); }
    else { ord.rows.forEach((r, i) => pos.set(r[r.length - 1], i)); rows = rows.slice().sort((a, b) => pos.get(a.key) - pos.get(b.key)); }
    steps.push({ clause: 'order', title: `ORDER BY ${p.order}`, text: 'Переставляем строки. Сортировка идёт после SELECT, поэтому здесь можно использовать алиасы.', fields: proj.fields, computed, rows, flip: true });
  }
  if (p.limit || p.offset) {
    const off = Number(p.offset || 0), lim = p.limit && !/^all$/i.test(p.limit) ? Number(p.limit) : Infinity;
    const marked = rows.map((r, i) => ({ ...r, out: i < off || i >= off + lim }));
    const kept = marked.filter((r) => !r.out).length;
    steps.push({ clause: 'limit', title: [p.limit && `LIMIT ${p.limit}`, p.offset && `OFFSET ${p.offset}`].filter(Boolean).join(' '), text: `${off ? `Пропускаем первые ${off}, оставляем` : 'Оставляем'} ${kept} ${plural(kept, 'строку', 'строки', 'строк')}.`, fields: proj.fields, computed, rows: marked });
    rows = marked.filter((r) => !r.out);
  }
  steps.push({ clause: 'result', title: 'Результат', text: `${rows.length} ${plural(rows.length, 'строка', 'строки', 'строк')} в ответе.`, fields: proj.fields, computed, rows: rows.map((r) => ({ ...r, out: false })) });
  // убрать строки, отброшенные на прошлых шагах
  let alive = null;
  for (const s of steps) {
    if (alive && s.clause !== 'select') s.rows = s.rows.filter((r) => alive.has(r.key));
    alive = new Set(s.rows.filter((r) => !r.out).map((r) => r.key));
  }
  return steps;
}

const CLAUSE_ORDER = [['from', 'FROM'], ['where', 'WHERE'], ['select', 'SELECT'], ['distinct', 'DISTINCT'], ['order', 'ORDER BY'], ['limit', 'LIMIT']];
async function visualize(container, sql) {
  container.innerHTML = '';
  const p = parseSimple(sql);
  if (p.error) { container.append(h(`<div class="viz-note">${esc(p.error)}</div>`)); return; }
  let steps;
  try { steps = await buildSteps(p); } catch (e) { container.append(h(`<div class="viz-note bad">Запрос с ошибкой, визуализировать нечего: ${esc(e.message)}</div>`)); return; }
  const present = new Set(steps.map((s) => s.clause));
  const box = h(`<div class="viz">
    <ol class="viz-pipe">${CLAUSE_ORDER.filter(([c]) => present.has(c)).map(([c, label], i) => `<li data-c="${c}"><span class="n">${i + 1}</span>${label}</li>`).join('')}<li data-c="result"><span class="n">✓</span>Ответ</li></ol>
    <div class="viz-cap"><b class="viz-title"></b><p class="viz-text"></p></div>
    <div class="viz-stage tbl-wrap"></div>
    <div class="viz-ctrl"><button class="btn ghost" data-a="prev" type="button">← Назад</button><button class="btn" data-a="play" type="button">Проиграть</button><button class="btn ghost" data-a="next" type="button">Дальше →</button><span class="viz-pos"></span></div>
  </div>`);
  container.append(box);
  const stage = $('.viz-stage', box);
  let i = 0, timer = null;
  const draw = (idx, animate) => {
    const s = steps[idx];
    const before = new Map();
    if (animate) stage.querySelectorAll('tr[data-k]').forEach((tr) => before.set(tr.dataset.k, tr.getBoundingClientRect().top));
    $('.viz-title', box).textContent = s.title;
    $('.viz-text', box).textContent = s.text;
    $('.viz-pos', box).textContent = `шаг ${idx + 1} из ${steps.length}`;
    box.querySelectorAll('.viz-pipe li').forEach((li) => { li.classList.toggle('on', li.dataset.c === s.clause); li.classList.toggle('done', steps.slice(0, idx).some((x) => x.clause === li.dataset.c)); });
    stage.innerHTML = `<table class="res viz-t"><thead><tr>${s.fields.map((f, j) => `<th class="${s.computed && s.computed[j] ? 'calc' : ''}">${esc(f)}</th>`).join('')}</tr></thead><tbody>${s.rows.map((r) => `<tr data-k="${esc(r.key)}" class="${r.out ? 'out' : ''}">${r.cells.map((v) => { const t = fmt(v); return t === null ? '<td class="null">NULL</td>' : `<td>${esc(t)}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
    stage.classList.toggle('pulse', s.clause === 'select');
    if (animate && !reduceMotion()) {
      stage.querySelectorAll('tr[data-k]').forEach((tr) => {
        const old = before.get(tr.dataset.k);
        if (old == null) { tr.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 }); return; }
        const dy = old - tr.getBoundingClientRect().top;
        if (dy) tr.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: s.flip ? 700 : 350, easing: 'cubic-bezier(.2,.7,.2,1)' });
      });
    }
    $('[data-a=prev]', box).disabled = idx === 0;
    $('[data-a=next]', box).disabled = idx === steps.length - 1;
  };
  const stop = () => { clearInterval(timer); timer = null; $('[data-a=play]', box).textContent = 'Проиграть'; };
  box.addEventListener('click', (e) => {
    const a = e.target.closest('button')?.dataset.a; if (!a) return;
    if (a === 'prev' && i > 0) { stop(); draw(--i, true); }
    if (a === 'next' && i < steps.length - 1) { stop(); draw(++i, true); }
    if (a === 'play') {
      if (timer) return stop();
      if (i === steps.length - 1) { i = 0; draw(0, false); }
      $('[data-a=play]', box).textContent = 'Пауза';
      timer = setInterval(() => { if (i >= steps.length - 1) return stop(); draw(++i, true); }, 1700);
    }
  });
  draw(0, false);
}


/* ================= demo «было → стало» для теории ================= */
async function renderDemo(el) {
  const sql = el.dataset.sql;
  el.innerHTML = `<pre class="sql">${hl(sql)}</pre><div class="demo-body"><p class="muted small">Считаю…</p></div>${el.dataset.note ? `<p class="demo-note">${esc(el.dataset.note)}</p>` : ''}`;
  const body = $('.demo-body', el);
  let result;
  try { result = await run(sql); } catch (e) { body.innerHTML = `<div class="err"><pre>${esc(e.message)}</pre></div>`; return; }
  const after = `<div class="demo-col"><p class="eyebrow">Стало: ответ</p>${tableHTML(result, { max: 30 })}</div>`;
  const p = parseSimple(sql);
  if (p.error) { body.innerHTML = after; return; }
  try {
    const ref = p.alias || p.table;
    const from = `FROM ${p.table}${p.alias ? ' ' + p.alias : ''}`;
    const base = await run(`SELECT *, ${ref}.ctid::text AS __k ${from} ORDER BY ${ref}.ctid`);
    const k = base.fields.length - 1;
    let ok = null;
    if (p.where) ok = new Set((await run(`SELECT ${ref}.ctid::text ${from} WHERE ${p.where}`)).rows.map((r) => r[0]));
    const listLow = ' ' + p.list.toLowerCase().replace(/'(?:[^']|'')*'/g, '') + ' ';
    const used = base.fields.slice(0, k).map((f) => p.list.trim() === '*' || new RegExp('[^a-z0-9_]' + f + '[^a-z0-9_]').test(listLow));
    const head = base.fields.slice(0, k).map((f, j) => `<th class="${used[j] ? 'calc' : ''}">${esc(f)}</th>`).join('');
    const rows = base.rows.map((r) => `<tr class="${ok && !ok.has(r[k]) ? 'out' : ''}">${r.slice(0, k).map((v, j) => `<td class="${used[j] ? 'use' : ''}">${esc(fmt(v) ?? 'NULL')}</td>`).join('')}</tr>`).join('');
    const kept = ok ? ok.size : base.rows.length;
    body.innerHTML = `<div class="demo-col"><p class="eyebrow">Было: таблица ${esc(p.table)}</p><div class="tbl-wrap"><table class="res viz-t">${`<thead><tr>${head}</tr></thead>`}<tbody>${rows}</tbody></table></div><p class="rows-count">${base.rows.length} ${plural(base.rows.length, 'строка', 'строки', 'строк')}${ok ? `, условию подходят ${kept}` : ''}</p></div><div class="demo-arrow" aria-hidden="true">→</div>${after}`;
  } catch { body.innerHTML = after; }
}

/* ================= runner block (editor + buttons + output) ================= */
function runner({ initial = '', rows = 7, onCheck = null, showViz = true, noRun = false, checkLabel = 'Проверить', extra = '' } = {}) {
  const paper = noRun;
  const wrap = h(`<div class="runner"></div>`);
  const ta = editor(initial, { rows });
  const bar = h(`<div class="bar">
    ${noRun ? '' : '<button class="btn" data-a="run" type="button" title="Ctrl+Enter">Запустить</button>'}
    ${onCheck ? `<button class="btn pen" data-a="check" type="button">${noRun ? 'Ответить' : checkLabel}</button>` : ''}
    ${showViz && !noRun ? '<button class="btn ghost" data-a="viz" type="button">Показать выполнение</button>' : ''}
    ${extra}
    <span class="kbd">${noRun ? 'Без запуска: проверка памяти' : 'Ctrl + Enter: запустить'}</span>
  </div>`);
  const out = h(`<div class="out"></div>`);
  const viz = h(`<div class="viz-host"></div>`);
  wrap.append(ta, bar, out, viz);
  const doRun = async () => {
    out.innerHTML = '<p class="muted small">Выполняю…</p>';
    try { const res = await run(ta.value); out.innerHTML = tableHTML(res); }
    catch (e) { out.innerHTML = `<div class="err"><b>Ошибка PostgreSQL</b><pre>${esc(e.message)}</pre>${hintForError(e.message, ta.value)}</div>`; }
  };
  wrap.addEventListener('run', () => (paper ? null : doRun()));
  bar.addEventListener('click', async (e) => {
    const a = e.target.closest('button')?.dataset.a;
    if (a === 'run') doRun();
    if (a === 'viz') { viz.innerHTML = '<p class="muted small">Строю шаги…</p>'; await visualize(viz, ta.value); viz.scrollIntoView({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' }); }
    if (a === 'check' && onCheck) onCheck(ta.value, { out, ta, viz, bar });
  });
  return { el: wrap, ta, out, viz, bar, run: doRun };
}

function hintForError(msg, sql) {
  const tips = [];
  if (/column "([^"]+)" does not exist/.test(msg)) {
    const c = msg.match(/column "([^"]+)" does not exist/)[1];
    if (new RegExp('"' + c + '"').test(sql)) tips.push(`Похоже, строка в двойных кавычках. Строки пишутся в одинарных: '${c}'.`);
    else if (/where/i.test(sql) && new RegExp('as\\s+' + c, 'i').test(sql)) tips.push('Алиас из SELECT нельзя использовать в WHERE: WHERE выполняется раньше.');
    else tips.push('Проверь имя колонки по схеме справа или снизу.');
  }
  if (/with no tables specified|missing FROM-clause/i.test(msg)) tips.push('Не хватает FROM и имени таблицы. После списка колонок напиши, откуда брать данные, например: FROM person.');
  if (/syntax error at or near "FROM"/i.test(msg)) tips.push('Возможно, лишняя запятая перед FROM.');
  if (/syntax error at end of input/i.test(msg)) tips.push('Запрос оборвался: не хватает части выражения, скобки или END у CASE.');
  if (/relation "([^"]+)" does not exist/.test(msg)) tips.push('Такой таблицы нет. Таблицы: ' + SCHEMA.map((t) => t.name).join(', ') + '.');
  if (/more than one row returned by a subquery/.test(msg)) tips.push('Скалярный подзапрос вернул несколько строк. Используй IN или сузь подзапрос.');
  return tips.length ? `<p class="tip">${tips.map(esc).join(' ')}</p>` : '';
}

const tablesOf = (sql) => [...new Set([...stripSql(sql).matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase()))];
const tablesHTML = (sql) => { const t = tablesOf(sql); return `<p class="tables">${t.length > 1 ? 'Таблицы' : 'Таблица'}: ${t.map((x) => `<code>${x}</code>`).join(', ')}</p>`; };

function schemaHTML() {
  return `<div class="schema">${SCHEMA.map((t) => `<div class="sch-t"><button class="sch-name" type="button" data-table="${t.name}" title="Вставить SELECT * FROM ${t.name}">${t.name}</button><small>${esc(t.note)}</small><ul>${t.cols.map((c) => `<li>${c.replace(/→ (\w+)/, '<span class="fk">→ $1</span>')}</li>`).join('')}</ul></div>`).join('')}</div>`;
}

/* ================= spaced repetition ================= */
const BOX_INTERVAL = [0, 10 * MIN, 1 * DAY, 2 * DAY, 4 * DAY, 7 * DAY];
function allCards() {
  const extra = Object.keys(store.state.cards).filter((id) => id.startsWith('x:')).map((id) => {
    const t = EXAM_TASKS.find((e) => e.id === id.slice(2)) || TASKS.find((e) => e.id === id.slice(2));
    return t && { id, type: 'write', q: t.text, ref: t.ref, ordered: t.ordered, forbid: t.forbid, checkNames: t.checkNames, fromExam: true };
  }).filter(Boolean);
  return CARDS.concat(extra);
}
const cardState = (id) => store.state.cards[id] || { box: 0, due: 0, seen: 0, lapses: 0 };
function dueCards() { const t = now(); return allCards().filter((c) => cardState(c.id).due <= t); }
function grade(id, result) { // result: 'again' | 'hard' | 'good'
  const s = { ...cardState(id) };
  s.seen++;
  if (result === 'again') { s.box = 1; s.lapses++; s.due = now() + 1 * MIN; }
  else if (result === 'hard') { s.box = Math.max(1, s.box); s.due = now() + BOX_INTERVAL[s.box]; }
  else { s.box = Math.min(5, s.box + 1); s.due = now() + BOX_INTERVAL[s.box]; }
  store.state.cards[id] = s; store.save();
}
const fmtWait = (ms) => ms < MIN ? 'меньше минуты' : ms < 60 * MIN ? `${Math.round(ms / MIN)} мин` : ms < DAY ? `${Math.round(ms / 36e5)} ч` : `${Math.round(ms / DAY)} ${plural(Math.round(ms / DAY), 'день', 'дня', 'дней')}`;

/* ================= views ================= */
const views = {};
const main = () => $('#main');

function progressNumbers() {
  const st = store.state;
  const lessons = LESSONS.filter((l) => st.lessons[l.id]?.read).length;
  const tasks = TASKS.filter((t) => st.tasks[t.id]?.solved).length;
  const paper = TASKS.filter((t) => st.tasks[t.id]?.paper).length;
  const bestTest = st.tests.reduce((m, t) => Math.max(m, t.score), 0);
  const bestExam = st.exams.filter((t) => t.total === 100).reduce((m, t) => Math.max(m, t.score), 0);
  const learned = CARDS.filter((c) => cardState(c.id).box >= 3).length;
  return { lessons, tasks, paper, bestTest, bestExam, learned, due: dueCards().length };
}

views.home = () => {
  const p = progressNumbers();
  const bar = (v, max) => `<span class="meter"><i style="width:${Math.round((v / max) * 100)}%"></i></span>`;
  main().innerHTML = `
  <section class="hero">
    <p class="eyebrow">${TOPIC.day} · тема 1 из 10</p>
    <h1>${TOPIC.title}</h1>
    <p class="lead">На экзамене в Школе 21 есть компьютер, но нет интернета, документации и подсказок. Задания открываются по уровням, а сдачу проверяет автопроверка. Поэтому здесь всё построено вокруг одного навыка: написать верный запрос по памяти и сдать его с первой попытки.</p>
  </section>
  <section class="today">
    <a class="today-card due" href="#review"><b>${p.due}</b><span>${plural(p.due, 'карточка', 'карточки', 'карточек')} к повторению сейчас</span></a>
    <a class="today-card" href="#practice"><b>${p.tasks}<small>/${TASKS.length}</small></b><span>задач решено, в режиме экзамена ${p.paper}</span></a>
    <a class="today-card" href="#exam"><b>${store.state.exams.length ? p.bestExam : '—'}</b><span>лучший пробный экзамен, баллов из 100</span></a>
  </section>
  <section class="path">
    <h2>Путь по теме</h2>
    <ol class="steps">
      <li><a href="#learn"><b>Теория</b><span>${p.lessons} из ${LESSONS.length} разделов</span>${bar(p.lessons, LESSONS.length)}</a></li>
      <li><a href="#practice"><b>Тренажёр</b><span>${p.tasks} из ${TASKS.length} задач</span>${bar(p.tasks, TASKS.length)}</a></li>
      <li><a href="#test"><b>Тест по теме</b><span>${store.state.tests.length ? `лучший результат ${p.bestTest} из ${TEST.length}` : 'ещё не пройден'}</span>${bar(p.bestTest, TEST.length)}</a></li>
      <li><a href="#exam"><b>Пробный экзамен</b><span>${store.state.exams.length ? `попыток: ${store.state.exams.length}` : '4 уровня, задания по одному'}</span>${bar(p.bestExam, 100)}</a></li>
    </ol>
  </section>
  <section class="routine">
    <h2>Распорядок на неделю до экзамена</h2>
    <table class="plan">
      <tbody>
      <tr><th>Каждый день</th><td>Повторение карточек (10–15 минут), затем 5 задач тренажёра в режиме экзамена.</td></tr>
      <tr><th>Дни 1–2</th><td>Теория целиком: читаешь раздел, запускаешь пример, смотришь выполнение, отвечаешь на вопрос по памяти.</td></tr>
      <tr><th>Дни 3–5</th><td>Все задачи тренажёра. Сначала обычный режим, потом те же задачи в режиме экзамена: без подсказок и визуализации. Тест по теме.</td></tr>
      <tr><th>Дни 6–7</th><td>Пробный экзамен каждый день, листок с ручкой рядом для заметок. Ошибки экзамена автоматически попадают в повторение.</td></tr>
      </tbody>
    </table>
  </section>
  <section class="method">
    <h2>Почему так</h2>
    <dl>${METHOD.map((m) => `<div><dt>${m.t}</dt><dd>${m.d}</dd></div>`).join('')}</dl>
  </section>
  <section class="danger-zone">
    <button class="btn ghost small" type="button" id="reset">Сбросить прогресс</button>
    <span id="reset-confirm" hidden>Точно удалить весь прогресс? <button class="btn small bad" type="button" id="reset-yes">Да, удалить</button> <button class="btn ghost small" type="button" id="reset-no">Отмена</button></span>
  </section>`;
  $('#reset').onclick = () => { $('#reset-confirm').hidden = false; };
  $('#reset-no').onclick = () => { $('#reset-confirm').hidden = true; };
  $('#reset-yes').onclick = () => { store.reset(); views.home(); };
};

let lessonIdx = 0;
views.learn = () => {
  const st = store.state;
  const l = LESSONS[lessonIdx];
  main().innerHTML = `
  <div class="split">
    <nav class="side" aria-label="Разделы теории"><p class="eyebrow">Теория</p><ol>${LESSONS.map((x, i) => `<li><button type="button" data-i="${i}" class="${i === lessonIdx ? 'on' : ''}"><span class="mark ${st.lessons[x.id]?.recalled ? 'ok' : st.lessons[x.id]?.read ? 'half' : ''}"></span>${esc(x.title)}</button></li>`).join('')}</ol></nav>
    <article class="lesson">
      <p class="eyebrow">Раздел ${lessonIdx + 1} из ${LESSONS.length}</p>
      <h1>${esc(l.title)}</h1>
      <div class="prose">${l.html}${l.extraHtml || ''}</div>
      <h3>Попробуй сам</h3>
      ${l.exampleNote ? `<p class="muted">${esc(l.exampleNote)}</p>` : ''}
      <div id="ex"></div>
      <div class="recall">
        <p class="eyebrow">Вспомни, не подглядывая</p>
        <p class="q">${esc(l.recall.q)}</p>
        <textarea id="recall-in" rows="2" placeholder="Ответь своими словами, потом открой ответ"></textarea>
        <div class="bar"><button class="btn" id="show-a" type="button">Показать ответ</button></div>
        <div id="recall-a" hidden><p class="answer">${esc(l.recall.a)}</p><div class="bar"><button class="btn pen" id="rec-ok" type="button">Вспомнил</button><button class="btn ghost" id="rec-no" type="button">Не вспомнил</button></div></div>
      </div>
      <div class="pager">${lessonIdx > 0 ? `<button class="btn ghost" data-go="${lessonIdx - 1}" type="button">← ${esc(LESSONS[lessonIdx - 1].title)}</button>` : '<span></span>'}${lessonIdx < LESSONS.length - 1 ? `<button class="btn" data-go="${lessonIdx + 1}" type="button">${esc(LESSONS[lessonIdx + 1].title)} →</button>` : '<a class="btn pen" href="#practice">К тренажёру →</a>'}</div>
    </article>
  </div>`;
  const r = runner({ initial: l.example, rows: Math.min(9, l.example.split('\n').length + 1) });
  $('#ex').append(r.el);
  document.querySelectorAll('.prose .demo').forEach(renderDemo);
  document.querySelectorAll('.prose .demo-table').forEach(async (el) => { el.innerHTML = tableHTML(await run(`SELECT * FROM ${el.dataset.table} ORDER BY id`)); });
  st.lessons[l.id] = { ...(st.lessons[l.id] || {}), read: true }; store.save();
  $('.side').addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) { lessonIdx = +b.dataset.i; views.learn(); window.scrollTo(0, 0); } });
  $('.pager').addEventListener('click', (e) => { const b = e.target.closest('button[data-go]'); if (b) { lessonIdx = +b.dataset.go; views.learn(); window.scrollTo(0, 0); } });
  $('#show-a').onclick = () => { $('#recall-a').hidden = false; $('#show-a').hidden = true; };
  const mark = (ok) => { st.lessons[l.id] = { ...st.lessons[l.id], recalled: ok }; store.save(); $('#recall-a .bar').innerHTML = `<p class="small ${ok ? 'good' : 'muted'}">${ok ? 'Отмечено. Карточки по теме ждут в «Повторении».' : 'Ничего страшного: перечитай раздел и вернись к вопросу через пару минут.'}</p>`; $('.side .on .mark').className = 'mark ' + (ok ? 'ok' : 'half'); };
  $('#rec-ok').onclick = () => mark(true);
  $('#rec-no').onclick = () => mark(false);
};

let taskIdx = 0, paperMode = false;
views.practice = () => {
  const st = store.state;
  const t = TASKS[taskIdx];
  const ts = st.tasks[t.id] || {};
  main().innerHTML = `
  <div class="split">
    <nav class="side" aria-label="Задачи"><p class="eyebrow">Тренажёр · ${TASKS.filter((x) => st.tasks[x.id]?.solved).length}/${TASKS.length}</p>
      <label class="switch" title="Без подсказок, эталона и визуализации. Запускать запросы можно, но каждая неверная сдача засчитывается как ошибка."><input type="checkbox" id="paper" ${paperMode ? 'checked' : ''}> Режим экзамена</label>
      <ol>${TASKS.map((x, i) => { const s = st.tasks[x.id] || {}; return `<li><button type="button" data-i="${i}" class="${i === taskIdx ? 'on' : ''}"><span class="mark ${s.paper ? 'ok' : s.solved ? 'half' : s.tries ? 'bad' : ''}"></span><span class="lvl">${'•'.repeat(x.level)}</span>${esc(x.title)}</button></li>`; }).join('')}</ol>
      <p class="legend"><span class="mark half"></span>решено <span class="mark ok"></span>решено в режиме экзамена <span class="mark bad"></span>есть ошибки</p>
    </nav>
    <article class="task">
      <p class="eyebrow">Задача ${taskIdx + 1} · уровень ${t.level}${ts.solved ? ' · решена' : ''}${ts.paper ? ' в режиме экзамена' : ''}</p>
      <h1>${esc(t.title)}</h1>
      <p class="task-text">${t.text}</p>
      ${tablesHTML(t.ref)}
      <div id="r"></div>
      <div class="hints" id="hints"></div>
      <details class="schema-box" open><summary>Схема базы: какие таблицы и колонки есть</summary>${schemaHTML()}</details>
      <div class="pager">${taskIdx > 0 ? `<button class="btn ghost" data-go="${taskIdx - 1}" type="button">← Предыдущая</button>` : '<span></span>'}${taskIdx < TASKS.length - 1 ? `<button class="btn" data-go="${taskIdx + 1}" type="button">Следующая →</button>` : '<a class="btn pen" href="#test">К тесту →</a>'}</div>
    </article>
  </div>`;
  const draftKey = 'draft.' + t.id + (paperMode ? '.p' : '');
  let draft = ''; try { draft = sessionStorage.getItem(draftKey) || ''; } catch {}
  const r = runner({
    initial: draft, rows: 8, showViz: !paperMode, checkLabel: paperMode ? 'Сдать' : 'Проверить',
    extra: paperMode ? '' : '<button class="btn ghost" data-a="hint" type="button">Подсказка</button><button class="btn ghost" data-a="answer" type="button">Ответ</button>',
    onCheck: async (sql, { out, bar }) => {
      out.innerHTML = '<p class="muted small">Проверяю…</p>';
      const res = await check(sql, t);
      const s = { ...(st.tasks[t.id] || {}) };
      s.tries = (s.tries || 0) + 1;
      if (res.ok) { s.solved = true; if (paperMode) s.paper = true; }
      st.tasks[t.id] = s; store.save();
      out.innerHTML = paperMode ? `<div class="verdict ${res.ok ? 'ok' : 'bad'}"><b>${res.ok ? 'OK' : 'FAILURE'}</b><span>${res.ok ? 'Задание сдано.' : esc(res.reason) + ' Эталон в режиме экзамена не показывается.'}</span></div>` : verdictHTML(res, t, false);
      document.querySelectorAll('.side li button')[taskIdx].querySelector('.mark').className = 'mark ' + (s.paper ? 'ok' : s.solved ? 'half' : 'bad');
    },
  });
  $('#r').append(r.el);
  r.ta.addEventListener('input', () => { try { sessionStorage.setItem(draftKey, r.ta.value); } catch {} });
  r.bar.addEventListener('click', (e) => {
    const a = e.target.closest('button')?.dataset.a;
    if (a === 'hint') $('#hints').innerHTML = `<p class="tip">Подсказка: <code>${esc(t.hint || 'перечитай условие')}</code></p>`;
    if (a === 'answer') {
      $('#hints').innerHTML = `<div class="reveal">Показать эталон? Лучше сначала попробовать ещё раз: подсмотренный ответ запоминается хуже. <button class="btn small" type="button" id="reveal-yes">Показать</button></div>`;
      $('#reveal-yes').onclick = () => { $('#hints').innerHTML = `<pre class="sql">${hl(t.ref)}</pre>`; };
    }
  });
  $('#paper').onchange = (e) => { paperMode = e.target.checked; views.practice(); };
  $('.side').addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) { taskIdx = +b.dataset.i; views.practice(); } });
  $('.pager').addEventListener('click', (e) => { const b = e.target.closest('button[data-go]'); if (b) { taskIdx = +b.dataset.go; views.practice(); window.scrollTo(0, 0); } });
  $('.schema').addEventListener('click', (e) => { const b = e.target.closest('[data-table]'); if (b) { r.ta.value = `SELECT * FROM ${b.dataset.table};`; r.run(); } });
};

function verdictHTML(res, task, paper) {
  let html = `<div class="verdict ${res.ok ? 'ok' : res.almost ? 'almost' : 'bad'}"><b>${res.ok ? 'Верно' : res.almost ? 'Почти' : 'Неверно'}</b><span>${esc(res.reason)}</span></div>`;
  if (res.mine && !res.ok) {
    html += `<div class="cmp"><div><p class="eyebrow">Твой результат</p>${tableHTML(res.mine, { max: 25 })}</div><div><p class="eyebrow">Ожидалось</p>${tableHTML(res.ref, { max: 25 })}</div></div>`;
  } else if (res.mine) {
    html += tableHTML(res.mine, { max: 25 });
    if (!paper) html += `<p class="small muted">Эталон: </p><pre class="sql">${hl(task.ref)}</pre>`;
  }
  return html;
}

/* ---------- review ---------- */
views.review = () => {
  const due = dueCards();
  const all = allCards();
  const boxes = [0, 1, 2, 3, 4, 5].map((b) => all.filter((c) => cardState(c.id).box === b).length);
  const header = `<p class="eyebrow">Повторение</p><h1>Карточки</h1>
    <div class="boxes" aria-label="Карточки по коробкам">${['новые', '10 мин', '1 день', '2 дня', '4 дня', '7 дней'].map((l, i) => `<div><b>${boxes[i]}</b><span>${l}</span></div>`).join('')}</div>`;
  if (!due.length) {
    const next = all.map((c) => cardState(c.id).due).filter((d) => d > now()).sort((a, b) => a - b)[0];
    main().innerHTML = `<article class="narrow">${header}<div class="empty"><p><b>На сейчас всё повторено.</b></p><p>Следующая карточка через ${next ? fmtWait(next - now()) : '—'}. Пока можно решить пару задач в режиме бумаги.</p><a class="btn" href="#practice">В тренажёр</a></div></article>`;
    return;
  }
  // новые карточки после просроченных
  const queueCards = due.sort((a, b) => (cardState(b.id).seen ? 1 : 0) - (cardState(a.id).seen ? 1 : 0) || cardState(a.id).due - cardState(b.id).due);
  const c = queueCards[0];
  main().innerHTML = `<article class="narrow">${header}
    <p class="small muted">Осталось сейчас: ${due.length}${c.fromExam ? ' · ошибка с пробного экзамена' : ''}</p>
    <div class="flash">
      <p class="q">${c.type === 'write' ? c.q : esc(c.q)}</p>${c.type === 'write' ? tablesHTML(c.ref) : ''}
      <div id="fbody"></div>
    </div></article>`;
  const body = $('#fbody');
  if (c.type === 'recall') {
    body.innerHTML = `<textarea id="frec" rows="2" placeholder="Сначала ответь по памяти"></textarea><div class="bar"><button class="btn" id="flip" type="button">Показать ответ</button></div>`;
    $('#flip').onclick = () => {
      body.innerHTML = `<p class="answer">${esc(c.a)}</p><div class="bar grade"><button class="btn bad" data-g="again" type="button">Не вспомнил</button><button class="btn ghost" data-g="hard" type="button">С трудом</button><button class="btn pen" data-g="good" type="button">Помню</button></div>`;
      body.querySelector('.grade').onclick = (e) => { const g = e.target.closest('[data-g]')?.dataset.g; if (g) { grade(c.id, g); views.review(); } };
    };
  } else {
    const r = runner({ rows: 5, noRun: true, showViz: false, onCheck: async (sql, { out, bar }) => {
      bar.querySelector('[data-a=check]').disabled = true; r.ta.readOnly = true;
      const res = await check(sql, c);
      out.innerHTML = `<div class="verdict ${res.ok ? 'ok' : 'bad'}"><b>${res.ok ? 'Верно' : 'Неверно'}</b><span>${esc(res.reason)}</span></div><p class="small muted">Эталон:</p><pre class="sql">${hl(c.ref)}</pre><div class="bar"><button class="btn pen" id="nextc" type="button">Дальше</button></div>`;
      $('#nextc').onclick = () => { grade(c.id, res.ok ? 'good' : 'again'); views.review(); };
    } });
    body.append(r.el);
    r.ta.focus();
  }
};

/* ---------- test ---------- */
let testRun = null;
views.test = () => {
  if (!testRun) {
    const hist = store.state.tests.slice(-5).reverse();
    main().innerHTML = `<article class="narrow"><p class="eyebrow">Тест по теме</p><h1>${TOPIC.title}</h1>
      <p class="lead">${TEST.length} вопросов: выбор ответа, «сколько строк вернёт запрос» и запросы, которые нужно написать без запуска. Ответ на каждый вопрос даётся один раз.</p>
      <div class="bar"><button class="btn pen" id="start" type="button">Начать тест</button></div>
      ${hist.length ? `<h3>Прошлые попытки</h3><ul class="hist">${hist.map((t) => `<li><b>${t.score}/${t.total}</b> <span class="muted">${new Date(t.at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span></li>`).join('')}</ul>` : ''}
    </article>`;
    $('#start').onclick = () => { testRun = { i: 0, answers: [], items: shuffle(TEST) }; views.test(); };
    return;
  }
  const { i, items } = testRun;
  if (i >= items.length) {
    const score = testRun.answers.filter((a) => a.ok).length;
    store.state.tests.push({ at: now(), score, total: items.length }); store.save();
    const wrong = testRun.answers.filter((a) => !a.ok);
    main().innerHTML = `<article class="narrow"><p class="eyebrow">Тест завершён</p><h1>${score} из ${items.length}</h1>
      <p class="lead">${score === items.length ? 'Все ответы верные. Переходи к пробному экзамену.' : score >= 8 ? 'Хорошо. Разбери ошибки ниже и пройди тест ещё раз завтра.' : 'Вернись к теории по вопросам с ошибками, потом пройди тест ещё раз.'}</p>
      ${wrong.length ? `<h3>Ошибки</h3><ol class="mistakes">${wrong.map((a) => `<li><p>${esc(a.q.q)}</p>${a.q.sql ? `<pre class="sql">${hl(a.q.sql)}</pre>` : ''}<p class="small">Твой ответ: <b>${esc(a.given)}</b>. Верно: <b>${esc(a.right)}</b>. ${esc(a.q.why || '')}</p></li>`).join('')}</ol>` : ''}
      <div class="bar"><button class="btn" id="again" type="button">Пройти ещё раз</button><a class="btn pen" href="#exam">К пробному экзамену</a></div></article>`;
    $('#again').onclick = () => { testRun = null; views.test(); };
    return;
  }
  const q = items[i];
  main().innerHTML = `<article class="narrow"><p class="eyebrow">Вопрос ${i + 1} из ${items.length}</p>
    <div class="progress-line"><i style="width:${(i / items.length) * 100}%"></i></div>
    <h2 class="q">${esc(q.q)}</h2>${q.type === 'write' ? tablesHTML(q.ref) : ''}${q.sql ? `<pre class="sql">${hl(q.sql)}</pre>` : ''}<div id="qa"></div><div id="qfb"></div></article>`;
  const qa = $('#qa'), fb = $('#qfb');
  const finish = (ok, given, right) => {
    testRun.answers.push({ q, ok, given, right });
    fb.innerHTML = `<div class="verdict ${ok ? 'ok' : 'bad'}"><b>${ok ? 'Верно' : 'Неверно'}</b><span>${ok ? esc(q.why || '') : `Правильный ответ: ${esc(right)}. ${esc(q.why || '')}`}</span></div><div class="bar"><button class="btn pen" id="nextq" type="button">${i + 1 < items.length ? 'Следующий вопрос' : 'Результат'}</button></div>`;
    $('#nextq').onclick = () => { testRun.i++; views.test(); };
    $('#nextq').focus();
  };
  if (q.type === 'choice') {
    qa.innerHTML = `<div class="options">${q.options.map((o, j) => `<button type="button" class="opt" data-j="${j}"><code>${esc(o)}</code></button>`).join('')}</div>`;
    qa.onclick = (e) => { const b = e.target.closest('.opt'); if (!b || qa.dataset.done) return; qa.dataset.done = 1; const j = +b.dataset.j; qa.querySelectorAll('.opt').forEach((x, k) => { x.disabled = true; x.classList.toggle('right', k === q.correct); x.classList.toggle('wrong', k === j && j !== q.correct); }); finish(j === q.correct, q.options[j], q.options[q.correct]); };
  } else if (q.type === 'count') {
    qa.innerHTML = `<div id="qdata"></div><form class="count" id="cf"><label for="cnt">Строк в результате:</label><input id="cnt" type="number" min="0" inputmode="numeric" required><button class="btn" type="submit">Ответить</button></form>`;
    $('#cf').onsubmit = async (e) => { e.preventDefault(); const v = +$('#cnt').value; $('#cf button').disabled = true; $('#cnt').readOnly = true; const res = await run(q.sql); finish(v === res.rows.length, String(v), String(res.rows.length)); fb.append(h(`<div>${tableHTML(res)}</div>`)); };
    $('#cnt').focus();
    // данные, по которым нужно посчитать ответ
    (async () => {
      const parts = [];
      for (const t of tablesOf(q.sql)) parts.push(`<p class="eyebrow">Таблица ${t}: посчитай по этим данным</p>${tableHTML(await run(`SELECT * FROM ${t} ORDER BY id`))}`);
      const el = $('#qdata'); if (el) el.innerHTML = parts.join('');
    })();
  } else {
    const r = runner({ rows: 5, noRun: true, showViz: false, onCheck: async (sql, { bar }) => { bar.querySelector('[data-a=check]').disabled = true; r.ta.readOnly = true; const res = await check(sql, q); finish(res.ok, res.ok ? 'верный запрос' : res.reason, q.ref); } });
    qa.append(r.el);
  }
};

/* ---------- exam ---------- */
// Симуляция экзамена в формате Школы 21: компьютер без интернета, задания по уровням,
// одно задание за раз, сдача на автопроверку, после провала новое задание того же уровня и штраф по времени.
const LEVELS = 4, PTS = 25, PASS = 50, EXAM_MINUTES = [60, 90, 120];
let exam = null;
const examSave = () => { try { sessionStorage.setItem('exam.v2', JSON.stringify(exam)); } catch {} };
try { const e = JSON.parse(sessionStorage.getItem('exam.v2') || 'null'); if (e && !e.done && e.end > now()) exam = e; } catch {}
const examTask = (id) => EXAM_TASKS.find((t) => t.id === id);
function pickTask(level) {
  const pool = EXAM_TASKS.filter((t) => t.level === level);
  const fresh = pool.filter((t) => !exam.used.includes(t.id));
  const t = shuffle(fresh.length ? fresh : pool)[0];
  exam.used.push(t.id);
  return t.id;
}
const mmss = (ms) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
function examTimerTick() {
  if (!exam || exam.done) return;
  const left = Math.max(0, exam.end - now());
  const el = $('#timer'); if (el) { el.textContent = mmss(left); el.classList.toggle('late', left < 5 * MIN); }
  const bar = $('#tbar'); if (bar) bar.style.width = `${(left / (exam.minutes * MIN)) * 100}%`;
  const btn = $('#grademe');
  if (btn) {
    const wait = exam.cooldownUntil - now();
    btn.disabled = wait > 0 || exam.checking;
    btn.textContent = wait > 0 ? `Сдать через ${mmss(wait)}` : 'Сдать (grademe)';
  }
  if (left <= 0) finishExam('time');
}
setInterval(examTimerTick, 1000);

function finishExam(reason) {
  if (!exam || exam.done) return;
  exam.done = true; exam.reason = reason; exam.finishedAt = Math.min(now(), exam.end);
  const failedIds = [...new Set(exam.attempts.filter((a) => !a.ok).map((a) => a.id))];
  failedIds.forEach((id) => { if (!exam.attempts.some((a) => a.id === id && a.ok)) store.state.cards['x:' + id] = { box: 1, due: now(), seen: 0, lapses: 1 }; });
  store.state.exams.push({ at: now(), score: exam.points, total: 100, dur: Math.round((exam.finishedAt - exam.start) / 1000), tries: exam.attempts.length, level: exam.level });
  store.save();
  try { sessionStorage.removeItem('exam.v2'); } catch {}
  views.exam();
}

async function grademe() {
  if (!exam || exam.done || exam.checking || exam.cooldownUntil > now()) return;
  const sql = $('#exam-sql').value;
  exam.checking = true; examTimerTick();
  const out = $('#exam-out');
  out.innerHTML = '<p class="muted small">Автопроверка…</p>';
  const t = examTask(exam.current);
  const res = await check(sql, t);
  exam.checking = false;
  exam.attempts.push({ id: t.id, level: exam.level, sql, ok: res.ok, reason: res.reason, at: now() });
  if (res.ok) {
    exam.points += PTS; exam.fails = 0;
    if (exam.level >= LEVELS) { exam.level = LEVELS + 1; examSave(); finishExam('all'); return; }
    exam.level++; exam.current = pickTask(exam.level); exam.draft = '';
    examSave(); views.exam();
    $('#exam-out').innerHTML = `<div class="verdict ok"><b>SUCCESS</b><span>+${PTS} баллов. Открыт уровень ${exam.level}.</span></div>`;
  } else {
    exam.fails++;
    const penalty = exam.penalty ? Math.min(4 * MIN, 30e3 * 2 ** (exam.fails - 1)) : 0;
    exam.cooldownUntil = now() + penalty;
    exam.current = pickTask(exam.level); exam.draft = '';
    examSave(); views.exam();
    $('#exam-out').innerHTML = `<div class="verdict bad"><b>FAILURE</b><span>${esc(res.reason)} Выдано новое задание того же уровня.${penalty ? ` Кнопка «Сдать» снова заработает через ${fmtWait(penalty).replace('меньше минуты', '30 секунд')}.` : ''}</span></div>`;
  }
  examTimerTick();
}

views.exam = () => {
  if (exam && exam.done) {
    const passed = exam.points >= PASS;
    const tries = exam.attempts;
    main().innerHTML = `<article class="narrow">
      <p class="eyebrow">Пробный экзамен · ${exam.reason === 'time' ? 'время вышло' : exam.reason === 'all' ? 'все уровни пройдены' : 'завершён досрочно'}</p>
      <div class="exam-score ${passed ? 'ok' : 'bad'}"><b>${exam.points}</b><span>${passed ? 'Сдано' : 'Не сдано'}. Пройдено уровней: ${Math.min(exam.level - 1, LEVELS)} из ${LEVELS}, сдач: ${tries.length}, ошибок: ${tries.filter((a) => !a.ok).length}. Порог в симуляции ${PASS} из 100.</span></div>
      <p>${tries.some((a) => !a.ok) ? 'Задания, которые ты так и не сдал, добавлены в «Повторение»: они вернутся сегодня и потом через 1, 2, 4 дня.' : 'Без единой ошибки. Завтра попробуй ещё раз: задания выпадают случайно.'}</p>
      <h3>Все сдачи</h3>
      <ol class="exam-review">${tries.map((a) => { const t = examTask(a.id); return `<li class="${a.ok ? 'ok' : 'bad'}"><h3>Уровень ${a.level}. ${esc(t.title)} <span class="tag">${a.ok ? 'success' : 'failure'}</span></h3><p class="task-text">${t.text}</p><p class="eyebrow">Твой ответ</p><pre class="sql">${a.sql.trim() ? hl(a.sql) : '<span class="muted">пусто</span>'}</pre>${a.ok ? '' : `<p class="small">${esc(a.reason)}</p><p class="eyebrow">Эталон</p><pre class="sql">${hl(t.ref)}</pre>`}</li>`; }).join('') || '<li>Ни одной сдачи.</li>'}</ol>
      <div class="bar"><button class="btn" id="new-exam" type="button">Новый экзамен</button><a class="btn pen" href="#review">В повторение</a></div></article>`;
    $('#new-exam').onclick = () => { exam = null; views.exam(); };
    return;
  }
  if (!exam) {
    const hist = store.state.exams.filter((e) => e.total === 100).slice(-5).reverse();
    main().innerHTML = `<article class="narrow">
      <p class="eyebrow">Симуляция экзамена</p><h1>Пробный экзамен</h1>
      <p class="lead">Экзамен в Школе 21 сдаётся за компьютером без интернета. Ручка и чистый лист разрешены только для заметок. Задания открываются по уровням, а проверяет их автоматическая система.</p>
      <ul class="rules">
        <li><b>${LEVELS} уровня, одно задание за раз.</b> Следующий уровень откроется, только когда сдашь текущий. Каждый уровень даёт ${PTS} баллов.</li>
        <li><b>Сдача через автопроверку.</b> Запрос выполняется в PostgreSQL, результат сравнивается с эталоном целиком: колонки, их имена, строки и порядок.</li>
        <li><b>Ошибка не прощается.</b> После FAILURE выдаётся другое задание того же уровня. Если включить паузу, кнопка «Сдать» после ошибки на время блокируется: 30 секунд, потом минута, две, четыре. Это приучает проверять запрос до сдачи.</li>
        <li><b>Никаких подсказок.</b> Нет эталона, визуализации и автодополнения. Справа есть «листок» для заметок, он не проверяется.</li>
      </ul>
      <form id="exam-setup" class="setup">
        <label for="ex-min">Длительность</label>
        <select id="ex-min">${EXAM_MINUTES.map((m) => `<option value="${m}" ${m === 60 ? 'selected' : ''}>${m} минут</option>`).join('')}</select>
        <label class="switch"><input type="checkbox" id="ex-run" checked> Можно запускать запросы перед сдачей</label>
        <label class="switch"><input type="checkbox" id="ex-pen"> Пауза после ошибки</label>
        <button class="btn pen" type="submit">Начать экзамен</button>
      </form>
      <p class="small muted">Сдать или нет, решает число баллов. Порог ${PASS} из 100 и длину паузы я задал сам: точных цифр для экзамена по SQL в открытых источниках нет. Если на твоём экзамене запускать запросы нельзя, выключи запуск и тренируйся вслепую.</p>
      ${hist.length ? `<h3>Прошлые попытки</h3><ul class="hist">${hist.map((t) => `<li><b>${t.score}/100</b> <span class="muted">${new Date(t.at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} · ${Math.round(t.dur / 60)} мин · сдач ${t.tries}</span></li>`).join('')}</ul>` : ''}
    </article>`;
    $('#exam-setup').onsubmit = (e) => {
      e.preventDefault();
      const minutes = +$('#ex-min').value;
      exam = { start: now(), end: now() + minutes * MIN, minutes, allowRun: $('#ex-run').checked, penalty: $('#ex-pen').checked, level: 1, points: 0, used: [], attempts: [], fails: 0, cooldownUntil: 0, done: false, notes: '', draft: '' };
      exam.current = pickTask(1);
      examSave(); views.exam(); window.scrollTo(0, 0);
    };
    return;
  }
  const t = examTask(exam.current);
  const tryNo = exam.attempts.filter((a) => a.level === exam.level).length + 1;
  main().innerHTML = `
    <div class="exam-head"><div class="exam-head-in">
      <ol class="lvls" aria-label="Уровни">${Array.from({ length: LEVELS }, (_, i) => `<li class="${i + 1 < exam.level ? 'done' : i + 1 === exam.level ? 'on' : ''}">${i + 1}</li>`).join('')}</ol>
      <span class="pts"><b>${exam.points}</b>/100</span>
      <span class="timer" id="timer">--:--</span>
      <button class="btn small ghost" id="finish" type="button">Завершить</button>
    </div><div class="tbar"><i id="tbar"></i></div>
    <div id="fin-confirm" class="fin" hidden>Завершить экзамен сейчас? Баллы за непройденные уровни не начислятся. <button class="btn small bad" id="fin-yes" type="button">Завершить</button> <button class="btn small ghost" id="fin-no" type="button">Продолжить</button></div></div>
    <div class="exam-grid">
      <section class="exam-main">
        <div class="subject">
          <p class="eyebrow">Уровень ${exam.level} из ${LEVELS} · попытка ${tryNo}</p>
          <h2>${esc(t.title)}</h2>
          <p class="task-text">${t.text}</p>
          ${tablesHTML(t.ref)}
          <p class="small muted">Сдаётся один запрос. Имена колонок и порядок строк должны совпасть с условием.</p>
        </div>
        <div id="exam-ed"></div>
        <div class="bar">
          ${exam.allowRun ? '<button class="btn" id="exam-run" type="button">Запустить</button>' : ''}
          <button class="btn pen" id="grademe" type="button">Сдать (grademe)</button>
          <span class="kbd">${exam.allowRun ? 'Ctrl + Enter: запустить' : 'Запуск выключен'}</span>
        </div>
        <div id="exam-out" class="out"></div>
        <details class="schema-box"><summary>Схема базы</summary>${schemaHTML()}</details>
      </section>
      <aside class="exam-notes">
        <label class="eyebrow" for="notes">Листок для заметок</label>
        <textarea id="notes" class="code paper" rows="16" spellcheck="false" placeholder="Черновик: схема, план запроса, порядок колонок. Не проверяется."></textarea>
      </aside>
    </div>`;
  const ta = editor(exam.draft || '', { rows: 8, id: 'exam-sql' });
  $('#exam-ed').append(ta);
  ta.addEventListener('input', () => { exam.draft = ta.value; examSave(); });
  ta.addEventListener('run', () => exam.allowRun && runExam());
  const notes = $('#notes'); notes.value = exam.notes || '';
  notes.addEventListener('input', () => { exam.notes = notes.value; examSave(); });
  const runExam = async () => { const out = $('#exam-out'); try { out.innerHTML = tableHTML(await run(ta.value), { max: 50 }); } catch (e) { out.innerHTML = `<div class="err"><b>ERROR</b><pre>${esc(e.message)}</pre></div>`; } };
  $('#exam-run')?.addEventListener('click', runExam);
  $('#grademe').onclick = grademe;
  $('#finish').onclick = () => { $('#fin-confirm').hidden = false; };
  $('#fin-no').onclick = () => { $('#fin-confirm').hidden = true; };
  $('#fin-yes').onclick = () => finishExam('manual');
  examTimerTick();
};

/* ---------- sandbox ---------- */
views.sandbox = () => {
  main().innerHTML = `<div class="split wide">
    <article><p class="eyebrow">Песочница</p><h1>Свободный запрос</h1><p class="muted">Любой запрос к базе пиццерий. После каждого запуска база возвращается в исходное состояние, так что INSERT, UPDATE и DELETE тоже можно пробовать.</p><div id="sb"></div></article>
    <aside class="side"><p class="eyebrow">Схема · нажми на таблицу</p>${schemaHTML()}</aside></div>`;
  let initial = `SELECT pizza_name, price\nFROM menu\nWHERE price >= 900\nORDER BY price DESC, pizza_name\nLIMIT 5;`;
  try { initial = localStorage.getItem('sandbox') || initial; } catch {}
  const r = runner({ initial, rows: 9 });
  $('#sb').append(r.el);
  r.ta.addEventListener('input', () => { try { localStorage.setItem('sandbox', r.ta.value); } catch {} });
  $('.schema').addEventListener('click', (e) => { const b = e.target.closest('[data-table]'); if (b) { r.ta.value = `SELECT * FROM ${b.dataset.table};`; r.run(); } });
  r.run();
};

/* ================= router ================= */
const ROUTES = ['home', 'learn', 'practice', 'review', 'test', 'exam', 'sandbox'];
function route() {
  let name = location.hash.replace('#', '') || 'home';
  if (!ROUTES.includes(name)) name = 'home';
  if (exam && !exam.done && name !== 'exam') { location.hash = 'exam'; return; }
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + name));
  views[name]();
  const due = dueCards().length;
  const badge = $('#due-badge'); if (badge) { badge.textContent = due; badge.hidden = !due; }
}
window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });
route();
store.init();
