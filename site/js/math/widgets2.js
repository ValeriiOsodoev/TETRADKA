// Интерактивные картинки: уравнения, графики, геометрия, вероятность.

import { h, s, clear, inline } from '../dom.js';
import { fm, fmt, ri } from './tasks.js';
import { shell, slider, button, segmented, svgRoot, text, plane, curvePath } from './widget-kit.js';

let uid = 0;

// --------------------------------------------------- весы: решаем уравнение
export function balance({ a = 3, b = 2, x = 4 } = {}) {
  const W = shell();
  const svg = svgRoot(640, 216, 'Весы с коробками и гирьками');
  W.canvas.append(svg);
  const st = { a, b, x, stage: 0 };
  const weights = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'гирька' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 > 20) ? 'гирьки' : 'гирек');

  function pan(cx, boxes, weights) {
    svg.append(s('line', { x1: cx, y1: 30, x2: cx - 100, y2: 176, class: 'thread' }), s('line', { x1: cx, y1: 30, x2: cx + 100, y2: 176, class: 'thread' }));
    svg.append(s('line', { x1: cx - 108, y1: 178, x2: cx + 108, y2: 178, class: 'plate' }));
    const boxSize = 34;
    const startX = cx - 96;
    for (let i = 0; i < boxes; i++) {
      const bx = startX + i * (boxSize + 4);
      svg.append(s('rect', { x: bx, y: 176 - boxSize, width: boxSize, height: boxSize, rx: 3, class: 'box' }));
      svg.append(text(bx + boxSize / 2, 176 - boxSize / 2 + 5, 'x', { class: 'box-label' }));
    }
    const perRow = 9;
    const baseY = boxes ? 176 - boxSize - 12 : 166;
    for (let i = 0; i < weights; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      svg.append(s('circle', { cx: startX + 10 + col * 21.5, cy: baseY - row * 21, r: 9, class: 'weight' }));
    }
  }

  function draw() {
    clear(svg);
    const c = st.a * st.x + st.b;
    svg.append(s('line', { x1: 320, y1: 30, x2: 320, y2: 204, class: 'stand' }), s('line', { x1: 280, y1: 204, x2: 360, y2: 204, class: 'stand' }));
    svg.append(s('line', { x1: 170, y1: 30, x2: 470, y2: 30, class: 'stand' }), s('circle', { cx: 320, cy: 30, r: 5, class: 'f-ink' }));
    if (st.stage === 0) {
      pan(170, st.a, st.b);
      pan(470, 0, c);
      W.say(`$${st.a}x + ${st.b} = ${c}$ — слева ${st.a} одинаковые коробки и ${st.b} ${weights(st.b)}, справа ${c} ${weights(c)}. Весы в равновесии.`);
      act.textContent = `Убрать по ${st.b} ${weights(st.b) === 'гирька' ? 'гирьке' : weights(st.b) === 'гирьки' ? 'гирьки' : 'гирек'} с каждой чаши`;
    } else if (st.stage === 1) {
      pan(170, st.a, 0);
      pan(470, 0, c - st.b);
      W.say(`$${st.a}x = ${c} - ${st.b} = ${c - st.b}$ — сняли поровну с обеих чаш, равновесие сохранилось.`);
      act.textContent = `Разделить обе чаши на ${st.a}`;
    } else {
      pan(170, 1, 0);
      pan(470, 0, st.x);
      W.say(`$x = ${c - st.b} : ${st.a} = ${st.x}$ — оставили на каждой чаше одну и ту же долю. В коробке ${st.x} ${weights(st.x)}.`);
    }
    act.hidden = st.stage === 2;
  }
  const act = button('', () => {
    st.stage += 1;
    draw();
  }, 'primary');
  W.controls.append(
    act,
    button('Другое уравнение', () => {
      st.a = ri(2, 4);
      st.b = ri(1, 6);
      st.x = ri(1, 5);
      st.stage = 0;
      draw();
    }),
  );
  draw();
  return W.el;
}

