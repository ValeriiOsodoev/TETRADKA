// Раздел «Алгоритмы»: каталог, страница алгоритма с анимацией и тренажёром, основы Python.

import { h, t, icon, clear, append, inline, plural } from '../dom.js';
import { groups, algos, algoById } from '../algo/catalog.js';
import { pyBasics } from '../algo/pybasics.js';
import { visualizer } from '../algo/viz.js';
import { editor } from '../algo/editor.js';
import { runPython, watchPython, warmUp, explainError } from '../algo/runner.js';
import { RUN_TIMEOUT } from '../config.js';
import { state, rec, needsReview, finishPractice, toggleReview, patchData, countAttempt } from '../store.js';
import { statusOf, statusMark, renderBlocks } from './math.js';

const STATUS_TEXT = { review: 'пора повторить', done: 'решено', started: 'начато', new: 'не начато' };

// ----------------------------------------------------------------- каталог
export function algoCatalog() {
  const done = algos.filter((a) => rec('algo', a.id).done).length;
  const list = h('ol.sections');
  for (const group of groups) {
    const rows = h('ol.lesson-list');
    for (const algo of group.items) {
      rows.append(
        h('li',
          h('a.lesson-row', { href: `#/algo/${algo.id}` },
            statusMark(statusOf('algo', algo.id)),
            h('span.lesson-title', algo.title),
            h('span.lesson-blurb', algo.blurb),
          ),
        ),
      );
    }
    const n = group.items.length;
    list.append(
      h('li.section',
        h('div.section-margin', h('span.grade', `${n} ${plural(n, 'алгоритм', 'алгоритма', 'алгоритмов')}`)),
        h('div.section-body', h('div.section-head', h('h2', group.title)), rows),
      ),
    );
  }
  const head = h('header.page-head',
    h('h1', 'Алгоритмы'),
    h('p.lead', 'Каждый алгоритм разобран в четыре шага: идея простыми словами, анимация по шагам, своё решение на Python с автоматической проверкой и примеры из жизни.'),
    h('div.head-row',
      h('span.count-pill', `Решено ${done} из ${algos.length}`),
      h('a.btn', { href: '#/algo/python' }, 'Не знакомы с Python? Основы за 15 минут'),
    ),
  );
  return { title: 'Алгоритмы', el: h('div.page.ruled', head, list) };
}

// ------------------------------------------------------ показ значений Python
function pyRepr(value) {
  if (value === null || value === undefined) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (typeof value === 'string') return `'${value}'`;
  if (Array.isArray(value)) return `[${value.map(pyRepr).join(', ')}]`;
  if (typeof value === 'object') return `{${Object.entries(value).map(([k, v]) => `'${k}': ${pyRepr(v)}`).join(', ')}}`;
  return String(value);
}
const shorten = (text, max = 90) => (text.length > max ? text.slice(0, max - 1) + '…' : text);

function errorBox(error) {
  const info = explainError(error);
  return h('div.run-error', h('p.run-error-title', info.title), info.hint && t('p', info.hint));
}

function pythonNotice() {
  const el = h('p.py-status', { 'aria-live': 'polite' });
  const stop = watchPython((status) => {
    el.hidden = status !== 'loading' && status !== 'failed';
    el.className = 'py-status ' + status;
    el.textContent = status === 'loading'
      ? 'Загружаем Python. Это нужно один раз, около 10 МБ — дальше код будет запускаться сразу.'
      : 'Не получилось загрузить Python. Проверьте соединение с интернетом и запустите ещё раз.';
  });
  return { el, stop };
}

const TIMEOUT_TEXT = `Программа работала дольше ${RUN_TIMEOUT / 1000} секунд и была остановлена. Скорее всего, где-то бесконечный цикл: проверьте, что условие \`while\` когда-нибудь становится ложным, а индексы меняются.`;

