// Интерактивные картинки: числа, действия, дроби, проценты.

import { h, s, clear, inline } from '../dom.js';
import { fm, fmt, gcd, lcm, reduce, fs } from './tasks.js';
import { shell, slider, button, segmented, svgRoot, text } from './widget-kit.js';

// ------------------------------------------------------------ разряды числа
export function placeValue({ value = 347 } = {}) {
  const W = shell();
  const board = h('div.pv');
  W.canvas.append(board);
  const names = [
    ['сотни', 100, 'pv-100'],
    ['десятки', 10, 'pv-10'],
    ['единицы', 1, 'pv-1'],
  ];
  function draw(v) {
    clear(board);
    const digits = [Math.floor(v / 100), Math.floor(v / 10) % 10, v % 10];
    names.forEach(([name, size, cls], i) => {
      const blocks = h('div.pv-blocks');
      for (let k = 0; k < digits[i]; k++) blocks.append(h('span', { class: cls }, String(size)));
      board.append(h('div.pv-col', h('div.pv-digit', String(digits[i])), h('div.pv-name', name), blocks));
    });
    const parts = [];
    if (digits[0]) parts.push(`${digits[0] * 100}`);
    if (digits[1]) parts.push(`${digits[1] * 10}`);
    if (digits[2] || !parts.length) parts.push(`${digits[2]}`);
    W.say(`$${v} = ${parts.join(' + ')}$`);
  }
  W.controls.append(slider('число', 1, 999, value, draw).el);
  draw(value);
  return W.el;
}

