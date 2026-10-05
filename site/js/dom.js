// Мелкие помощники: создание элементов, разметка текста, запись формул.

/** h('div.card', {onclick}, 'текст', узел, [узлы]) → HTMLElement */
export function h(spec, attrs, ...children) {
  const [tag, ...classes] = spec.split('.');
  const el = document.createElement(tag || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
    children.unshift(attrs);
    attrs = null;
  }
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'html') el.innerHTML = value;
    else if (key === 'class') el.className += (el.className ? ' ' : '') + value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, value);
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** s('circle', {cx, cy, r}) → SVGElement */
export function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value);
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function esc(text) {
  return String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

// ------------------------------------------------------------------ формулы
// Мини-запись внутри $...$:
//   a/b — дробь (числитель и знаменатель — одно «слово» или группа в {…}),
//   x^2, a_1 — степень и индекс, sqrt{…} — корень, * — точка умножения.

const UPRIGHT = new Set(['sin', 'cos', 'tg', 'ctg', 'log', 'lg', 'ln', 'min', 'max', 'mod']);
const SYMBOLS = { pi: 'π', alpha: 'α', beta: 'β', gamma: 'γ', inf: '∞', deg: '°', Delta: 'Δ', phi: 'φ' };
const OPERATORS = [
  ['<=', '≤'], ['>=', '≥'], ['!=', '≠'], ['~=', '≈'], ['+-', '±'], ['->', '→'], ['...', '…'],
  ['*', '·'], ['-', '−'], ['<', '&lt;'], ['>', '&gt;'], ['&', '&amp;'],
];

export function tex(src) {
  let i = 0;
  const isLetter = (c) => /[A-Za-zА-Яа-яЁё]/.test(c);

  function atom() {
    const c = src[i];
    let base;
    if (c === '{') {
      i++;
      base = seq('}');
    } else if (c === '(') {
      i++;
      base = '(' + seq(')') + ')';
    } else if (/\d/.test(c)) {
      let j = i;
      while (j < src.length && /\d/.test(src[j])) j++;
      if ((src[j] === ',' || src[j] === '.') && /\d/.test(src[j + 1] || '')) {
        j++;
        while (j < src.length && /\d/.test(src[j])) j++;
      }
      base = src.slice(i, j).replace('.', ',');
      i = j;
    } else if (isLetter(c)) {
      let j = i;
      while (j < src.length && isLetter(src[j])) j++;
      const word = src.slice(i, j);
      i = j;
      if (word === 'sqrt') {
        const arg = atom();
        base = `<span class="sqrt"><span class="rad">${arg}</span></span>`;
      } else if (SYMBOLS[word]) base = SYMBOLS[word];
      else if (UPRIGHT.has(word) || /[А-Яа-яЁё]/.test(word)) base = word;
      else base = `<i>${word}</i>`;
    } else {
      for (const [from, to] of OPERATORS) {
        if (src.startsWith(from, i)) {
          i += from.length;
          return to;
        }
      }
      i++;
      return c;
    }
    while (src[i] === '^' || src[i] === '_') {
      const tag = src[i] === '^' ? 'sup' : 'sub';
      i++;
      base += `<${tag}>${atom()}</${tag}>`;
    }
    return base;
  }

  function seq(close) {
    const items = [];
    while (i < src.length) {
      if (close && src[i] === close) {
        i++;
        break;
      }
      if (src[i] === '/') {
        i++;
        while (src[i] === ' ') i++;
        const den = atom();
        const num = items.pop() ?? '';
        items.push(`<span class="frac"><span class="num">${num}</span><span class="den">${den}</span></span>`);
        continue;
      }
      items.push(atom());
    }
    return items.join('');
  }

  return `<span class="m">${seq(null)}</span>`;
}

/** Разметка строки: **жирный**, ==маркер==, `код`, $формула$ → HTML. */
export function inline(text) {
  return String(text).replace(
    /\*\*(.+?)\*\*|==(.+?)==|\$([^$]+)\$|`([^`]+)`|[&<>]/g,
    (m, bold, mark, math, code) => {
      if (bold !== undefined) return `<strong>${inline(bold)}</strong>`;
      if (mark !== undefined) return `<mark>${inline(mark)}</mark>`;
      if (math !== undefined) return tex(math);
      if (code !== undefined) return `<code>${esc(code)}</code>`;
      return esc(m);
    },
  );
}

/** Элемент с размеченным текстом: t('p', 'Дробь $1/2$ — это **половина**') */
export function t(spec, text, attrs = {}) {
  return h(spec, { ...attrs, html: inline(text) });
}

// ------------------------------------------------------------------- иконки

const ICONS = {
  check: '<path d="M4 10.5l4 4 8-9" />',
  repeat: '<path d="M4 9a6 6 0 0 1 10.5-3.5L16 7M16 3v4h-4M16 11a6 6 0 0 1-10.5 3.5L4 13M4 17v-4h4" />',
  play: '<path d="M6 4l10 6-10 6z" fill="currentColor" stroke="none" />',
  pause: '<path d="M6 4h3v12H6zM11 4h3v12h-3z" fill="currentColor" stroke="none" />',
  next: '<path d="M5 4l8 6-8 6z" fill="currentColor" stroke="none" /><path d="M15 4v12" />',
  prev: '<path d="M15 4l-8 6 8 6z" fill="currentColor" stroke="none" /><path d="M5 4v12" />',
  reset: '<path d="M4 4v5h5M4.6 9A6.5 6.5 0 1 1 5 13" />',
  sun: '<circle cx="10" cy="10" r="3.5" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" />',
  moon: '<path d="M16 11.5A7 7 0 0 1 8.5 4a6.5 6.5 0 1 0 7.5 7.5z" />',
  user: '<circle cx="10" cy="7" r="3.2" /><path d="M3.5 17c.8-3.2 3.4-5 6.5-5s5.700 1.800 6.500 5" />',
  left: '<path d="M12 4l-6 6 6 6" />',
  right: '<path d="M8 4l6 6-6 6" />',
  flag: '<path d="M5 17V4M5 4h9l-2 3.500 2 3.500H5" />',
  lamp: '<path d="M7.500 14h5M8.500 17h3M6 9a4 4 0 1 1 8 0c0 1.800-1.200 2.600-1.500 5h-5C7.200 11.600 6 10.800 6 9z" />',
  dice: '<rect x="3.500" y="3.500" width="13" height="13" rx="2" /><circle cx="7.500" cy="7.500" r=".9" fill="currentColor" /><circle cx="12.500" cy="12.500" r=".9" fill="currentColor" /><circle cx="10" cy="10" r=".9" fill="currentColor" />',
  cross: '<path d="M5 5l10 10M15 5L5 15" />',
};

export function icon(name, size = 18) {
  const span = document.createElement('span');
  span.className = 'icon';
  span.innerHTML =
    `<svg viewBox="0 0 20 20" width="${size}" height="${size}" fill="none" stroke="currentColor" ` +
    `stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  return span;
}

// ------------------------------------------------------------- всякое общее

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

export function toast(message, kind = 'info') {
  let box = document.querySelector('.toasts');
  if (!box) {
    box = h('div.toasts', { role: 'status', 'aria-live': 'polite' });
    document.body.append(box);
  }
  const item = h('div.toast', { class: kind }, message);
  box.append(item);
  setTimeout(() => item.remove(), 4500);
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
