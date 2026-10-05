// Раздел «Математика»: карта тем, страница урока и тренировка.

import { h, t, icon, clear, append, plural } from '../dom.js';
import { sections, lessons, lessonById } from '../math/course.js';
import { widgets } from '../math/widgets.js';
import { check, answerText, placeholder } from '../math/tasks.js';
import { state, rec, needsReview, finishPractice, toggleReview, PASS } from '../store.js';

export function statusOf(kind, id) {
  const r = rec(kind, id);
  if (needsReview(r)) return 'review';
  if (r.done) return 'done';
  if (r.attempts) return 'started';
  return 'new';
}

const STATUS_TEXT = { review: 'пора повторить', done: 'пройдено', started: 'начато', new: 'не начато' };

/** Клетка-отметка. spoken = false, если рядом уже есть подпись словами. */
export function statusMark(status, spoken = true) {
  const el = h('span.mark', { class: status, title: spoken ? STATUS_TEXT[status] : null, 'aria-hidden': spoken ? null : 'true' });
  if (status === 'done') el.append(icon('check', 14));
  if (status === 'review') el.append(icon('repeat', 14));
  if (spoken) el.append(h('span.sr', STATUS_TEXT[status]));
  return el;
}

/** Первая тема, которая ещё не пройдена, — её предлагаем на главной и в карте. */
export function nextLesson() {
  return lessons.find((lesson) => !rec('math', lesson.id).done) || null;
}

// --------------------------------------------------------------- карта тем
export function mathMap() {
  const done = lessons.filter((lesson) => rec('math', lesson.id).done).length;
  const upNext = nextLesson();

  const list = h('ol.sections');
  for (const section of sections) {
    const rows = h('ol.lesson-list');
    for (const lesson of section.lessons) {
      const status = statusOf('math', lesson.id);
      rows.append(
        h('li',
          h('a.lesson-row', { href: `#/math/${lesson.id}`, class: lesson === upNext ? 'up-next' : '' },
            statusMark(status),
            h('span.lesson-title', lesson.title),
            h('span.lesson-blurb', lesson.blurb),
          ),
        ),
      );
    }
    const sectionDone = section.lessons.filter((lesson) => rec('math', lesson.id).done).length;
    list.append(
      h('li.section',
        h('div.section-margin', h('span.grade', section.grade)),
        h('div.section-body',
          h('div.section-head', h('h2', section.title), h('span.section-count', `${sectionDone} из ${section.lessons.length}`)),
          rows,
        ),
      ),
    );
  }

  const head = h('header.page-head',
    h('h1', 'Математика'),
    h('p.lead', 'Одна дорожка от счёта до производной. Каждая тема опирается на предыдущие: если что-то непонятно, вернитесь на шаг назад — пробел почти всегда там.'),
    h('div.head-row',
      h('span.count-pill', `Пройдено ${done} из ${lessons.length}`),
      upNext && h('a.btn.primary', { href: `#/math/${upNext.id}` }, done ? `Продолжить: ${upNext.title}` : 'Начать с первой темы'),
    ),
  );

  return { title: 'Математика', el: h('div.page.ruled', head, list) };
}

// ------------------------------------------------------------ блоки урока
function exampleBlock(block, number) {
  const steps = h('ol.ex-steps');
  const answer = block.a ? t('p.ex-answer', `Ответ: ${block.a}`) : null;
  let shown = 0;
  const more = h('button.btn.small', { type: 'button' }, 'Показать решение');
  const reveal = () => {
    if (shown < block.steps.length) {
      steps.append(t('li', block.steps[shown]));
      shown += 1;
    }
    if (shown >= block.steps.length) {
      if (answer) body.append(answer);
      more.remove();
    } else {
      more.textContent = 'Следующий шаг';
    }
  };
  more.addEventListener('click', reveal);
  const body = h('div.block-body', t('p.ex-q', block.q), steps, more);
  return h('div.block.example', h('div.block-label', `Пример ${number}`), body);
}