// ---------------------------------------------------------- числовая прямая
// mode: 'jump' — сложение и вычитание шагами, 'compare' — сравнение двух чисел,
//       'round' — округление до десятков, 'ray' — решение неравенства.
export function numberLine({ min = 0, max = 20, a = 7, b = 5, op = '+', mode = 'jump', ops = false } = {}) {
  const W = shell();
  const width = 640;
  const height = mode === 'jump' ? 150 : 110;
  const svg = svgRoot(width, height, 'Числовая прямая');
  W.canvas.append(svg);
  const pad = 26;
  const baseY = height - 44;
  const X = (v) => pad + ((v - min) / (max - min)) * (width - pad * 2);
  const span = max - min;
  const labelEvery = span <= 22 ? 1 : span <= 50 ? 5 : 10;
  const state = { a, b, op };

  function axis() {
    clear(svg);
    svg.append(s('line', { x1: X(min) - 12, y1: baseY, x2: X(max) + 12, y2: baseY, class: 'axis' }));
    svg.append(s('path', { d: `M${X(max) + 18} ${baseY}l-8 -4v8z`, class: 'axis-tip' }));
    for (let v = min; v <= max; v++) {
      const major = v % labelEvery === 0;
      if (!major && span > 50) continue;
      svg.append(s('line', { x1: X(v), y1: baseY - (major ? 6 : 3), x2: X(v), y2: baseY + (major ? 6 : 3), class: 'axis' }));
      if (major) svg.append(text(X(v), baseY + 24, fmt(v), { class: 'tick-label' + (v === 0 ? ' strong' : '') }));
    }
  }
  const dot = (v, cls, label) => {
    svg.append(s('circle', { cx: X(v), cy: baseY, r: 6, class: cls }));
    if (label) svg.append(text(X(v), baseY - 14, label, { class: 'pt-label' }));
  };

  function drawJump() {
    const dir = state.op === '+' ? 1 : -1;
    const result = state.a + dir * state.b;
    axis();
    const steps = Math.abs(state.b);
    const each = steps <= 12 ? 1 : steps; // много шагов рисуем одной дугой
    const count = steps <= 12 ? steps : 1;
    for (let k = 0; k < count; k++) {
      const from = state.a + dir * k * each;
      const to = from + dir * each;
      const mid = (X(from) + X(to)) / 2;
      const lift = Math.min(54, 14 + Math.abs(X(to) - X(from)) * 0.45);
      svg.append(s('path', { d: `M${X(from)} ${baseY - 8}Q${mid} ${baseY - 8 - lift} ${X(to)} ${baseY - 8}`, class: 'arc' }));
    }
    if (steps > 0) {
      const tip = X(result);
      svg.append(s('path', { d: `M${tip} ${baseY - 8}l-4.5 -9h9z`, class: 'arc-tip' }));
    }
    dot(state.a, 'pt-start');
    dot(result, 'pt-end');
    const where = state.op === '+' ? 'вправо' : 'влево';
    W.say(`$${fm(state.a)} ${state.op} ${fm(state.b)} = ${fm(result)}$ — от ${fmt(state.a)} делаем ${fmt(state.b)} ${stepWord(state.b)} ${where}.`);
  }
  const stepWord = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'шаг' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 > 20) ? 'шага' : 'шагов');

  function drawCompare() {
    axis();
    dot(state.a, 'pt-start', fmt(state.a));
    dot(state.b, 'pt-end', fmt(state.b));
    const sign = state.a < state.b ? '<' : state.a > state.b ? '>' : '=';
    const why = sign === '=' ? 'это одно и то же число.' : `${fmt(Math.min(state.a, state.b))} стоит левее, значит оно меньше.`;
    W.say(`$${fm(state.a)} ${sign} ${fm(state.b)}$ — ${why}`);
  }

  function drawRound() {
    // показываем крупно только тот десяток, в который попало число
    const lo = Math.min(Math.floor(state.a / 10) * 10, max - 10);
    const hi = lo + 10;
    const Z = (v) => pad + ((v - lo) / 10) * (width - pad * 2);
    clear(svg);
    svg.append(s('line', { x1: Z(lo) - 12, y1: baseY, x2: Z(hi) + 12, y2: baseY, class: 'axis' }));
    for (let v = lo; v <= hi; v++) {
      const edge = v === lo || v === hi;
      svg.append(s('line', { x1: Z(v), y1: baseY - (edge ? 8 : 4), x2: Z(v), y2: baseY + (edge ? 8 : 4), class: 'axis' }));
      svg.append(text(Z(v), baseY + 26, fmt(v), { class: 'tick-label' + (edge ? ' strong' : '') }));
    }
    svg.append(s('line', { x1: Z(lo + 5), y1: baseY - 34, x2: Z(lo + 5), y2: baseY + 10, class: 'dash' }));
    svg.append(text(Z(lo + 5), baseY - 40, 'середина', { class: 'tick-label' }));
    const rounded = state.a - lo >= 5 ? hi : lo;
    svg.append(s('line', { x1: Z(state.a), y1: baseY, x2: Z(rounded), y2: baseY, class: 'seg-hot' }));
    svg.append(s('circle', { cx: Z(rounded), cy: baseY, r: 7, class: 'pt-end' }));
    if (rounded !== state.a) {
      svg.append(s('circle', { cx: Z(state.a), cy: baseY, r: 6, class: 'pt-start' }));
      svg.append(text(Z(state.a), baseY - 14, fmt(state.a), { class: 'pt-label' }));
    }
    const digit = state.a % 10;
    const why = digit === 0 ? 'это уже круглое число.' : digit >= 5 ? `последняя цифра ${digit} — это 5 или больше, округляем вверх, к ${hi}.` : `последняя цифра ${digit} меньше 5, округляем вниз, к ${lo}.`;
    W.say(`$${state.a} ~= ${rounded}$ — ${why}`);
  }

  function drawRay() {
    axis();
    const right = state.op === '>' || state.op === '>=';
    const closed = state.op === '>=' || state.op === '<=';
    const end = right ? X(max) + 10 : X(min) - 10;
    svg.append(s('line', { x1: X(state.a), y1: baseY, x2: end, y2: baseY, class: 'seg-hot' }));
    svg.append(s('circle', { cx: X(state.a), cy: baseY, r: 6, class: closed ? 'pt-start' : 'pt-open' }));
    svg.append(text(X(state.a), baseY - 14, fmt(state.a), { class: 'pt-label' }));
    const side = right ? 'правее' : 'левее';
    const edge = closed ? `Само число ${fmt(state.a)} подходит — точка закрашена.` : `Само число ${fmt(state.a)} не подходит — точка пустая.`;
    W.say(`$x ${state.op} ${fm(state.a)}$ — подходят все числа ${side} ${fmt(state.a)}. ${edge}`);
  }

  const draw = { jump: drawJump, compare: drawCompare, round: drawRound, ray: drawRay }[mode];

  if (mode === 'jump') {
    const limitB = () => (state.op === '+' ? max - state.a : state.a - min);
    let sb;
    const sa = slider('первое число', min, max, a, (v) => {
      state.a = v;
      sb.setMax(Math.max(limitB(), 0));
      state.b = sb.value;
      draw();
    });
    sb = slider('шагов', 0, Math.max(limitB(), 0), b, (v) => {
      state.b = v;
      draw();
    });
    W.controls.append(sa.el, sb.el);
    if (ops) {
      const seg = segmented([['+', 'прибавить'], ['-', 'вычесть']], op, (v) => {
        state.op = v;
        sb.setMax(Math.max(limitB(), 0));
        state.b = sb.value;
        draw();
      });
      W.controls.append(seg.el);
    }
  } else if (mode === 'compare') {
    W.controls.append(
      slider('первое', min, max, a, (v) => ((state.a = v), draw())).el,
      slider('второе', min, max, b, (v) => ((state.b = v), draw())).el,
    );
  } else if (mode === 'round') {
    W.controls.append(slider('число', min, max, a, (v) => ((state.a = v), draw())).el);
  } else {
    state.op = op === '+' ? '>' : op;
    W.controls.append(
      slider('число', min, max, a, (v) => ((state.a = v), draw())).el,
      segmented([['>', '$x > a$'], ['>=', '$x >= a$'], ['<', '$x < a$'], ['<=', '$x <= a$']], state.op, (v) => ((state.op = v), draw())).el,
    );
  }
  draw();
  return W.el;
}