// ---------------------------------------------------------------- тренажёр
function trainer(algo, onProgress) {
  const cleanups = [];
  const saved = rec('algo', algo.id).data || {};
  const codes = { ...(saved.code || {}) };
  const solved = [...(saved.solved || [])];
  let current = 0;
  let failures = 0;
  let hintsShown = 0;
  let saveTimer = null;

  const tabs = h('div.task-tabs', { role: 'tablist' });
  const text = h('div.task-text');
  const out = h('div.run-out', { 'aria-live': 'polite' });
  const hintBox = h('div.hints');
  const notice = pythonNotice();
  cleanups.push(notice.stop);

  const ed = editor({
    value: '',
    onChange(value) {
      codes[current] = value;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => patchData('algo', algo.id, { code: { ...codes } }), 900);
    },
  });
  ed.el.addEventListener('focusin', warmUp, { once: true });

  const checkBtn = h('button.btn.primary', { type: 'button' }, 'Проверить');
  const runBtn = h('button.btn', { type: 'button' }, 'Запустить');
  const hintBtn = h('button.btn.icon-btn', { type: 'button' }, icon('lamp', 16), 'Подсказка');
  const solutionBtn = h('button.btn', { type: 'button' }, 'Показать решение');
  const resetBtn = h('button.btn', { type: 'button' }, 'Сбросить код');

  const task = () => algo.tasks[current];

  function drawTabs() {
    clear(tabs);
    algo.tasks.forEach((item, i) => {
      const b = h('button.task-tab', { type: 'button', role: 'tab', 'aria-selected': String(i === current) }, solved[i] && icon('check', 14), `${i + 1}. ${item.title}`);
      b.addEventListener('click', () => select(i));
      tabs.append(b);
    });
  }

  function drawHints() {
    clear(hintBox);
    task().hints.slice(0, hintsShown).forEach((hint, i) => hintBox.append(h('p.hint', h('b', `Подсказка ${i + 1}. `), h('span', { html: inline(hint) }))));
    const left = task().hints.length - hintsShown;
    hintBtn.disabled = left <= 0;
    clear(hintBtn).append(icon('lamp', 16), left > 0 ? `Подсказка (осталось ${left})` : 'Подсказки закончились');
  }

  function select(i) {
    current = i;
    failures = 0;
    hintsShown = 0;
    clear(text).append(t('p', task().text));
    ed.value = codes[i] ?? task().starter;
    clear(out);
    drawTabs();
    drawHints();
  }

  function busy(flag) {
    for (const b of [checkBtn, runBtn]) b.disabled = flag;
    checkBtn.textContent = flag ? 'Выполняется…' : 'Проверить';
  }

  function showFailure(result) {
    if (result.busy) return true;
    if (result.loadFailed) {
      clear(out);
      return true;
    }
    if (result.timeout) {
      clear(out).append(h('div.run-error', t('p', TIMEOUT_TEXT)));
      return true;
    }
    return false;
  }

  const stdoutBlock = (result) => (result.stdout ? [h('p.run-label', 'Вывод программы'), h('pre.run-stdout', result.stdout)] : []);

  async function runTests() {
    busy(true);
    const result = await runPython({ code: ed.value, mode: 'test', fn: task().fn, tests: task().tests });
    busy(false);
    if (showFailure(result)) return;
    clear(out);
    if (result.error) {
      ed.markError(result.error.line);
      out.append(errorBox(result.error), ...stdoutBlock(result));
      failures += 1;
      countAttempt('algo', algo.id);
      return;
    }
    const passed = result.tests.filter((x) => x.ok).length;
    const total = result.tests.length;
    const rows = h('ul.test-list');
    result.tests.forEach((item) => {
      const call = shorten(`${task().fn}(${item.args.map(pyRepr).join(', ')})`);
      const row = h('li', { class: item.ok ? 'ok' : 'bad' }, icon(item.ok ? 'check' : 'cross', 14), h('code', call));
      if (item.ok) row.append(h('span', ' → ', h('code', shorten(pyRepr(item.got), 60))));
      else if (item.error) {
        const info = explainError(item.error);
        row.append(h('span.test-detail', info.title));
      } else row.append(h('span.test-detail', 'ожидалось ', h('code', shorten(pyRepr(item.want), 60)), ', получено ', h('code', shorten(pyRepr(item.got), 60))));
      rows.append(row);
    });
    if (result.ok) {
      const first = !solved[current];
      solved[current] = true;
      patchData('algo', algo.id, { code: { ...codes, [current]: ed.value }, solved: [...solved] });
      if (current === 0) finishPractice('algo', algo.id, 100);
      const nextAlgo = algos[algo.index + 1];
      out.append(
        h('div.result.ok',
          h('p.result-score', `Все тесты пройдены: ${total} из ${total}`),
          current === 0 && algo.tasks.length > 1
            ? h('p', first ? 'Алгоритм засчитан. Теперь попробуйте применить его в задаче посложнее.' : 'Решение по-прежнему верное.')
            : h('p', 'Задача решена.'),
          !state.user && first && h('p.muted', 'Сейчас прогресс хранится только в этом браузере. ', h('a', { href: '#/register' }, 'Создайте аккаунт'), ', чтобы он не потерялся.'),
          h('div.result-actions',
            current + 1 < algo.tasks.length && h('button.btn.primary', { type: 'button', onclick: () => select(current + 1) }, `Дальше: ${algo.tasks[current + 1].title}`),
            (current + 1 >= algo.tasks.length || solved[current + 1]) && nextAlgo && h('a.btn', { href: `#/algo/${nextAlgo.id}` }, `Следующий алгоритм: ${nextAlgo.title}`),
          ),
        ),
      );
      drawTabs();
      onProgress();
    } else {
      failures += 1;
      countAttempt('algo', algo.id);
      const firstBad = result.tests.find((x) => !x.ok);
      if (firstBad && firstBad.error) ed.markError(firstBad.error.line);
      out.append(h('p.run-summary.bad', `Пройдено ${passed} из ${total}. Посмотрите на первый красный тест — на нём проще всего найти ошибку.`));
    }
    out.append(rows, ...stdoutBlock(result));
  }

  async function runFree() {
    busy(true);
    const result = await runPython({ code: ed.value, mode: 'run' });
    busy(false);
    if (showFailure(result)) return;
    clear(out);
    if (result.error) {
      ed.markError(result.error.line);
      out.append(errorBox(result.error), ...stdoutBlock(result));
      return;
    }
    if (result.stdout) out.append(...stdoutBlock(result));
    else {
      const sample = task().tests[0];
      out.append(t('p.run-summary', `Программа выполнилась без ошибок, но ничего не вывела. Чтобы увидеть результат, вызовите функцию и напечатайте ответ — допишите в конец строку: \`print(${task().fn}(${sample.args.map(pyRepr).join(', ')}))\``));
    }
  }

  checkBtn.addEventListener('click', runTests);
  runBtn.addEventListener('click', runFree);
  hintBtn.addEventListener('click', () => {
    hintsShown += 1;
    drawHints();
  });
  resetBtn.addEventListener('click', () => {
    delete codes[current];
    ed.value = task().starter;
    patchData('algo', algo.id, { code: { ...codes } });
    clear(out);
  });
  solutionBtn.addEventListener('click', () => {
    clear(out).append(
      h('div.solution',
        h('p', failures >= 2 || solved[current] ? 'Один из вариантов решения:' : 'Решение лучше смотреть после пары честных попыток — так оно запомнится. Но если застряли, вот один из вариантов:'),
        h('pre.run-stdout', task().solution),
        h('p.muted', 'Разберите его по строкам, затем сбросьте код и напишите своё решение, не подглядывая.'),
      ),
    );
  });

  select(0);

  const el = h('div.trainer',
    tabs, text,
    ed.el,
    h('p.ed-help', 'Tab — отступ. Чтобы уйти из редактора с клавиатуры, нажмите Esc, затем Tab.'),
    h('div.trainer-actions', checkBtn, runBtn, hintBtn, solutionBtn, resetBtn),
    notice.el, hintBox, out,
  );
  return {
    el,
    destroy() {
      clearTimeout(saveTimer);
      cleanups.forEach((fn) => fn());
    },
  };
}

