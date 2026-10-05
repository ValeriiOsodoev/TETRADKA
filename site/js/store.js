// Аккаунт и прогресс. Гость учится без регистрации — прогресс лежит в браузере.
// После входа прогресс хранится на сервере, а гостевой переносится в аккаунт.

const LS_GUEST = 'tetradka.guest';
const LS_PENDING = 'tetradka.pending';
const DAY = 24 * 60 * 60 * 1000;

export const PASS = 80; // процент верных ответов, с которого тема считается пройденной
const INTERVALS = [2, 5, 12, 30, 60, 120]; // через сколько дней предложить повторить

export const state = {
  user: null, // { login, name } или null
  progress: new Map(), // 'math:fractions' → запись
  serverOk: true,
  ready: false,
};

const listeners = new Set();
export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  for (const fn of listeners) fn(state);
}

// --------------------------------------------------------------- хранилище

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* хранилище недоступно — работаем в памяти */
  }
}

export class ApiFail extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

async function api(method, path, body) {
  let response;
  try {
    response = await fetch('/api' + path, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiFail(0, 'Сервер не отвечает. Проверьте соединение и попробуйте ещё раз.');
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
    /* не JSON */
  }
  if (!response.ok) {
    if (!data || !data.error) throw new ApiFail(0, 'Сервер аккаунтов недоступен.');
    throw new ApiFail(response.status, data.error, data.field);
  }
  return data || {};
}

// ---------------------------------------------------------------- прогресс

const key = (kind, id) => `${kind}:${id}`;

function blank(kind, id) {
  return { kind, id, best: 0, last: 0, attempts: 0, done: false, review: false, stage: 0, due: null, updated: 0, data: {} };
}

export function rec(kind, id) {
  return state.progress.get(key(kind, id)) || blank(kind, id);
}

export function needsReview(r) {
  return r.review || (r.done && r.due !== null && r.due <= Date.now());
}

export function reviewList() {
  return [...state.progress.values()].filter(needsReview).sort((a, b) => (a.due || 0) - (b.due || 0));
}

function setMap(items) {
  state.progress = new Map(items.map((r) => [key(r.kind, r.id), r]));
}

let pending = new Map();
let flushTimer = null;
let warned = false;

function store(record) {
  record.updated = Date.now();
  state.progress.set(key(record.kind, record.id), record);
  if (state.user) {
    pending.set(key(record.kind, record.id), record);
    lsSet(LS_PENDING, { login: state.user.login, items: [...pending.values()] });
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 500);
  } else {
    lsSet(LS_GUEST, [...state.progress.values()]);
  }
  emit();
}

async function flush() {
  if (!state.user || !pending.size) return;
  const batch = new Map(pending);
  try {
    await api('PUT', '/progress', { items: [...batch.values()] });
    for (const [k, r] of batch) if (pending.get(k) === r) pending.delete(k);
    lsSet(LS_PENDING, pending.size ? { login: state.user.login, items: [...pending.values()] } : null);
    warned = false;
  } catch (err) {
    if (err.status === 401) {
      state.user = null;
      emit();
    }
    if (!warned) {
      warned = true;
      window.dispatchEvent(new CustomEvent('save-failed'));
    }
  }
}

/** Итог тренировки: percent — доля верных ответов (0–100). Возвращает обновлённую запись. */
export function finishPractice(kind, id, percent) {
  const r = { ...rec(kind, id) };
  const now = Date.now();
  const wasDue = !r.done || needsReview(r);
  r.attempts += 1;
  r.last = percent;
  r.best = Math.max(r.best, percent);
  if (percent >= PASS) {
    if (wasDue) r.stage = Math.min(r.stage + 1, INTERVALS.length);
    r.done = true;
    r.review = false;
    r.due = now + INTERVALS[Math.max(r.stage, 1) - 1] * DAY;
  } else {
    r.review = true;
    r.stage = Math.max(r.stage - 1, 0);
  }
  store(r);
  return r;
}

export function toggleReview(kind, id) {
  const r = { ...rec(kind, id) };
  r.review = !r.review;
  if (!r.review && r.due !== null && r.due <= Date.now()) r.due = Date.now() + INTERVALS[Math.max(r.stage, 1) - 1] * DAY;
  store(r);
  return r;
}

/** «Не сейчас»: убрать тему из списка на повтор на пару дней. */
export function snooze(kind, id) {
  const r = { ...rec(kind, id) };
  r.review = false;
  r.due = Date.now() + 2 * DAY;
  store(r);
  return r;
}

/** Дополнительные данные темы (например, код решения) — сливаются с уже сохранёнными. */
export function patchData(kind, id, patch) {
  const r = { ...rec(kind, id) };
  r.data = { ...r.data, ...patch };
  store(r);
  return r;
}

export function countAttempt(kind, id) {
  const r = { ...rec(kind, id) };
  r.attempts += 1;
  store(r);
  return r;
}

// ----------------------------------------------------------------- аккаунт

async function loadServerProgress() {
  const { items } = await api('GET', '/progress');
  setMap(items);
}

async function adopt(user) {
  state.user = user;
  const guest = lsGet(LS_GUEST, []);
  if (guest.length) {
    await api('PUT', '/progress', { items: guest.slice(0, 500) });
    lsSet(LS_GUEST, null);
  }
  const left = lsGet(LS_PENDING, null);
  if (left && left.login === user.login && left.items.length) {
    try {
      await api('PUT', '/progress', { items: left.items });
    } catch {
      /* попробуем при следующем сохранении */
    }
  }
  lsSet(LS_PENDING, null);
  pending = new Map();
  await loadServerProgress();
  emit();
}

export async function init() {
  try {
    const { user } = await api('GET', '/me');
    if (user) await adopt(user);
    else setMap(lsGet(LS_GUEST, []));
  } catch {
    // сервер недоступен — работаем как гость, прогресс хранится в браузере
    state.user = null;
    state.serverOk = false;
    setMap(lsGet(LS_GUEST, []));
  }
  state.ready = true;
  emit();
}

export async function register(login, name, password) {
  const { user } = await api('POST', '/register', { login, name, password });
  await adopt(user);
}

export async function login(loginValue, password) {
  const { user } = await api('POST', '/login', { login: loginValue, password });
  await adopt(user);
}

export async function logout() {
  await flush();
  try {
    await api('POST', '/logout');
  } catch {
    /* сессия всё равно сбрасывается в браузере */
  }
  state.user = null;
  setMap([]);
  emit();
}

export async function updateAccount(patch) {
  const { user } = await api('PATCH', '/me', patch);
  state.user = user;
  emit();
}

export async function deleteAccount(password) {
  await api('DELETE', '/me', { password });
  state.user = null;
  setMap([]);
  emit();
}

export async function resetProgress() {
  if (state.user) {
    pending = new Map();
    lsSet(LS_PENDING, null);
    await api('DELETE', '/progress');
  } else {
    lsSet(LS_GUEST, null);
  }
  setMap([]);
  emit();
}

window.addEventListener('pagehide', () => {
  if (!state.user || !pending.size) return;
  // последняя попытка сохранить перед закрытием вкладки
  fetch('/api/progress', {
    method: 'PUT',
    credentials: 'same-origin',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [...pending.values()] }),
  }).catch(() => {});
});