// --------------------------------------------- точки: умножение и деление
export function dots({ mode = 'mul', a = 3, b = 4, total = 17, per = 5 } = {}) {
  const W = shell();
  const cell = 26;
  const svg = svgRoot(10 * cell + 20, 10 * cell + 20, 'Точки, сложенные рядами');
  W.canvas.append(svg);
  const state = { a, b, total, per };
  const groups = (n, fullWord) => {
    const one = n % 10 === 1 && n % 100 !== 11;
    const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 > 20);
    return `${n} ${fullWord ? (one ? 'полная ' : few ? 'полные ' : 'полных ') : ''}${one ? 'группа' : few ? 'группы' : 'групп'}`;
  };

  function draw() {
    clear(svg);
    if (mode === 'mul') {
      svg.setAttribute('viewBox', `0 0 ${10 * cell + 20} ${state.a * cell + 20}`);
      for (let r = 0; r < state.a; r++) {
        for (let c = 0; c < state.b; c++) {
          svg.append(s('circle', { cx: 10 + c * cell + cell / 2, cy: 10 + r * cell + cell / 2, r: 8, class: 'f-pen' }));
        }
      }
      const sum = Array(state.a).fill(state.b).join(' + ');
      const rows = `${state.a} ${state.a === 1 ? 'ряд' : state.a < 5 ? 'ряда' : 'рядов'} по ${state.b}`;
      W.say(state.a > 1 ? `${rows}: $${sum} = ${state.a} * ${state.b} = ${state.a * state.b}$` : `${rows}: $1 * ${state.b} = ${state.b}$`);
    } else {
      const full = Math.floor(state.total / state.per);
      const rest = state.total % state.per;
      const rowsCount = full + (rest ? 1 : 0);
      svg.setAttribute('viewBox', `0 0 ${10 * cell + 20} ${Math.max(rowsCount, 1) * cell + 20}`);
      for (let i = 0; i < state.total; i++) {
        const r = Math.floor(i / state.per);
        const c = i % state.per;
        svg.append(s('circle', { cx: 10 + c * cell + cell / 2, cy: 10 + r * cell + cell / 2, r: 8, class: r < full ? 'f-pen' : 'f-bad' }));
      }
      for (let r = 0; r < full; r++) {
        svg.append(s('rect', { x: 12, y: 12 + r * cell, width: state.per * cell - 4, height: cell - 4, rx: 11, class: 'group-box' }));
      }
      W.say(
        rest
          ? `$${state.total} : ${state.per} = ${full}$ (остаток $${rest}$) — ${full ? `${groups(full, true)} по ${state.per}` : 'ни одной полной группы'}, и ещё ${rest} в остатке. Проверка: $${state.per} * ${full} + ${rest} = ${state.total}$`
          : `$${state.total} : ${state.per} = ${full}$ — ровно ${groups(full, false)} по ${state.per}, без остатка. Проверка: $${state.per} * ${full} = ${state.total}$`,
      );
    }
  }
  if (mode === 'mul') {
    W.controls.append(
      slider('рядов', 1, 10, a, (v) => ((state.a = v), draw())).el,
      slider('в каждом ряду', 1, 10, b, (v) => ((state.b = v), draw())).el,
    );
  } else {
    W.controls.append(
      slider('всего предметов', 1, 50, total, (v) => ((state.total = v), draw())).el,
      slider('в одной группе', 1, 10, per, (v) => ((state.per = v), draw())).el,
    );
  }
  draw();
  return W.el;
}

// -------------------------------------------------------- таблица умножения
export function mulTable() {
  const W = shell();
  const table = h('table.mt');
  const cells = [];
  for (let r = 0; r <= 10; r++) {
    const tr = h('tr');
    for (let c = 0; c <= 10; c++) {
      if (r === 0 || c === 0) {
        tr.append(h('th', { scope: r === 0 ? 'col' : 'row' }, r === 0 && c === 0 ? '×' : String(r || c)));
      } else {
        const td = h('td', { tabindex: 0 }, String(r * c));
        const choose = () => select(r, c);
        td.addEventListener('mouseenter', choose);
        td.addEventListener('focus', choose);
        td.addEventListener('click', choose);
        cells.push([td, r, c]);
        tr.append(td);
      }
    }
    table.append(tr);
  }
  function select(r, c) {
    for (const [td, rr, cc] of cells) {
      td.className = rr === r && cc === c ? 'hit' : (rr === r && cc <= c) || (cc === c && rr <= r) ? 'lane' : '';
    }
    W.say(`$${r} * ${c} = ${r * c}$ — и наоборот тоже: $${c} * ${r} = ${r * c}$`);
  }
  W.canvas.append(h('div.mt-wrap', table));
  select(6, 7);
  return W.el;
}

