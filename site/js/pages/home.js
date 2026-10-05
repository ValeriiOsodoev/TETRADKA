// Главная страница.

import { h, plural } from '../dom.js';
import { sections, lessons } from '../math/course.js';
import { groups, algos, algoById } from '../algo/catalog.js';
import { miniPlayer } from '../algo/viz.js';
import { rec, reviewList } from '../store.js';
import { nextLesson } from './math.js';

export function homePage() {
  const demoAlgo = algoById('bubble-sort');
  const demo = miniPlayer(demoAlgo.viz, demoAlgo.code, { arr: [34, 12, 51, 7, 28, 45] });

  const mathDone = lessons.filter((l) => rec('math', l.id).done).length;
  const algoDone = algos.filter((a) => rec('algo', a.id).done).length;
  const upNext = nextLesson();
  const due = reviewList().length;
  const started = mathDone + algoDone > 0;

  const hero = h('section.hero',
    h('div.hero-text',
      h('h1', 'Математика с первого класса и алгоритмы на Python'),
      h('p.lead', 'Короткие объяснения, картинки, которые можно покрутить руками, и задачи с проверкой. Можно начать с самого начала или с той темы, где появился пробел.'),
      h('div.hero-actions',
        h('a.btn.primary.large', { href: started && upNext ? `#/math/${upNext.id}` : '#/math' }, started && upNext ? `Продолжить: ${upNext.title}` : 'Начать с математики'),
        h('a.btn.large', { href: '#/algo' }, 'Перейти к алгоритмам'),
      ),
      h('p.hero-note', 'Бесплатно. Регистрация не обязательна — она нужна только чтобы сохранять прогресс.'),
    ),
    h('figure.hero-demo',
      demo.el,
      h('figcaption', 'Сортировка пузырьком, шаг за шагом. Так на сайте разобран каждый алгоритм — ', h('a', { href: '#/algo/bubble-sort' }, 'открыть этот'), '.'),
    ),
  );

  const status = started
    ? h('section.home-status',
        h('span', `Математика: ${mathDone} из ${lessons.length}`),
        h('span', `Алгоритмы: ${algoDone} из ${algos.length}`),
        due ? h('a', { href: '#/me' }, `Пора повторить: ${due} ${plural(due, 'тема', 'темы', 'тем')}`) : h('span.muted', 'Повторять пока нечего'),
      )
    : null;

  const mathCol = h('section.home-col',
    h('h2', h('a', { href: '#/math' }, 'Математика')),
    h('p', `${lessons.length} тем подряд — от цифр и счёта до производной. Каждая опирается на предыдущие.`),
    h('ol.home-list', sections.map((s) => h('li', h('a', { href: `#/math/${s.lessons[0].id}` }, h('span.home-item', s.title), h('span.home-meta', s.grade))))),
  );
  const algoCol = h('section.home-col',
    h('h2', h('a', { href: '#/algo' }, 'Алгоритмы')),
    h('p', `${algos.length} алгоритмов с анимацией и тренажёром. Python запускается прямо в браузере — ничего устанавливать не нужно.`),
    h('ol.home-list', [
      h('li', h('a', { href: '#/algo/python' }, h('span.home-item', 'Основы Python'), h('span.home-meta', 'подготовка'))),
      ...groups.map((g) => h('li', h('a', { href: `#/algo/${g.items[0].id}` }, h('span.home-item', g.title), h('span.home-meta', `${g.items.length} ${plural(g.items.length, 'алгоритм', 'алгоритма', 'алгоритмов')}`)))),
    ]),
  );

  const how = h('section.how',
    h('h2', 'Как устроена каждая тема'),
    h('ol.how-steps',
      h('li', h('b', 'Объяснение.'), ' Несколько абзацев простыми словами: что это, зачем и откуда берётся правило.'),
      h('li', h('b', 'Картинка.'), ' Двигаете ползунки — и видите, как меняется результат. В алгоритмах это анимация по шагам рядом с кодом.'),
      h('li', h('b', 'Примеры.'), ' Решение открывается по одному шагу, чтобы можно было сначала подумать самому.'),
      h('li', h('b', 'Тренировка.'), ' Задачи каждый раз новые. Тема засчитывается при пяти верных ответах из шести, а через несколько дней сайт предложит её повторить.'),
    ),
  );

  return {
    title: '',
    el: h('div.page.home', hero, status, h('div.home-cols', mathCol, algoCol), how),
    onLeave: demo.destroy,
  };
}
