// Задачи для тренировки: случайные числа, виды ответов и их проверка.

export const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = (arr) => arr[ri(0, arr.length - 1)];
export const nz = (a, b) => {
  // случайное целое из [a; b], кроме нуля
  let v = 0;
  while (v === 0) v = ri(a, b);
  return v;
};

export function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = ri(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const gcd = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};
export const lcm = (a, b) => (a / gcd(a, b)) * b;

/** Форма слова после числа: pl(3, 'шаг', 'шага', 'шагов') → 'шага'. */
export function pl(n, one, few, many) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

/** Число вместе со словом: np(3, 'шаг', 'шага', 'шагов') → '3 шага'. */
export const np = (n, one, few, many) => `${n} ${pl(n, one, few, many)}`;

/** Число для показа: десятичная запятая, без хвостов вроде 0,30000000004. */
export function fmt(n, digits = 6) {
  const v = Number(Number(n).toFixed(digits));
  return String(v).replace('.', ',').replace('-', '−');
}

/** Число для вставки в формулу $…$ — запись та же, что и в обычном тексте. */
export const fm = fmt;

/** Число в скобках, если оно отрицательное: 5 + (−3). */
export const par = (n) => (n < 0 ? `(${fm(n)})` : fm(n));

/** Знак и модуль для записи «x + 3» / «x − 3». */
export const sgn = (n) => (n < 0 ? `- ${fm(-n)}` : `+ ${fm(n)}`);

export function reduce(n, d) {
  const g = gcd(n, d) || 1;
  if (d < 0) [n, d] = [-n, -d];
  return [n / g, d / g];
}

/** Дробь для формулы: «3/4», «−3/4» или целое, если делится нацело. */
export function fs(n, d) {
  [n, d] = reduce(n, d);
  if (d === 1) return fm(n);
  return n < 0 ? `-${-n}/${d}` : `${n}/${d}`;
}

// ------------------------------------------------------------ виды заданий

export const num = (q, a, why, extra = {}) => ({ type: 'num', q, a, why, ...extra });
export const fr = (q, n, d, why, extra = {}) => ({ type: 'frac', q, a: reduce(n, d), why, ...extra });
export const many = (q, a, why, extra = {}) => ({ type: 'set', q, a, why, ...extra });

/** Выбор из вариантов: первым передаётся верный, порядок перемешивается. */
export function choice(q, correct, wrong, why, extra = {}) {
  const options = shuffle([correct, ...wrong.filter((w) => w !== correct)]);
  return { type: 'choice', q, options, a: options.indexOf(correct), why, ...extra };
}

// -------------------------------------------------------- разбор и проверка

function cleanInput(raw) {
  return String(raw)
    .trim()
    .replace(/[−–—]/g, '-')
    .replace(/[%°]/g, '')
    .replace(/^[a-zа-яё]\s*=\s*/i, '') // «x = 5» тоже считаем ответом
    .replace(/\s*[a-zа-яё]+(\/[a-zа-яё]+)?[²³23]?\.?$/i, '') // единицы измерения: см, м², км/ч
    .trim();
}

/** Возвращает [числитель, знаменатель] или null. Понимает 7, −2,5, 3/4, 1 1/2. */
export function parseRational(raw) {
  const text = cleanInput(raw).replace(/,/g, '.');
  let m = text.match(/^(-?)\s*(\d+)\s+(\d+)\s*\/\s*(\d+)$/); // смешанное число
  if (m) {
    const [, sign, whole, n, d] = m;
    if (+d === 0) return null;
    const top = +whole * +d + +n;
    return [sign ? -top : top, +d];
  }
  m = text.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (m) return +m[2] === 0 ? null : [+m[1], +m[2]];
  if (/^-?\d+(\.\d+)?$/.test(text)) {
    const digits = (text.split('.')[1] || '').length;
    const scale = 10 ** digits;
    return [Math.round(+text * scale), scale];
  }
  return null;
}

/**
 * Проверка ответа. Возвращает { ok } либо { ok: false, soft: 'подсказка' } —
 * во втором случае попытка не засчитывается и можно ввести ответ ещё раз.
 */
export function check(task, input) {
  if (task.type === 'choice') return { ok: input === task.a };

  if (task.type === 'num') {
    const r = parseRational(input);
    if (!r) return { ok: false, soft: 'Введите число, например 12 или 3,5.' };
    const value = r[0] / r[1];
    const tol = task.tol ?? 1e-9;
    return { ok: Math.abs(value - task.a) <= tol + 1e-12 };
  }

  if (task.type === 'frac') {
    const r = parseRational(input);
    if (!r) return { ok: false, soft: 'Введите дробь через косую черту, например 3/4. Целую часть можно отделить пробелом: 1 1/2.' };
    const [n, d] = task.a;
    if (r[0] * d !== n * r[1]) return { ok: false };
    if (task.reduced && gcd(r[0], r[1]) !== 1 && !/^\s*-?\d+\s+\d/.test(String(input))) {
      return { ok: false, soft: 'По значению верно, но дробь ещё можно сократить.' };
    }
    return { ok: true };
  }

  if (task.type === 'set') {
    // если все ответы целые, запятая — разделитель; иначе запятая — десятичная
    const allInt = task.a.every((v) => Number.isInteger(v));
    const parts = cleanInput(input).split(allInt ? /[;,\s]+/ : /[;\s]+|,\s+/).filter(Boolean);
    const values = parts.map((p) => parseRational(p));
    if (!parts.length || values.some((v) => !v)) return { ok: false, soft: 'Введите числа через пробел, например: 2 5.' };
    const got = values.map((v) => v[0] / v[1]).sort((a, b) => a - b);
    const want = [...task.a].sort((a, b) => a - b);
    const unique = got.filter((v, i) => i === 0 || Math.abs(v - got[i - 1]) > 1e-9);
    return { ok: unique.length === want.length && unique.every((v, i) => Math.abs(v - want[i]) < 1e-9) };
  }

  return { ok: false };
}

/** Правильный ответ в виде размеченной строки. */
export function answerText(task) {
  if (task.type === 'choice') return task.options[task.a];
  if (task.type === 'num') return `$${fm(task.a)}$` + (task.unit ? (/^[°%]/.test(task.unit) ? '' : ' ') + task.unit : '');
  if (task.type === 'frac') {
    const [n, d] = task.a;
    if (task.mixed && d > 1 && Math.abs(n) > d) return `$${n < 0 ? '-' : ''}${Math.floor(Math.abs(n) / d)}{${Math.abs(n) % d}/${d}}$`;
    return `$${fs(n, d)}$`;
  }
  if (task.type === 'set') return task.a.map((v) => `$${fm(v)}$`).join(' и ');
  return '';
}

export function placeholder(task) {
  if (task.type === 'frac') return 'например 3/4';
  if (task.type === 'set') return 'числа через пробел';
  return 'ответ';
}