// ---------------------------------------- сложение и вычитание в столбик
export function columnCalc({ a = 478, b = 256, op = '+' } = {}) {
  const W = shell();
  const state = { a, b, op, step: 0 };
  const board = h('div.col-board');
  W.canvas.append(board);

  function plan() {
    let x = state.a;
    let y = state.b;
    if (state.op === '-' && y > x) [x, y] = [y, x];
    const len = Math.max(String(x).length, String(y).length) + (state.op === '+' ? 1 : 0);
    const dx = String(x).padStart(len, ' ').split('');
    const dy = String(y).padStart(len, ' ').split('');
    const names = ['Единицы', 'Десятки', 'Сотни', 'Тысячи', 'Десятки тысяч'];
    const steps = [];
    const result = Array(len).fill(' ');
    const marks = Array(len).fill(''); // пометки над столбцами: перенос или заём
    let carry = 0;
    for (let k = 0; k < len; k++) {
      const pos = len - 1 - k;
      const p = +dx[pos] || 0;
      const q = +dy[pos] || 0;
      if (dx[pos] === ' ' && dy[pos] === ' ' && !carry) break;
      let note;
      if (state.op === '+') {
        const sum = p + q + carry;
        const digit = sum % 10;
        const next = Math.floor(sum / 10);
        note = `${names[k]}: $${p} + ${q}${carry ? ' + ' + carry : ''} = ${sum}$. Пишем ${digit}` + (next ? `, а ${next} переносим в следующий разряд.` : '.');
        result[pos] = String(digit);
        carry = next;
        if (next && pos > 0) marks[pos - 1] = '+' + next;
      } else {
        let top = p - carry;
        let next = 0;
        let lead = `${names[k]}: `;
        if (top < q) {
          top += 10;
          next = 1;
          lead += `из ${p - carry} не вычесть ${q} — занимаем 1 у следующего разряда. `;
          if (pos > 0) marks[pos - 1] = '−1';
        }
        const digit = top - q;
        note = `${lead}$${top} - ${q} = ${digit}$. Пишем ${digit}.`;
        result[pos] = String(digit);
        carry = next;
      }
      steps.push({ pos, note, result: [...result], marks: [...marks] });
    }
    return { x, y, dx, dy, len, steps };
  }

  let P = plan();
  function draw() {
    clear(board);
    const cur = state.step > 0 ? P.steps[state.step - 1] : null;
    const row = (chars, cls, sign = '') => {
      const r = h('div.col-row', { class: cls });
      r.append(h('span.col-sign', sign));
      chars.forEach((ch, i) => r.append(h('span.col-cell', { class: cur && cur.pos === i ? 'now' : '' }, ch === ' ' ? '' : ch)));
      return r;
    };
    let shown = cur ? [...cur.result] : Array(P.len).fill(' ');
    if (state.step === P.steps.length) {
      // убираем ведущие нули в готовом ответе
      let i = 0;
      while (i < shown.length - 1 && (shown[i] === ' ' || shown[i] === '0')) shown[i++] = ' ';
    }
    board.append(
      row(cur ? cur.marks : Array(P.len).fill(''), 'marks'),
      row(P.dx, ''),
      row(P.dy, '', state.op === '+' ? '+' : '−'),
      h('div.col-line'),
      row(shown, 'total'),
    );
    const total = state.op === '+' ? P.x + P.y : P.x - P.y;
    if (!cur) W.say('Числа записаны разряд под разрядом. Считаем справа налево — нажмите «Шаг».');
    else if (state.step === P.steps.length) W.say(`${cur.note} Ответ: $${P.x} ${state.op} ${P.y} = ${total}$`);
    else W.say(cur.note);
    stepBtn.disabled = state.step >= P.steps.length;
  }
  const stepBtn = button('Шаг', () => {
    state.step = Math.min(state.step + 1, P.steps.length);
    draw();
  }, 'primary');
  const restart = () => {
    P = plan();
    state.step = 0;
    draw();
  };
  const numInput = (label, key) => {
    const input = h('input.num-input', { type: 'number', min: 1, max: 99999, value: state[key], 'aria-label': label });
    input.addEventListener('change', () => {
      state[key] = Math.max(1, Math.min(99999, Math.floor(+input.value) || 1));
      input.value = state[key];
      restart();
    });
    return h('label.ctl.inline', h('span', label), input);
  };
  W.controls.append(
    numInput('первое', 'a'),
    segmented([['+', '+'], ['-', '−']], op, (v) => ((state.op = v), restart())).el,
    numInput('второе', 'b'),
    stepBtn,
    button('Сначала', restart),
  );
  draw();
  return W.el;
}

// ------------------------------------------------------------------- дробь
function bar(svg, x, y, width, height, parts, filled, cls = 'f-pen') {
  const g = s('g');
  for (let i = 0; i < parts; i++) {
    g.append(s('rect', { x: x + (i * width) / parts, y, width: width / parts, height, class: i < filled ? cls : 'f-paper' }));
  }
  for (let i = 1; i < parts; i++) {
    g.append(s('line', { x1: x + (i * width) / parts, y1: y, x2: x + (i * width) / parts, y2: y + height, class: 'part-line' }));
  }
  g.append(s('rect', { x, y, width, height, class: 'frame' }));
  svg.append(g);
}

