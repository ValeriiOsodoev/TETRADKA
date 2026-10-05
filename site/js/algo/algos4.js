// Алгоритмы на графах: обход в ширину и обход в глубину.

import { p, rule, list, sub, tip, warn } from '../math/blocks.js';
import { pick } from '../math/tasks.js';
import { parseCode } from './editor.js';
import { tracer } from './viz.js';

// Учебный граф: восемь вершин, координаты — для рисунка.
const NODES = [
  { id: 'A', x: 48, y: 70 },
  { id: 'B', x: 150, y: 38 },
  { id: 'C', x: 88, y: 190 },
  { id: 'D', x: 262, y: 36 },
  { id: 'E', x: 236, y: 122 },
  { id: 'F', x: 196, y: 214 },
  { id: 'G', x: 326, y: 168 },
  { id: 'H', x: 380, y: 66 },
];
const GRAPH = { A: ['B', 'C'], B: ['A', 'D', 'E'], C: ['A', 'F'], D: ['B'], E: ['B', 'F', 'G'], F: ['C', 'E'], G: ['E', 'H'], H: ['G'] };
const EDGES = [];
for (const [a, list2] of Object.entries(GRAPH)) for (const b of list2) if (a < b) EDGES.push([a, b]);

const startInput = [{ key: 'start', label: 'Откуда начинаем', type: 'choice', options: NODES.map((n) => n.id) }];

function drawGraph(nodeCls, badges = {}, hot = null) {
  return {
    nodes: NODES.map((n) => ({ ...n, cls: nodeCls[n.id] || '', badge: badges[n.id] })),
    edges: EDGES.map(([a, b]) => [a, b, hot && ((hot[0] === a && hot[1] === b) || (hot[0] === b && hot[1] === a)) ? 'hot' : '']),
  };
}

const TEST_GRAPH = { A: ['B', 'C'], B: ['A', 'D'], C: ['A', 'D'], D: ['B', 'C', 'E'], E: ['D'] };
const TWO_ISLANDS = { A: ['B'], B: ['A'], C: ['D'], D: ['C'], E: [] };

