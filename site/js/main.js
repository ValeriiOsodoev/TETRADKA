// Точка входа: шапка, подвал, переключение темы и переходы между страницами.

import { h, icon, clear, toast } from './dom.js';
import { SITE_NAME } from './config.js';
import * as store from './store.js';
import { homePage } from './pages/home.js';
import { mathMap, lessonPage } from './pages/math.js';
import { algoCatalog, algoPage, pythonPage } from './pages/algo.js';
import { loginPage, registerPage, cabinetPage } from './pages/account.js';

const main = document.getElementById('main');
const header = document.getElementById('header');
const footer = document.getElementById('footer');

// Адреса вида #/math/fractions. Порядок важен: точные совпадения раньше шаблонов.
const routes = [
  [/^\/?$/, homePage],
  [/^\/math$/, mathMap],
  [/^\/math\/([a-z0-9-]+)$/, (m) => lessonPage({ id: m[1] })],
  [/^\/algo$/, algoCatalog],
  [/^\/algo\/python$/, pythonPage],
  [/^\/algo\/([a-z0-9-]+)$/, (m) => algoPage({ id: m[1] })],
  [/^\/login$/, loginPage],
  [/^\/register$/, registerPage],
  [/^\/me$/, cabinetPage],
];

function notFound() {
  return {
    title: 'Страница не найдена',
    el: h('div.page.narrow', h('h1', 'Такой страницы нет'), h('p.lead', 'Возможно, адрес набран с ошибкой или тема переехала.'), h('p', h('a.btn.primary', { href: '#/' }, 'На главную'))),
  };
}

let current = null;

function render() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  let page = null;
  for (const [pattern, make] of routes) {
    const m = path.match(pattern);
    if (m) {
      page = make(m);
      break;
    }
  }
  if (!page) page = notFound();
  if (current && current.onLeave) current.onLeave();
  current = page;
  clear(main).append(page.el);
  document.title = page.title ? `${page.title} — ${SITE_NAME}` : `${SITE_NAME} — математика и алгоритмы с самого начала`;
  drawHeader(path);
  const target = query === 'practice' ? document.getElementById('practice') || document.getElementById('part-code') : null;
  if (target) target.scrollIntoView({ block: 'start' });
  else window.scrollTo(0, 0);
}

function navigate(restoreFocus) {
  render();
  if (restoreFocus) main.focus({ preventScroll: true });
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('tetradka.theme', theme);
  } catch {
    /* не страшно: тема просто не запомнится */
  }
  drawHeader((location.hash.replace(/^#/, '') || '/').split('?')[0]);
}

function drawHeader(path) {
  const dark = document.documentElement.dataset.theme === 'dark';
  const user = store.state.user;
  const link = (href, label) => h('a', { href, 'aria-current': path === href.slice(1) || path.startsWith(href.slice(1) + '/') ? 'page' : null }, label);
  clear(header).append(
    h('div.header-inner',
      h('a.brand', { href: '#/', 'aria-label': `${SITE_NAME} — на главную` }, h('span.brand-mark', { 'aria-hidden': 'true' }), SITE_NAME),
      h('nav.main-nav', { 'aria-label': 'Разделы' }, link('#/math', 'Математика'), link('#/algo', 'Алгоритмы')),
      h('div.header-tools',
        h('button.tool', { type: 'button', 'aria-label': dark ? 'Светлая тема' : 'Тёмная тема', title: dark ? 'Светлая тема' : 'Тёмная тема', onclick: () => setTheme(dark ? 'light' : 'dark') }, icon(dark ? 'sun' : 'moon', 18)),
        user
          ? h('a.account', { href: '#/me', 'aria-current': path === '/me' ? 'page' : null }, icon('user', 18), h('span', user.name))
          : h('span.account-links', h('a.account', { href: '#/me', 'aria-current': path === '/me' ? 'page' : null }, 'Прогресс'), h('a.btn.small.primary', { href: '#/login' }, 'Войти')),
      ),
    ),
  );
}

function drawFooter() {
  clear(footer).append(
    h('div.footer-inner',
      h('p', `${SITE_NAME} — бесплатный учебный сайт по математике и алгоритмам.`),
      h('p.footer-links', h('a', { href: '#/math' }, 'Математика'), h('a', { href: '#/algo' }, 'Алгоритмы'), h('a', { href: '#/algo/python' }, 'Основы Python'), h('a', { href: '#/me' }, 'Мой прогресс')),
    ),
  );
}

window.addEventListener('hashchange', () => navigate(true));
window.addEventListener('save-failed', () => toast('Не удалось сохранить прогресс на сервере. Он сохранён в браузере и отправится позже.', 'bad'));

drawFooter();
drawHeader('/');
store.init().then(() => {
  render();
  // после входа и выхода шапку нужно перерисовать
  store.onChange(() => drawHeader((location.hash.replace(/^#/, '') || '/').split('?')[0]));
});