function pie(svg, cx, cy, r, parts, filled) {
  svg.append(s('circle', { cx, cy, r, class: 'f-paper' }));
  if (parts === 1 && filled >= 1) svg.append(s('circle', { cx, cy, r, class: 'f-pen' }));
  else {
    for (let i = 0; i < Math.min(filled, parts); i++) {
      const a0 = (i / parts) * 2 * Math.PI - Math.PI / 2;
      const a1 = ((i + 1) / parts) * 2 * Math.PI - Math.PI / 2;
      const d = `M${cx} ${cy}L${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)}A${r} ${r} 0 0 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}Z`;
      svg.append(s('path', { d, class: 'f-pen' }));
    }
  }
  if (parts > 1) {
    for (let i = 0; i < parts; i++) {
      const a = (i / parts) * 2 * Math.PI - Math.PI / 2;
      svg.append(s('line', { x1: cx, y1: cy, x2: cx + r * Math.cos(a), y2: cy + r * Math.sin(a), class: 'part-line' }));
    }
  }
  svg.append(s('circle', { cx, cy, r, class: 'frame' }));
}

// mode: 'basic' — что такое дробь; 'equiv' — равные дроби; 'improper' — неправильные дроби
export function fractionBar({ n = 3, d = 4, mode = 'basic', k = 2 } = {}) {
  const W = shell();
  const svg = svgRoot(640, mode === 'equiv' ? 170 : 150, 'Дробь на полоске');
  W.canvas.append(svg);
  const state = { n, d, k };
  let sn;

  function draw() {
    clear(svg);
    const { n: N, d: D } = state;
    if (mode === 'equiv') {
      bar(svg, 20, 20, 600, 46, D, N);
      bar(svg, 20, 98, 600, 46, D * state.k, N * state.k);
      const [rn, rd] = reduce(N, D);
      const more = rn !== N && state.k === 1 ? ` Её можно сократить: $${N}/${D} = ${rn}/${rd}$.` : '';
      W.say(
        state.k === 1
          ? `$${N}/${D}$ — сдвиньте множитель, чтобы разрезать каждую часть.${more}`
          : `$${N}/${D} = {${N} * ${state.k}}/{${D} * ${state.k}} = ${N * state.k}/${D * state.k}$ — частей стало больше, а закрашено столько же.`,
      );
      return;
    }
    const wholes = Math.max(1, Math.ceil(N / D));
    const barW = wholes === 1 ? 440 : 290;
    for (let w = 0; w < wholes; w++) {
      bar(svg, 20 + w * (barW + 20), 44, barW, 56, D, Math.max(0, Math.min(D, N - w * D)));
    }
    if (wholes === 1) pie(svg, 560, 72, 52, D, N);
    let msg;
    if (N === 0) msg = `$0/${D} = 0$ — не взяли ни одной части.`;
    else if (N === D) msg = `$${N}/${D} = 1$ — взяли все части, получилось целое.`;
    else if (N > D) {
      const whole = Math.floor(N / D);
      const rest = N % D;
      msg = rest ? `$${N}/${D} = ${whole}{${rest}/${D}}$ — ${whole} ${whole === 1 ? 'целая' : 'целых'} и ещё $${rest}/${D}$.` : `$${N}/${D} = ${whole}$ — ровно ${whole} целых.`;
    } else msg = `$${N}/${D}$ — целое разделили на ${D} ${D < 5 ? 'равные части' : 'равных частей'} и взяли ${N}.`;
    W.say(msg);
  }

  const maxN = () => (mode === 'improper' ? state.d * 2 : state.d);
  const sd = slider('знаменатель — на сколько частей делим', mode === 'equiv' ? 2 : 1, 12, d, (v) => {
    state.d = v;
    sn.setMax(mode === 'equiv' ? v - 1 : maxN());
    state.n = sn.value;
    draw();
  });
  sn = slider('числитель — сколько частей берём', mode === 'equiv' ? 1 : 0, mode === 'equiv' ? d - 1 : maxN(), n, (v) => ((state.n = v), draw()));
  W.controls.append(sn.el, sd.el);
  if (mode === 'equiv') W.controls.append(slider('множитель', 1, 5, k, (v) => ((state.k = v), draw())).el);
  draw();
  return W.el;
}

