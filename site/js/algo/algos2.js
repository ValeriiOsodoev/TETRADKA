// Алгоритмы: сортировки — пузырьком, выбором, вставками, слиянием и быстрая.

import { p, rule, sub, tip, warn } from '../math/blocks.js';
import { ri, shuffle } from '../math/tasks.js';
import { parseCode } from './editor.js';
import { tracer } from './viz.js';

const randomList = (n, lo = 1, hi = 60) => {
  const pool = [];
  for (let v = lo; v <= hi; v++) pool.push(v);
  return shuffle(pool).slice(0, n);
};

const listInput = (maxLen = 9) => [{ key: 'arr', label: 'Список', type: 'list', min: 1, max: 99, maxLen }];

/** Элементы с постоянными номерами — чтобы столбики на экране переезжали, а не перерисовывались. */
function tracked(arr) {
  const items = arr.map((v, id) => ({ v, id }));
  return {
    items,
    swap(i, j) {
      [items[i], items[j]] = [items[j], items[i]];
    },
    snap(marks = {}, ptr = {}, extra = {}) {
      return { arr: items.map((x) => x.v), ids: items.map((x) => x.id), marks, ptr, ...extra };
    },
  };
}

const SORT_TESTS = [
  { args: [[3, 1, 2]], want: [1, 2, 3], inplace: true },
  { args: [[5, 4, 3, 2, 1]], want: [1, 2, 3, 4, 5], inplace: true },
  { args: [[1, 2, 3, 4]], want: [1, 2, 3, 4], inplace: true },
  { args: [[7]], want: [7], inplace: true },
  { args: [[]], want: [], inplace: true },
  { args: [[2, 3, 2, 1, 3]], want: [1, 2, 2, 3, 3], inplace: true },
  { args: [[-4, 10, 0, -7, 3]], want: [-7, -4, 0, 3, 10], inplace: true },
  { args: [[9, 2, 7, 4, 8, 1, 6, 3, 5]], want: [1, 2, 3, 4, 5, 6, 7, 8, 9], inplace: true },
];

const NO_SORTED = 'Готовыми `sorted` и `.sort()` не пользуйтесь — иначе тренировать будет нечего.';