export const graphs = [
  {
    id: 'bfs',
    title: 'Обход в ширину',
    blurb: 'Сначала все соседи, потом соседи соседей',
    cost: 'Каждая вершина попадает в очередь один раз, каждая связь просматривается пару раз. Время растёт вместе с размером графа — линейно.',
    theory: [
      p('**Граф** — это набор точек (**вершин**) и связей между ними (**рёбер**). Станции метро и перегоны, люди и дружба между ними, города и дороги, страницы сайта и ссылки — всё это графы.'),
      p('В Python граф удобно хранить словарём: для каждой вершины — список её соседей. `graph["A"]` — это те, с кем A связана напрямую.'),
      p('Частый вопрос: как далеко одна вершина от другой? Сколько пересадок от станции до станции, через сколько знакомых вы знаете какого-нибудь человека?'),
      rule('**Обход в ширину** идёт от стартовой вершины «волнами»: сначала посещает всех её соседей (расстояние 1), потом всех соседей этих соседей (расстояние 2) и так далее. Поэтому каждую вершину он впервые встречает по кратчайшему пути.'),
      sub('Очередь'),
      p('Чтобы обходить вершины в правильном порядке, нужна **очередь** — как в магазине: кто первым пришёл, того первым обслужат. Новые вершины встают в конец, обрабатываем мы всегда первую.'),
      list(
        'Кладём в очередь стартовую вершину, её расстояние — 0.',
        'Достаём из очереди первую вершину и смотрим на её соседей.',
        'Каждого соседа, которого ещё не встречали, отмечаем (расстояние на 1 больше) и ставим в конец очереди.',
        'Повторяем, пока очередь не опустеет.',
      ),
      tip('`deque` из модуля `collections` — список, у которого можно быстро забирать элементы с начала: `queue.popleft()`. Словарь `dist` выполняет сразу две работы: хранит расстояния и помнит, какие вершины уже посещены.'),
      warn('Если не отмечать посещённые вершины, алгоритм будет ходить по кругу: из A в B, из B обратно в A — и так бесконечно.'),
    ],
    code: parseCode(`
from collections import deque

def bfs(graph, start):
    dist = {start: 0}                      #@init
    queue = deque([start])
    while queue:                           #@loop
        v = queue.popleft()                #@pop
        for u in graph[v]:                 #@neigh
            if u not in dist:              #@check
                dist[u] = dist[v] + 1      #@set
                queue.append(u)            #@push
    return dist                            #@ret
`),
    viz: {
      inputs: startInput,
      initial: { start: 'A' },
      sample: () => ({ start: pick(NODES.map((n) => n.id)) }),
      steps({ start }, L) {
        const T = tracer();
        const dist = { [start]: 0 };
        const queue = [start];
        const done = new Set();
        const cls = (now) => Object.fromEntries(NODES.map((n) => [n.id, n.id === now ? 'now' : done.has(n.id) ? 'seen' : queue.includes(n.id) ? 'queued' : '']));
        const aux = () => [{ label: 'очередь', items: [...queue], empty: 'пуста' }];
        T.add(L.init, `Начинаем с вершины ${start}: расстояние до неё — 0. Ставим её в очередь.`, { graph: drawGraph(cls(null), dist), aux: aux() });
        while (queue.length) {
          const v = queue.shift();
          T.add(L.pop, `Достаём из очереди первую вершину — ${v}. Смотрим на её соседей: ${GRAPH[v].join(', ')}.`, { graph: drawGraph(cls(v), dist), aux: aux() });
          for (const u of GRAPH[v]) {
            if (!(u in dist)) {
              dist[u] = dist[v] + 1;
              queue.push(u);
              T.add(L.set, `В ${u} ещё не были. Расстояние до неё: ${dist[v]} + 1 = ${dist[u]}. Ставим ${u} в конец очереди.`, { graph: drawGraph(cls(v), dist, [v, u]), aux: aux() });
            } else {
              T.add(L.check, `В ${u} уже были (расстояние ${dist[u]}) — пропускаем.`, { graph: drawGraph(cls(v), dist, [v, u]), aux: aux() });
            }
          }
          done.add(v);
        }
        T.add(L.ret, `Очередь опустела — обошли всё, до чего можно добраться. Числа у вершин — кратчайшие расстояния от ${start}.`, { graph: drawGraph(cls(null), dist), aux: aux() });
        return T.steps;
      },
    },
    tasks: [
      {
        title: 'Напишите сами',
        text: 'Напишите функцию `bfs(graph, start)`. Граф задан словарём: ключ — вершина, значение — список соседей. Верните словарь, в котором для каждой достижимой вершины записано кратчайшее расстояние от `start` (число рёбер). Для самой `start` расстояние равно 0.',
        fn: 'bfs',
        starter: 'from collections import deque\n\n\ndef bfs(graph, start):\n    dist = {start: 0}\n    queue = deque([start])\n    while queue:\n        v = queue.popleft()\n        # обойдите соседей вершины v\n\n    return dist\n',
        tests: [
          { args: [TEST_GRAPH, 'A'], want: { A: 0, B: 1, C: 1, D: 2, E: 3 } },
          { args: [TEST_GRAPH, 'E'], want: { E: 0, D: 1, B: 2, C: 2, A: 3 } },
          { args: [TEST_GRAPH, 'D'], want: { D: 0, B: 1, C: 1, E: 1, A: 2 } },
          { args: [{ X: [] }, 'X'], want: { X: 0 } },
          { args: [TWO_ISLANDS, 'A'], want: { A: 0, B: 1 } },
          { args: [GRAPH, 'A'], want: { A: 0, B: 1, C: 1, D: 2, E: 2, F: 2, G: 3, H: 4 } },
        ],
        hints: ['Соседи вершины: `for u in graph[v]:`.', 'Новая вершина — та, которой ещё нет в словаре: `if u not in dist:`.', 'Для новой вершины: `dist[u] = dist[v] + 1` и `queue.append(u)`.'],
        solution: 'from collections import deque\n\n\ndef bfs(graph, start):\n    dist = {start: 0}\n    queue = deque([start])\n    while queue:\n        v = queue.popleft()\n        for u in graph[v]:\n            if u not in dist:\n                dist[u] = dist[v] + 1\n                queue.append(u)\n    return dist\n',
      },
      {
        title: 'Задача на применение',
        text: 'Напишите функцию `handshakes(graph, a, b)`. Граф — это люди и их знакомства. Верните, через сколько «рукопожатий» человек `a` связан с человеком `b`: 1 — знакомы напрямую, 2 — через общего знакомого, и так далее. Если `a` и `b` — один человек, ответ 0. Если цепочки знакомств между ними нет, верните `-1`.',
        fn: 'handshakes',
        starter: 'from collections import deque\n\n\ndef handshakes(graph, a, b):\n    pass\n',
        tests: [
          { args: [TEST_GRAPH, 'A', 'E'], want: 3 },
          { args: [TEST_GRAPH, 'A', 'B'], want: 1 },
          { args: [TEST_GRAPH, 'C', 'C'], want: 0 },
          { args: [TWO_ISLANDS, 'A', 'D'], want: -1 },
          { args: [TWO_ISLANDS, 'E', 'A'], want: -1 },
          { args: [GRAPH, 'D', 'H'], want: 4 },
        ],
        hints: ['Запустите обход в ширину из вершины `a` — получится словарь расстояний.', 'Если `b` есть в словаре, ответ — `dist[b]`. Если нет — до `b` добраться нельзя.'],
        solution: 'from collections import deque\n\n\ndef handshakes(graph, a, b):\n    dist = {a: 0}\n    queue = deque([a])\n    while queue:\n        v = queue.popleft()\n        for u in graph[v]:\n            if u not in dist:\n                dist[u] = dist[v] + 1\n                queue.append(u)\n    return dist.get(b, -1)\n',
      },
    ],
    uses: [
      '**Маршруты.** Как доехать на метро с наименьшим числом станций, как пройти лабиринт кратчайшим путём — обход в ширину находит путь с наименьшим числом шагов.',
      '**Социальные сети.** «У вас 12 общих друзей», «возможно, вы знакомы» — это вершины на расстоянии 2 от вас в графе дружбы.',
      '**Заливка в графических редакторах.** Инструмент «ведро» закрашивает область, расходясь от точки нажатия во все стороны, пока не упрётся в границу. Пиксели — вершины, соседство — рёбра.',
    ],
  },
  {
    id: 'dfs',
    title: 'Обход в глубину',
    blurb: 'Идём до упора, потом возвращаемся к развилке',
    cost: 'Как и обход в ширину: каждая вершина посещается один раз, время растёт линейно вместе с графом.',
    theory: [
      p('Как пройти весь лабиринт и ничего не пропустить? Способ, известный с древности: идём вперёд, пока есть куда. Упёрлись в тупик — возвращаемся до последней развилки и сворачиваем в коридор, где ещё не были. Это **обход в глубину**.'),
      rule('Заходим в вершину и отмечаем её. Затем по очереди берём её соседей: если сосед ещё не посещён — сразу идём в него и делаем там то же самое. Когда непосещённых соседей не осталось, возвращаемся на шаг назад.'),
      p('«Сделать то же самое в соседе» — это рекурсия: функция `dfs` вызывает саму себя. А «вернуться на шаг назад» происходит само, когда рекурсивный вызов завершается. Путь от старта до текущей вершины в каждый момент лежит в стеке вызовов.'),
      sub('Чем отличается от обхода в ширину'),
      list(
        '**В ширину** — осторожно, слой за слоем: сначала всё рядом, потом дальше. Нужна очередь. Находит кратчайшие пути.',
        '**В глубину** — смело, по одной дорожке до конца. Нужен стек (его роль играет рекурсия). Кратчайших путей не гарантирует, зато проще в записи и удобен, когда нужно перебрать все варианты.',
      ),
      tip('Оба обхода посещают одни и те же вершины — все, до которых можно добраться от старта. Разница только в порядке.'),
      warn('Запись `visited=None` и проверка `if visited is None` нужны, чтобы при каждом новом запуске создавался свежий список. Если написать `visited=[]` прямо в заголовке функции, Python создаст список один раз, и второй запуск продолжит заполнять старый.'),
    ],
    code: parseCode(`
def dfs(graph, v, visited=None):
    if visited is None:
        visited = []
    visited.append(v)                      #@visit
    for u in graph[v]:                     #@neigh
        if u not in visited:               #@check
            dfs(graph, u, visited)         #@go
    return visited                         #@ret
`),
    viz: {
      inputs: startInput,
      initial: { start: 'A' },
      sample: () => ({ start: pick(NODES.map((n) => n.id)) }),
      steps({ start }, L) {
        const T = tracer();
        const visited = [];
        const path = [];
        const order = () => Object.fromEntries(visited.map((id, i) => [id, i + 1]));
        const cls = () => Object.fromEntries(NODES.map((n) => [n.id, n.id === path[path.length - 1] ? 'now' : path.includes(n.id) ? 'queued' : visited.includes(n.id) ? 'seen' : '']));
        const aux = () => [
          { label: 'путь от старта', items: [...path], empty: 'пуст' },
          { label: 'порядок обхода', items: [...visited], empty: 'пока никого' },
        ];
        function go(v, from) {
          visited.push(v);
          path.push(v);
          T.add(L.visit, `${from ? `Идём из ${from} в ${v}.` : `Начинаем с вершины ${v}.`} Отмечаем её посещённой. Соседи: ${GRAPH[v].join(', ')}.`, { graph: drawGraph(cls(), order(), from ? [from, v] : null), aux: aux() });
          for (const u of GRAPH[v]) {
            if (!visited.includes(u)) {
              T.add(L.go, `Из ${v}: в ${u} ещё не были — идём туда.`, { graph: drawGraph(cls(), order(), [v, u]), aux: aux() });
              go(u, v);
              T.add(L.neigh, `Вернулись в ${v}. Проверяем оставшихся соседей.`, { graph: drawGraph(cls(), order()), aux: aux() });
            } else {
              T.add(L.check, `Из ${v}: в ${u} уже были — пропускаем.`, { graph: drawGraph(cls(), order(), [v, u]), aux: aux() });
            }
          }
          path.pop();
          T.add(L.ret, path.length ? `У ${v} не осталось непосещённых соседей — возвращаемся назад, в ${path[path.length - 1]}.` : `У ${v} не осталось непосещённых соседей, и возвращаться некуда: обход закончен. Числа у вершин — порядок посещения.`, { graph: drawGraph(cls(), order()), aux: aux() });
        }
        go(start, null);
        return T.steps;
      },
    },
    tasks: [
      {
        title: 'Напишите сами',
        text: 'Напишите функцию `dfs(graph, start)`, которая возвращает список вершин в том порядке, в каком их посещает обход в глубину. Соседей каждой вершины перебирайте в том порядке, в каком они записаны в словаре.',
        fn: 'dfs',
        starter: 'def dfs(graph, v, visited=None):\n    if visited is None:\n        visited = []\n    visited.append(v)\n    # загляните в каждого непосещённого соседа\n\n    return visited\n',
        tests: [
          { args: [TEST_GRAPH, 'A'], want: ['A', 'B', 'D', 'C', 'E'] },
          { args: [TEST_GRAPH, 'E'], want: ['E', 'D', 'B', 'A', 'C'] },
          { args: [{ X: [] }, 'X'], want: ['X'] },
          { args: [TWO_ISLANDS, 'C'], want: ['C', 'D'] },
          { args: [GRAPH, 'A'], want: ['A', 'B', 'D', 'E', 'F', 'C', 'G', 'H'] },
        ],
        hints: ['Цикл по соседям: `for u in graph[v]:`.', 'Если соседа ещё нет в списке (`if u not in visited:`), вызываем для него ту же функцию.', 'Рекурсивный вызов: `dfs(graph, u, visited)` — список `visited` передаём дальше, чтобы он был общим.'],
        solution: 'def dfs(graph, v, visited=None):\n    if visited is None:\n        visited = []\n    visited.append(v)\n    for u in graph[v]:\n        if u not in visited:\n            dfs(graph, u, visited)\n    return visited\n',
      },
      {
        title: 'Задача на применение',
        text: 'Напишите функцию `count_groups(graph)`. Граф — это люди и их знакомства. Компанией назовём группу людей, где от каждого можно по цепочке знакомств дойти до любого другого. Посчитайте, сколько в графе отдельных компаний. Человек без знакомых — тоже компания из одного.',
        fn: 'count_groups',
        starter: 'def count_groups(graph):\n    pass\n',
        tests: [
          { args: [TWO_ISLANDS], want: 3 },
          { args: [TEST_GRAPH], want: 1 },
          { args: [{}], want: 0 },
          { args: [{ A: [], B: [], C: [] }], want: 3 },
          { args: [{ A: ['B'], B: ['A', 'C'], C: ['B'], D: ['E'], E: ['D'] }], want: 2 },
        ],
        hints: ['Заведите общий список (или множество) посещённых вершин.', 'Перебирайте все вершины графа: `for v in graph:`. Если вершина ещё не посещена — это новая компания: увеличьте счётчик и запустите из неё обход.', 'Обход отметит всю компанию целиком, поэтому каждая будет посчитана один раз.'],
        solution: 'def count_groups(graph):\n    visited = set()\n\n    def walk(v):\n        visited.add(v)\n        for u in graph[v]:\n            if u not in visited:\n                walk(u)\n\n    count = 0\n    for v in graph:\n        if v not in visited:\n            count += 1\n            walk(v)\n    return count\n',
      },
    ],
    uses: [
      '**Перебор с возвратом.** Решение судоку, расстановка ферзей, поиск выхода из лабиринта: делаем ход, идём вглубь, а если зашли в тупик — возвращаемся и пробуем другой вариант.',
      '**Порядок зависимостей.** Чтобы установить программу, сначала нужны библиотеки, от которых она зависит, а им — свои. Обход в глубину выстраивает правильный порядок установки и находит круговые зависимости.',
      '**Связные области.** Сколько островов на карте, сколько отдельных пятен на снимке, связана ли сеть дорог — всё это подсчёт групп вершин, до которых можно добраться друг от друга.',
    ],
  },
];