// --------------------------------------------------- сложение двух дробей
export function fracAdd({ a = [1, 2], b = [1, 3] } = {}) {
  const W = shell();
  const svg = svgRoot(640, 250, 'Сложение дробей на полосках');
  W.canvas.append(svg);
  const st = { n1: a[0], d1: a[1], n2: b[0], d2: b[1] };
  const sl = {};

  function draw() {
    clear(svg);
    const D = lcm(st.d1, st.d2);
    const m1 = D / st.d1;
    const m2 = D / st.d2;
    const sum = st.n1 * m1 + st.n2 * m2;
    const w = 300;
    bar(svg, 10, 28, w, 34, st.d1, st.n1);
    bar(svg, 330, 28, w, 34, st.d2, st.n2, 'f-ok');
    svg.append(text(160, 18, `${st.n1}/${st.d1}`, { class: 'tick-label strong' }), text(480, 18, `${st.n2}/${st.d2}`, { class: 'tick-label strong' }));
    bar(svg, 10, 104, w, 34, D, st.n1 * m1);
    bar(svg, 330, 104, w, 34, D, st.n2 * m2, 'f-ok');
    svg.append(text(160, 94, `${st.n1 * m1}/${D}`, { class: 'tick-label strong' }), text(480, 94, `${st.n2 * m2}/${D}`, { class: 'tick-label strong' }));
    // сумма: сначала части первой дроби, затем второй
    const wholes = sum > D ? 2 : 1;
    const bw = wholes === 1 ? w : 300;
    for (let u = 0; u < wholes; u++) {
      const x0 = wholes === 1 ? 170 : 10 + u * 320;
      const g = s('g');
      for (let i = 0; i < D; i++) {
        const idx = u * D + i;
        const cls = idx < st.n1 * m1 ? 'f-pen' : idx < sum ? 'f-ok' : 'f-paper';
        g.append(s('rect', { x: x0 + (i * bw) / D, y: 190, width: bw / D, height: 34, class: cls }));
        if (i) g.append(s('line', { x1: x0 + (i * bw) / D, y1: 190, x2: x0 + (i * bw) / D, y2: 224, class: 'part-line' }));
      }
      g.append(s('rect', { x: x0, y: 190, width: bw, height: 34, class: 'frame' }));
      svg.append(g);
    }
    svg.append(text(320, 180, 'сумма', { class: 'tick-label' }));
    svg.append(text(320, 82, m1 === 1 && m2 === 1 ? 'знаменатели уже одинаковые' : `режем на одинаковые части — по 1/${D}`, { class: 'tick-label' }));
    const same = st.d1 === st.d2;
    const [rn, rd] = reduce(sum, D);
    const tail = rn !== sum ? ` $= ${fs(sum, D)}$` : '';
    W.say(
      same
        ? `$${st.n1}/${st.d1} + ${st.n2}/${st.d2} = {${st.n1} + ${st.n2}}/${D} = ${sum}/${D}$${tail}`
        : `$${st.n1}/${st.d1} + ${st.n2}/${st.d2} = ${st.n1 * m1}/${D} + ${st.n2 * m2}/${D} = ${sum}/${D}$${tail}`,
    );
  }
  const mk = (key, label, min, max, dep) =>
    (sl[key] = slider(label, min, max, st[key], (v) => {
      st[key] = v;
      if (dep) {
        sl[dep].setMax(v - 1);
        st[dep] = sl[dep].value;
      }
      draw();
    }));
  mk('n1', 'числитель 1', 1, st.d1 - 1);
  mk('d1', 'знаменатель 1', 2, 8, 'n1');
  mk('n2', 'числитель 2', 1, st.d2 - 1);
  mk('d2', 'знаменатель 2', 2, 8, 'n2');
  W.controls.append(sl.n1.el, sl.d1.el, sl.n2.el, sl.d2.el);
  W.controls.classList.add('two');
  draw();
  return W.el;
}

// ---------------------------------------------------------------- проценты
export function percentGrid({ p = 35, of = 200 } = {}) {
  const W = shell();
  const size = 22;
  const svg = svgRoot(size * 10 + 4, size * 10 + 4, 'Сто клеток, часть закрашена');
  W.canvas.append(svg);
  const st = { p, of };
  function draw() {
    clear(svg);
    for (let i = 0; i < 100; i++) {
      const r = Math.floor(i / 10);
      const c = i % 10;
      svg.append(s('rect', { x: 2 + c * size, y: 2 + r * size, width: size, height: size, class: (i < st.p ? 'f-pen' : 'f-paper') + ' cell' }));
    }
    const [rn, rd] = reduce(st.p, 100);
    const asFrac = rd === 100 || st.p === 0 ? `${st.p}/100` : `${st.p}/100 = ${rn}/${rd}`;
    W.say(`$${st.p}% = ${asFrac} = ${fm(st.p / 100)}$. А ${st.p}% от ${st.of} — это $${st.of} * ${fm(st.p / 100)} = ${fm((st.of * st.p) / 100)}$`);
  }
  W.controls.append(
    slider('процент', 0, 100, p, (v) => ((st.p = v), draw()), 1, (v) => v + '%').el,
    slider('от какого числа', 10, 500, of, (v) => ((st.of = v), draw()), 10).el,
  );
  draw();
  return W.el;
}

// ---------------------------------------------------------------- делители
export function factorize(n) {
  const out = [];
  for (let p = 2; p * p <= n; p++) {
    while (n % p === 0) {
      out.push(p);
      n /= p;
    }
  }
  if (n > 1) out.push(n);
  return out;
}