// -------------------------------------------------------- страница алгоритма
export function algoPage({ id }) {
  const algo = algoById(id);
  if (!algo) return null;
  const prev = algos[algo.index - 1];
  const next = algos[algo.index + 1];

  const meta = h('div.lesson-meta');
  function drawMeta() {
    clear(meta);
    const r = rec('algo', algo.id);
    const status = statusOf('algo', algo.id);
    const flag = h('button.btn.small', { type: 'button', 'aria-pressed': String(r.review) }, icon('flag', 16), r.review ? 'Отмечено на повтор' : 'Повторить позже');
    flag.addEventListener('click', () => {
      toggleReview('algo', algo.id);
      drawMeta();
    });
    append(meta, [
      h('span.chip-grade', algo.group.title),
      h('span.status', { class: status }, statusMark(status, false), STATUS_TEXT[status]),
      needsReview(r) && r.done && h('span.muted', 'Чтобы повторить, сбросьте код в тренажёре и напишите решение заново.'),
      flag,
    ]);
  }
  drawMeta();

  const viz = visualizer(algo.viz, algo.code);
  const train = trainer(algo, drawMeta);

  const parts = [
    ['idea', 'Идея'],
    ['viz', 'Как это работает'],
    ['code', 'Напишите сами'],
    ['uses', 'Где это пригодится'],
  ];
  const jump = (key) => () => document.getElementById(`part-${key}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
  const stepsNav = h('ol.steps-nav', parts.map(([key, label]) => h('li', h('button', { type: 'button', onclick: jump(key) }, label))));

  const el = h('article.page.sheet.wide',
    h('nav.crumbs', { 'aria-label': 'Где вы находитесь' }, h('a', { href: '#/algo' }, 'Алгоритмы'), h('span', ' / '), h('span', algo.group.title)),
    h('header.lesson-head', h('h1', algo.title), h('p.lead', algo.blurb), meta, stepsNav),
    h('section.part', { id: 'part-idea' },
      h('h2.part-title', 'Идея'),
      h('div.lesson-body', renderBlocks(algo.theory), h('div.block.cost', h('div.block-label', 'Скорость'), h('div.block-body', t('p', algo.cost)))),
    ),
    h('section.part', { id: 'part-viz' },
      h('h2.part-title', 'Как это работает'),
      h('p.part-sub', 'Справа — код на Python, слева — данные. Подсвеченная строка выполняется прямо сейчас. Идите по шагам или нажмите «Пуск»; данные можно заменить своими.'),
      viz.el,
    ),
    h('section.part', { id: 'part-code' },
      h('h2.part-title', 'Напишите сами'),
      h('p.part-sub', 'Код запускается прямо в браузере. «Проверить» вызывает вашу функцию на нескольких наборах данных и сравнивает ответы.'),
      train.el,
    ),
    h('section.part', { id: 'part-uses' },
      h('h2.part-title', 'Где это пригодится'),
      h('ul.uses', algo.uses.map((use) => t('li', use))),
    ),
    h('nav.pager', { 'aria-label': 'Соседние алгоритмы' },
      prev ? h('a.pager-link', { href: `#/algo/${prev.id}` }, icon('left', 16), h('span', h('small', 'Предыдущий'), prev.title)) : h('span'),
      next ? h('a.pager-link.next', { href: `#/algo/${next.id}` }, h('span', h('small', 'Следующий'), next.title), icon('right', 16)) : h('span'),
    ),
  );
  return {
    title: algo.title,
    el,
    onLeave() {
      viz.destroy();
      train.destroy();
    },
  };
}

