// Пошаговая анимация алгоритма: рисует состояние на каждом шаге
// и подсвечивает строку кода, которая сейчас выполняется.

import { h, s, icon, clear, inline, reducedMotion } from '../dom.js';
import { codeView } from './editor.js';

/** Записывает шаги алгоритма. Состояние копируется, поэтому массивы можно менять на месте. */
export function tracer() {
  const steps = [];
  return {
    steps,
    add(line, note, state = {}) {
      steps.push({ line, note, ...structuredClone(state) });
    },
  };
}

// ------------------------------------------------------- отрисовка состояния

/** Ряд значений: столбики (bars) или клетки (cells). Элементы живут между шагами, чтобы плавно переезжать. */
function arrayRow(mode) {
  const el = h('div.vz-array', { class: mode });
  const items = new Map();
  const pointers = h('div.vz-pointers');
  const wrap = h('div.vz-array-wrap', el, pointers);
  return {
    el: wrap,
    update({ arr, ids, marks = {}, ptr = {}, labels }) {
      const n = arr.length;
      const max = Math.max(...arr.map((v) => (typeof v === 'number' ? Math.abs(v) : 1)), 1);
      wrap.style.setProperty('--n', n);
      wrap.classList.toggle('dense', n > 12);
      const seen = new Set();
      arr.forEach((value, pos) => {
        const id = ids ? ids[pos] : pos;
        seen.add(id);
        let item = items.get(id);
        if (!item) {
          item = h('div.vz-item', h('span.vz-val'), h('span.vz-bar'), h('span.vz-idx'));
          items.set(id, item);
          el.append(item);
        }
        item.style.setProperty('--i', pos);
        item.style.setProperty('--h', typeof value === 'number' ? Math.max(0.06, Math.abs(value) / max) : 1);
        item.className = 'vz-item ' + (marks[pos] || '');
        item.children[0].textContent = value === null ? '' : String(value);
        item.children[2].textContent = labels ? labels[pos] ?? '' : String(pos);
      });
      for (const [id, item] of items) {
        if (!seen.has(id)) {
          item.remove();
          items.delete(id);
        }
      }
      clear(pointers);
      const byPos = {};
      for (const [name, pos] of Object.entries(ptr)) {
        if (pos === null || pos === undefined || pos < 0 || pos >= n) continue;
        (byPos[pos] ||= []).push(name);
      }
      for (const [pos, names] of Object.entries(byPos)) {
        pointers.append(h('span.vz-ptr', { style: `--i:${pos}` }, names.join(', ')));
      }
    },
  };
}

function auxRows(list) {
  return h('div.vz-aux', list.map((row) =>
    h('div.vz-aux-row',
      h('span.vz-aux-label', row.label),
      h('span.vz-aux-items', row.items.length
        ? row.items.map((item, i) => h('span.vz-chip', { class: (row.marks && row.marks[i]) || '' }, String(item)))
        : h('span.vz-empty', row.empty || 'пусто')),
    ),
  ));
}

function varsRow(vars) {
  return h('div.vz-vars', Object.entries(vars).map(([name, value]) =>
    h('span.vz-var', h('code', name), ' = ', h('b', value === null || value === undefined ? '—' : String(value))),
  ));
}

function gridView({ cols, cells }) {
  return h('div.vz-grid', { style: `--cols:${cols}` }, cells.map((cell) => h('span.vz-cell', { class: cell.cls || '' }, String(cell.v))));
}

function hbars(list) {
  const max = Math.max(...list.map((b) => b.value), 1);
  return h('div.vz-hbars', list.map((b) =>
    h('div.vz-hbar-row', h('code', b.label), h('span.vz-hbar-track', h('span.vz-hbar', { class: b.cls || '', style: `width:${(b.value / max) * 100}%` })), h('b', String(b.value))),
  ));
}

function callStack(frames) {
  return h('div.vz-calls', frames.length ? frames.map((f) => h('div.vz-frame', { class: f.cls || '' }, h('code', f.label), f.note && h('span', f.note))) : h('span.vz-empty', 'стек вызовов пуст'));
}

function graphView({ nodes, edges }) {
  const svg = s('svg', { viewBox: '0 0 420 250', class: 'vz-graph', role: 'img', 'aria-label': 'Граф' });
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  for (const [a, b, cls] of edges) {
    svg.append(s('line', { x1: byId[a].x, y1: byId[a].y, x2: byId[b].x, y2: byId[b].y, class: 'g-edge ' + (cls || '') }));
  }
  for (const n of nodes) {
    svg.append(
      s('circle', { cx: n.x, cy: n.y, r: 19, class: 'g-node ' + (n.cls || '') }),
      s('text', { x: n.x, y: n.y + 5, class: 'g-label', 'text-anchor': 'middle' }, n.id),
    );
    if (n.badge !== undefined && n.badge !== null) {
      svg.append(s('text', { x: n.x + 21, y: n.y - 15, class: 'g-badge', 'text-anchor': 'middle' }, String(n.badge)));
    }
  }
  return svg;
}