export function divisors({ n = 12 } = {}) {
  const W = shell();
  const board = h('div.chips');
  W.canvas.append(board);
  function draw(v) {
    clear(board);
    const list = [];
    for (let i = 1; i <= v; i++) {
      const hit = v % i === 0;
      if (hit) list.push(i);
      board.append(h('span.chip', { class: hit ? 'on' : '' }, String(i)));
    }
    const factors = factorize(v);
    let kind;
    if (v === 1) kind = 'Единица — ни простое, ни составное число: у неё только один делитель.';
    else if (factors.length === 1) kind = `Делителей ровно два — 1 и само число, значит ${v} — **простое**.`;
    else {
      const groups = {};
      factors.forEach((f) => (groups[f] = (groups[f] || 0) + 1));
      const expr = Object.entries(groups).map(([f, c]) => (c > 1 ? `${f}^${c}` : f)).join(' * ');
      kind = `Число **составное**: $${v} = ${factors.join(' * ')}${factors.length > Object.keys(groups).length ? ' = ' + expr : ''}$`;
    }
    W.say(`Делители числа ${v}: ${list.join(', ')}. ${kind}`);
  }
  W.controls.append(slider('число', 1, 60, n, draw).el);
  draw(n);
  return W.el;
}

// ----------------------------------------------------------------- степени
export function powers({ base = 2, exp = 5 } = {}) {
  const W = shell();
  const board = h('div.pow-bars');
  W.canvas.append(board);
  const st = { base, exp };
  function draw() {
    clear(board);
    const top = st.base ** st.exp;
    for (let e = 0; e <= st.exp; e++) {
      const value = st.base ** e;
      const height = Math.max(2, (value / top) * 120);
      board.append(
        h('div.pow-col', { class: e === st.exp ? 'now' : '' },
          h('span.pow-val', String(value)),
          h('span.pow-bar', { style: { height: height + 'px' } }),
          h('span.pow-exp', { html: inline(`$${st.base}^${e}$`) }),
        ),
      );
    }
    const chain = st.exp === 0 ? '' : st.exp === 1 ? '' : ` = ${Array(st.exp).fill(st.base).join(' * ')}`;
    const zero = st.exp === 0 ? ' — любое число (кроме нуля) в нулевой степени равно 1.' : ` — число ${st.base} взяли множителем ${st.exp} ${st.exp === 1 ? 'раз' : st.exp < 5 ? 'раза' : 'раз'}.`;
    W.say(`$${st.base}^${st.exp}${chain} = ${top}$${zero}`);
  }
  W.controls.append(
    slider('основание', 2, 10, base, (v) => ((st.base = v), draw())).el,
    slider('показатель', 0, 6, exp, (v) => ((st.exp = v), draw())).el,
  );
  draw();
  return W.el;
}

// ------------------------------------------------- общие делители двух чисел
export function commonDivisors({ a = 12, b = 18 } = {}) {
  const W = shell();
  const board = h('div.cd');
  W.canvas.append(board);
  const st = { a, b };
  function draw() {
    clear(board);
    const row = (n, other) => {
      const chips = h('div.chips');
      for (let i = 1; i <= n; i++) {
        if (n % i) continue;
        chips.append(h('span.chip', { class: other % i === 0 ? 'both' : 'on' }, String(i)));
      }
      return h('div.cd-row', h('span.cd-name', `Делители ${n}`), chips);
    };
    board.append(row(st.a, st.b), row(st.b, st.a));
    const g = gcd(st.a, st.b);
    const l = lcm(st.a, st.b);
    W.say(`Жёлтым отмечены общие делители. Самый большой из них — НОД$(${st.a}, ${st.b}) = ${g}$. А НОК$(${st.a}, ${st.b}) = ${st.a} * ${st.b} : ${g} = ${l}$.`);
  }
  W.controls.append(slider('первое число', 2, 60, a, (v) => ((st.a = v), draw())).el, slider('второе число', 2, 60, b, (v) => ((st.b = v), draw())).el);
  draw();
  return W.el;
}

// --------------------------------------------- десятые и сотые на квадрате
export function decimalGrid({ value = 37 } = {}) {
  const W = shell();
  const size = 22;
  const svg = svgRoot(size * 10 + 4, size * 10 + 4, 'Квадрат из ста клеток: столбцы — десятые, клетки — сотые');
  W.canvas.append(svg);
  function draw(v) {
    clear(svg);
    const tenths = Math.floor(v / 10);
    const rest = v % 10;
    for (let c = 0; c < 10; c++) {
      for (let r = 0; r < 10; r++) {
        const full = c < tenths;
        const part = c === tenths && r < rest;
        svg.append(s('rect', { x: 2 + c * size, y: 2 + r * size, width: size, height: size, class: (full ? 'f-pen' : part ? 'f-ok' : 'f-paper') + ' cell' }));
      }
    }
    const parts = [];
    if (tenths) parts.push(`${tenths} ${tenths === 1 ? 'десятая' : 'десятых'} (целые столбцы)`);
    if (rest) parts.push(`${rest} ${rest === 1 ? 'сотая' : 'сотых'} (отдельные клетки)`);
    W.say(v === 100 ? 'Закрашен весь квадрат: $1,00 = 1$.' : v === 0 ? 'Ничего не закрашено: $0$.' : `$${fm(v / 100)} = ${v}/100$ — это ${parts.join(' и ')}.`);
  }
  W.controls.append(slider('число', 0, 100, value, draw, 1, (v) => fmt(v / 100)).el);
  draw(value);
  return W.el;
}