// ------------------------------------------------------------ основы Python
function runBox(code) {
  const ed = editor({ value: code });
  ed.el.addEventListener('focusin', warmUp, { once: true });
  const out = h('div.run-out', { 'aria-live': 'polite' });
  const btn = h('button.btn.primary.icon-btn', { type: 'button' }, icon('play', 14), 'Запустить');
  const back = h('button.btn', { type: 'button', onclick: () => ((ed.value = code), clear(out)) }, 'Вернуть как было');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const result = await runPython({ code: ed.value, mode: 'run' });
    btn.disabled = false;
    if (result.busy || result.loadFailed) return;
    clear(out);
    if (result.timeout) return void out.append(h('div.run-error', t('p', TIMEOUT_TEXT)));
    if (result.stdout) out.append(h('pre.run-stdout', result.stdout));
    if (result.error) {
      ed.markError(result.error.line);
      out.append(errorBox(result.error));
    } else if (!result.stdout) out.append(h('p.run-summary', 'Программа выполнилась, но ничего не вывела: в ней нет ни одного print.'));
  });
  return h('div.runbox', ed.el, h('div.trainer-actions', btn, back), out);
}

export function pythonPage() {
  const notice = pythonNotice();
  const cards = pyBasics.map((card, i) =>
    h('section.py-card',
      h('h2', `${i + 1}. ${card.title}`),
      card.text.map((line) => t('p', line)),
      runBox(card.code),
      t('p.try-it', `**Попробуйте.** ${card.tryIt}`),
    ),
  );
  const el = h('article.page.sheet.wide',
    h('nav.crumbs', h('a', { href: '#/algo' }, 'Алгоритмы'), h('span', ' / '), h('span', 'Подготовка')),
    h('header.lesson-head',
      h('h1', 'Основы Python'),
      h('p.lead', 'Восемь коротких шагов — ровно столько, сколько нужно, чтобы читать код алгоритмов и писать свой. Каждый пример можно менять и запускать прямо здесь.'),
    ),
    notice.el,
    cards,
    h('nav.pager', h('span'), h('a.pager-link.next', { href: `#/algo/${algos[0].id}` }, h('span', h('small', 'Первый алгоритм'), algos[0].title), icon('right', 16))),
  );
  return { title: 'Основы Python', el, onLeave: notice.stop };
}
