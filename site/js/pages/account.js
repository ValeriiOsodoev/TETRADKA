// Вход, регистрация и личный кабинет.

import { h, clear, toast, plural } from '../dom.js';
import { sections, lessons, lessonById } from '../math/course.js';
import { groups, algos, algoById } from '../algo/catalog.js';
import * as store from '../store.js';
import { statusOf, statusMark } from './math.js';

function field(label, attrs, hint) {
  const input = h('input', attrs);
  const error = h('span.field-error', { role: 'alert' });
  const el = h('label.field', h('span.field-label', label), input, hint && h('span.field-hint', hint), error);
  return { el, input, error };
}

function showError(form, fields, err) {
  for (const f of Object.values(fields)) f.error.textContent = '';
  const target = err.field && fields[err.field];
  if (target) {
    target.error.textContent = err.message;
    target.input.focus();
  } else form.querySelector('.form-error').textContent = err.message;
}

function authPage(mode) {
  const isRegister = mode === 'register';
  const fields = {};
  if (isRegister) fields.name = field('Имя', { type: 'text', name: 'name', autocomplete: 'given-name', maxlength: 40, required: true }, 'Как к вам обращаться на сайте.');
  fields.login = field('Логин', { type: 'text', name: 'login', autocomplete: 'username', autocapitalize: 'off', spellcheck: 'false', maxlength: 24, required: true }, isRegister ? 'От 3 до 24 символов: буквы, цифры, точка, дефис, подчёркивание.' : null);
  fields.password = field('Пароль', { type: 'password', name: 'password', autocomplete: isRegister ? 'new-password' : 'current-password', minlength: 6, required: true }, isRegister ? 'Не короче 6 символов. Запишите его: почту мы не спрашиваем, поэтому восстановить забытый пароль не получится.' : null);
  const submit = h('button.btn.primary.large', { type: 'submit' }, isRegister ? 'Создать аккаунт' : 'Войти');
  const form = h('form.auth-form', { novalidate: true }, Object.values(fields).map((f) => f.el), h('p.form-error', { role: 'alert' }), submit);

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    form.querySelector('.form-error').textContent = '';
    submit.disabled = true;
    try {
      if (isRegister) await store.register(fields.login.input.value, fields.name.input.value, fields.password.input.value);
      else await store.login(fields.login.input.value, fields.password.input.value);
      location.hash = '#/me';
    } catch (err) {
      showError(form, fields, err);
    } finally {
      submit.disabled = false;
    }
  });

  const guest = store.state.progress.size;
  const el = h('div.page.narrow',
    h('h1', isRegister ? 'Новый аккаунт' : 'Вход'),
    h('p.lead', isRegister ? 'Аккаунт нужен для одного: чтобы пройденные темы и решения сохранялись и были доступны с любого устройства.' : 'Войдите, чтобы продолжить с того места, где остановились.'),
    guest > 0 && h('p.note', `В этом браузере уже есть прогресс по ${guest} ${plural(guest, 'теме', 'темам', 'темам')} — он перенесётся в аккаунт.`),
    !store.state.serverOk && h('p.note.warn', 'Сервер аккаунтов сейчас не отвечает. Учиться можно и без входа: прогресс сохранится в этом браузере.'),
    form,
    h('p.switch', isRegister ? 'Уже есть аккаунт? ' : 'Ещё нет аккаунта? ', h('a', { href: isRegister ? '#/login' : '#/register' }, isRegister ? 'Войти' : 'Создать')),
  );
  return { title: isRegister ? 'Новый аккаунт' : 'Вход', el };
}

export const loginPage = () => authPage('login');
export const registerPage = () => authPage('register');

// ---------------------------------------------------------- личный кабинет
const DAY = 86400000;

function topicOf(record) {
  if (record.kind === 'math') {
    const lesson = lessonById(record.id);
    return lesson && { title: lesson.title, where: lesson.section.title, href: `#/math/${lesson.id}?practice` };
  }
  const algo = algoById(record.id);
  return algo && { title: algo.title, where: 'Алгоритмы', href: `#/algo/${algo.id}?practice` };
}