export function renderBlocks(blocks) {
  const out = [];
  let exampleNo = 0;
  for (const block of blocks) {
    switch (block.t) {
      case 'p':
        out.push(t('p', block.text));
        break;
      case 'sub':
        out.push(t('h2', block.text));
        break;
      case 'rule':
        out.push(h('div.block.rule', h('div.block-label', 'Правило'), h('div.block-body', t('p', block.text))));
        break;
      case 'formula':
        out.push(t('div.formula', block.text));
        break;
      case 'list':
        out.push(h('ul.plain', block.items.map((item) => t('li', item))));
        break;
      case 'tip':
        out.push(h('div.block.tip', h('div.block-label', 'Совет'), h('div.block-body', t('p', block.text))));
        break;
      case 'warn':
        out.push(h('div.block.warn', h('div.block-label', 'Осторожно'), h('div.block-body', t('p', block.text))));
        break;
      case 'ex':
        exampleNo += 1;
        out.push(exampleBlock(block, exampleNo));
        break;
      case 'w': {
        const make = widgets[block.name];
        const figure = h('figure.figure', make ? make(block.props) : h('p', `Нет картинки «${block.name}»`));
        if (block.caption) figure.append(t('figcaption', block.caption));
        out.push(figure);
        break;
      }
      default:
        break;
    }
  }
  return out;
}

// --------------------------------------------------------------- тренировка
function practice(lesson, onFinish) {
  const total = lesson.n || 6;
  const need = Math.ceil((total * PASS) / 100);
  const cells = h('div.cells', { 'aria-hidden': 'true' });
  const area = h('div.task-area');
  const root = h('section.practice', { id: 'practice' },
    h('h2', 'Тренировка'),
    h('p.practice-sub', `${total} ${plural(total, 'задача', 'задачи', 'задач')}, каждый раз новые. Тема засчитывается, если верных ответов не меньше ${need}.`),
    cells,
    area,
  );
  let index = 0;
  let results = [];

  function drawCells() {
    clear(cells);
    for (let i = 0; i < total; i++) {
      const cls = i < results.length ? (results[i] ? 'ok' : 'bad') : i === index ? 'now' : '';
      cells.append(h('span.cell-mark', { class: cls }));
    }
  }

  function start() {
    index = 0;
    results = [];
    showTask();
  }

  function showTask() {
    drawCells();
    clear(area);
    const gen = lesson.tasks[Math.floor((index * lesson.tasks.length) / total)];
    const task = gen();
    const feedback = h('div.feedback', { role: 'status', 'aria-live': 'polite' });
    const nextBtn = h('button.btn.primary', { type: 'button' }, index === total - 1 ? 'Показать результат' : 'Дальше');
    nextBtn.addEventListener('click', () => {
      index += 1;
      if (index >= total) finish();
      else showTask();
    });

    const settle = (ok) => {
      results.push(ok);
      drawCells();
      clear(feedback);
      feedback.className = 'feedback ' + (ok ? 'ok' : 'bad');
      append(feedback, [
        h('p.verdict', ok ? 'Верно.' : h('span', { html: `Неверно. Правильный ответ: ${t('span', answerText(task)).innerHTML}` })),
        task.why && t('p.why', task.why),
        nextBtn,
      ]);
      nextBtn.focus({ preventScroll: true });
    };

    area.append(h('p.task-no', `Задача ${index + 1} из ${total}`), t('p.task-q', task.q));

    if (task.type === 'choice') {
      const options = h('div.options');
      task.options.forEach((option, i) => {
        const b = t('button.option', option, { type: 'button' });
        b.addEventListener('click', () => {
          for (const other of options.children) other.disabled = true;
          const ok = check(task, i).ok;
          b.classList.add(ok ? 'ok' : 'bad');
          if (!ok) options.children[task.a].classList.add('ok');
          settle(ok);
        });
        options.append(b);
      });
      area.append(options, feedback);
    } else {
      const input = h('input.answer', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: placeholder(task), 'aria-label': 'Ваш ответ' });
      const submit = h('button.btn.primary', { type: 'submit' }, 'Проверить');
      const form = h('form.answer-row', input, task.unit && h('span.unit', task.unit), submit);
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        if (input.disabled || !input.value.trim()) return;
        const res = check(task, input.value);
        if (res.soft) {
          feedback.className = 'feedback soft';
          clear(feedback).append(h('p', res.soft));
          return;
        }
        input.disabled = true;
        submit.disabled = true;
        input.classList.add(res.ok ? 'ok' : 'bad');
        settle(res.ok);
      });
      area.append(form, feedback);
      if (index > 0) input.focus({ preventScroll: true });
    }
  }

  function finish() {
    const correct = results.filter(Boolean).length;
    const percent = Math.round((correct / total) * 100);
    const record = finishPractice('math', lesson.id, percent);
    const passed = percent >= PASS;
    drawCells();
    clear(area);
    const next = lessons[lesson.index + 1];
    const again = h('button.btn', { type: 'button', onclick: start }, passed ? 'Решить ещё раз' : 'Попробовать ещё раз');
    const days = record.due ? Math.max(1, Math.round((record.due - Date.now()) / 86400000)) : 0;
    area.append(
      h('div.result', { class: passed ? 'ok' : 'bad' },
        h('p.result-score', `Верно ${correct} из ${total}`),
        passed
          ? h('p', `Тема пройдена. Чтобы она не забылась, через ${days} ${plural(days, 'день', 'дня', 'дней')} она появится в списке на повторение.`)
          : h('p', `Пока не засчитано: нужно ${need} из ${total}. Перечитайте объяснение и разобранные примеры — и попробуйте снова, задачи будут другие.`),
        !state.user && passed && h('p.muted', 'Сейчас прогресс хранится только в этом браузере. ', h('a', { href: '#/register' }, 'Создайте аккаунт'), ', чтобы он не потерялся.'),
        h('div.result-actions',
          passed && next && h('a.btn.primary', { href: `#/math/${next.id}` }, `Дальше: ${next.title}`),
          passed && !next && h('a.btn.primary', { href: '#/algo' }, 'Перейти к алгоритмам'),
          again,
          !passed && h('button.btn', { type: 'button', onclick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) }, 'К объяснению'),
        ),
      ),
    );
    onFinish();
  }

  start();
  return root;
}