// ------------------------------------------- умножение дробей как площадь
export function fracMul({ a = [2, 3], b = [3, 4] } = {}) {
  const W = shell();
  const side = 240;
  const svg = svgRoot(side + 20, side + 20, 'Квадрат, разрезанный по горизонтали и вертикали');
  W.canvas.append(svg);
  const st = { n1: a[0], d1: a[1], n2: b[0], d2: b[1] };
  const sl = {};
  function draw() {
    clear(svg);
    const x0 = 10;
    const y0 = 10;
    const cw = side / st.d1;
    const ch = side / st.d2;
    for (let c = 0; c < st.d1; c++) {
      for (let r = 0; r < st.d2; r++) {
        const inA = c < st.n1;
        const inB = r < st.n2;
        svg.append(s('rect', { x: x0 + c * cw, y: y0 + r * ch, width: cw, height: ch, class: (inA && inB ? 'f-pen' : inA || inB ? 'f-soft' : 'f-paper') + ' cell' }));
      }
    }
    svg.append(s('rect', { x: x0, y: y0, width: side, height: side, class: 'frame' }));
    const top = st.n1 * st.n2;
    const bottom = st.d1 * st.d2;
    const [rn] = reduce(top, bottom);
    W.say(`По горизонтали взяли $${st.n1}/${st.d1}$ квадрата, по вертикали — $${st.n2}/${st.d2}$. Тёмная часть — их пересечение: ${top} ${top === 1 ? 'клетка' : 'клеток'} из ${bottom}. $${st.n1}/${st.d1} * ${st.n2}/${st.d2} = ${top}/${bottom}$${rn !== top ? ` $= ${fs(top, bottom)}$` : ''}`);
  }
  const mk = (key, label, min, max, dep) =>
    (sl[key] = slider(label, min, max, st[key], (v) => {
      st[key] = v;
      if (dep) {
        sl[dep].setMax(v);
        st[dep] = sl[dep].value;
      }
      draw();
    }));
  mk('n1', 'числитель 1', 1, st.d1);
  mk('d1', 'знаменатель 1', 2, 8, 'n1');
  mk('n2', 'числитель 2', 1, st.d2);
  mk('d2', 'знаменатель 2', 2, 8, 'n2');
  W.controls.append(sl.n1.el, sl.d1.el, sl.n2.el, sl.d2.el);
  W.controls.classList.add('two');
  draw();
  return W.el;
}

// ----------------------------------- умножение по частям (десятки и единицы)
export function areaMul({ a = 23, b = 4 } = {}) {
  const W = shell();
  const svg = svgRoot(600, 170, 'Прямоугольник, разбитый на десятки и единицы');
  W.canvas.append(svg);
  const st = { a, b };
  function draw() {
    clear(svg);
    const tens = Math.floor(st.a / 10) * 10;
    const ones = st.a % 10;
    const k = 560 / 49;
    const hgt = 30 + st.b * 10;
    const x0 = 20;
    const y0 = 28;
    svg.append(s('rect', { x: x0, y: y0, width: tens * k, height: hgt, class: 'sq sq-a' }));
    svg.append(text(x0 + (tens * k) / 2, y0 + hgt / 2 + 5, `${tens} · ${st.b} = ${tens * st.b}`, { class: 'pt-label' }));
    svg.append(text(x0 + (tens * k) / 2, y0 - 8, String(tens), { class: 'tick-label strong' }));
    if (ones) {
      svg.append(s('rect', { x: x0 + tens * k, y: y0, width: ones * k, height: hgt, class: 'sq sq-b' }));
      svg.append(text(x0 + tens * k + (ones * k) / 2, y0 + hgt / 2 + 5, ones * k > 60 ? `${ones} · ${st.b} = ${ones * st.b}` : String(ones * st.b), { class: 'pt-label' }));
      svg.append(text(x0 + tens * k + (ones * k) / 2, y0 - 8, String(ones), { class: 'tick-label strong' }));
    }
    svg.append(text(x0 - 10, y0 + hgt / 2 + 5, String(st.b), { class: 'tick-label strong' }));
    W.say(ones ? `$${st.a} * ${st.b} = (${tens} + ${ones}) * ${st.b} = ${tens * st.b} + ${ones * st.b} = ${st.a * st.b}$ — площадь всего прямоугольника равна сумме площадей двух частей.` : `$${st.a} * ${st.b} = ${st.a * st.b}$ — здесь единиц нет, считаем только десятки.`);
  }
  W.controls.append(slider('первый множитель', 11, 49, a, (v) => ((st.a = v), draw())).el, slider('второй множитель', 2, 9, b, (v) => ((st.b = v), draw())).el);
  draw();
  return W.el;
}