// ------------------------------------------------------------------- плеер

const SPEEDS = [['медленно', 1500], ['обычно', 850], ['быстро', 350]];

function parseInput(spec, raw) {
  const text = String(raw).trim();
  if (spec.type === 'list') {
    const parts = text.split(/[\s,;]+/).filter(Boolean);
    const values = parts.map(Number);
    if (!parts.length || values.some((v) => !Number.isInteger(v))) return { error: `${spec.label}: введите целые числа через запятую.` };
    if (values.length < (spec.minLen || 2) || values.length > (spec.maxLen || 10)) return { error: `${spec.label}: от ${spec.minLen || 2} до ${spec.maxLen || 10} чисел.` };
    if (values.some((v) => v < (spec.min ?? 0) || v > (spec.max ?? 99))) return { error: `${spec.label}: числа от ${spec.min ?? 0} до ${spec.max ?? 99}.` };
    return { value: spec.sorted ? [...values].sort((a, b) => a - b) : values };
  }
  if (spec.type === 'int') {
    const v = Number(text);
    if (!Number.isInteger(v) || v < (spec.min ?? 0) || v > (spec.max ?? 99)) return { error: `${spec.label}: целое число от ${spec.min ?? 0} до ${spec.max ?? 99}.` };
    return { value: v };
  }
  if (spec.type === 'text') {
    if (!text.length || text.length > (spec.maxLen || 14)) return { error: `${spec.label}: от 1 до ${spec.maxLen || 14} символов.` };
    if (spec.pattern && !spec.pattern.test(text)) return { error: `${spec.label}: ${spec.patternHint}` };
    return { value: text };
  }
  if (spec.type === 'choice') return { value: text };
  return { value: text };
}

const show = (spec, value) => (spec.type === 'list' ? value.join(', ') : String(value));

/**
 * viz: {
 *   mode: 'bars' | 'cells',
 *   inputs: [{ key, label, type: 'list' | 'int' | 'text' | 'choice', ... }],
 *   initial: { ... }, sample: () => ({ ... }),
 *   steps: (input, L) => [шаги]   // L — номера строк по меткам из кода
 * }
 */