// ------------------------------------------------------------ страница урока
export function lessonPage({ id }) {
  const lesson = lessonById(id);
  if (!lesson) return null;
  const prev = lessons[lesson.index - 1];
  const next = lessons[lesson.index + 1];

  const meta = h('div.lesson-meta');
  function drawMeta() {
    clear(meta);
    const r = rec('math', lesson.id);
    const status = statusOf('math', lesson.id);
    const flag = h('button.btn.small', { type: 'button', 'aria-pressed': String(r.review) }, icon('flag', 16), r.review ? 'Отмечено на повтор' : 'Повторить позже');
    flag.addEventListener('click', () => {
      toggleReview('math', lesson.id);
      drawMeta();
    });
    meta.append(
      h('span.chip-grade', lesson.section.grade),
      h('span.status', { class: status }, statusMark(status, false), r.attempts ? `${STATUS_TEXT[status]}, лучший результат ${r.best}%` : STATUS_TEXT[status]),
      flag,
    );
  }
  drawMeta();

  const el = h('article.page.sheet',
    h('nav.crumbs', { 'aria-label': 'Где вы находитесь' }, h('a', { href: '#/math' }, 'Математика'), h('span', ' / '), h('span', lesson.section.title)),
    h('header.lesson-head', h('h1', lesson.title), h('p.lead', lesson.blurb), meta),
    h('div.lesson-body', renderBlocks(lesson.body)),
    practice(lesson, drawMeta),
    h('nav.pager', { 'aria-label': 'Соседние темы' },
      prev ? h('a.pager-link', { href: `#/math/${prev.id}` }, icon('left', 16), h('span', h('small', 'Предыдущая тема'), prev.title)) : h('span'),
      next ? h('a.pager-link.next', { href: `#/math/${next.id}` }, h('span', h('small', 'Следующая тема'), next.title), icon('right', 16)) : h('span'),
    ),
  );
  return { title: lesson.title, el };
}