// ----------------------------------------------------- координатная плоскость
export function coordPlane({ x = 3, y = 2 } = {}) {
  const W = shell();
  const box = { xmin: -6, xmax: 6, ymin: -6, ymax: 6, unit: 24 };
  const size = 28 + 12 * box.unit;
  const svg = svgRoot(size, size, 'Координатная плоскость с точкой');
  svg.classList.add('clickable');
  W.canvas.append(svg);
  const st = { x, y };
  let sx;
  let sy;
  function draw() {
    clear(svg);
    const { X, Y } = plane(svg, box);
    svg.append(
      s('line', { x1: X(st.x), y1: Y(0), x2: X(st.x), y2: Y(st.y), class: 'dash' }),
      s('line', { x1: X(0), y1: Y(st.y), x2: X(st.x), y2: Y(st.y), class: 'dash' }),
      s('circle', { cx: X(st.x), cy: Y(st.y), r: 6, class: 'pt-start' }),
      text(X(st.x) + (st.x >= 4 ? -30 : 30), Y(st.y) - 10, `A(${fmt(st.x)}; ${fmt(st.y)})`, { class: 'pt-label' }),
    );
    const horiz = st.x === 0 ? 'по горизонтали не двигаемся' : `${Math.abs(st.x)} ${st.x > 0 ? 'вправо' : 'влево'}`;
    const vert = st.y === 0 ? 'по вертикали не двигаемся' : `${Math.abs(st.y)} ${st.y > 0 ? 'вверх' : 'вниз'}`;
    let where;
    if (st.x === 0 && st.y === 0) where = 'Это начало координат.';
    else if (st.x === 0) where = 'Точка лежит на оси y.';
    else if (st.y === 0) where = 'Точка лежит на оси x.';
    else where = `Это ${st.x > 0 ? (st.y > 0 ? 'I' : 'IV') : st.y > 0 ? 'II' : 'III'} четверть.`;
    W.say(`$A(${fm(st.x)}; ${fm(st.y)})$ — от нуля ${horiz}, ${vert}. ${where}`);
  }
  svg.addEventListener('click', (ev) => {
    const r = svg.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * size;
    const py = ((ev.clientY - r.top) / r.height) * size;
    st.x = Math.max(-6, Math.min(6, Math.round((px - 14) / box.unit) - 6));
    st.y = Math.max(-6, Math.min(6, 6 - Math.round((py - 14) / box.unit)));
    sx.value = st.x;
    sy.value = st.y;
    draw();
  });
  sx = slider('$x$ — вправо и влево', -6, 6, x, (v) => ((st.x = v), draw()));
  sy = slider('$y$ — вверх и вниз', -6, 6, y, (v) => ((st.y = v), draw()));
  W.controls.append(sx.el, sy.el);
  draw();
  return W.el;
}

// ------------------------------------------------------------ график функции
/**
 * params: [{ name, label, min, max, step, value }]
 * f: (x, p) => y  или массив таких функций
 * title: (p) => 'размеченная строка с формулой'
 * marks: (p) => [{ x, y, label }]   — отмеченные точки
 * lines: (p) => [{ x1, y1, x2, y2 }] — вспомогательные отрезки
 */
export function plot({ range = [-6, 6, -6, 6], unit = 24, params = [], f, title, marks, lines } = {}) {
  const W = shell();
  const [xmin, xmax, ymin, ymax] = range;
  const box = { xmin, xmax, ymin, ymax, unit };
  const width = 28 + (xmax - xmin) * unit;
  const height = 28 + (ymax - ymin) * unit;
  const svg = svgRoot(width, height, 'График функции');
  W.canvas.append(svg);
  const p = Object.fromEntries(params.map((q) => [q.name, q.value]));
  const clipId = `clip${++uid}`;
  const fns = Array.isArray(f) ? f : [f];

  function draw() {
    clear(svg);
    const { X, Y } = plane(svg, box);
    svg.append(s('clipPath', { id: clipId }, s('rect', { x: X(xmin), y: Y(ymax), width: (xmax - xmin) * unit, height: (ymax - ymin) * unit })));
    const layer = s('g', { 'clip-path': `url(#${clipId})` });
    for (const ln of lines ? lines(p) : []) {
      layer.append(s('line', { x1: X(ln.x1), y1: Y(ln.y1), x2: X(ln.x2), y2: Y(ln.y2), class: ln.cls || 'dash' }));
    }
    fns.forEach((fn, i) => layer.append(s('path', { d: curvePath((x) => fn(x, p), X, Y, box), class: 'curve' + (i ? ' second' : '') })));
    svg.append(layer);
    for (const m of marks ? marks(p) : []) {
      if (!Number.isFinite(m.x) || !Number.isFinite(m.y) || m.x < xmin || m.x > xmax || m.y < ymin || m.y > ymax) continue;
      svg.append(s('circle', { cx: X(m.x), cy: Y(m.y), r: 5, class: 'pt-end' }));
      if (m.label) svg.append(text(X(m.x) + (m.x > xmax - 2.5 ? -36 : 36), Y(m.y) - 9, m.label, { class: 'pt-label' }));
    }
    if (title) W.say(title(p));
  }
  for (const q of params) {
    W.controls.append(slider(q.label || `$${q.name}$`, q.min, q.max, q.value, (v) => ((p[q.name] = v), draw()), q.step || 1).el);
  }
  draw();
  return W.el;
}