export function visualizer(viz, code) {
  const view = codeView(code.text);
  const stage = h('div.viz-stage');
  const note = h('p.viz-note', { 'aria-live': 'polite' });
  const counter = h('span.viz-count');
  const scrub = h('input', { type: 'range', min: 0, max: 0, value: 0, 'aria-label': 'Шаг анимации' });
  const errorBox = h('p.viz-error', { role: 'alert', hidden: true });

  let input = structuredClone(viz.initial);
  let steps = [];
  let index = 0;
  let timer = null;
  let speed = SPEEDS[1][1];
  let row = null; // живой ряд массива
  let extra = h('div.vz-extra');

  const playBtn = h('button.btn.primary.icon-btn', { type: 'button' });
  const setPlayLabel = () => {
    clear(playBtn).append(icon(timer ? 'pause' : 'play', 16), timer ? 'Пауза' : index >= steps.length - 1 ? 'Сначала' : 'Пуск');
  };

  function render() {
    const step = steps[index];
    view.setLine(step.line);
    note.innerHTML = inline(step.note || '');
    counter.textContent = `шаг ${index + 1} из ${steps.length}`;
    scrub.value = index;
    if (step.arr) {
      if (!row) {
        row = arrayRow(viz.mode || 'cells');
        stage.prepend(row.el);
      }
      row.update(step);
    }
    const parts = [];
    if (step.graph) parts.push(graphView(step.graph));
    if (step.grid) parts.push(gridView(step.grid));
    if (step.hbars) parts.push(hbars(step.hbars));
    if (step.calls) parts.push(callStack(step.calls));
    if (step.aux) parts.push(auxRows(step.aux));
    if (step.vars) parts.push(varsRow(step.vars));
    clear(extra).append(...parts);
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index >= steps.length - 1;
    setPlayLabel();
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    setPlayLabel();
  }

  function go(to) {
    index = Math.max(0, Math.min(steps.length - 1, to));
    render();
  }

  function play() {
    if (timer) return stop();
    if (index >= steps.length - 1) index = 0;
    render();
    timer = setInterval(() => {
      if (index >= steps.length - 1) return stop();
      go(index + 1);
      if (index >= steps.length - 1) stop();
    }, speed);
    setPlayLabel();
  }

  function build() {
    stop();
    clear(stage);
    row = null;
    extra = h('div.vz-extra');
    stage.append(extra);
    steps = viz.steps(input, code.marks);
    index = 0;
    scrub.max = steps.length - 1;
    render();
  }

  const prevBtn = h('button.btn.icon-btn', { type: 'button', 'aria-label': 'Шаг назад', onclick: () => (stop(), go(index - 1)) }, icon('prev', 16));
  const nextBtn = h('button.btn.icon-btn', { type: 'button', 'aria-label': 'Шаг вперёд', onclick: () => (stop(), go(index + 1)) }, icon('next', 16), 'Шаг');
  playBtn.addEventListener('click', play);
  scrub.addEventListener('input', () => (stop(), go(+scrub.value)));

  const speedSel = h('select', { 'aria-label': 'Скорость' }, SPEEDS.map(([label, ms]) => h('option', { value: ms, selected: ms === speed }, label)));
  speedSel.addEventListener('change', () => {
    speed = +speedSel.value;
    if (timer) {
      stop();
      play();
    }
  });

  // поля для своих данных
  const fields = {};
  const form = h('form.viz-input');
  for (const spec of viz.inputs || []) {
    let control;
    if (spec.type === 'choice') {
      control = h('select', spec.options.map((o) => h('option', { value: o, selected: o === input[spec.key] }, o)));
    } else {
      control = h('input', { type: 'text', value: show(spec, input[spec.key]), autocomplete: 'off', spellcheck: 'false', class: spec.type === 'list' || spec.type === 'text' ? 'wide' : 'narrow' });
    }
    fields[spec.key] = control;
    form.append(h('label', h('span', spec.label), control));
  }
  const apply = () => {
    const next = {};
    for (const spec of viz.inputs || []) {
      const res = parseInput(spec, fields[spec.key].value);
      if (res.error) {
        errorBox.textContent = res.error;
        errorBox.hidden = false;
        return;
      }
      next[spec.key] = res.value;
    }
    const problem = viz.validate ? viz.validate(next) : null;
    if (problem) {
      errorBox.textContent = problem;
      errorBox.hidden = false;
      return;
    }
    errorBox.hidden = true;
    input = next;
    for (const spec of viz.inputs || []) if (spec.type !== 'choice') fields[spec.key].value = show(spec, input[spec.key]);
    build();
  };
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    apply();
  });
  if ((viz.inputs || []).length) {
    form.append(h('button.btn.small', { type: 'submit' }, 'Применить'));
    if (viz.sample) {
      form.append(h('button.btn.small.icon-btn', {
        type: 'button',
        onclick: () => {
          input = viz.sample();
          for (const spec of viz.inputs) fields[spec.key].value = show(spec, input[spec.key]);
          errorBox.hidden = true;
          build();
        },
      }, icon('dice', 16), 'Случайные данные'));
    }
  }

  const el = h('div.viz',
    (viz.inputs || []).length ? form : null,
    errorBox,
    h('div.viz-main', h('div.viz-left', stage, note), h('div.viz-code', view.el)),
    h('div.viz-controls',
      playBtn, prevBtn, nextBtn,
      h('button.btn.icon-btn', { type: 'button', 'aria-label': 'В начало', onclick: () => (stop(), go(0)) }, icon('reset', 16)),
      scrub, counter,
      h('label.viz-speed', h('span.sr', 'Скорость'), speedSel),
    ),
  );
  build();
  if (reducedMotion()) el.classList.add('no-motion');
  return { el, destroy: stop };
}


/** Маленькая самоиграющая анимация для главной страницы: без кнопок, по кругу. */
export function miniPlayer(viz, code, input) {
  const stage = h('div.viz-stage');
  const note = h('p.viz-note');
  const view = codeView(code.text);
  const el = h('div.mini-viz', h('div.viz-left', stage, note), h('div.viz-code', view.el));
  const steps = viz.steps(structuredClone(input), code.marks);
  const row = arrayRow(viz.mode || 'cells');
  stage.append(row.el);
  let index = reducedMotion() ? Math.floor(steps.length / 2) : 0;
  let hold = false;
  const render = () => {
    const step = steps[index];
    row.update(step);
    view.setLine(step.line);
    note.innerHTML = inline(step.note || '');
  };
  render();
  let timer = null;
  if (!reducedMotion()) {
    el.addEventListener('mouseenter', () => (hold = true));
    el.addEventListener('mouseleave', () => (hold = false));
    let rest = 0;
    timer = setInterval(() => {
      if (hold || document.hidden) return;
      if (index >= steps.length - 1) {
        rest += 1;
        if (rest < 3) return; // короткая пауза на готовом результате
        rest = 0;
        index = 0;
      } else index += 1;
      render();
    }, 1100);
  }
  return { el, destroy: () => clearInterval(timer) };
}