function reason(record) {
  if (record.done && record.due !== null && record.due <= Date.now()) {
    const days = Math.max(1, Math.round((Date.now() - record.updated) / DAY));
    return `пройдено ${days} ${plural(days, 'день', 'дня', 'дней')} назад — пора освежить`;
  }
  if (!record.done && record.attempts) return `последний результат ${record.last}% — тема пока не засчитана`;
  if (record.last < store.PASS && record.attempts) return `последний результат ${record.last}%`;
  return 'отмечено вами';
}

function cellsRow(title, kind, items, hrefOf) {
  const done = items.filter((item) => store.rec(kind, item.id).done).length;
  return h('div.progress-row',
    h('span.progress-name', title),
    h('span.progress-cells', items.map((item) => {
      const status = statusOf(kind, item.id);
      return h('a.pcell', { href: hrefOf(item), class: status, title: item.title, 'aria-label': `${item.title}: ${status === 'done' ? 'пройдено' : status === 'review' ? 'пора повторить' : status === 'started' ? 'начато' : 'не начато'}` });
    })),
    h('span.progress-count', `${done} из ${items.length}`),
  );
}

export function cabinetPage() {
  const el = h('div.page.cabinet');

  function draw() {
    clear(el);
    const user = store.state.user;
    const review = store.reviewList().map((record) => ({ record, topic: topicOf(record) })).filter((x) => x.topic);
    const mathDone = lessons.filter((l) => store.rec('math', l.id).done).length;
    const algoDone = algos.filter((a) => store.rec('algo', a.id).done).length;

    el.append(
      h('header.page-head',
        h('h1', user ? user.name : 'Мой прогресс'),
        user
          ? h('p.lead', `Логин: ${user.login}. Прогресс сохраняется в аккаунте.`)
          : h('p.lead', 'Вы не вошли в аккаунт — прогресс хранится только в этом браузере и пропадёт, если очистить его данные. ', h('a', { href: '#/register' }, 'Создать аккаунт'), ' или ', h('a', { href: '#/login' }, 'войти'), '.'),
        h('div.head-row', h('span.count-pill', `Математика: ${mathDone} из ${lessons.length}`), h('span.count-pill', `Алгоритмы: ${algoDone} из ${algos.length}`)),
      ),
    );

    // что пора повторить
    const reviewSection = h('section.cab-section', h('h2', 'Пора повторить'));
    if (!review.length) {
      reviewSection.append(h('p.muted', mathDone + algoDone
        ? 'Сейчас повторять нечего. Пройденные темы будут появляться здесь через несколько дней — сначала через два, потом всё реже. Любую тему можно отметить на повтор самому: кнопка «Повторить позже» есть на её странице.'
        : 'Здесь появятся темы, к которым стоит вернуться: те, где тренировка не получилась, те, что давно пройдены, и те, что вы отметите сами.'));
    } else {
      const rows = h('ul.review-list');
      for (const { record, topic } of review) {
        const drop = h('button.btn.small', { type: 'button', title: 'Убрать из списка' }, 'Не сейчас');
        drop.addEventListener('click', () => {
          if (record.review) store.toggleReview(record.kind, record.id);
          else store.snooze(record.kind, record.id);
          draw();
        });
        rows.append(
          h('li',
            statusMark('review', false),
            h('span.review-main', h('a', { href: topic.href }, topic.title), h('span.review-why', `${topic.where}: ${reason(record)}`)),
            h('a.btn.small.primary', { href: topic.href }, 'Повторить'),
            drop,
          ),
        );
      }
      reviewSection.append(rows);
    }
    el.append(reviewSection);

    // карта прогресса
    el.append(
      h('section.cab-section',
        h('h2', 'Математика'),
        h('div.progress-table', sections.map((s) => cellsRow(s.title, 'math', s.lessons, (l) => `#/math/${l.id}`))),
        h('h2', 'Алгоритмы'),
        h('div.progress-table', groups.map((g) => cellsRow(g.title, 'algo', g.items, (a) => `#/algo/${a.id}`))),
        h('p.legend', h('span.pcell.done'), ' пройдено ', h('span.pcell.review'), ' пора повторить ', h('span.pcell.started'), ' начато ', h('span.pcell.new'), ' не начато'),
      ),
    );

    // настройки аккаунта
    const settings = h('section.cab-section', h('h2', user ? 'Аккаунт' : 'Данные'));
    if (user) {
      const name = h('input', { type: 'text', value: user.name, maxlength: 40, 'aria-label': 'Имя' });
      const nameForm = h('form.inline-form', h('label.field', h('span.field-label', 'Имя'), name), h('button.btn', { type: 'submit' }, 'Сохранить имя'));
      nameForm.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        try {
          await store.updateAccount({ name: name.value });
          toast('Имя сохранено');
          draw();
        } catch (err) {
          toast(err.message, 'bad');
        }
      });

      const oldPass = h('input', { type: 'password', autocomplete: 'current-password', 'aria-label': 'Текущий пароль' });
      const newPass = h('input', { type: 'password', autocomplete: 'new-password', minlength: 6, 'aria-label': 'Новый пароль' });
      const passForm = h('form.inline-form', h('label.field', h('span.field-label', 'Текущий пароль'), oldPass), h('label.field', h('span.field-label', 'Новый пароль'), newPass), h('button.btn', { type: 'submit' }, 'Сменить пароль'));
      passForm.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        try {
          await store.updateAccount({ password: oldPass.value, new_password: newPass.value });
          toast('Пароль изменён');
          oldPass.value = '';
          newPass.value = '';
        } catch (err) {
          toast(err.message, 'bad');
        }
      });

      const out = h('button.btn', { type: 'button' }, 'Выйти из аккаунта');
      out.addEventListener('click', async () => {
        await store.logout();
        location.hash = '#/';
      });
      settings.append(nameForm, passForm, h('div.inline-form', out));
    }

    const danger = h('div.danger');
    const resetBtn = h('button.btn', { type: 'button' }, 'Сбросить весь прогресс');
    resetBtn.addEventListener('click', () => confirmBox(danger, 'Все отметки о пройденных темах и сохранённые решения будут удалены. Вернуть их нельзя.', 'Да, сбросить', async () => {
      await store.resetProgress();
      toast('Прогресс сброшен');
      draw();
    }));
    danger.append(resetBtn);
    if (user) {
      const del = h('button.btn', { type: 'button' }, 'Удалить аккаунт');
      del.addEventListener('click', () => confirmBox(danger, 'Аккаунт и весь прогресс будут удалены с сервера навсегда. Для подтверждения введите пароль.', 'Удалить аккаунт', async (password) => {
        await store.deleteAccount(password);
        location.hash = '#/';
      }, true));
      danger.append(del);
    }
    settings.append(danger);
    el.append(settings);
  }

  draw();
  return { title: 'Личный кабинет', el };
}

/** Подтверждение опасного действия прямо на странице — без всплывающих окон браузера. */
function confirmBox(host, text, actionLabel, action, askPassword = false) {
  host.querySelector('.confirm')?.remove();
  const password = askPassword ? h('input', { type: 'password', autocomplete: 'current-password', 'aria-label': 'Пароль' }) : null;
  const error = h('span.field-error', { role: 'alert' });
  const yes = h('button.btn.danger-btn', { type: 'submit' }, actionLabel);
  const box = h('form.confirm', h('p', text), password, error, h('div.result-actions', yes, h('button.btn', { type: 'button', onclick: () => box.remove() }, 'Отмена')));
  box.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    yes.disabled = true;
    try {
      await action(password ? password.value : undefined);
    } catch (err) {
      error.textContent = err.message;
      yes.disabled = false;
    }
  });
  host.append(box);
  (password || yes).focus();
}