// --------------------------------------------------------------------- угол
export function angle({ value = 60 } = {}) {
  const W = shell();
  const svg = svgRoot(320, 230, 'Угол между двумя лучами');
  W.canvas.append(svg);
  function draw(deg) {
    clear(svg);
    const cx = 160;
    const cy = 120;
    const len = 100;
    const rad = (deg * Math.PI) / 180;
    const ex = cx + len * Math.cos(rad);
    const ey = cy - len * Math.sin(rad);
    if (deg === 90) svg.append(s('path', { d: `M${cx + 22} ${cy}v-22h-22`, class: 'arc' }));
    else if (deg > 0) {
      const r = 30;
      const large = deg > 180 ? 1 : 0;
      const end = deg === 360 ? 359.9 : deg;
      const ax = cx + r * Math.cos((end * Math.PI) / 180);
      const ay = cy - r * Math.sin((end * Math.PI) / 180);
      svg.append(s('path', { d: `M${cx + r} ${cy}A${r} ${r} 0 ${large} 0 ${ax} ${ay}`, class: 'arc' }));
    }
    svg.append(
      s('line', { x1: cx, y1: cy, x2: cx + len, y2: cy, class: 'ray' }),
      s('line', { x1: cx, y1: cy, x2: ex, y2: ey, class: 'ray hot' }),
      s('circle', { cx, cy, r: 4, class: 'f-ink' }),
    );
    const kind =
      deg === 0 ? 'нулевой угол — лучи совпали' :
      deg < 90 ? '**острый** угол — меньше 90°' :
      deg === 90 ? '**прямой** угол — ровно 90°, как угол тетрадного листа' :
      deg < 180 ? '**тупой** угол — больше 90°, но меньше 180°' :
      deg === 180 ? '**развёрнутый** угол — ровно 180°, лучи образуют прямую' :
      deg < 360 ? 'угол больше развёрнутого' : '**полный** угол — целый оборот, 360°';
    W.say(`${deg}° — ${kind}.`);
  }
  W.controls.append(slider('угол', 0, 360, value, draw, 5, (v) => v + '°').el);
  draw(value);
  return W.el;
}