export const sorting = [
  {
    id: 'bubble-sort',
    title: 'Сортировка пузырьком',
    blurb: 'Сравниваем соседей и меняем местами, если стоят не так',
    cost: 'На каждом из примерно $n$ проходов делается до $n$ сравнений — всего порядка $n^2$ действий: $O(n^2)$. Для 10 чисел это мелочь, для миллиона — уже триллион шагов.',
    theory: [
      p('**Сортировка** — расстановка элементов по порядку: чисел по возрастанию, фамилий по алфавиту, товаров по цене. Это одна из самых частых задач в программировании, и способов решить её придумано много. Начнём с самого простого.'),
      p('Идём по списку слева направо и сравниваем каждую пару соседей. Если левый больше правого — меняем их местами. К концу прохода самое большое число «доедет» до правого края — как пузырёк воздуха всплывает наверх.'),
      rule('Один проход ставит на место одно число — самое большое из оставшихся. Повторяем проходы, каждый раз не доходя до уже расставленных чисел в конце. После $n - 1$ прохода список отсортирован.'),
      p('В коде это два вложенных цикла. Внешний считает проходы, внутренний сравнивает соседей. Запись `a[j], a[j + 1] = a[j + 1], a[j]` меняет два элемента местами — в Python это делается одной строкой.'),
      sub('Хорош ли этот способ'),
      p('Пузырёк — лучший алгоритм, чтобы понять саму идею сортировки, и один из худших по скорости. Число действий растёт как квадрат длины списка: список стал в 10 раз длиннее — работы стало в 100 раз больше.'),
      tip('Если за целый проход не случилось ни одного обмена, список уже отсортирован и можно остановиться. Попробуйте добавить эту проверку сами.'),
    ],
    code: parseCode(`
def bubble_sort(a):
    n = len(a)
    for i in range(n - 1):                     #@outer
        for j in range(n - 1 - i):             #@inner
            if a[j] > a[j + 1]:                #@cmp
                a[j], a[j + 1] = a[j + 1], a[j]    #@swap
    return a                                   #@ret
`),
    viz: {
      mode: 'bars',
      inputs: listInput(8),
      initial: { arr: [34, 12, 51, 7, 28, 45, 19] },
      sample: () => ({ arr: randomList(ri(6, 8)) }),
      steps({ arr }, L) {
        const T = tracer();
        const S = tracked(arr);
        const n = arr.length;
        const done = {};
        for (let i = 0; i < n - 1; i++) {
          for (let j = 0; j < n - 1 - i; j++) {
            const [x, y] = [S.items[j].v, S.items[j + 1].v];
            T.add(L.cmp, `Сравниваем соседей: ${x} и ${y}.`, S.snap({ ...done, [j]: 'cmp', [j + 1]: 'cmp' }, { j }));
            if (x > y) {
              S.swap(j, j + 1);
              T.add(L.swap, `${x} больше ${y} — меняем их местами.`, S.snap({ ...done, [j]: 'swap', [j + 1]: 'swap' }, { j }));
            }
          }
          done[n - 1 - i] = 'done';
          T.add(L.outer, `Проход ${i + 1} закончен: ${S.items[n - 1 - i].v} «всплыло» на своё место.`, S.snap({ ...done }));
        }
        done[0] = 'done';
        T.add(L.ret, 'Все числа на своих местах — список отсортирован.', S.snap({ ...done }));
        return T.steps;
      },
    },
    tasks: [
      {
        title: 'Напишите сами',
        text: `Напишите функцию \`bubble_sort(a)\`, которая сортирует список по возрастанию и возвращает его. ${NO_SORTED}`,
        fn: 'bubble_sort',
        starter: 'def bubble_sort(a):\n    n = len(a)\n    # два вложенных цикла: проходы и сравнение соседей\n\n    return a\n',
        tests: SORT_TESTS,
        hints: ['Внешний цикл: `for i in range(n - 1):` — столько нужно проходов.', 'Внутренний: `for j in range(n - 1 - i):` — сравниваем `a[j]` и `a[j + 1]`.', 'Обмен: `a[j], a[j + 1] = a[j + 1], a[j]`.'],
        solution: 'def bubble_sort(a):\n    n = len(a)\n    for i in range(n - 1):\n        for j in range(n - 1 - i):\n            if a[j] > a[j + 1]:\n                a[j], a[j + 1] = a[j + 1], a[j]\n    return a\n',
      },
      {
        title: 'Задача на применение',
        text: 'Напишите функцию `count_swaps(a)`, которая возвращает, сколько обменов сделает сортировка пузырьком, пока отсортирует список `a`. Это число показывает, насколько список «перемешан».',
        fn: 'count_swaps',
        starter: 'def count_swaps(a):\n    pass\n',
        tests: [
          { args: [[1, 2, 3]], want: 0 },
          { args: [[3, 2, 1]], want: 3 },
          { args: [[2, 1, 3]], want: 1 },
          { args: [[]], want: 0 },
          { args: [[4, 3, 2, 1]], want: 6 },
          { args: [[1, 3, 2, 4]], want: 1 },
        ],
        hints: ['Возьмите код сортировки пузырьком и добавьте счётчик.', 'Увеличивайте счётчик на 1 в том месте, где происходит обмен.'],
        solution: 'def count_swaps(a):\n    a = list(a)\n    count = 0\n    n = len(a)\n    for i in range(n - 1):\n        for j in range(n - 1 - i):\n            if a[j] > a[j + 1]:\n                a[j], a[j + 1] = a[j + 1], a[j]\n                count += 1\n    return count\n',
      },
    ],
    uses: [
      '**Учёба.** На пузырьке проще всего понять вложенные циклы, обмен значений и то, как считать стоимость алгоритма.',
      '**Почти упорядоченные данные.** Если в списке одна-две пары стоят не на месте, пузырёк с ранней остановкой справится за один-два прохода.',
      '**В настоящих программах — нет.** Для реальных задач берут готовую `sorted()`: она устроена сложнее и работает во много раз быстрее. Но чтобы понять, чем она лучше, нужно знать, с чем сравнивать.',
    ],
  },
  {
    id: 'selection-sort',
    title: 'Сортировка выбором',
    blurb: 'Находим самое маленькое и ставим в начало',
    cost: 'Сравнений по-прежнему порядка $n^2$, зато обменов — не больше $n - 1$: каждый обмен сразу ставит число на окончательное место.',
    theory: [
      p('Как бы вы расставили книги по высоте? Скорее всего, так: нашли самую низкую — поставили первой. Из оставшихся снова нашли самую низкую — поставили второй. И так до конца. Это и есть **сортировка выбором**.'),
      rule('Список делится на две части: слева — уже отсортированная, справа — ещё нет. На каждом шаге находим минимум в правой части и меняем его местами с первым её элементом. Граница сдвигается на один элемент вправо.'),
      p('Поиск минимума — тот самый проход «с запоминанием лучшего» из первой темы. Только запоминаем не само число, а его индекс `m`, чтобы потом знать, что с чем менять.'),
      sub('Сравнение с пузырьком'),
      p('Сравнений столько же, но обменов гораздо меньше: один на проход вместо множества. Если переставлять элементы «дорого» (например, это тяжёлые ящики на складе, а не числа), сортировка выбором выигрывает.'),
      tip('После шага с номером `i` первые `i + 1` чисел уже стоят окончательно — их больше никто не тронет. Это удобно проверять на анимации.'),
    ],
    code: parseCode(`
def selection_sort(a):
    n = len(a)
    for i in range(n - 1):             #@outer
        m = i                          #@init
        for j in range(i + 1, n):      #@inner
            if a[j] < a[m]:            #@cmp
                m = j                  #@upd
        a[i], a[m] = a[m], a[i]        #@swap
    return a                           #@ret
`),
    viz: {
      mode: 'bars',
      inputs: listInput(8),
      initial: { arr: [29, 44, 8, 53, 17, 36, 21] },
      sample: () => ({ arr: randomList(ri(6, 8)) }),
      steps({ arr }, L) {
        const T = tracer();
        const S = tracked(arr);
        const n = arr.length;
        const done = {};
        for (let i = 0; i < n - 1; i++) {
          let m = i;
          T.add(L.init, `Ищем самое маленькое число начиная с позиции ${i}. Пока считаем минимумом ${S.items[i].v}.`, S.snap({ ...done, [m]: 'best' }, { i, m }));
          for (let j = i + 1; j < n; j++) {
            T.add(L.cmp, `${S.items[j].v} меньше, чем ${S.items[m].v}?`, S.snap({ ...done, [m]: 'best', [j]: 'cmp' }, { i, j, m }));
            if (S.items[j].v < S.items[m].v) {
              m = j;
              T.add(L.upd, `Да — новый минимум ${S.items[m].v}.`, S.snap({ ...done, [m]: 'best' }, { i, j, m }));
            }
          }
          const small = S.items[m].v;
          if (m !== i) {
            S.swap(i, m);
            done[i] = 'done';
            T.add(L.swap, `Минимум — ${small}. Меняем его местами с числом на позиции ${i}.`, S.snap({ ...done, [m]: 'swap' }, { i }));
          } else {
            done[i] = 'done';
            T.add(L.swap, `Минимум — ${small}, и он уже стоит на позиции ${i}. Ничего менять не нужно.`, S.snap({ ...done }, { i }));
          }
        }
        done[n - 1] = 'done';
        T.add(L.ret, 'Осталось одно число — оно самое большое и уже стоит последним. Готово.', S.snap({ ...done }));
        return T.steps;
      },
    },
    tasks: [
      {
        title: 'Напишите сами',
        text: `Напишите функцию \`selection_sort(a)\`, которая сортирует список по возрастанию и возвращает его. ${NO_SORTED}`,
        fn: 'selection_sort',
        starter: 'def selection_sort(a):\n    n = len(a)\n    for i in range(n - 1):\n        m = i\n        # найдите индекс минимума справа от i и поменяйте местами\n\n    return a\n',
        tests: SORT_TESTS,
        hints: ['Внутренний цикл: `for j in range(i + 1, n):`.', 'Если `a[j] < a[m]`, запоминаем новый индекс: `m = j`.', 'После внутреннего цикла — обмен: `a[i], a[m] = a[m], a[i]`. Он стоит на одном уровне с `for j`, не внутри него.'],
        solution: 'def selection_sort(a):\n    n = len(a)\n    for i in range(n - 1):\n        m = i\n        for j in range(i + 1, n):\n            if a[j] < a[m]:\n                m = j\n        a[i], a[m] = a[m], a[i]\n    return a\n',
      },
      {
        title: 'Задача на применение',
        text: `Напишите функцию \`sort_desc(a)\`, которая сортирует список **по убыванию** — от большего к меньшему — и возвращает его. ${NO_SORTED}`,
        fn: 'sort_desc',
        starter: 'def sort_desc(a):\n    pass\n',
        tests: [
          { args: [[3, 1, 2]], want: [3, 2, 1], inplace: true },
          { args: [[1, 2, 3, 4]], want: [4, 3, 2, 1], inplace: true },
          { args: [[5]], want: [5], inplace: true },
          { args: [[]], want: [], inplace: true },
          { args: [[2, 7, 2, 9]], want: [9, 7, 2, 2], inplace: true },
          { args: [[-1, -5, 4]], want: [4, -1, -5], inplace: true },
        ],
        hints: ['Алгоритм тот же, только на каждом шаге ищем не минимум, а максимум.', 'Достаточно поменять одно сравнение: `<` на `>`.'],
        solution: 'def sort_desc(a):\n    n = len(a)\n    for i in range(n - 1):\n        m = i\n        for j in range(i + 1, n):\n            if a[j] > a[m]:\n                m = j\n        a[i], a[m] = a[m], a[i]\n    return a\n',
      },
    ],
    uses: [
      '**Когда перестановка дорогая.** Перемещать большие файлы или физические предметы долго — выгоднее много раз сравнить, но мало раз переставить.',
      '**Нужны только первые места.** Чтобы найти трёх лучших из ста, не обязательно сортировать всех: достаточно трёх шагов сортировки выбором.',
      '**Устройства с маленькой памятью.** Алгоритму не нужен дополнительный список — он переставляет элементы на месте.',
    ],
  },
  {
    id: 'insertion-sort',
    title: 'Сортировка вставками',
    blurb: 'Как раскладывают карты в руке',
    cost: 'В худшем случае — порядка $n^2$ действий. Но если список почти упорядочен, работает почти за $n$: каждому числу нужно сдвинуться всего на пару позиций.',
    theory: [
      p('Вам сдают карты по одной. Каждую новую вы вставляете в руку на нужное место — между меньшей и большей. Карты в руке всё время упорядочены. Так работает **сортировка вставками**.'),
      rule('Считаем, что левая часть списка уже упорядочена (сначала это один элемент). Берём следующее число и двигаем его влево, пока слева от него стоит число больше. Каждое такое число сдвигается на одну позицию вправо, освобождая место.'),
      p('В коде берём число в переменную `x` — «в руку». Индекс `j` идёт влево по упорядоченной части. Пока `a[j]` больше `x`, сдвигаем `a[j]` вправо. Когда встретили число не больше `x` или дошли до начала — ставим `x` на освободившееся место.'),
      sub('Чем этот способ хорош'),
      p('Если данные почти отсортированы, каждое число проходит всего пару шагов — и алгоритм работает очень быстро. Пузырёк и выбор так не умеют: они в любом случае делают все свои сравнения.'),
      tip('Условие `j >= 0 and a[j] > x` проверяется слева направо. Сначала убеждаемся, что индекс не ушёл за начало списка, и только потом обращаемся к `a[j]`.'),
    ],
    code: parseCode(`
def insertion_sort(a):
    for i in range(1, len(a)):         #@outer
        x = a[i]                       #@take
        j = i - 1
        while j >= 0 and a[j] > x:     #@cmp
            a[j + 1] = a[j]            #@shift
            j -= 1
        a[j + 1] = x                   #@put
    return a                           #@ret
`),
    viz: {
      mode: 'bars',
      inputs: listInput(8),
      initial: { arr: [22, 40, 9, 31, 15, 48, 27] },
      sample: () => ({ arr: randomList(ri(6, 8)) }),
      steps({ arr }, L) {
        const T = tracer();
        const S = tracked(arr);
        const n = arr.length;
        const part = (upto) => Object.fromEntries(Array.from({ length: upto }, (_, k) => [k, 'part']));
        T.add(L.outer, `Одно число — ${S.items[0].v} — уже «упорядоченная часть».`, S.snap(part(1)));
        for (let i = 1; i < n; i++) {
          const x = S.items[i].v;
          let pos = i;
          T.add(L.take, `Берём ${x} и ищем ему место среди чисел слева.`, S.snap({ ...part(i), [pos]: 'hold' }, { i }, { vars: { x } }));
          while (pos > 0 && S.items[pos - 1].v > x) {
            const big = S.items[pos - 1].v;
            T.add(L.cmp, `${big} больше ${x} — его нужно сдвинуть вправо.`, S.snap({ ...part(i + 1), [pos]: 'hold', [pos - 1]: 'cmp' }, {}, { vars: { x } }));
            S.swap(pos - 1, pos);
            pos -= 1;
            T.add(L.shift, `${big} сдвинулось, место слева освободилось.`, S.snap({ ...part(i + 1), [pos]: 'hold' }, {}, { vars: { x } }));
          }
          const why = pos === 0 ? 'Дошли до начала списка.' : `${S.items[pos - 1].v} не больше ${x} — дальше двигаться не нужно.`;
          T.add(L.put, `${why} Ставим ${x} сюда.`, S.snap({ ...part(i + 1), [pos]: 'found' }, {}, { vars: { x } }));
        }
        T.add(L.ret, 'Все числа вставлены — список отсортирован.', S.snap(Object.fromEntries(arr.map((_, k) => [k, 'done']))));
        return T.steps;
      },
    },
    tasks: [
      {
        title: 'Напишите сами',
        text: `Напишите функцию \`insertion_sort(a)\`, которая сортирует список по возрастанию и возвращает его. ${NO_SORTED}`,
        fn: 'insertion_sort',
        starter: 'def insertion_sort(a):\n    for i in range(1, len(a)):\n        x = a[i]\n        j = i - 1\n        # сдвигайте вправо всё, что больше x, и вставьте x\n\n    return a\n',
        tests: SORT_TESTS,
        hints: ['Цикл сдвига: `while j >= 0 and a[j] > x:`.', 'Внутри него: `a[j + 1] = a[j]`, затем `j -= 1`.', 'После цикла: `a[j + 1] = x`.'],
        solution: 'def insertion_sort(a):\n    for i in range(1, len(a)):\n        x = a[i]\n        j = i - 1\n        while j >= 0 and a[j] > x:\n            a[j + 1] = a[j]\n            j -= 1\n        a[j + 1] = x\n    return a\n',
      },
      {
        title: 'Задача на применение',
        text: 'Напишите функцию `insert_sorted(a, x)`. Список `a` уже отсортирован по возрастанию. Нужно вернуть новый список, в который добавлено число `x` так, чтобы порядок сохранился.',
        fn: 'insert_sorted',
        starter: 'def insert_sorted(a, x):\n    pass\n',
        tests: [
          { args: [[1, 3, 5], 4], want: [1, 3, 4, 5] },
          { args: [[1, 3, 5], 0], want: [0, 1, 3, 5] },
          { args: [[1, 3, 5], 9], want: [1, 3, 5, 9] },
          { args: [[], 2], want: [2] },
          { args: [[2, 2], 2], want: [2, 2, 2] },
          { args: [[-3, 0, 8], -1], want: [-3, -1, 0, 8] },
        ],
        hints: ['Найдите первую позицию `i`, где `a[i] > x`. Если такой нет — `x` идёт в конец.', 'Собрать ответ можно срезами: `a[:i] + [x] + a[i:]`.'],
        solution: 'def insert_sorted(a, x):\n    i = 0\n    while i < len(a) and a[i] <= x:\n        i += 1\n    return a[:i] + [x] + a[i:]\n',
      },
    ],
    uses: [
      '**Данные приходят по одному.** Таблица рекордов, в которую добавляется новый результат, или лента событий — каждый новый элемент просто вставляют на своё место.',
      '**Почти упорядоченные списки.** Если после небольших правок нужно «подровнять» порядок, вставки справляются быстрее всех.',
      '**Внутри `sorted()`.** Сортировка в Python (её называют Timsort) режет список на небольшие куски и сортирует их именно вставками, а потом сливает — как в следующей теме.',
    ],
  },
  {
    id: 'merge-sort',
    title: 'Сортировка слиянием',
    blurb: 'Разделить пополам, отсортировать половины, слить',
    cost: 'Список делится пополам около $log_2 n$ раз, и на каждом уровне все $n$ чисел сливаются один раз. Всего порядка $n * log_2 n$ действий: для миллиона чисел — около 20 миллионов вместо триллиона.',
    theory: [
      p('Три предыдущие сортировки тратят порядка $n^2$ действий. Можно ли быстрее? Да — если применить приём **«разделяй и властвуй»**: большую задачу разбить на несколько маленьких, решить их и собрать ответ.'),
      p('Ключевое наблюдение: **слить** два уже отсортированных списка в один очень легко. Смотрим на первые элементы обоих списков, берём меньший, переносим в результат — и так, пока списки не кончатся. Каждый элемент обрабатывается один раз.'),
      rule('Сортировка слиянием: 1) делим список пополам; 2) сортируем каждую половину тем же способом; 3) сливаем две отсортированные половины.'),
      p('Но как отсортировать половину? Точно так же: разделить её пополам ещё раз. И ещё. Пока не останутся куски из одного элемента — а один элемент уже отсортирован. Функция, которая вызывает саму себя, называется **рекурсивной**; подробнее о рекурсии — в теме про факториал.'),
      sub('Откуда скорость'),
      p('Список из 8 чисел делится пополам три раза: 8 → 4 → 2 → 1. Из миллиона — всего 20 раз. На каждом уровне все числа сливаются по одному разу. Уровней мало — потому и получается быстро.'),
      warn('Плата за скорость — память: при слиянии создаются новые списки. Сортировки из прошлых тем переставляли элементы на месте и дополнительной памяти не требовали.'),
    ],
    code: parseCode(`
def merge_sort(a):
    if len(a) <= 1:                        #@base
        return a
    mid = len(a) // 2                      #@split
    left = merge_sort(a[:mid])             #@left
    right = merge_sort(a[mid:])            #@right
    return merge(left, right)              #@merge

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):    #@loop
        if left[i] <= right[j]:            #@cmp
            result.append(left[i])         #@takel
            i += 1
        else:
            result.append(right[j])        #@taker
            j += 1
    return result + left[i:] + right[j:]   #@tail
`),
    viz: {
      mode: 'cells',
      inputs: listInput(8),
      initial: { arr: [38, 12, 45, 7, 26, 51, 19, 33] },
      sample: () => ({ arr: randomList(ri(6, 8)) }),
      steps({ arr }, L) {
        const T = tracer();
        const a = [...arr];
        const marks = (lo, hi, cls, mid) => Object.fromEntries(a.map((_, k) => [k, k < lo || k >= hi ? 'off' : mid !== undefined && k >= mid ? 'cmp' : cls]));
        function sort(lo, hi) {
          if (hi - lo <= 1) return;
          const mid = lo + Math.floor((hi - lo) / 2);
          T.add(L.split, `Делим кусок [${a.slice(lo, hi).join(', ')}] пополам: [${a.slice(lo, mid).join(', ')}] и [${a.slice(mid, hi).join(', ')}].${mid - lo === 1 && hi - mid === 1 ? ' Куски из одного числа уже отсортированы.' : ''}`, { arr: a, marks: marks(lo, hi, 'best', mid) });
          sort(lo, mid);
          sort(mid, hi);
          const left = a.slice(lo, mid);
          const right = a.slice(mid, hi);
          const result = [];
          let i = 0;
          let j = 0;
          const used = (count) => Object.fromEntries(Array.from({ length: count }, (_, k) => [k, 'off']));
          const aux = (hot = {}) => [
            { label: 'left', items: left, marks: { ...used(i), ...(hot.left !== undefined ? { [hot.left]: hot.cls } : {}) } },
            { label: 'right', items: right, marks: { ...used(j), ...(hot.right !== undefined ? { [hot.right]: hot.cls } : {}) } },
            { label: 'result', items: result, marks: hot.last ? { [result.length - 1]: 'found' } : {} },
          ];
          T.add(L.merge, `Обе половины отсортированы: [${left.join(', ')}] и [${right.join(', ')}]. Сливаем их.`, { arr: a, marks: marks(lo, hi, 'best'), aux: aux() });
          while (i < left.length && j < right.length) {
            T.add(L.cmp, `Сравниваем первые из оставшихся: ${left[i]} и ${right[j]}.`, { arr: a, marks: marks(lo, hi, 'best'), aux: aux({ left: i, right: j, cls: 'cmp' }) });
            if (left[i] <= right[j]) {
              result.push(left[i]);
              i += 1;
              T.add(L.takel, `${result[result.length - 1]} не больше — переносим его в результат.`, { arr: a, marks: marks(lo, hi, 'best'), aux: aux({ last: true }) });
            } else {
              result.push(right[j]);
              j += 1;
              T.add(L.taker, `${result[result.length - 1]} меньше — переносим его в результат.`, { arr: a, marks: marks(lo, hi, 'best'), aux: aux({ last: true }) });
            }
          }
          const rest = [...left.slice(i), ...right.slice(j)];
          result.push(...rest);
          i = left.length;
          j = right.length;
          for (let k = lo; k < hi; k++) a[k] = result[k - lo];
          T.add(L.tail, `Одна половина закончилась — остаток второй (${rest.join(', ')}) дописываем целиком. Кусок готов: [${result.join(', ')}].`, { arr: a, marks: marks(lo, hi, 'found'), aux: aux() });
        }
        T.add(L.base, 'Будем делить список пополам, пока не останутся куски из одного числа.', { arr: a, marks: {} });
        sort(0, a.length);
        T.add(L.merge, 'Последнее слияние собрало весь список — он отсортирован.', { arr: a, marks: Object.fromEntries(a.map((_, k) => [k, 'done'])) });
        return T.steps;
      },
    },
    tasks: [
      {
        title: 'Напишите сами: слияние',
        text: 'Начнём с главной части. Напишите функцию `merge(left, right)`: оба списка отсортированы по возрастанию, нужно вернуть один общий отсортированный список. Не пользуйтесь `sorted` — идите по обоим спискам двумя указателями.',
        fn: 'merge',
        starter: 'def merge(left, right):\n    result = []\n    i = j = 0\n    # берите меньший из left[i] и right[j]\n\n    return result\n',
        tests: [
          { args: [[1, 4, 7], [2, 3, 9]], want: [1, 2, 3, 4, 7, 9] },
          { args: [[], [1, 2]], want: [1, 2] },
          { args: [[5], []], want: [5] },
          { args: [[], []], want: [] },
          { args: [[1, 2, 3], [4, 5, 6]], want: [1, 2, 3, 4, 5, 6] },
          { args: [[2, 2], [2]], want: [2, 2, 2] },
          { args: [[10], [1, 2, 3]], want: [1, 2, 3, 10] },
        ],
        hints: ['Цикл работает, пока в обоих списках что-то осталось: `while i < len(left) and j < len(right):`.', 'Если `left[i] <= right[j]`, добавляем `left[i]` и увеличиваем `i`. Иначе — `right[j]` и `j`.', 'После цикла один из списков мог не закончиться. Остатки дописываем срезами: `result + left[i:] + right[j:]`.'],
        solution: 'def merge(left, right):\n    result = []\n    i = j = 0\n    while i < len(left) and j < len(right):\n        if left[i] <= right[j]:\n            result.append(left[i])\n            i += 1\n        else:\n            result.append(right[j])\n            j += 1\n    return result + left[i:] + right[j:]\n',
      },
      {
        title: 'Вся сортировка целиком',
        text: `Теперь напишите \`merge_sort(a)\`, которая возвращает отсортированный список. Функцию \`merge\` тоже нужно определить в этом же коде. ${NO_SORTED}`,
        fn: 'merge_sort',
        starter: 'def merge(left, right):\n    pass\n\n\ndef merge_sort(a):\n    if len(a) <= 1:\n        return a\n    mid = len(a) // 2\n    # отсортируйте половины и слейте их\n',
        tests: SORT_TESTS.map((test) => ({ args: test.args, want: test.want })),
        hints: ['Левая половина — срез `a[:mid]`, правая — `a[mid:]`.', 'Каждую половину сортирует сама `merge_sort`: `left = merge_sort(a[:mid])`.', 'В конце: `return merge(left, right)`.'],
        solution: 'def merge(left, right):\n    result = []\n    i = j = 0\n    while i < len(left) and j < len(right):\n        if left[i] <= right[j]:\n            result.append(left[i])\n            i += 1\n        else:\n            result.append(right[j])\n            j += 1\n    return result + left[i:] + right[j:]\n\n\ndef merge_sort(a):\n    if len(a) <= 1:\n        return a\n    mid = len(a) // 2\n    left = merge_sort(a[:mid])\n    right = merge_sort(a[mid:])\n    return merge(left, right)\n',
      },
    ],
    uses: [
      '**Сортировка в Python.** Встроенные `sorted()` и `.sort()` построены на слиянии упорядоченных кусков. Вызывая их, вы пользуетесь этим алгоритмом.',
      '**Очень большие данные.** Файл на сто гигабайт не поместится в память. Его режут на части, каждую сортируют отдельно, а потом сливают — слиянию достаточно читать части подряд.',
      '**Когда важен порядок равных.** Сортировка слиянием не меняет местами одинаковые элементы. Отсортировали учеников по фамилии, потом по классу — внутри класса фамилии останутся по алфавиту.',
    ],
  },
  {
    id: 'quick-sort',
    title: 'Быстрая сортировка',
    blurb: 'Выбрать опорное число и разложить остальные по две стороны',
    cost: 'В среднем — порядка $n * log_2 n$ действий, как у слияния, и без дополнительных списков. При неудачном выборе опорного числа может замедлиться до $n^2$, но на практике это редкость.',
    theory: [
      p('Ещё один алгоритм «разделяй и властвуй», но делит он иначе. Сортировка слиянием режет список пополам не глядя, а всю работу делает при сборке. **Быстрая сортировка** — наоборот: вся работа в разделении, а собирать потом ничего не нужно.'),
      rule('1) Выбираем одно число — **опорное**. 2) Переставляем остальные так, чтобы все меньшие оказались слева от него, а остальные — справа. Опорное число при этом встаёт на своё окончательное место. 3) Так же сортируем левую и правую части.'),
      p('Шаг 2 называют **разбиением**. В коде ниже опорным берётся последнее число куска. Индекс `i` показывает границу: левее него — числа меньше опорного. Индекс `j` бежит по куску; встретив число меньше опорного, мы перебрасываем его к границе и сдвигаем её.'),
      p('После разбиения опорное число стоит точно там, где будет в отсортированном списке: слева всё меньше, справа всё не меньше. Больше его трогать не нужно.'),
      sub('Быстрая — насколько?'),
      p('Если опорное число каждый раз делит кусок примерно пополам, уровней деления — около $log_2 n$, как в сортировке слиянием. А перестановки делаются прямо в исходном списке, без копий. Поэтому на практике быстрая сортировка часто обгоняет слияние.'),
      warn('Худший случай: опорное число каждый раз оказывается самым большим или самым маленьким — например, если список уже отсортирован, а опорным берётся последний элемент. Тогда от куска «откусывается» всего одно число за проход. Поэтому в серьёзных реализациях опорное число выбирают случайно.'),
    ],
    code: parseCode(`
def quick_sort(a, lo=0, hi=None):
    if hi is None:
        hi = len(a) - 1
    if lo >= hi:                           #@base
        return a
    pivot = a[hi]                          #@pivot
    i = lo
    for j in range(lo, hi):                #@loop
        if a[j] < pivot:                   #@cmp
            a[i], a[j] = a[j], a[i]        #@swap
            i += 1
    a[i], a[hi] = a[hi], a[i]              #@place
    quick_sort(a, lo, i - 1)               #@left
    quick_sort(a, i + 1, hi)               #@right
    return a
`),
    viz: {
      mode: 'bars',
      inputs: listInput(9),
      initial: { arr: [31, 14, 47, 8, 39, 22, 53, 27] },
      sample: () => ({ arr: randomList(ri(7, 9)) }),
      steps({ arr }, L) {
        const T = tracer();
        const S = tracked(arr);
        const done = {};
        const view = (lo, hi, marks = {}) => {
          const out = {};
          S.items.forEach((_, k) => {
            out[k] = done[k] || (k < lo || k > hi ? 'off' : '');
          });
          return { ...out, ...marks };
        };
        function sort(lo, hi) {
          if (lo > hi) return;
          if (lo === hi) {
            done[lo] = 'done';
            T.add(L.base, `Кусок из одного числа (${S.items[lo].v}) сортировать не нужно — оно на месте.`, S.snap(view(lo, hi)));
            return;
          }
          const pivot = S.items[hi].v;
          let i = lo;
          T.add(L.pivot, `Берём кусок с позиции ${lo} по ${hi}. Опорное число — последнее: ${pivot}.`, S.snap(view(lo, hi, { [hi]: 'pivot' }), { i }));
          for (let j = lo; j < hi; j++) {
            const v = S.items[j].v;
            T.add(L.cmp, `${v} меньше опорного ${pivot}?`, S.snap(view(lo, hi, { [hi]: 'pivot', [j]: 'cmp' }), { i, j }));
            if (v < pivot) {
              S.swap(i, j);
              T.add(L.swap, i === j ? `Да. Оно уже стоит у границы — просто сдвигаем границу.` : `Да — перебрасываем ${v} к левой границе.`, S.snap(view(lo, hi, { [hi]: 'pivot', [i]: 'swap', ...(i !== j ? { [j]: 'swap' } : {}) }), { i, j }));
              i += 1;
            }
          }
          S.swap(i, hi);
          done[i] = 'done';
          T.add(L.place, `Ставим опорное число ${pivot} на границу. Слева от него всё меньше, справа — не меньше: оно на своём окончательном месте.`, S.snap(view(lo, hi), { i }));
          sort(lo, i - 1);
          sort(i + 1, hi);
        }
        sort(0, arr.length - 1);
        T.add(L.base, 'Все куски разобраны — список отсортирован.', S.snap(view(0, arr.length - 1)));
        return T.steps;
      },
    },
    tasks: [
      {
        title: 'Напишите сами',
        text: `Напишите функцию \`quick_sort(a)\`, которая возвращает отсортированный список. Можно написать как в примере — с перестановками на месте. А можно проще: выбрать опорное число, собрать три списка — меньше него, равные ему, больше него — и склеить результаты. ${NO_SORTED}`,
        fn: 'quick_sort',
        starter: 'def quick_sort(a):\n    if len(a) <= 1:\n        return a\n    pivot = a[len(a) // 2]\n    # соберите списки less, equal, greater и склейте\n',
        tests: SORT_TESTS.map((test) => ({ args: test.args, want: test.want, inplace: true })),
        hints: ['Список чисел меньше опорного: `less = [x for x in a if x < pivot]`.', 'Так же соберите `equal` (равные) и `greater` (больше).', 'Ответ: `quick_sort(less) + equal + quick_sort(greater)`.'],
        solution: 'def quick_sort(a):\n    if len(a) <= 1:\n        return a\n    pivot = a[len(a) // 2]\n    less = [x for x in a if x < pivot]\n    equal = [x for x in a if x == pivot]\n    greater = [x for x in a if x > pivot]\n    return quick_sort(less) + equal + quick_sort(greater)\n',
      },
      {
        title: 'Задача на применение',
        text: 'Напишите функцию `kth_smallest(a, k)`, которая возвращает `k`-е по величине число в списке, считая с единицы: при `k = 1` — самое маленькое, при `k = 2` — следующее за ним. Числа в списке могут повторяться.',
        fn: 'kth_smallest',
        starter: 'def kth_smallest(a, k):\n    pass\n',
        tests: [
          { args: [[5, 2, 9, 1], 1], want: 1 },
          { args: [[5, 2, 9, 1], 2], want: 2 },
          { args: [[5, 2, 9, 1], 4], want: 9 },
          { args: [[7], 1], want: 7 },
          { args: [[3, 3, 1], 2], want: 3 },
          { args: [[10, -2, 4, 4, 0], 3], want: 4 },
        ],
        hints: ['Самый простой путь: отсортировать список своей функцией и взять элемент с индексом `k - 1`.', 'Путь интереснее: после разбиения по опорному числу понятно, в какой из трёх частей лежит ответ, — и в другие можно не заходить.'],
        solution: 'def kth_smallest(a, k):\n    pivot = a[len(a) // 2]\n    less = [x for x in a if x < pivot]\n    equal = [x for x in a if x == pivot]\n    greater = [x for x in a if x > pivot]\n    if k <= len(less):\n        return kth_smallest(less, k)\n    if k <= len(less) + len(equal):\n        return pivot\n    return kth_smallest(greater, k - len(less) - len(equal))\n',
      },
    ],
    uses: [
      '**Стандартные библиотеки.** Функции сортировки во многих языках программирования — варианты быстрой сортировки: она экономит память и хорошо ложится на устройство процессора.',
      '**Медиана и «топ-N».** Чтобы найти средний по величине элемент, сортировать всё не обязательно: после разбиения ясно, в какой части он лежит. Так считают медианную зарплату по стране.',
      '**Идея разбиения.** Разложить элементы «по одну и по другую сторону» от порога — отдельно полезный приём: отделить чётные от нечётных, сданные работы от несданных.',
    ],
  },
];

