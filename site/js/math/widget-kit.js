// Общие детали интерактивных картинок: рамка, ползунки, кнопки, координатная сетка.

import { h, s, inline } from '../dom.js';

/** Рамка картинки: поле для рисунка, управление, строка с результатом. */
export function shell(extraClass = '') {
  const canvas = h('div.w-canvas');
  const controls = h('div.w-controls');
  const out = h('div.w-out', { 'aria-live': 'polite' });
  const el = h('div.widget', { class: extraClass }, canvas, controls, out);
  return {
    el,
    canvas,
    controls,
    out,
    say(markup) {
      out.innerHTML = inline(markup);
    },
  };
}

let sliderSeq = 0;

/** Ползунок с подписью и текущим значением. */
export function slider(label, min, max, value, onInput, step = 1, format = (v) => String(v).replace('.', ',').replace('-', '−')) {
  const id = `sl${++sliderSeq}`;
  const input = h('input', { type: 'range', id, min, max, step, value });
  const output = h('output', { for: id }, format(value));
  const el = h('div.ctl', h('label', { for: id, html: inline(label) }), input, output);
  input.addEventListener('input', () => {
    output.textContent = format(+input.value);
    onInput(+input.value);
  });
  return {
    el,
    input,
    get value() {
      return +input.value;
    },
    set value(v) {
      input.value = v;
      output.textContent = format(+input.value);
    },
    setMax(m) {
      input.max = m;
      if (+input.value > m) input.value = m;
      output.textContent = format(+input.value);
    },
  };
}

export function button(label, onClick, kind = '') {
  return h('button.btn.small', { type: 'button', class: kind, onclick: onClick }, label);
}

/** Переключатель из нескольких вариантов. */
export function segmented(options, value, onChange) {
  const el = h('div.seg', { role: 'group' });
  const api = { el, value };
  options.forEach(([val, label]) => {
    const b = h('button', { type: 'button', 'aria-pressed': String(val === value), html: inline(label) });
    b.addEventListener('click', () => {
      api.value = val;
      for (const other of el.children) other.setAttribute('aria-pressed', String(other === b));
      onChange(val);
    });
    el.append(b);
  });
  return api;
}

export function svgRoot(width, height, label) {
  return s('svg', {
    viewBox: `0 0 ${width} ${height}`,
    class: 'w-svg',
    role: 'img',
    'aria-label': label,
    // на узком экране рисунок не сжимается до нечитаемого — поле прокручивается вбок
    style: `max-width:${width}px;min-width:${Math.min(width, 520)}px`,
  });
}

export const text = (x, y, content, attrs = {}) => s('text', { x, y, 'text-anchor': 'middle', ...attrs }, content);

/**
 * Координатная плоскость внутри svg. Возвращает функции пересчёта X(x), Y(y)
 * и рисует сетку с осями.
 */
export function plane(svg, { xmin, xmax, ymin, ymax, unit, labels = true, pad = 14 }) {
  const X = (x) => pad + (x - xmin) * unit;
  const Y = (y) => pad + (ymax - y) * unit;
  const g = s('g');
  for (let x = Math.ceil(xmin); x <= xmax; x++) {
    g.append(s('line', { x1: X(x), y1: Y(ymin), x2: X(x), y2: Y(ymax), class: 'grid-line' }));
  }
  for (let y = Math.ceil(ymin); y <= ymax; y++) {
    g.append(s('line', { x1: X(xmin), y1: Y(y), x2: X(xmax), y2: Y(y), class: 'grid-line' }));
  }
  if (ymin <= 0 && ymax >= 0) {
    g.append(s('line', { x1: X(xmin), y1: Y(0), x2: X(xmax) + 6, y2: Y(0), class: 'axis' }));
    g.append(s('path', { d: `M${X(xmax) + 10} ${Y(0)}l-7 -4v8z`, class: 'axis-tip' }));
    g.append(text(X(xmax) + 6, Y(0) + 16, 'x', { class: 'axis-name' }));
  }
  if (xmin <= 0 && xmax >= 0) {
    g.append(s('line', { x1: X(0), y1: Y(ymin), x2: X(0), y2: Y(ymax) - 6, class: 'axis' }));
    g.append(s('path', { d: `M${X(0)} ${Y(ymax) - 10}l-4 7h8z`, class: 'axis-tip' }));
    g.append(text(X(0) - 12, Y(ymax) - 2, 'y', { class: 'axis-name' }));
  }
  if (labels) {
    const stepX = xmax - xmin > 14 ? 2 : 1;
    for (let x = Math.ceil(xmin); x <= xmax; x++) {
      if (x === 0 || x % stepX || x === xmax) continue;
      g.append(text(X(x), Y(0) + 14, String(x).replace('-', '−'), { class: 'tick-label' }));
    }
    const stepY = ymax - ymin > 14 ? 2 : 1;
    for (let y = Math.ceil(ymin); y <= ymax; y++) {
      if (y === 0 || y % stepY || y === ymax) continue;
      g.append(text(X(0) - 5, Y(y) + 4, String(y).replace('-', '−'), { class: 'tick-label', 'text-anchor': 'end' }));
    }
    g.append(text(X(0) - 7, Y(0) + 14, '0', { class: 'tick-label' }));
  }
  svg.append(g);
  return { X, Y, width: pad * 2 + (xmax - xmin) * unit, height: pad * 2 + (ymax - ymin) * unit };
}

/** Ломаная графика функции; разрывы (деление на ноль и т. п.) не соединяются. */
export function curvePath(f, X, Y, { xmin, xmax, ymin, ymax }, samples = 300) {
  let d = '';
  let pen = false;
  let prevY = null;
  for (let i = 0; i <= samples; i++) {
    const x = xmin + ((xmax - xmin) * i) / samples;
    const y = f(x);
    const visible = Number.isFinite(y) && y >= ymin - 2 && y <= ymax + 2;
    const jump = prevY !== null && Math.abs(y - prevY) > (ymax - ymin) * 0.9;
    if (!visible || jump) {
      pen = false;
    } else {
      d += `${pen ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`;
      pen = true;
    }
    prevY = Number.isFinite(y) ? y : null;
  }
  return d;
}