// --------------------------------------------------- сумма углов треугольника
export function triangleAngles({ a = 60, b = 70 } = {}) {
  const W = shell();
  const svg = svgRoot(560, 250, 'Треугольник с тремя углами');
  W.canvas.append(svg);
  const st = { a, b };
  let sb;
  function draw() {
    clear(svg);
    const c = 180 - st.a - st.b;
    const A = (st.a * Math.PI) / 180;
    const B = (st.b * Math.PI) / 180;
    const C = (c * Math.PI) / 180;
    // основание длиной 1, третья вершина — по теореме синусов
    const side = Math.sin(B) / Math.sin(C);
    const px = side * Math.cos(A);
    const py = side * Math.sin(A);
    const minX = Math.min(0, px);
    const maxX = Math.max(1, px);
    const k = Math.min(440 / (maxX - minX), 190 / py);
    const ox = 280 - ((minX + maxX) / 2) * k;
    const oy = 226;
    const P = [[ox, oy], [ox + k, oy], [ox + px * k, oy - py * k]];
    svg.append(s('polygon', { points: P.map((q) => q.join(',')).join(' '), class: 'shape' }));
    const mid = [(P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3];
    [st.a, st.b, c].forEach((deg, i) => {
      const [x, y] = P[i];
      const dx = mid[0] - x;
      const dy = mid[1] - y;
      const len = Math.hypot(dx, dy);
      const reach = Math.min(34, len * 0.42);
      svg.append(text(x + (dx / len) * reach, y + (dy / len) * reach + 5, deg + '°', { class: 'pt-label' }));
    });
    const kind = c === 90 || st.a === 90 || st.b === 90 ? 'прямоугольный' : Math.max(st.a, st.b, c) > 90 ? 'тупоугольный' : 'остроугольный';
    W.say(`$${st.a}deg + ${st.b}deg + ${c}deg = 180deg$ — третий угол всегда добирает до 180°. Треугольник ${kind}.`);
  }
  const sa = slider('первый угол', 20, 130, a, (v) => {
    st.a = v;
    sb.setMax(160 - v);
    st.b = sb.value;
    draw();
  }, 5, (v) => v + '°');
  sb = slider('второй угол', 20, 160 - a, b, (v) => ((st.b = v), draw()), 5, (v) => v + '°');
  W.controls.append(sa.el, sb.el);
  draw();
  return W.el;
}

// ---------------------------------------------- прямоугольник: периметр и площадь
export function rectArea({ w = 6, h: hh = 4 } = {}) {
  const W = shell();
  const unit = 30;
  const svg = svgRoot(12 * unit + 70, 8 * unit + 50, 'Прямоугольник из клеток');
  W.canvas.append(svg);
  const st = { w, h: hh };
  function draw() {
    clear(svg);
    svg.setAttribute('viewBox', `0 0 ${12 * unit + 70} ${st.h * unit + 50}`);
    const x0 = 40;
    const y0 = 10;
    for (let r = 0; r < st.h; r++) {
      for (let c = 0; c < st.w; c++) {
        svg.append(s('rect', { x: x0 + c * unit, y: y0 + r * unit, width: unit, height: unit, class: 'f-soft cell' }));
      }
    }
    svg.append(s('rect', { x: x0, y: y0, width: st.w * unit, height: st.h * unit, class: 'frame hot' }));
    svg.append(text(x0 + (st.w * unit) / 2, y0 + st.h * unit + 22, `${st.w} см`, { class: 'pt-label' }));
    svg.append(text(x0 - 8, y0 + (st.h * unit) / 2 + 5, `${st.h}`, { class: 'pt-label', 'text-anchor': 'end' }));
    const square = st.w === st.h ? ' Стороны равны — это квадрат.' : '';
    W.say(`Периметр — длина границы: $P = 2 * (${st.w} + ${st.h}) = ${2 * (st.w + st.h)}$ см. Площадь — сколько клеток внутри: $S = ${st.w} * ${st.h} = ${st.w * st.h}$ см².${square}`);
  }
  W.controls.append(slider('длина', 1, 12, w, (v) => ((st.w = v), draw())).el, slider('ширина', 1, 8, hh, (v) => ((st.h = v), draw())).el);
  draw();
  return W.el;
}

// --------------------------------------------------------- теорема Пифагора
export function pythagoras({ a = 4, b = 3 } = {}) {
  const W = shell();
  const svg = svgRoot(560, 330, 'Прямоугольный треугольник с квадратами на сторонах');
  W.canvas.append(svg);
  const st = { a, b };
  function draw() {
    clear(svg);
    const { a: A, b: B } = st;
    const k = Math.min(520 / (A + 2 * B), 300 / (2 * A + B), 30);
    // центр рисунка: по x фигура занимает [−b; a + b], по y — [−a; a + b]
    const cx = A / 2;
    const cy = B / 2;
    const X = (x) => 280 + (x - cx) * k;
    const Y = (y) => 165 - (y - cy) * k;
    const poly = (pts, cls) => s('polygon', { points: pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(' '), class: cls });
    svg.append(
      poly([[0, 0], [A, 0], [A, -A], [0, -A]], 'sq sq-a'),
      poly([[0, 0], [0, B], [-B, B], [-B, 0]], 'sq sq-b'),
      poly([[A, 0], [0, B], [B, A + B], [A + B, A]], 'sq sq-c'),
      poly([[0, 0], [A, 0], [0, B]], 'shape'),
      s('path', { d: `M${X(0) + 10} ${Y(0)}v-10h-10`, class: 'arc' }),
      text(X(A / 2), Y(-A / 2) + 5, `${A}² = ${A * A}`, { class: 'pt-label' }),
      text(X(-B / 2), Y(B / 2) + 5, `${B}² = ${B * B}`, { class: 'pt-label' }),
      text(X((A + B) / 2), Y((A + B) / 2) + 5, `c² = ${A * A + B * B}`, { class: 'pt-label' }),
    );
    const sum = A * A + B * B;
    const c = Math.sqrt(sum);
    const exact = Number.isInteger(c);
    W.say(`$c^2 = a^2 + b^2 = ${A}^2 + ${B}^2 = ${A * A} + ${B * B} = ${sum}$, значит $c = sqrt{${sum}} ${exact ? '=' : '~='} ${fm(c, 2)}$. Площадь большого квадрата равна сумме двух маленьких.`);
  }
  W.controls.append(slider('катет $a$', 1, 8, a, (v) => ((st.a = v), draw())).el, slider('катет $b$', 1, 8, b, (v) => ((st.b = v), draw())).el);
  draw();
  return W.el;
}

// --------------------------------------------------------- окружность и круг
export function circle({ r = 5 } = {}) {
  const W = shell();
  const svg = svgRoot(320, 240, 'Круг с радиусом и диаметром');
  W.canvas.append(svg);
  function draw(R) {
    clear(svg);
    const cx = 160;
    const cy = 120;
    const px = R * 10.5;
    svg.append(
      s('circle', { cx, cy, r: px, class: 'shape' }),
      s('line', { x1: cx - px, y1: cy, x2: cx + px, y2: cy, class: 'dash' }),
      s('line', { x1: cx, y1: cy, x2: cx + px * Math.cos(-0.9), y2: cy + px * Math.sin(-0.9), class: 'ray hot' }),
      s('circle', { cx, cy, r: 3.5, class: 'f-ink' }),
      text(cx + (px / 2) * Math.cos(-0.9) - 12, cy + (px / 2) * Math.sin(-0.9), 'r', { class: 'pt-label' }),
      text(cx - px / 2, cy + 18, 'd', { class: 'pt-label' }),
    );
    W.say(`Радиус $r = ${R}$, диаметр $d = 2r = ${2 * R}$. Длина окружности $C = 2 pi r ~= ${fm(2 * Math.PI * R, 1)}$. Площадь круга $S = pi r^2 ~= ${fm(Math.PI * R * R, 1)}$.`);
  }
  W.controls.append(slider('радиус', 1, 10, r, draw).el);
  draw(r);
  return W.el;
}

// ----------------------------------------------------- единичная окружность
export function unitCircle({ value = 30 } = {}) {
  const W = shell();
  const size = 300;
  const svg = svgRoot(size, size, 'Единичная окружность');
  W.canvas.append(svg);
  function draw(deg) {
    clear(svg);
    const c = size / 2;
    const R = 110;
    const rad = (deg * Math.PI) / 180;
    const px = c + R * Math.cos(rad);
    const py = c - R * Math.sin(rad);
    svg.append(
      s('line', { x1: 14, y1: c, x2: size - 14, y2: c, class: 'axis' }),
      s('line', { x1: c, y1: 14, x2: c, y2: size - 14, class: 'axis' }),
      s('circle', { cx: c, cy: c, r: R, class: 'shape thin' }),
      text(c + R + 12, c + 16, '1', { class: 'tick-label' }),
      text(c - 10, c - R - 6, '1', { class: 'tick-label' }),
    );
    if (deg > 0) {
      const r = 22;
      const end = deg === 360 ? 359.9 : deg;
      const ax = c + r * Math.cos((end * Math.PI) / 180);
      const ay = c - r * Math.sin((end * Math.PI) / 180);
      svg.append(s('path', { d: `M${c + r} ${c}A${r} ${r} 0 ${deg > 180 ? 1 : 0} 0 ${ax} ${ay}`, class: 'arc' }));
    }
    svg.append(
      s('line', { x1: c, y1: c, x2: px, y2: py, class: 'ray' }),
      s('line', { x1: c, y1: c, x2: px, y2: c, class: 'proj-cos' }),
      s('line', { x1: px, y1: c, x2: px, y2: py, class: 'proj-sin' }),
      s('circle', { cx: px, cy: py, r: 5.5, class: 'pt-start' }),
    );
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const round = (v) => fm(Math.abs(v) < 1e-9 ? 0 : v, 2);
    const eq = (v) => (Math.abs(v * 2 - Math.round(v * 2)) < 1e-9 ? '=' : '~=');
    W.say(`Угол ${deg}°. Синяя линия — насколько точка ушла по горизонтали: $cos ${deg}deg ${eq(cos)} ${round(cos)}$. Красная — по вертикали: $sin ${deg}deg ${eq(sin)} ${round(sin)}$.`);
  }
  W.controls.append(slider('угол', 0, 360, value, draw, 15, (v) => v + '°').el);
  draw(value);
  return W.el;
}

// --------------------------------------------------------------- прогрессии
export function progression({ kind = 'arith' } = {}) {
  const W = shell();
  const board = h('div.pow-bars');
  W.canvas.append(board);
  const st = { kind, a1: 2, d: 3, q: 2 };
  function draw() {
    clear(board);
    const count = st.kind === 'arith' ? 8 : 7;
    const terms = Array.from({ length: count }, (_, i) => (st.kind === 'arith' ? st.a1 + st.d * i : st.a1 * st.q ** i));
    const top = Math.max(...terms, 1);
    terms.forEach((value, i) => {
      board.append(
        h('div.pow-col',
          h('span.pow-val', String(value)),
          h('span.pow-bar', { style: { height: Math.max(2, (value / top) * 120) + 'px' } }),
          h('span.pow-exp', { html: inline(st.kind === 'arith' ? `$a_${i + 1}$` : `$b_${i + 1}$`) }),
        ),
      );
    });
    const sum = terms.reduce((x, y) => x + y, 0);
    if (st.kind === 'arith') {
      W.say(`Каждый следующий член больше на $d = ${st.d}$. Формула: $a_n = a_1 + d(n - 1)$, например $a_${count} = ${st.a1} + ${st.d} * ${count - 1} = ${terms[count - 1]}$. Сумма первых ${count} членов: ${sum}.`);
    } else {
      W.say(`Каждый следующий член больше в $q = ${st.q}$ ${st.q < 5 ? 'раза' : 'раз'}. Формула: $b_n = b_1 * q^{n - 1}$, например $b_${count} = ${st.a1} * ${st.q}^${count - 1} = ${terms[count - 1]}$. Сумма первых ${count} членов: ${sum}.`);
    }
    sd.el.hidden = st.kind !== 'arith';
    sq.el.hidden = st.kind === 'arith';
  }
  const seg = segmented([['arith', 'арифметическая'], ['geom', 'геометрическая']], kind, (v) => ((st.kind = v), draw()));
  const sa = slider('первый член', 1, 10, st.a1, (v) => ((st.a1 = v), draw()));
  const sd = slider('разность $d$', 0, 6, st.d, (v) => ((st.d = v), draw()));
  const sq = slider('знаменатель $q$', 2, 3, st.q, (v) => ((st.q = v), draw()));
  W.controls.append(seg.el, sa.el, sd.el, sq.el);
  draw();
  return W.el;
}

// ------------------------------------------------- опыт: монета или кубик
export function chance({ kind = 'coin' } = {}) {
  const W = shell();
  const labels = kind === 'coin' ? ['орёл', 'решка'] : ['1', '2', '3', '4', '5', '6'];
  const counts = labels.map(() => 0);
  const board = h('div.chance');
  W.canvas.append(board);
  function draw() {
    clear(board);
    const total = counts.reduce((a, b) => a + b, 0);
    const expected = 100 / labels.length;
    labels.forEach((label, i) => {
      const share = total ? (counts[i] / total) * 100 : 0;
      board.append(
        h('div.chance-row',
          h('span.chance-name', label),
          h('span.chance-track', h('span.chance-fill', { style: { width: share + '%' } }), h('span.chance-mark', { style: { left: expected + '%' } })),
          h('span.chance-num', total ? `${counts[i]} — ${fmt(share, 1)}%` : '—'),
        ),
      );
    });
    const exp = kind === 'coin' ? '$1/2$, то есть 50%' : '$1/6$, то есть примерно 16,7%';
    W.say(total ? `Бросков: ${total}. Вероятность каждого исхода — ${exp} (пунктир). Чем больше бросков, тем ближе доли к пунктиру.` : `Вероятность каждого исхода — ${exp}. Проверьте на опыте: бросайте и смотрите на доли.`);
  }
  const roll = (n) => {
    for (let i = 0; i < n; i++) counts[ri(0, labels.length - 1)] += 1;
    draw();
  };
  W.controls.append(
    button('Бросить 1 раз', () => roll(1), 'primary'),
    button('10 раз', () => roll(10)),
    button('1000 раз', () => roll(1000)),
    button('Сбросить', () => {
      counts.fill(0);
      draw();
    }),
  );
  draw();
  return W.el;
}

// --------------------------------------------------------- квадратный корень
export function sqrtSquare({ n = 49 } = {}) {
  const W = shell();
  const unit = 22;
  const svg = svgRoot(10 * unit + 60, 10 * unit + 40, 'Квадрат заданной площади');
  W.canvas.append(svg);
  function draw(v) {
    clear(svg);
    const side = Math.sqrt(v);
    const x0 = 30;
    const y0 = 10;
    svg.append(s('rect', { x: x0, y: y0, width: 10 * unit, height: 10 * unit, class: 'f-paper' }));
    svg.append(s('rect', { x: x0, y: y0, width: side * unit, height: side * unit, class: 'shape' }));
    for (let i = 0; i <= 10; i++) {
      svg.append(s('line', { x1: x0 + i * unit, y1: y0, x2: x0 + i * unit, y2: y0 + 10 * unit, class: 'grid-line strong' }));
      svg.append(s('line', { x1: x0, y1: y0 + i * unit, x2: x0 + 10 * unit, y2: y0 + i * unit, class: 'grid-line strong' }));
    }
    svg.append(s('rect', { x: x0, y: y0, width: side * unit, height: side * unit, class: 'frame hot' }));
    svg.append(text(x0 + (side * unit) / 2, y0 + side * unit + 20, `сторона ${fmt(side, 2)}`, { class: 'pt-label' }));
    const whole = Number.isInteger(side);
    const lo = Math.floor(side);
    W.say(
      whole
        ? `Площадь квадрата ${v} клеток, сторона — ровно ${side}: $sqrt{${v}} = ${side}$, потому что $${side}^2 = ${v}$.`
        : `Площадь ${v} клеток. Сторона — между ${lo} и ${lo + 1}, потому что $${lo}^2 = ${lo * lo}$ и $${lo + 1}^2 = ${(lo + 1) ** 2}$. Примерно $sqrt{${v}} ~= ${fm(side, 2)}$.`,
    );
  }
  W.controls.append(slider('площадь квадрата', 1, 100, n, draw).el);
  draw(n);
  return W.el;
}

// ------------------------------------------------------- среднее и медиана
export function meanBars({ values = [3, 7, 4, 10, 6] } = {}) {
  const W = shell();
  const board = h('div.pow-bars.mean');
  W.canvas.append(board);
  let data = [...values];
  function draw() {
    clear(board);
    const sum = data.reduce((a, b) => a + b, 0);
    const mean = sum / data.length;
    const sorted = [...data].sort((a, b) => a - b);
    const median = sorted[(sorted.length - 1) / 2];
    data.forEach((value) => {
      board.append(h('div.pow-col', h('span.pow-val', String(value)), h('span.pow-bar', { style: { height: value * 11 + 'px' } })));
    });
    board.append(h('span.mean-line', { style: { bottom: mean * 11 + 'px' } }, h('span', `среднее ${fmt(mean, 1)}`)));
    W.say(`Среднее арифметическое: $(${data.join(' + ')}) : ${data.length} = ${sum} : ${data.length} = ${fm(mean, 2)}$. Медиана — число посередине после сортировки: ${sorted.map((v, i) => (i === 2 ? `**${v}**` : v)).join(', ')}, то есть ${median}.`);
  }
  W.controls.append(
    button('Другие числа', () => {
      data = Array.from({ length: 5 }, () => ri(1, 12));
      draw();
    }),
  );
  draw();
  return W.el;
}

// ------------------------------------------------- квадрат суммы на картинке
export function squareSum({ a = 5, b = 3 } = {}) {
  const W = shell();
  const svg = svgRoot(300, 300, 'Квадрат со стороной a + b, разрезанный на четыре части');
  W.canvas.append(svg);
  const st = { a, b };
  function draw() {
    clear(svg);
    const k = 260 / (st.a + st.b);
    const x0 = 28;
    const y0 = 12;
    const A = st.a * k;
    const B = st.b * k;
    svg.append(
      s('rect', { x: x0, y: y0, width: A, height: A, class: 'sq sq-a' }),
      s('rect', { x: x0 + A, y: y0, width: B, height: A, class: 'sq sq-c' }),
      s('rect', { x: x0, y: y0 + A, width: A, height: B, class: 'sq sq-c' }),
      s('rect', { x: x0 + A, y: y0 + A, width: B, height: B, class: 'sq sq-b' }),
      text(x0 + A / 2, y0 + A / 2 + 5, 'a²', { class: 'pt-label' }),
      text(x0 + A + B / 2, y0 + A / 2 + 5, 'ab', { class: 'pt-label' }),
      text(x0 + A / 2, y0 + A + B / 2 + 5, 'ab', { class: 'pt-label' }),
      text(x0 + A + B / 2, y0 + A + B / 2 + 5, 'b²', { class: 'pt-label' }),
      text(x0 + A / 2, y0 + A + B + 18, `a = ${st.a}`, { class: 'tick-label' }),
      text(x0 + A + B / 2, y0 + A + B + 18, `b = ${st.b}`, { class: 'tick-label' }),
    );
    const sum = st.a + st.b;
    W.say(`$(${st.a} + ${st.b})^2 = ${st.a}^2 + 2 * ${st.a} * ${st.b} + ${st.b}^2 = ${st.a * st.a} + ${2 * st.a * st.b} + ${st.b * st.b} = ${sum * sum}$. Проверка: $${sum}^2 = ${sum * sum}$.`);
  }
  W.controls.append(slider('$a$', 1, 9, a, (v) => ((st.a = v), draw())).el, slider('$b$', 1, 9, b, (v) => ((st.b = v), draw())).el);
  draw();
  return W.el;
}

// ------------------------------------------------------ коробка из кубиков
export function boxVolume({ a = 4, b = 3, c = 2 } = {}) {
  const W = shell();
  const svg = svgRoot(420, 260, 'Коробка из единичных кубиков');
  W.canvas.append(svg);
  const st = { a, b, c };
  function draw() {
    clear(svg);
    const u = Math.min(34, 300 / (st.a + st.b * 0.55), 190 / (st.c + st.b * 0.45));
    const dx = u * 0.55; // сдвиг «в глубину»
    const dy = u * 0.45;
    const width = st.a * u + st.b * dx;
    const height = st.c * u + st.b * dy;
    const x0 = (420 - width) / 2;
    const y0 = (250 - height) / 2 + st.b * dy;
    const pt = (i, j, k) => `${x0 + i * u + j * dx},${y0 + (st.c - k) * u - j * dy}`;
    const face = (pts, cls) => svg.append(s('polygon', { points: pts.join(' '), class: cls }));
    for (let i = 0; i < st.a; i++) for (let k = 0; k < st.c; k++) face([pt(i, 0, k), pt(i + 1, 0, k), pt(i + 1, 0, k + 1), pt(i, 0, k + 1)], 'cube front');
    for (let i = 0; i < st.a; i++) for (let j = 0; j < st.b; j++) face([pt(i, j, st.c), pt(i + 1, j, st.c), pt(i + 1, j + 1, st.c), pt(i, j + 1, st.c)], 'cube top');
    for (let j = 0; j < st.b; j++) for (let k = 0; k < st.c; k++) face([pt(st.a, j, k), pt(st.a, j + 1, k), pt(st.a, j + 1, k + 1), pt(st.a, j, k + 1)], 'cube side');
    W.say(`В одном слое $${st.a} * ${st.b} = ${st.a * st.b}$ кубиков, слоёв ${st.c}. Объём: $V = ${st.a} * ${st.b} * ${st.c} = ${st.a * st.b * st.c}$ кубиков.`);
  }
  W.controls.append(
    slider('длина', 1, 8, a, (v) => ((st.a = v), draw())).el,
    slider('ширина', 1, 6, b, (v) => ((st.b = v), draw())).el,
    slider('высота', 1, 5, c, (v) => ((st.c = v), draw())).el,
  );
  draw();
  return W.el;
}

// --------------------------------------- рецепт: прямая пропорциональность
export function recipe({ portions = 2 } = {}) {
  const W = shell();
  const board = h('div.chance');
  W.canvas.append(board);
  const base = [['мука', 75, 'г'], ['молоко', 100, 'мл'], ['сахар', 10, 'г']];
  function draw(n) {
    clear(board);
    base.forEach(([name, per, unit]) => {
      board.append(
        h('div.chance-row',
          h('span.chance-name', name),
          h('span.chance-track', h('span.chance-fill', { style: { width: (n / 8) * 100 + '%' } })),
          h('span.chance-num', `${per * n} ${unit}`),
        ),
      );
    });
    W.say(`На 1 порцию блинов: 75 г муки, 100 мл молока и 10 г сахара. На ${n} ${n === 1 ? 'порцию' : n < 5 ? 'порции' : 'порций'} всего нужно в ${n} ${n === 1 ? 'раз' : n < 5 ? 'раза' : 'раз'} больше, а отношение муки к молоку остаётся прежним: $${75 * n} : ${100 * n} = 3 : 4$.`);
  }
  W.controls.append(slider('порций', 1, 8, portions, draw).el);
  draw(portions);
  return W.el;
}

// --------------------------------------------- правило умножения: комплекты
export function outfits({ a = 3, b = 2 } = {}) {
  const W = shell();
  const board = h('div.outfits');
  W.canvas.append(board);
  const st = { a, b };
  const tops = ['красная', 'синяя', 'зелёная', 'жёлтая', 'белая'];
  const bottoms = ['джинсы', 'шорты', 'брюки', 'юбка'];
  function draw() {
    clear(board);
    board.style.gridTemplateColumns = `repeat(${st.a}, minmax(0, 1fr))`;
    for (let j = 0; j < st.b; j++) {
      for (let i = 0; i < st.a; i++) {
        board.append(h('div.outfit', h('span.outfit-top', { class: 'c' + i }, tops[i]), h('span.outfit-bottom', bottoms[j])));
      }
    }
    W.say(`Каждый столбец — одна футболка, каждая строка — один низ. Комплектов столько, сколько клеток в таблице: $${st.a} * ${st.b} = ${st.a * st.b}$.`);
  }
  W.controls.append(slider('футболок', 1, 5, a, (v) => ((st.a = v), draw())).el, slider('вариантов низа', 1, 4, b, (v) => ((st.b = v), draw())).el);
  draw();
  return W.el;
}
